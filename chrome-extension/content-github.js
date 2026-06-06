// Vercentic Sourcing — GitHub Content Script v2.1
(function () {
  'use strict';
  const isProfilePage = () => { const p=window.location.pathname.split('/').filter(Boolean); return p.length===1&&!['features','enterprise','marketplace','explore','topics','settings'].includes(p[0]); };
  if (!isProfilePage()) return;
  const text=el=>el?.textContent?.trim()||'', q=sel=>document.querySelector(sel), qa=sel=>[...document.querySelectorAll(sel)];
  function extractProfile() {
    const nameRaw=text(q('.p-name,[itemprop="name"],.vcard-fullname')), parts=nameRaw.split(/\s+/).filter(Boolean);
    const skills=[];
    qa('.topic-tag,.repo-topic-tag span').forEach(el=>{const t=text(el);if(t&&!skills.includes(t))skills.push(t);});
    qa('.pinned-item-list-item').forEach(item=>{const lang=text(item.querySelector('[itemprop="programmingLanguage"]'));if(lang&&!skills.includes(lang))skills.push(lang);});
    return { firstName:parts.slice(0,-1).join(' ')||parts[0]||'', lastName:parts.length>1?parts[parts.length-1]:'', title:text(q('.p-job,[itemprop="jobTitle"]')), company:text(q('.p-org,[itemprop="worksFor"]')).replace('@','').trim(), location:text(q('.p-label,[itemprop="homeLocation"]')), summary:text(q('.p-note,[itemprop="description"]')).slice(0,500), email:(q('a[href^="mailto:"]')?.textContent||'').trim(), skills:[...new Set(skills)].slice(0,20), githubUrl:window.location.href, linkedinUrl:'', avatar:q('img.avatar-user,img[itemprop="image"]')?.src||'', source:'github', extractedAt:new Date().toISOString() };
  }
  chrome.runtime.onMessage.addListener((msg,_sender,sendResponse)=>{
    if(msg.type==='EXTRACT_PROFILE'){try{sendResponse({ok:true,profile:extractProfile()});}catch(e){sendResponse({ok:false,error:e.message});}return true;}
    if(msg.type==='PAGE_TYPE'){sendResponse({isProfilePage:isProfilePage(),url:window.location.href,platform:'github'});return true;}
  });
})();
