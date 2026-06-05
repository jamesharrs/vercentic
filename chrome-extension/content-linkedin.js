// ─────────────────────────────────────────────────────────────────────────────
// Vercentic Sourcing — LinkedIn Content Script
// Extracts structured profile data from LinkedIn profile pages
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';
  const isProfilePage = () => /^\/in\/[^/]+\/?$/.test(window.location.pathname);
  if (!isProfilePage()) return;

  const text  = el => el?.textContent?.trim() || '';
  const q     = sel => document.querySelector(sel);
  const qa    = sel => [...document.querySelectorAll(sel)];
  const first = (...sels) => { for (const s of sels) { const el = q(s); if (el && text(el)) return text(el); } return ''; };

  function extractName() {
    const raw = first('h1.text-heading-xlarge', 'h1[class*="inline"]', '.pv-text-details__left-panel h1', '.top-card-layout__title', 'h1');
    const parts = raw.split(/\s+/).filter(Boolean);
    return { firstName: parts.slice(0, -1).join(' ') || parts[0] || '', lastName: parts.length > 1 ? parts[parts.length - 1] : '' };
  }

  function extractCurrentRole() {
    const expItems = qa('#experience ~ .pvs-list__outer-container .pvs-list__item--line-separated');
    const firstItem = expItems[0];
    let title = '', company = '';
    if (firstItem) {
      const spans = qa.call ? firstItem.querySelectorAll('span[aria-hidden="true"]') : [];
      if (spans.length >= 2) { title = text(spans[0]); company = text(spans[1]).replace(/\s*·.*/, ''); }
    }
    if (!title) {
      const headline = first('.text-body-medium.break-words', '.pv-text-details__left-panel .text-body-medium', '.top-card-layout__headline');
      const match = headline.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
      if (match) { title = match[1]; company = match[2]; } else title = headline;
    }
    return { title, company };
  }

  function extractSkills() {
    const skillEls = qa('#skills ~ .pvs-list__outer-container .pvs-list__item--line-separated span[aria-hidden="true"]:first-child');
    const skills = skillEls.map(text).filter(s => s && s.length < 60 && !s.includes('·'));
    if (!skills.length) qa('.pv-skill-category-entity__name').forEach(el => { const s = text(el); if (s) skills.push(s); });
    return [...new Set(skills)].slice(0, 20);
  }

  function extractProfile() {
    const { firstName, lastName } = extractName();
    const { title, company }      = extractCurrentRole();
    const path = window.location.pathname.replace(/\/$/, '');
    return {
      firstName, lastName, title, company,
      location:    first('.text-body-small.inline.t-black--light.break-words', '.pv-text-details__left-panel span.text-body-small:not(.visually-hidden)'),
      summary:     (text(q('#about ~ .pvs-list__outer-container .visually-hidden')) || '').slice(0, 600),
      skills:      extractSkills(),
      linkedinUrl: `https://www.linkedin.com${path}`,
      email:       (q('a[href^="mailto:"]')?.href || '').replace('mailto:', ''),
      avatar:      q('.pv-top-card-profile-picture__image, img.pv-top-card__photo')?.src || '',
      source:      'linkedin',
      extractedAt: new Date().toISOString(),
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'EXTRACT_PROFILE') {
      try { sendResponse({ ok: true, profile: extractProfile() }); }
      catch (err) { sendResponse({ ok: false, error: err.message }); }
      return true;
    }
    if (msg.type === 'PAGE_TYPE') {
      sendResponse({ isProfilePage: isProfilePage(), url: window.location.href, platform: 'linkedin' });
      return true;
    }
  });
})();
