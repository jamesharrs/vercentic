// server/routes/cohort_auth.js
const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore } = require('../db/init');

const now = () => new Date().toISOString();
const MAGIC_LINK_TTL_MINS = 30;
const bcrypt = require('bcryptjs');
const hashPassword = (pw) => bcrypt.hashSync(pw, 12);
const checkPassword = (pw, hash) => {
  if (!hash) return false;
  if (hash.startsWith('$2')) return bcrypt.compareSync(pw, hash);
  // legacy sha256 fallback
  const legacy = crypto.createHash('sha256').update(`vercentic_salt_${pw}`).digest('hex');
  return hash === legacy;
};
const getCohort = (id) => (getStore().cohorts || []).find(c => c.id === id && !c.deleted_at);
const getMemberById = (id) => (getStore().cohort_members || []).find(m => m.id === id && !m.removed_at);
const getPersonRecord = (id) => (getStore().records || []).find(r => r.id === id);

const buildMemberSession = (member, cohort, personRecord) => ({
  member_id: member.id, cohort_id: cohort.id, cohort_name: cohort.name,
  cohort_primary_color: cohort.primary_color, role: member.role,
  person_record_id: member.person_record_id,
  name: personRecord?.data?.first_name ? `${personRecord.data.first_name} ${personRecord.data.last_name || ''}`.trim() : 'Member',
  email: personRecord?.data?.email || '', university: personRecord?.data?.university || '',
  programme_type: personRecord?.data?.programme_type || '',
  allow_dm: cohort.allow_dm, allow_member_posts: cohort.allow_member_posts,
  show_member_directory: cohort.show_member_directory, tasks_enabled: cohort.tasks_enabled,
});

// POST /api/cohort-auth/:cohortId/request-magic-link
router.post('/:cohortId/request-magic-link', (req, res) => {
  const s = getStore();
  const cohort = getCohort(req.params.cohortId);
  if (!cohort) return res.status(404).json({ error: 'Cohort not found' });
  if (cohort.auth_mode !== 'magic_link') return res.status(400).json({ error: 'This cohort uses password authentication' });
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const members = (s.cohort_members || []).filter(m => m.cohort_id === req.params.cohortId && !m.removed_at);
  let foundMember = null;
  for (const m of members) {
    const rec = getPersonRecord(m.person_record_id);
    if (rec?.data?.email?.toLowerCase() === email.toLowerCase()) { foundMember = m; break; }
  }
  if (!foundMember) return res.json({ sent: true, message: 'If your email is registered, you will receive a link shortly.' });
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + MAGIC_LINK_TTL_MINS * 60 * 1000).toISOString();
  const idx = (s.cohort_members || []).findIndex(m => m.id === foundMember.id);
  if (idx !== -1) { s.cohort_members[idx].magic_token = token; s.cohort_members[idx].magic_token_expires = expires; s.cohort_members[idx].magic_token_used = false; saveStore(); }
  console.log(`[CohortAuth] Magic link for ${email}: token=${token}`);
  const isDev = process.env.NODE_ENV !== 'production';
  res.json({ sent: true, message: 'If your email is registered, you will receive a link shortly.', ...(isDev && { _dev_token: token, _dev_member_id: foundMember.id }) });
});

// POST /api/cohort-auth/:cohortId/verify-magic-link
router.post('/:cohortId/verify-magic-link', (req, res) => {
  const s = getStore();
  const cohort = getCohort(req.params.cohortId);
  if (!cohort) return res.status(404).json({ error: 'Cohort not found' });
  const { token, member_id } = req.body;
  if (!token || !member_id) return res.status(400).json({ error: 'token and member_id required' });
  const idx = (s.cohort_members || []).findIndex(m => m.id === member_id && m.cohort_id === req.params.cohortId && !m.removed_at);
  if (idx === -1) return res.status(401).json({ error: 'Invalid link' });
  const member = s.cohort_members[idx];
  if (member.magic_token !== token) return res.status(401).json({ error: 'Invalid or expired link' });
  if (member.magic_token_used) return res.status(401).json({ error: 'This link has already been used' });
  if (member.magic_token_expires && new Date(member.magic_token_expires) < new Date()) return res.status(401).json({ error: 'This link has expired — please request a new one' });
  s.cohort_members[idx].magic_token_used = true;
  s.cohort_members[idx].last_seen = now();
  saveStore();
  const personRecord = getPersonRecord(member.person_record_id);
  res.json({ success: true, session: buildMemberSession(member, cohort, personRecord) });
});

// POST /api/cohort-auth/:cohortId/set-password
router.post('/:cohortId/set-password', (req, res) => {
  const s = getStore();
  const cohort = getCohort(req.params.cohortId);
  if (!cohort) return res.status(404).json({ error: 'Cohort not found' });
  if (cohort.auth_mode !== 'password') return res.status(400).json({ error: 'This cohort uses magic link authentication' });
  const { member_id, magic_token, new_password } = req.body;
  if (!member_id || !magic_token || !new_password) return res.status(400).json({ error: 'member_id, magic_token and new_password required' });
  if (new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const idx = (s.cohort_members || []).findIndex(m => m.id === member_id && m.cohort_id === req.params.cohortId && !m.removed_at && m.magic_token === magic_token && !m.magic_token_used);
  if (idx === -1) return res.status(401).json({ error: 'Invalid or expired invite link' });
  s.cohort_members[idx].password_hash = hashPassword(new_password);
  s.cohort_members[idx].magic_token_used = true;
  s.cohort_members[idx].last_seen = now();
  saveStore();
  const member = s.cohort_members[idx];
  res.json({ success: true, session: buildMemberSession(member, cohort, getPersonRecord(member.person_record_id)) });
});

// POST /api/cohort-auth/:cohortId/login
router.post('/:cohortId/login', (req, res) => {
  const s = getStore();
  const cohort = getCohort(req.params.cohortId);
  if (!cohort) return res.status(404).json({ error: 'Cohort not found' });
  if (cohort.auth_mode !== 'password') return res.status(400).json({ error: 'This cohort uses magic link authentication' });
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const members = (s.cohort_members || []).filter(m => m.cohort_id === req.params.cohortId && !m.removed_at);
  let foundMember = null;
  for (const m of members) {
    const rec = getPersonRecord(m.person_record_id);
    if (rec?.data?.email?.toLowerCase() === email.toLowerCase()) { foundMember = m; break; }
  }
  if (!foundMember || !foundMember.password_hash) return res.status(401).json({ error: 'Invalid email or password' });
  if (!checkPassword(password, foundMember.password_hash)) return res.status(401).json({ error: 'Invalid email or password' });
  const idx = (s.cohort_members || []).findIndex(m => m.id === foundMember.id);
  if (idx !== -1) { s.cohort_members[idx].last_seen = now(); saveStore(); }
  res.json({ success: true, session: buildMemberSession(foundMember, cohort, getPersonRecord(foundMember.person_record_id)) });
});

// POST /api/cohort-auth/:cohortId/ping
router.post('/:cohortId/ping', (req, res) => {
  const s = getStore();
  const { member_id } = req.body;
  const idx = (s.cohort_members || []).findIndex(m => m.id === member_id && m.cohort_id === req.params.cohortId);
  if (idx !== -1) { s.cohort_members[idx].last_seen = now(); saveStore(); }
  res.json({ ok: true });
});

// PATCH /api/cohort-auth/:cohortId/profile
router.patch('/:cohortId/profile', (req, res) => {
  const s = getStore();
  const { member_id, bio, headline, linkedin_url } = req.body;
  const member = getMemberById(member_id);
  if (!member || member.cohort_id !== req.params.cohortId) return res.status(404).json({ error: 'Not found' });
  const recIdx = (s.records || []).findIndex(r => r.id === member.person_record_id);
  if (recIdx !== -1) {
    if (bio !== undefined) s.records[recIdx].data.cohort_bio = bio;
    if (headline !== undefined) s.records[recIdx].data.cohort_headline = headline;
    if (linkedin_url !== undefined) s.records[recIdx].data.linkedin_url = linkedin_url;
    saveStore();
  }
  if (bio) {
    const mIdx = (s.cohort_members || []).findIndex(m => m.id === member_id);
    if (mIdx !== -1) { s.cohort_members[mIdx].intro_posted = true; saveStore(); }
  }
  res.json({ ok: true });
});

// GET /api/cohort-auth/by-token/:token
router.get('/by-token/:token', (req, res) => {
  const s = getStore();
  const cohort = (s.cohorts || []).find(c => c.portal_token === req.params.token && !c.deleted_at);
  if (!cohort) return res.status(404).json({ error: 'Invalid portal link' });
  res.json({ id: cohort.id, name: cohort.name, programme_type: cohort.programme_type, cohort_year: cohort.cohort_year, start_date: cohort.start_date, primary_color: cohort.primary_color, auth_mode: cohort.auth_mode });
});

// GET /api/cohort-auth/:cohortId/portal-token/:token
router.get('/:cohortId/portal-token/:token', (req, res) => {
  const cohort = getCohort(req.params.cohortId);
  if (!cohort || cohort.portal_token !== req.params.token) return res.status(404).json({ error: 'Invalid portal link' });
  res.json({ id: cohort.id, name: cohort.name, programme_type: cohort.programme_type, cohort_year: cohort.cohort_year, start_date: cohort.start_date, primary_color: cohort.primary_color, auth_mode: cohort.auth_mode });
});

module.exports = router;
