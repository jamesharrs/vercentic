// Vercentic Sourcing — Popup v2.1
const msg = (type, payload) =>
  new Promise((res, rej) =>
    chrome.runtime.sendMessage({ type, ...payload }, r => {
      if (chrome.runtime.lastError) return rej(new Error(chrome.runtime.lastError.message));
      if (r?.error) return rej(new Error(r.error));
      res(r);
    })
  );

let profile=null, jobs=[], selJob=null, existing=null;
let activeCh='inmail', activeTone='professional';
const $=id=>document.getElementById(id), show=id=>$(id)?.classList.remove('hidden'), hide=id=>$(id)?.classList.add('hidden');

function showState(name) { ['loading','login','no-profile','profile','settings'].forEach(s=>hide(`s-${s}`)); show(`s-${name}`); }

async function init() {
  showState('loading');
  let cfg; try { cfg = await msg('GET_CONFIG'); } catch { showState('login'); return; }
  if (!cfg.sessionToken && !cfg.userId) {
    if (cfg.apiUrl) $('login-url').value = cfg.apiUrl;
    if (cfg.userEmail) $('login-email').value = cfg.userEmail;
    showState('login'); return;
  }
  $('hdr-sub').textContent = cfg.userName || cfg.userEmail || 'Sourcing Assistant';
  const [tab] = await chrome.tabs.query({ active:true, currentWindow:true });
  let pageType = { isProfilePage:false };
  try { pageType = await chrome.tabs.sendMessage(tab.id, { type:'PAGE_TYPE' }) || pageType; } catch {}
  if (!pageType.isProfilePage) { showState('no-profile'); return; }
  await loadProfile(tab, pageType);
}

async function loadProfile(tab, pageType) {
  showState('loading');
  let p=null;
  try { const r=await chrome.tabs.sendMessage(tab.id,{type:'EXTRACT_PROFILE'}); if(r?.ok) p=r.profile; } catch {}
  if (!p) { showState('no-profile'); return; }
  profile=p; showState('profile');
  renderProfile(p, pageType.platform);
  checkExists(p); loadJobs(p);
}

function renderProfile(p, platform) {
  const ini=[(p.firstName?.[0]||''),(p.lastName?.[0]||'')].join('').toUpperCase()||'?';
  $('p-name').textContent=`${p.firstName} ${p.lastName}`.trim()||'Unknown';
  $('p-title').textContent=[p.title,p.company].filter(Boolean).join(' · ');
  $('p-loc').textContent=p.location||'';
  const av=$('av-el');
  av.innerHTML=p.avatar?`<img src="${p.avatar}" alt="${ini}" onerror="this.parentElement.textContent='${ini}'"/>`:ini;
  const pb=$('p-platform');
  pb.className=`pbadge ${platform==='linkedin'?'b-li':platform==='github'?'b-gh':''}`;
  pb.textContent=platform==='linkedin'?'LinkedIn':platform==='github'?'GitHub':platform;
  const sw=$('skills-wrap'); sw.innerHTML='';
  (p.skills||[]).slice(0,10).forEach(s=>{const c=document.createElement('span');c.className='skill';c.textContent=s;sw.appendChild(c);});
  $('p-status').className='sbadge b-unknown'; $('p-status').textContent='Checking…';
}

async function checkExists(p) {
  try {
    const r=await msg('LOOKUP_PROFILE',{email:p.email,linkedinUrl:p.linkedinUrl});
    existing=r.record||null;
    const sb=$('p-status');
    if (r.exists) { sb.className='sbadge b-exists'; sb.textContent='✓ In Vercentic'; show('add-exists'); }
    else           { sb.className='sbadge b-new';    sb.textContent='New candidate'; }
  } catch {}
}

async function loadJobs(p) {
  $('jobs-list').innerHTML='<div class="loading"><div class="spin"></div> Scoring roles…</div>';
  try {
    const { jobs:raw }=await msg('GET_OPEN_JOBS'); jobs=raw||[];
    if (!jobs.length) { $('jobs-list').innerHTML='<div class="empty">No open roles found.</div>'; return; }
    const scored=await Promise.all(jobs.slice(0,8).map(async j=>{const{score,reasons}=await msg('MATCH_SCORE',{profile:p,job:j});return{...j,_score:score,_reasons:reasons};}));
    scored.sort((a,b)=>b._score-a._score); jobs=scored;
    const sel=$('add-job'); sel.innerHTML='<option value="">— Add without linking —</option>';
    scored.forEach(j=>{const o=document.createElement('option');o.value=j.id;o.textContent=`${j.data?.job_title||j.data?.title||'Untitled'} (${j._score}%)`;sel.appendChild(o);});
    if (scored.length){sel.value=scored[0].id;selJob=scored[0];}
    $('jobs-list').innerHTML='';
    scored.slice(0,6).forEach((j,i)=>{
      const col=j._score>=70?'#0CA678':j._score>=45?'#C8A87E':'#8b88a6';
      const row=document.createElement('div'); row.className=`job-row${i===0?' sel':''}`;
      row.innerHTML=`<div class="jradio">${i===0?'<div class="jdot"></div>':''}</div><div class="jinfo"><div class="jtitle">${j.data?.job_title||j.data?.title||'Untitled'}</div><div class="jdept">${[j.data?.department,j.data?.location].filter(Boolean).join(' · ')}</div>${j._reasons?.length?`<div style="font-size:10px;color:#8b88a6;margin-top:2px;">${j._reasons.slice(0,2).join(' · ')}</div>`:''}</div><div class="sring" style="border-color:${col};color:${col};">${j._score}%</div>`;
      row.addEventListener('click',()=>{selJob=j;$('add-job').value=j.id;document.querySelectorAll('.job-row').forEach(r=>{r.classList.remove('sel');r.querySelector('.jradio').innerHTML='';});row.classList.add('sel');row.querySelector('.jradio').innerHTML='<div class="jdot"></div>';});
      $('jobs-list').appendChild(row);
    });
  } catch(e){$('jobs-list').innerHTML=`<div class="err-msg">${e.message}</div>`;}
}

document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('act'));t.classList.add('act');['match','outreach','add'].forEach(p=>{const el=$(`p-${p}`);if(el)el.classList.toggle('hidden',p!==t.dataset.tab);});}));
document.querySelectorAll('.ch-btn').forEach(b=>b.addEventListener('click',()=>{activeCh=b.dataset.ch;document.querySelectorAll('.ch-btn').forEach(x=>x.classList.remove('act'));b.classList.add('act');$('subj-wrap').style.display=(activeCh==='inmail'||activeCh==='email')?'block':'none';}));
document.querySelectorAll('.tone').forEach(c=>c.addEventListener('click',()=>{activeTone=c.dataset.tone;document.querySelectorAll('.tone').forEach(x=>x.classList.remove('act'));c.classList.add('act');}));

$('btn-draft').addEventListener('click',async()=>{
  const btn=$('btn-draft');btn.disabled=true;btn.textContent='Drafting…';hide('out-err');
  try{const r=await msg('DRAFT_OUTREACH',{profile,job:selJob,tone:activeTone,channel:activeCh});if(r.subject){$('msg-subj').value=r.subject;$('subj-wrap').style.display='block';}$('msg-body').value=r.body||'';}
  catch(e){show('out-err');$('out-err').textContent=e.message;}
  finally{btn.disabled=false;btn.textContent='✨ Draft with AI';}
});
$('btn-copy').addEventListener('click',async()=>{const full=($('msg-subj').value?`Subject: ${$('msg-subj').value}\n\n`:'')+$('msg-body').value;if(!full.trim())return;await navigator.clipboard.writeText(full);showToast('Copied!');});
$('btn-log').addEventListener('click',async()=>{if(!existing?.id){showToast('Add candidate first');return;}try{await msg('LOG_COMM',{recordId:existing.id,type:activeCh==='email'?'email':'linkedin',subject:$('msg-subj').value,body:$('msg-body').value});showToast('Logged in Vercentic');}catch(e){showToast(`Failed: ${e.message}`);}});
$('btn-add').addEventListener('click',async()=>{
  const btn=$('btn-add');btn.disabled=true;btn.textContent='Adding…';hide('add-err');hide('add-ok');
  try{const r=await msg('ADD_CANDIDATE',{profile,jobId:$('add-job').value||null,note:$('add-note').value.trim()});existing=r.record;show('add-ok');$('add-ok').textContent=`✓ ${profile.firstName} added to Vercentic!`;show('add-exists');$('p-status').className='sbadge b-exists';$('p-status').textContent='✓ In Vercentic';}
  catch(e){show('add-err');$('add-err').textContent=e.message;}
  finally{btn.disabled=false;btn.textContent='+ Add to Vercentic';}
});

$('btn-login').addEventListener('click',async()=>{
  const btn=$('btn-login');btn.disabled=true;btn.textContent='Signing in…';hide('login-err');hide('login-debug');
  let url=$('login-url').value.trim().replace(/\/+$/,'');
  if(!url.startsWith('http')) url='https://'+url;
  $('login-url').value=url;
  const email=$('login-email').value.trim(), password=$('login-pass').value;
  if(!url||!email||!password){show('login-err');$('login-err').textContent='Please fill in all fields';btn.disabled=false;btn.textContent='Sign in';return;}
  try{await msg('SAVE_API_URL',{apiUrl:url});const r=await msg('LOGIN',{email,password});if(r.ok)init();else throw new Error(r.error||'Login failed');}
  catch(e){show('login-err');$('login-err').textContent=e.message||'Login failed';show('login-debug');$('login-debug').textContent=`Tried: POST ${url}/api/users/auth/login`;btn.disabled=false;btn.textContent='Sign in';}
});
$('login-pass').addEventListener('keydown',e=>{if(e.key==='Enter')$('btn-login').click();});

$('btn-test-conn').addEventListener('click',async()=>{
  const btn=$('btn-test-conn');btn.disabled=true;btn.textContent='Testing…';hide('login-err');hide('login-debug');
  let url=$('login-url').value.trim().replace(/\/+$/,'');
  if(!url.startsWith('http')) url='https://'+url;
  try{await msg('SAVE_API_URL',{apiUrl:url});const r=await msg('TEST_CONNECTION');show('login-debug');if(r.ok){$('login-debug').textContent=`✓ Connected: ${JSON.stringify(r.data)}`;$('login-debug').style.background='#f0fdf4';$('login-debug').style.borderColor='#a7f3d0';$('login-debug').style.color='#065f46';}else{$('login-debug').textContent=`✗ Failed: ${r.error||r.status}`;}}
  catch(e){show('login-debug');$('login-debug').textContent=`✗ Error: ${e.message}`;}
  btn.disabled=false;btn.textContent='Test connection';
});

let settingsOpen=false;
$('btn-settings').addEventListener('click',async()=>{
  settingsOpen=!settingsOpen;
  if(settingsOpen){const cfg=await msg('GET_CONFIG');$('set-user').textContent=cfg.userName?`${cfg.userName} (${cfg.userEmail})`:cfg.userEmail||'—';$('set-url').value=cfg.apiUrl||'';showState('settings');show('btn-back');$('btn-settings').style.opacity='.4';}
  else{hide('btn-back');$('btn-settings').style.opacity='1';init();}
});
$('btn-back').addEventListener('click',()=>{settingsOpen=false;hide('btn-back');$('btn-settings').style.opacity='1';init();});
$('btn-logout').addEventListener('click',async()=>{await msg('LOGOUT');settingsOpen=false;init();});
$('btn-save-url').addEventListener('click',async()=>{let u=$('set-url').value.trim().replace(/\/+$/,'');if(!u.startsWith('http'))u='https://'+u;if(u){await msg('SAVE_API_URL',{apiUrl:u});showToast('Saved');}});

function showToast(t){const el=$('toast');el.textContent=t;el.classList.remove('hidden');setTimeout(()=>el.classList.add('hidden'),2300);}
init();
