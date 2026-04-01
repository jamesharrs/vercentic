// background.js — Vercentic Chrome Extension Service Worker
// Handles API calls (bypasses CORS), badge updates, and message passing.

let importCount = 0;
let recentImports = [];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // ── API proxy — content script sends requests here to bypass CORS ──────
  if (msg.type === 'API_REQUEST') {
    (async () => {
      try {
        const { apiUrl, endpoint, method, body } = msg;
        const url = `${apiUrl}${endpoint}`;
        const opts = {
          method: method || 'GET',
          headers: { 'Content-Type': 'application/json' },
        };
        if (body) opts.body = JSON.stringify(body);
        const response = await fetch(url, opts);
        const data = await response.json();
        sendResponse({ ok: response.ok, status: response.status, data });
      } catch (err) {
        sendResponse({ ok: false, status: 0, data: { error: err.message } });
      }
    })();
    return true; // Keep channel open for async response
  }

  // ── Import success tracking ────────────────────────────────────────────
  if (msg.type === 'IMPORT_SUCCESS') {
    importCount++;
    recentImports.unshift({
      name: msg.name, id: msg.id, timestamp: Date.now(), tabUrl: sender.tab?.url,
    });
    recentImports = recentImports.slice(0, 20);
    chrome.action.setBadgeText({ text: String(importCount) });
    chrome.action.setBadgeBackgroundColor({ color: '#0CAF77' });
    chrome.storage.local.set({ recentImports, importCount });
    setTimeout(() => { chrome.action.setBadgeText({ text: '' }); }, 5000);
  }

  if (msg.type === 'GET_RECENT_IMPORTS') sendResponse(recentImports);

  if (msg.type === 'RESET_COUNT') {
    importCount = 0;
    chrome.action.setBadgeText({ text: '' });
    chrome.storage.local.set({ importCount: 0 });
  }

  return true;
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({ apiUrl: '', environmentId: '', environmentName: '' });
  }
});
