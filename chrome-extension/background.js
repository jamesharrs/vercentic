// ─────────────────────────────────────────────────────────────────────────────
// Vercentic Sourcing — Background Service Worker v2
// Handles all API communication with the Vercentic backend
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_API = 'https://talentos-production-4045.up.railway.app';

async function getConfig() {
  return new Promise(resolve => {
    chrome.storage.sync.get({
      apiUrl:        DEFAULT_API,
      sessionToken:  null,
      environmentId: null,
      userId:        null,
      userEmail:     null,
      userName:      null,
    }, resolve);
  });
}

async function setConfig(data) {
  return new Promise(resolve => chrome.storage.sync.set(data, resolve));
}

async function apiCall(path, options = {}) {
  const { apiUrl, sessionToken, environmentId, userId } = await getConfig();
  const url = `${apiUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(sessionToken  ? { 'X-Session-Token':  sessionToken  } : {}),
    ...(environmentId ? { 'X-Environment-Id': environmentId } : {}),
    ...(userId        ? { 'X-User-Id':        userId        } : {}),
  };
  const resp = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const data = await resp.json().catch(() => ({ error: 'Invalid response' }));
  if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
  return data;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg).then(sendResponse).catch(err => sendResponse({ error: err.message }));
  return true;
});

async function handleMessage(msg) {
  switch (msg.type) {

    case 'LOGIN': {
      const { email, password } = msg;
      const { apiUrl } = await getConfig();
      const resp = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json().catch(() => ({ error: 'Invalid response' }));
      if (!resp.ok) throw new Error(data.error || 'Login failed');
      await setConfig({
        sessionToken:  data.token || data.session?.token || null,
        environmentId: data.user?.environment_id || null,
        userId:        data.user?.id || null,
        userEmail:     data.user?.email || email,
        userName:      `${data.user?.first_name || ''} ${data.user?.last_name || ''}`.trim(),
      });
      return { ok: true, user: data.user };
    }

    case 'LOGOUT': {
      await setConfig({ sessionToken: null, userId: null, userEmail: null, userName: null });
      return { ok: true };
    }

    case 'GET_CONFIG': {
      return await getConfig();
    }

    case 'SAVE_API_URL': {
      await setConfig({ apiUrl: msg.apiUrl });
      return { ok: true };
    }

    case 'LOOKUP_PROFILE': {
      const { email, linkedinUrl } = msg;
      const { environmentId } = await getConfig();
      if (!environmentId) return { exists: false };
      try {
        const term = email || linkedinUrl || '';
        const data = await apiCall(`/api/records?object_slug=people&environment_id=${environmentId}&search=${encodeURIComponent(term)}&limit=5`);
        const records = Array.isArray(data) ? data : (data.records || []);
        const match = email
          ? records.find(r => r.data?.email === email)
          : records.find(r => r.data?.linkedin_url === linkedinUrl || r.data?.social_linkedin === linkedinUrl);
        return { exists: !!match, record: match || null };
      } catch { return { exists: false }; }
    }

    case 'GET_OPEN_JOBS': {
      const { environmentId } = await getConfig();
      if (!environmentId) return { jobs: [] };
      try {
        const data = await apiCall(`/api/records?object_slug=jobs&environment_id=${environmentId}&limit=20`);
        const records = Array.isArray(data) ? data : (data.records || []);
        const open = records.filter(r => {
          const s = (r.data?.status || '').toLowerCase();
          return s === 'open' || s === 'active' || s === '';
        });
        return { jobs: open };
      } catch { return { jobs: [] }; }
    }

    case 'ADD_CANDIDATE': {
      const { profile, jobId, note } = msg;
      const { environmentId, userId } = await getConfig();
      if (!environmentId) throw new Error('Not authenticated — please log in');
      const objs = await apiCall(`/api/objects?environment_id=${environmentId}`);
      const peopleObj = objs.find(o => (o.slug || '').toLowerCase() === 'people');
      if (!peopleObj) throw new Error('No People object found in your environment');
      const record = await apiCall('/api/records', {
        method: 'POST',
        body: JSON.stringify({
          object_id:      peopleObj.id,
          environment_id: environmentId,
          data: {
            first_name:      profile.firstName  || '',
            last_name:       profile.lastName   || '',
            email:           profile.email      || '',
            phone:           profile.phone      || '',
            current_title:   profile.title      || '',
            current_company: profile.company    || '',
            location:        profile.location   || '',
            summary:         profile.summary    || '',
            linkedin_url:    profile.linkedinUrl || '',
            github_url:      profile.githubUrl  || '',
            source:          'Chrome Extension',
            skills:          (profile.skills || []).join(', '),
            person_type:     'Candidate',
            status:          'New',
          },
        }),
      });
      if (note) {
        await apiCall('/api/activity', {
          method: 'POST',
          body: JSON.stringify({ record_id: record.id, environment_id: environmentId, action: 'note', details: note, user_id: userId }),
        }).catch(() => {});
      }
      if (jobId && record.id) {
        await apiCall('/api/people-links', {
          method: 'POST',
          body: JSON.stringify({ person_record_id: record.id, target_record_id: jobId, environment_id: environmentId, stage: 'Applied' }),
        }).catch(() => {});
      }
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#0CA678' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 4000);
      return { ok: true, record };
    }

    case 'DRAFT_OUTREACH': {
      const { profile, job, tone, channel } = msg;
      const systemPrompt = `You are an expert technical recruiter writing outreach messages. Write in ${tone || 'professional'} tone. Be concise, specific, and compelling. Never use generic phrases like "I came across your profile". Reference specific details from the candidate's background. Keep under 150 words for ${channel === 'inmail' ? 'LinkedIn InMail' : channel === 'email' ? 'email' : 'a connection request note'}.`;
      const userPrompt = `Write a ${channel === 'inmail' ? 'LinkedIn InMail' : channel === 'email' ? 'cold outreach email' : 'LinkedIn connection request note'} for this candidate:\n\nCandidate: ${profile.firstName} ${profile.lastName}\nCurrent role: ${profile.title} at ${profile.company}\nLocation: ${profile.location}\nSkills: ${(profile.skills || []).slice(0, 8).join(', ')}\n${profile.summary ? `Summary: ${profile.summary.slice(0, 200)}` : ''}\n\n${job ? `Role we're hiring for:\nJob title: ${job.data?.job_title || job.data?.title || 'Open Role'}\nDepartment: ${job.data?.department || ''}\nLocation: ${job.data?.location || ''}` : 'We are building our talent network for future opportunities.'}\n\n${channel === 'inmail' ? 'Include a subject line on the first line prefixed with "Subject: "' : ''}\nWrite only the message. No preamble.`;
      const { apiUrl } = await getConfig();
      const resp = await fetch(`${apiUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: userPrompt }], system: systemPrompt, max_tokens: 400 }),
      });
      const data = await resp.json();
      const text = data.content?.[0]?.text || data.text || data.message || '';
      if (!text) throw new Error('AI did not return a message');
      let subject = '', body = text;
      if (channel === 'inmail' && text.startsWith('Subject:')) {
        const lines = text.split('\n');
        subject = lines[0].replace('Subject:', '').trim();
        body = lines.slice(1).join('\n').trim();
      }
      return { ok: true, subject, body, channel };
    }

    case 'MATCH_SCORE': {
      const { profile, job } = msg;
      const jobSkills = (job.data?.required_skills || job.data?.skills || '').toLowerCase().split(/[,;]/).map(s => s.trim()).filter(Boolean);
      const candSkills = (profile.skills || []).map(s => s.toLowerCase());
      const jobTitle  = (job.data?.job_title || job.data?.title || '').toLowerCase();
      const candTitle = (profile.title || '').toLowerCase();
      const jobLoc    = (job.data?.location || '').toLowerCase();
      const candLoc   = (profile.location || '').toLowerCase();
      let score = 10;
      const reasons = [];
      if (jobSkills.length > 0) {
        const matched = jobSkills.filter(s => candSkills.some(c => c.includes(s) || s.includes(c)));
        score += Math.round((matched.length / jobSkills.length) * 50);
        if (matched.length > 0) reasons.push(`${matched.length}/${jobSkills.length} skills match`);
      }
      const titleWords = jobTitle.split(/\s+/).filter(w => w.length > 3);
      const titleMatch = titleWords.filter(w => candTitle.includes(w)).length;
      if (titleWords.length > 0 && titleMatch > 0) { score += Math.round((titleMatch / titleWords.length) * 25); reasons.push('Similar title'); }
      if (jobLoc && candLoc) {
        const locWords = jobLoc.split(/[,\s]+/);
        if (locWords.some(w => w.length > 3 && candLoc.includes(w))) { score += 15; reasons.push('Location match'); }
      }
      return { score: Math.min(score, 99), reasons };
    }

    case 'LOG_COMM': {
      const { recordId, type, subject, body } = msg;
      const { environmentId, userId } = await getConfig();
      await apiCall('/api/comms', {
        method: 'POST',
        body: JSON.stringify({ record_id: recordId, environment_id: environmentId, type, direction: 'outbound', subject, body, status: 'sent', created_by: userId }),
      });
      return { ok: true };
    }

    // Legacy API_REQUEST proxy (keep for backwards compat)
    case 'API_REQUEST': {
      const { apiUrl, endpoint, method, body } = msg;
      const resp = await fetch(`${apiUrl}${endpoint}`, {
        method: method || 'GET',
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await resp.json().catch(() => ({ error: 'Invalid JSON' }));
      return { ok: resp.ok, status: resp.status, data };
    }

    default:
      return { error: `Unknown message type: ${msg.type}` };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'add-to-vercentic', title: 'Add to Vercentic', contexts: ['page', 'selection'] });
  chrome.storage.sync.get({ apiUrl: DEFAULT_API }, () => {});
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'add-to-vercentic') chrome.action.openPopup();
});
