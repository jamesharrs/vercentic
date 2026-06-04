// Vercentic Sourcing Extension — Popup v2
const msg = (type, payload) =>
  new Promise((res, rej) =>
    chrome.runtime.sendMessage({ type, ...payload }, r =>
      r?.error ? rej(new Error(r.error)) : res(r)
    )
  );

let profile = null, jobs = [], selJob = null, existing = null;
let activeTab = 'match', activeCh = 'inmail', activeTone = 'professional';

const $ = id => document.getElementById(id);
const show = id => $(id)?.classList.remove('hidden');
const hide = id => $(id)?.classList.add('hidden');

function showState(name) {
  ['loading','login','no-profile','profile','settings'].forEach(s => hide(`s-${s}`));
  show(`s-${name}`);
}

async function init() {
  showState('loading');
  const cfg = await msg('GET_CONFIG');
  if (!cfg.sessionToken && !cfg.userId) {
    if (cfg.apiUrl) $('login-url').value = cfg.apiUrl;
    showState('login');
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  $('hdr-sub').textContent = cfg.userName || cfg.userEmail || 'Sourcing Assistant';
  let pageType = { isProfilePage: false };
  try { pageType = await chrome.tabs.sendMessage(tab.id, { type: 'PAGE_TYPE' }) || pageType; } catch {}
  if (!pageType.isProfilePage) { showState('no-profile'); return; }
  await loadProfile(tab, pageType);
}

async function loadProfile(tab, pageType) {
  showState('loading');
  let p = null;
  try { const r = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_PROFILE' }); if (r?.ok) p = r.profile; } catch {}
  if (!p) { showState('no-profile'); return; }
  profile = p;
  showState('profile');
  renderProfile(p, pageType.platform);
  checkExists(p);
  loadJobs(p);
}

function renderProfile(p, platform) {
  const name = `${p.firstName} ${p.lastName}`.trim() || 'Unknown';
  const ini  = [(p.firstName?.[0]||''),(p.lastName?.[0]||'')].join('').toUpperCase() || '?';
  $('p-name').textContent  = name;
  $('p-title').textContent = [p.title, p.company].filter(Boolean).join(' · ');
  $('p-loc').textContent   = p.location || '';
  const av = $('av-el');
  av.innerHTML = p.avatar ? `<img src="${p.avatar}" alt="${ini}" onerror="this.parentElement.textContent='${ini}'"/>` : ini;
  const pb = $('p-platform');
  pb.className = `pbadge ${platform==='linkedin'?'b-li':platform==='github'?'b-gh':''}`;
  pb.textContent = platform==='linkedin'?'LinkedIn':platform==='github'?'GitHub':platform;
  const sw = $('skills-wrap');
  sw.innerHTML = '';
  (p.skills||[]).slice(0,10).forEach(s => { const c=document.createElement('span'); c.className='skill'; c.textContent=s; sw.appendChild(c); });
  $('p-status').className = 'sbadge b-unknown';
  $('p-status').textContent = 'Checking…';
}

async function checkExists(p) {
  try {
    const r = await msg('LOOKUP_PROFILE', { email: p.email, linkedinUrl: p.linkedinUrl });
    existing = r.record || null;
    const sb = $('p-status');
    if (r.exists) { sb.className='sbadge b-exists'; sb.textContent='✓ In Vercentic'; show('add-exists'); }
    else           { sb.className='sbadge b-new';    sb.textContent='New candidate';  }
  } catch {}
}

async function loadJobs(p) {
  $('jobs-list').innerHTML = '<div class="loading"><div class="spin"></div> Scoring roles…</div>';
  try {
    const { jobs: raw } = await msg('GET_OPEN_JOBS');
    jobs = raw || [];
    if (!jobs.length) { $('jobs-list').innerHTML = '<div class="empty">No open roles found.</div>'; return; }
    const scored = await Promise.all(jobs.slice(0,8).map(async j => {
      const { score, reasons } = await msg('MATCH_SCORE', { profile: p, job: j });
      return { ...j, _score: score, _reasons: reasons };
    }));
    scored.sort((a,b) => b._score - a._score);
    jobs = scored;
    const sel = $('add-job');
    sel.innerHTML = '<option value="">— Add without linking —</option>';
    scored.forEach(j => { const o=document.createElement('option'); o.value=j.id; o.textContent=`${j.data?.job_title||j.data?.title||'Untitled'} (${j._score}%)`; sel.appendChild(o); });
    if (scored.length) { sel.value = scored[0].id; selJob = scored[0]; }
    $('jobs-list').innerHTML = '';
    scored.slice(0,6).forEach((j,i) => {
      const col = j._score>=70?'#0CA678':j._score>=45?'#C8A87E':'#8b88a6';
      const row = document.createElement('div');
      row.className = `job-row${i===0?' sel':''}`;
      row.dataset.jobId = j.id;
      row.innerHTML = `<div class="jradio">${i===0?'<div class="jdot"></div>':''}</div><div class="jinfo"><div class="jtitle">${j.data?.job_title||j.data?.title||'Untitled'}</div><div class="jdept">${[j.data?.department,j.data?.location].filter(Boolean).join(' · ')}</div>${j._reasons?.length?`<div style="font-size:10px;color:#8b88a6;margin-top:2px;">${j._reasons.slice(0,2).join(' · ')}</div>`:''}</div><div class="sring" style="border-color:${col};color:${col};">${j._score}%</div>`;
      row.addEventListener('click', () => selectJob(j, row));
      $('jobs-list').appendChild(row);
    });
  } catch (e) { $('jobs-list').innerHTML = `<div class="err-msg">${e.message}</div>`; }
}

function selectJob(j, el) {
  selJob = j;
  document.querySelectorAll('.job-row').forEach(r => { r.classList.remove('sel'); r.querySelector('.jradio').innerHTML=''; });
  el.classList.add('sel');
  el.querySelector('.jradio').innerHTML = '<div class="jdot"></div>';
  $('add-job').value = j.id;
}

// Tabs
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    activeTab = t.dataset.tab;
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('act'));
    t.classList.add('act');
    ['match','outreach','add'].forEach(p => { const el = $(`p-${p}`); if(el) el.classList.toggle('hidden', p!==activeTab); });
  });
});

// Channel / tone
document.querySelectorAll('.ch-btn').forEach(b => {
  b.addEventListener('click', () => {
    activeCh = b.dataset.ch;
    document.querySelectorAll('.ch-btn').forEach(x => x.classList.remove('act'));
    b.classList.add('act');
    $('subj-wrap').style.display = (activeCh==='inmail'||activeCh==='email') ? 'block' : 'none';
  });
});
document.querySelectorAll('.tone').forEach(c => {
  c.addEventListener('click', () => {
    activeTone = c.dataset.tone;
    document.querySelectorAll('.tone').forEach(x => x.classList.remove('act'));
    c.classList.add('act');
  });
});

// Draft
$('btn-draft').addEventListener('click', async () => {
  const btn = $('btn-draft'); btn.disabled=true; btn.textContent='Drafting…'; hide('out-err');
  try {
    const r = await msg('DRAFT_OUTREACH', { profile, job: selJob, tone: activeTone, channel: activeCh });
    if (r.subject) { $('msg-subj').value=r.subject; $('subj-wrap').style.display='block'; }
    $('msg-body').value = r.body||'';
  } catch (e) { show('out-err'); $('out-err').textContent=e.message; }
  finally {
    btn.disabled=false;
    btn.innerHTML=`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> Draft with AI`;
  }
});

// Copy
$('btn-copy').addEventListener('click', async () => {
  const full = ($('msg-subj').value?`Subject: ${$('msg-subj').value}\n\n`:'')+$('msg-body').value;
  if (!full.trim()) return;
  await navigator.clipboard.writeText(full);
  showToast('Copied!');
});

// Log comm
$('btn-log').addEventListener('click', async () => {
  if (!existing?.id) { showToast('Add candidate to Vercentic first'); return; }
  try {
    await msg('LOG_COMM', { recordId: existing.id, type: activeCh==='email'?'email':'linkedin', subject: $('msg-subj').value, body: $('msg-body').value });
    showToast('Logged in Vercentic');
  } catch (e) { showToast(`Failed: ${e.message}`); }
});

// Add candidate
$('btn-add').addEventListener('click', async () => {
  const btn=$('btn-add'); btn.disabled=true; btn.textContent='Adding…';
  hide('add-err'); hide('add-ok');
  try {
    const r = await msg('ADD_CANDIDATE', { profile, jobId: $('add-job').value||null, note: $('add-note').value.trim() });
    existing = r.record;
    show('add-ok'); $('add-ok').textContent=`✓ ${profile.firstName} added to Vercentic!`;
    show('add-exists');
    $('p-status').className='sbadge b-exists'; $('p-status').textContent='✓ In Vercentic';
  } catch (e) { show('add-err'); $('add-err').textContent=e.message; }
  finally {
    btn.disabled=false;
    btn.innerHTML=`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add to Vercentic`;
  }
});

// Login
$('btn-login').addEventListener('click', async () => {
  const btn=$('btn-login'); btn.disabled=true; btn.textContent='Signing in…'; hide('login-err');
  const url=$('login-url').value.trim().replace(/\/$/,'');
  if (url) await msg('SAVE_API_URL', { apiUrl: url });
  try { await msg('LOGIN', { email: $('login-email').value.trim(), password: $('login-pass').value }); init(); }
  catch (e) { show('login-err'); $('login-err').textContent=e.message||'Login failed'; btn.disabled=false; btn.textContent='Sign in'; }
});
$('login-pass').addEventListener('keydown', e => { if(e.key==='Enter') $('btn-login').click(); });

// Settings
let settingsOpen = false;
$('btn-settings').addEventListener('click', async () => {
  settingsOpen = !settingsOpen;
  if (settingsOpen) {
    const cfg = await msg('GET_CONFIG');
    $('set-user').textContent = cfg.userName ? `${cfg.userName} (${cfg.userEmail})` : cfg.userEmail||'Unknown';
    $('set-url').value = cfg.apiUrl||'';
    showState('settings'); show('btn-back'); $('btn-settings').style.opacity='.4';
  } else { hide('btn-back'); $('btn-settings').style.opacity='1'; init(); }
});
$('btn-back').addEventListener('click', () => { settingsOpen=false; hide('btn-back'); $('btn-settings').style.opacity='1'; init(); });
$('btn-logout').addEventListener('click', async () => { await msg('LOGOUT'); settingsOpen=false; init(); });
$('btn-save-url').addEventListener('click', async () => {
  const u=$('set-url').value.trim().replace(/\/$/,'');
  if (u) { await msg('SAVE_API_URL',{apiUrl:u}); showToast('Saved'); }
});

function showToast(t) {
  const el=$('toast'); el.textContent=t; el.classList.remove('hidden');
  setTimeout(()=>el.classList.add('hidden'),2300);
}

init();
