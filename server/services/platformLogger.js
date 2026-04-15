// server/services/platformLogger.js
// Lightweight platform event logger for Super Admin monitoring.
// Writes to platform_logs in the master store (not tenant stores).
// Keeps the last 5,000 entries with automatic rotation.

const { storeCache, saveStore: _saveStore } = require('../db/init');
const crypto = require('crypto');

const MAX_ENTRIES = 5000;
const CATEGORIES  = ['digest', 'scheduler', 'auth', 'provision', 'email', 'sms', 'system', 'error', 'sse'];

function getMasterStore() {
  return storeCache['master'];
}

function savemaster() {
  try { _saveStore('master'); } catch (_) {}
}

/**
 * Log a platform event.
 * @param {string} category  — one of CATEGORIES
 * @param {string} event     — short machine-readable name e.g. 'digest_sent'
 * @param {string} message   — human-readable description
 * @param {object} [meta]    — any extra key/value data
 * @param {'info'|'warn'|'error'} [level]
 */
function platformLog(category, event, message, meta = {}, level = 'info') {
  try {
    const store = getMasterStore();
    if (!store) return;
    if (!store.platform_logs) store.platform_logs = [];

    store.platform_logs.push({
      id:         crypto.randomUUID(),
      ts:         new Date().toISOString(),
      category,
      event,
      message,
      level,
      meta,
    });

    // Rotate — keep last MAX_ENTRIES
    if (store.platform_logs.length > MAX_ENTRIES) {
      store.platform_logs = store.platform_logs.slice(-MAX_ENTRIES);
    }

    savemaster();
  } catch (e) {
    // Never throw — logging must not crash the caller
    console.error('[platformLogger] failed:', e.message);
  }
}

module.exports = { platformLog, CATEGORIES };
