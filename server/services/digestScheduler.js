// server/services/digestScheduler.js
// Runs every 15 minutes. For each user who has daily_task_digest enabled,
// checks if NOW (in their timezone) matches their configured time + frequency.
// Sends one email per user per day, tracked in digest_sends table.

const https = require('https');
const { storeCache, loadTenantStore, listTenants, getCurrentTenant } = require('../db/init');

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

// Get current HH:MM in a given IANA timezone
function localHHMM(timezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone, hour:'2-digit', minute:'2-digit', hour12: false,
    }).formatToParts(new Date());
    const h = parts.find(p => p.type === 'hour')?.value   || '00';
    const m = parts.find(p => p.type === 'minute')?.value || '00';
    return `${h}:${m}`;
  } catch { return null; }
}

// Get YYYY-MM-DD in a given timezone
function localDate(timezone) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  } catch { return new Date().toISOString().slice(0,10); }
}

// Get day-of-week name in a given timezone
function localDayName(timezone) {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, weekday:'long' })
      .format(new Date()).toLowerCase();
  } catch { return DAY_NAMES[new Date().getDay()]; }
}

// Should this user receive a digest right now?
function isDue(digestConfig, nowHHMM) {
  const { daily_time = '08:00', frequency = 'weekdays', timezone = 'UTC', weekly_day = 'friday' } = digestConfig;
  if (frequency === 'off') return false;

  // Time window: within 14 minutes of configured time (scheduler runs every 15m)
  const [ch, cm] = nowHHMM.split(':').map(Number);
  const [th, tm] = daily_time.split(':').map(Number);
  const nowMins = ch * 60 + cm;
  const targetMins = th * 60 + tm;
  if (Math.abs(nowMins - targetMins) > 14) return false;

  // Day check
  const dayName = localDayName(timezone);
  if (frequency === 'weekdays') return !['saturday','sunday'].includes(dayName);
  if (frequency === 'weekly')   return dayName === weekly_day;
  return true; // 'daily'
}

// Mark a user as having received their digest today
function markSent(store, userId, date) {
  if (!store.digest_sends) store.digest_sends = [];
  store.digest_sends.push({ user_id: userId, date, sent_at: new Date().toISOString() });
  // Keep only last 90 days
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
  const cutStr = cutoff.toISOString().slice(0,10);
  store.digest_sends = store.digest_sends.filter(s => s.date >= cutStr);
}

function alreadySent(store, userId, date) {
  return (store.digest_sends || []).some(s => s.user_id === userId && s.date === date);
}

// Build digest data for a specific environment
function buildDigestData(store, environmentId) {
  const today = new Date().toISOString().slice(0,10);
  const threeDays = new Date(); threeDays.setDate(threeDays.getDate() + 3);
  const threeStr  = threeDays.toISOString().slice(0, 10);

  const tasks = (store.calendar_tasks || []).filter(t =>
    !t.deleted_at && t.status !== 'done' &&
    (!environmentId || t.environment_id === environmentId) &&
    t.due_date && t.due_date <= today
  ).sort((a,b) => (a.due_date||'').localeCompare(b.due_date||''));

  const interviews = (store.interviews || []).filter(i =>
    !i.deleted_at && i.date === today &&
    (!environmentId || i.environment_id === environmentId)
  );

  const offers = (store.offers || []).filter(o =>
    !o.deleted_at && o.status === 'sent' &&
    (!environmentId || o.environment_id === environmentId) &&
    o.expiry_date && o.expiry_date >= today && o.expiry_date <= threeStr
  );

  return {
    date: today,
    tasks_overdue: tasks.filter(t => t.due_date < today),
    tasks_today:   tasks.filter(t => t.due_date === today),
    interviews_today: interviews,
    offers_expiring: offers,
  };
}

// ── Main check — called every 15 minutes ─────────────────────────────────────
async function runDigestCheck() {
  const { saveStore: _ss } = require('../db/init');
  // Lazy-load to avoid circular deps at module init time
  const { buildDigestData: _build, buildHtml, sendEmail } = require('../routes/digest');

  // Ensure all tenant stores are loaded
  let slugs = [];
  try { slugs = listTenants(); } catch {}
  slugs.forEach(s => { if (!storeCache[s]) { try { loadTenantStore(s); } catch {} } });

  const storesToCheck = [
    { slug: 'master', store: storeCache['master'] },
    ...slugs.map(s => ({ slug: s, store: storeCache[s] })),
  ].filter(x => x.store);

  let sent = 0;
  for (const { slug, store } of storesToCheck) {
    const users = (store.users || []).filter(u => u.status === 'active' && u.email && !u.deleted_at);

    for (const user of users) {
      const prefs = (store.notification_preferences || []).find(p => p.user_id === user.id);
      if (!prefs) continue;

      // Must have email digest enabled
      const pref = prefs.preferences?.daily_task_digest;
      if (!pref?.email) continue;

      const dc     = prefs.digest_config || {};
      const tz     = dc.timezone || 'UTC';
      const nowStr = localHHMM(tz);
      const today  = localDate(tz);

      if (!nowStr || !isDue(dc, nowStr)) continue;
      if (alreadySent(store, user.id, today)) continue;

      const envId   = (store.environments || [])[0]?.id;
      const name    = `${user.first_name||''} ${user.last_name||''}`.trim();
      const digest  = buildDigestData(envId, store);
      const dayName = new Date(digest.date + 'T12:00:00')
        .toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
      const html    = buildHtml(digest, name);

      console.log(`[DigestScheduler] Sending to ${user.email} (${tz} ${nowStr})`);
      try {
        await sendEmail(user.email, name, `📋 Your Daily Digest — ${dayName}`, html);
        markSent(store, user.id, today);
        try { _ss(slug); } catch {}
        sent++;
      } catch(e) {
        console.error(`[DigestScheduler] Failed for ${user.email}:`, e.message);
      }
    }
  }
  if (sent > 0) console.log(`[DigestScheduler] Sent ${sent} digest(s)`);
}

// ── Startup ───────────────────────────────────────────────────────────────────
function startDigestScheduler() {
  const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
  // Run once shortly after boot (in case server restarted at digest time)
  setTimeout(() => runDigestCheck().catch(e => console.error('[DigestScheduler]', e.message)), 60_000);
  // Then every 15 minutes
  setInterval(() => runDigestCheck().catch(e => console.error('[DigestScheduler]', e.message)), INTERVAL_MS);
  console.log('[DigestScheduler] Started — checking every 15 minutes');
}

module.exports = { startDigestScheduler, runDigestCheck };

