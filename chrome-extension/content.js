// content.js — Vercentic Chrome Extension
(function() {
  'use strict';
  if (window.__vercentic_loaded) return;
  window.__vercentic_loaded = true;

  // Don't inject on Vercentic's own pages
  const h = window.location.hostname;
  if ((h.includes('vercel.app') || h === 'localhost') && document.title.includes('Vercentic')) return;

  let panelOpen = false, extractedData = null, isExtracting = false, settings = {};
  chrome.storage.sync.get(['apiUrl', 'environmentId', 'environmentName'], d => { settings = d; });

  // Route API calls through background worker to bypass CORS
  function apiCall(endpoint, method, body) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'API_REQUEST', apiUrl: settings.apiUrl, endpoint, method, body },
        (resp) => resolve(resp || { ok: false, data: { error: 'No response from extension' } })
      );
    });
  }

  // ── Floating button ──────────────────────────────────────────────────────
  const fab = document.createElement('div');
  fab.id = 'vercentic-fab';
  fab.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
  </svg>`;
  fab.title = 'Import to Vercentic';
  document.body.appendChild(fab);

  // ── Side panel ───────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'vercentic-panel';
  panel.innerHTML = `
    <div class="vc-panel-header">
      <div class="vc-panel-logo"><div class="vc-logo-mark">V</div><span class="vc-logo-text">Vercentic</span></div>
      <button class="vc-panel-close" id="vc-close">&times;</button>
    </div>
    <div class="vc-panel-body" id="vc-body">
      <div class="vc-initial-state" id="vc-initial">
        <div class="vc-initial-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b5bdb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg></div>
        <h3 class="vc-initial-title">Import this profile</h3>
        <p class="vc-initial-desc">Vercentic will scan this page and extract candidate data using AI.</p>
        <button class="vc-btn-primary" id="vc-extract-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Extract Profile Data</button>
        <div class="vc-page-info"><span class="vc-page-url" id="vc-page-url"></span></div>
      </div>
      <div class="vc-loading-state" id="vc-loading" style="display:none">
        <div class="vc-spinner"></div>
        <p class="vc-loading-text">Vercentic is analysing this page…</p>
        <p class="vc-loading-sub">Using AI to extract profile data</p>
      </div>
      <div class="vc-result-state" id="vc-result" style="display:none"></div>
      <div class="vc-error-state" id="vc-error" style="display:none">
        <div class="vc-error-icon">!</div>
        <p class="vc-error-text" id="vc-error-text"></p>
        <button class="vc-btn-secondary" id="vc-retry-btn">Try Again</button>
      </div>
      <div class="vc-success-state" id="vc-success" style="display:none">
        <div class="vc-success-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0CAF77" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
        <h3 class="vc-success-title">Profile Imported!</h3>
        <p class="vc-success-desc" id="vc-success-name"></p>
        <a class="vc-btn-primary" id="vc-open-record" target="_blank">Open in Vercentic</a>
      </div>
      <div class="vc-noconfig-state" id="vc-noconfig" style="display:none">
        <div class="vc-error-icon" style="background:#f59e0b22;color:#f59e0b">⚙</div>
        <p class="vc-error-text">Extension not configured yet.</p>
        <p class="vc-loading-sub">Click the Vercentic icon in your toolbar to set your API URL and environment.</p>
      </div>
    </div>`;
  document.body.appendChild(panel);

  const pageUrlEl = document.getElementById('vc-page-url');
  pageUrlEl.textContent = window.location.hostname.replace('www.','') + window.location.pathname.slice(0,40);

  // ── Event handlers ─────────────────────────────────────────────────────
  fab.addEventListener('click', () => {
    panelOpen = !panelOpen;
    panel.classList.toggle('vc-panel-open', panelOpen);
    fab.classList.toggle('vc-fab-active', panelOpen);
    if (panelOpen && !settings.apiUrl) showState('noconfig');
    else if (panelOpen) showState('initial');
  });
  document.getElementById('vc-close').addEventListener('click', () => {
    panelOpen = false; panel.classList.remove('vc-panel-open'); fab.classList.remove('vc-fab-active');
  });
  document.getElementById('vc-extract-btn').addEventListener('click', extractProfile);
  document.getElementById('vc-retry-btn').addEventListener('click', extractProfile);

  chrome.storage.onChanged.addListener(changes => {
    if (changes.apiUrl) settings.apiUrl = changes.apiUrl.newValue;
    if (changes.environmentId) settings.environmentId = changes.environmentId.newValue;
    if (changes.environmentName) settings.environmentName = changes.environmentName.newValue;
  });

  function showState(state) {
    ['initial','loading','result','error','success','noconfig'].forEach(s => {
      const el = document.getElementById(`vc-${s}`);
      if (el) el.style.display = s === state ? 'flex' : 'none';
    });
  }

  // ── Page scraping ──────────────────────────────────────────────────────
  function scrapePageContent() {
    const selectors = ['main','article','[role="main"]','.profile-section','.pv-top-card',
      '.vcard-details','.p-note','.candidate-profile','#content','.content','.page-content'];
    let contentEl = null;
    for (const sel of selectors) { contentEl = document.querySelector(sel); if (contentEl) break; }
    if (!contentEl) contentEl = document.body;

    const clone = contentEl.cloneNode(true);
    clone.querySelectorAll('script,style,nav,footer,header,.ad,[role="navigation"],[role="banner"]').forEach(el => el.remove());

    const structuredData = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(el => {
      try { structuredData.push(JSON.parse(el.textContent)); } catch {}
    });

    const meta = {};
    document.querySelectorAll('meta[property],meta[name]').forEach(el => {
      const key = el.getAttribute('property') || el.getAttribute('name');
      if (key) meta[key] = el.getAttribute('content');
    });

    const images = [];
    document.querySelectorAll('img[src]').forEach(img => {
      const alt = (img.alt || '').toLowerCase();
      const w = img.naturalWidth || img.width;
      if ((alt.includes('profile') || alt.includes('photo') || alt.includes('avatar') ||
           img.closest('.profile-photo,.avatar,.pv-top-card,.vcard-avatar')) && w >= 48 && img.src.startsWith('http'))
        images.push(img.src);
    });

    return {
      text: (clone.innerText || clone.textContent || '').slice(0, 12000),
      title: document.title,
      url: window.location.href,
      structured_data: structuredData.length ? JSON.stringify(structuredData) : null,
      meta,
      profile_images: images.slice(0, 3),
    };
  }

  // ── Extract profile ────────────────────────────────────────────────────
  async function extractProfile() {
    if (isExtracting) return;
    if (!settings.apiUrl || !settings.environmentId) { showState('noconfig'); return; }
    isExtracting = true;
    showState('loading');

    try {
      const pageData = scrapePageContent();
      const response = await apiCall('/api/chrome-import/extract', 'POST', {
          page_text: pageData.text, page_url: pageData.url, page_title: pageData.title,
          environment_id: settings.environmentId,
          structured_data: pageData.structured_data, meta: pageData.meta,
      });
      if (!response.ok) { throw new Error(response.data?.error || `Server returned ${response.status}`); }
      extractedData = response.data;
      extractedData.page_url = pageData.url;
      if (pageData.profile_images.length) extractedData.extracted_data.photo_url = extractedData.extracted_data.photo_url || pageData.profile_images[0];
      renderPreview(extractedData);
      showState('result');
    } catch (err) {
      document.getElementById('vc-error-text').textContent = err.message;
      showState('error');
    } finally { isExtracting = false; }
  }

  // ── Render preview ─────────────────────────────────────────────────────
  function renderPreview(data) {
    const container = document.getElementById('vc-result');
    const d = data.extracted_data || {};
    const name = [d.first_name, d.last_name].filter(Boolean).join(' ') || 'Unknown';
    const initials = [d.first_name?.[0], d.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?';
    const conf = data.confidence || 0;
    const confColor = conf >= 75 ? '#0CAF77' : conf >= 50 ? '#f59e0b' : '#ef4444';
    const sourceLabels = { linkedin_profile:'LinkedIn', github_profile:'GitHub', personal_website:'Personal Site', job_board_profile:'Job Board', resume:'Resume/CV', other:'Web Page' };

    const editableFields = (data.fields || [])
      .filter(f => d[f.api_key] !== undefined && d[f.api_key] !== null && d[f.api_key] !== '')
      .map(f => {
        const val = d[f.api_key];
        const displayVal = Array.isArray(val) ? val.join(', ') : String(val);
        return `<div class="vc-field-row">
          <label class="vc-field-label">${f.name}</label>
          <div class="vc-field-value">
            ${f.field_type === 'multi_select'
              ? `<div class="vc-tags">${(Array.isArray(val)?val:[]).map(v=>`<span class="vc-tag">${v}</span>`).join('')}</div>`
              : `<input class="vc-field-input" value="${displayVal.replace(/"/g,'&quot;')}" data-key="${f.api_key}"/>`}
          </div></div>`;
      }).join('');

    const emptyFields = (data.fields || [])
      .filter(f => (d[f.api_key] === undefined || d[f.api_key] === null || d[f.api_key] === '') && !['id','created_at','updated_at'].includes(f.api_key));

    container.innerHTML = `
      <div class="vc-preview-header">
        <div class="vc-preview-avatar" style="background:${d.photo_url ? `url(${d.photo_url}) center/cover` : '#3b5bdb'}">
          ${d.photo_url ? '' : `<span>${initials}</span>`}
        </div>
        <div class="vc-preview-info">
          <div class="vc-preview-name">${name}</div>
          <div class="vc-preview-title">${d.current_title || d.job_title || ''}</div>
          <div class="vc-preview-badges">
            <span class="vc-badge" style="background:${confColor}15;color:${confColor};border:1px solid ${confColor}30">${conf}% confidence</span>
            <span class="vc-badge" style="background:#3b5bdb12;color:#3b5bdb;border:1px solid #3b5bdb25">${sourceLabels[data.source_type] || 'Web'}</span>
          </div>
        </div>
      </div>
      ${data.summary ? `<div class="vc-summary">${data.summary}</div>` : ''}
      <div class="vc-fields-section">
        <div class="vc-fields-header">
          <span>Extracted Fields (${(data.fields||[]).filter(f=>d[f.api_key]).length})</span>
          ${emptyFields.length ? `<span class="vc-fields-empty">${emptyFields.length} not found</span>` : ''}
        </div>
        ${editableFields}
      </div>
      <div class="vc-preview-actions">
        <button class="vc-btn-secondary" id="vc-cancel-import">Cancel</button>
        <button class="vc-btn-primary" id="vc-confirm-import">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Import to Vercentic</button>
      </div>`;
    document.getElementById('vc-cancel-import').addEventListener('click', () => { extractedData = null; showState('initial'); });
    document.getElementById('vc-confirm-import').addEventListener('click', confirmImport);
  }

  // ── Confirm import ─────────────────────────────────────────────────────
  async function confirmImport() {
    if (!extractedData || !settings.apiUrl) return;
    const btn = document.getElementById('vc-confirm-import');
    btn.disabled = true;
    btn.innerHTML = '<div class="vc-spinner-small"></div> Importing…';
    try {
      document.querySelectorAll('.vc-field-input').forEach(input => {
        const key = input.dataset.key;
        if (key) extractedData.extracted_data[key] = input.value;
      });
      const response = await apiCall('/api/chrome-import/create', 'POST', {
          environment_id: settings.environmentId,
          object_id: extractedData.object_id,
          data: extractedData.extracted_data,
          source_url: extractedData.page_url,
      });
      const result = response.data;
      if (response.status === 409) {
        document.getElementById('vc-error-text').textContent = result.message || 'This person already exists.';
        showState('error'); return;
      }
      if (!response.ok) throw new Error(result.error || 'Import failed');
      const name = [extractedData.extracted_data.first_name, extractedData.extracted_data.last_name].filter(Boolean).join(' ');
      document.getElementById('vc-success-name').textContent = `${name} has been added to your database.`;
      const openBtn = document.getElementById('vc-open-record');
      openBtn.href = `${settings.apiUrl.replace(/:\d+$/, ':3000').replace('/api', '')}`;
      openBtn.textContent = 'Open Vercentic';
      chrome.runtime.sendMessage({ type: 'IMPORT_SUCCESS', name, id: result.id });
      showState('success');
    } catch (err) {
      document.getElementById('vc-error-text').textContent = err.message;
      showState('error');
    } finally { btn.disabled = false; }
  }
})();
