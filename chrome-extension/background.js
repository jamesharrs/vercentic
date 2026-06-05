// Vercentic Sourcing Extension — Background Service Worker v2.1
// Fixed: login endpoint, response parsing, CORS, test connection

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
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Non-JSON: ${text.slice(0, 100)}`); }
  if (!resp.ok) throw new Error(data.error || data.message || `HTTP ${resp.status}`);
  return data;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg).then(sendResponse).catch(err => sendResponse({ error: err.message }));
  return true;
});

async function handleMessage(msg) {
  switch (msg.type) {

    case 'TEST_CONNECTION': {
      const { apiUrl } = await getConfig();
      try {
        const resp = await fetch(`${apiUrl}/api/health`);
        const text = await resp.text();
        let data; try { data = JSON.parse(text); } catch { data = text; }
        return { ok: resp.ok, status: resp.status, data };
      } catch(e) { return { ok: false, error: e.message }; }
    }

    case 'LOGIN': {
      const { email, password } = msg;
      const { apiUrl } = await getConfig();
      let resp, text, data;
      try {
        resp = await fetch(`${apiUrl}/api/users/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        text = await resp.text();
        try { data = JSON.parse(text); } catch { throw new Error(`Server returned: ${text.slice(0,150)}`); }
      } catch(e) { throw new Error(`Connection failed: ${e.message}`); }
      if (!resp.ok) throw new Error(data.error || data.message || `Login failed (${resp.status})`);
      // Response shape: { token, user: { id, email, first_name, last_name, environment_id, role }, tenant_slug }
      const token = data.token || null;
      const user  = data.user || {};
      const envId = user.environment_id || null;
      await setConfig({
        sessionToken:  token,
        environmentId: envId,
        userId:        user.id || email,
        userEmail:     user.email || email,
        userName:      `${user.first_name || ''} ${user.last_name || ''}`.trim() || email,
      });
      return { ok: true, user };
    }

    case 'LOGOUT': {
      await setConfig({ sessionToken: null, userId: null, userEmail: null, userName: null });
      return { ok: true };
    }

    case 'GET_CONFIG': return await getConfig();

    case 'SAVE_API_URL': {
      const url = (msg.apiUrl || '').trim().replace(/\/+$/, '');
      await setConfig({ apiUrl: url });
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
          : records.find(r => r.data?.linkedin_url === linkedinUrl);
        return { exists: !!match, record: match || null };
      } catch { return { exists: false }; }
    }

    case 'GET_OPEN_JOBS': {
      const { environmentId } = await getConfig();
      if (!environmentId) return { jobs: [] };
      try {
        const data = await apiCall(`/api/records?object_slug=jobs&environment_id=${environmentId}&limit=20`);
        const records = Array.isArray(data) ? data : (data.records || []);
        return { jobs: records.filter(r => { const s=(r.data?.status||'').toLowerCase(); return s==='open'||s==='active'||s===''; }) };
      } catch { return { jobs: [] }; }
    }

    case 'ADD_CANDIDATE': {
      const { profile, jobId, note } = msg;
      const { environmentId, userId } = await getConfig();
      if (!environmentId) throw new Error('Not authenticated — please log in');
      const objs = await apiCall(`/api/objects?environment_id=${environmentId}`);
      const peopleObj = objs.find(o => (o.slug||'').toLowerCase() === 'people');
      if (!peopleObj) throw new Error('No People object found');
      const record = await apiCall('/api/records', {
        method: 'POST',
        body: JSON.stringify({
          object_id: peopleObj.id, environment_id: environmentId,
          data: {
            first_name: profile.firstName||'', last_name: profile.lastName||'',
            email: profile.email||'', current_title: profile.title||'',
            current_company: profile.company||'', location: profile.location||'',
            summary: profile.summary||'', linkedin_url: profile.linkedinUrl||'',
            github_url: profile.githubUrl||'', source: 'Chrome Extension',
            skills: (profile.skills||[]).join(', '), person_type: 'Candidate', status: 'New',
          },
        }),
      });
      if (note) await apiCall('/api/activity', { method:'POST', body:JSON.stringify({ record_id:record.id, environment_id:environmentId, action:'note', details:note, user_id:userId }) }).catch(()=>{});
      if (jobId && record.id) await apiCall('/api/people-links', { method:'POST', body:JSON.stringify({ person_record_id:record.id, target_record_id:jobId, environment_id:environmentId, stage:'Applied' }) }).catch(()=>{});
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#0CA678' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 4000);
      return { ok: true, record };
    }

    case 'DRAFT_OUTREACH': {
      const { profile, job, tone, channel } = msg;
      const { apiUrl } = await getConfig();
      const system = `You are an expert recruiter writing outreach messages. Write in ${tone||'professional'} tone. Be concise and specific. Never use generic phrases. Keep under 150 words.`;
      const user = `Write a ${channel==='inmail'?'LinkedIn InMail':channel==='email'?'cold email':'LinkedIn connection request note'} for:\n\nCandidate: ${profile.firstName} ${profile.lastName}\nRole: ${profile.title} at ${profile.company}\nLocation: ${profile.location}\nSkills: ${(profile.skills||[]).slice(0,8).join(', ')}\n\n${job?`Hiring for: ${job.data?.job_title||'open role'} · ${job.data?.department||''} · ${job.data?.location||''}`:''}\n\n${channel==='inmail'?'Start with "Subject: " on the first line.':''}\nWrite only the message.`;
      const resp = await fetch(`${apiUrl}/api/ai/chat`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ messages:[{role:'user',content:user}], system, max_tokens:400 }) });
      const d = await resp.json();
      const text = d.content?.[0]?.text || d.text || d.message || '';
      if (!text) throw new Error('AI did not return a message');
      let subject='', body=text;
      if (channel==='inmail' && text.startsWith('Subject:')) { const lines=text.split('\n'); subject=lines[0].replace('Subject:','').trim(); body=lines.slice(1).join('\n').trim(); }
      return { ok:true, subject, body };
    }

    case 'MATCH_SCORE': {
      const { profile, job } = msg;
      const js = (job.data?.required_skills||job.data?.skills||'').toLowerCase().split(/[,;]/).map(s=>s.trim()).filter(Boolean);
      const cs = (profile.skills||[]).map(s=>s.toLowerCase());
      let score=10; const reasons=[];
      if (js.length>0) { const m=js.filter(s=>cs.some(c=>c.includes(s)||s.includes(c))); score+=Math.round((m.length/js.length)*50); if(m.length>0) reasons.push(`${m.length}/${js.length} skills`); }
      const tw=(job.data?.job_title||job.data?.title||'').toLowerCase().split(/\s+/).filter(w=>w.length>3);
      const tm=tw.filter(w=>(profile.title||'').toLowerCase().includes(w)).length;
      if(tw.length>0&&tm>0){score+=Math.round((tm/tw.length)*25);reasons.push('Similar title');}
      const jl=(job.data?.location||'').toLowerCase(), cl=(profile.location||'').toLowerCase();
      if(jl&&cl&&jl.split(/[,\s]+/).some(w=>w.length>3&&cl.includes(w))){score+=15;reasons.push('Location match');}
      return { score:Math.min(score,99), reasons };
    }

    case 'LOG_COMM': {
      const { recordId, type, subject, body } = msg;
      const { environmentId, userId } = await getConfig();
      await apiCall('/api/comms', { method:'POST', body:JSON.stringify({ record_id:recordId, environment_id:environmentId, type, direction:'outbound', subject, body, status:'sent', created_by:userId }) });
      return { ok:true };
    }

    default: return { error: `Unknown: ${msg.type}` };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id:'add-to-vercentic', title:'Add to Vercentic', contexts:['page','selection'] });
});
chrome.contextMenus.onClicked.addListener(() => chrome.action.openPopup());
