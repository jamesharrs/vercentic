'use strict';
/* Surgical patch to the live basic-demo career portal — preserves the user's
 * manual hero(full-width)+nav(overlay) edits. Only touches:
 *   - rich_text row padding  lg -> sm   (kills the big whitespace band)
 *   - form row               add style.maxWidth 620px (centered apply column)
 * Run:  node scripts/patch-basic-career-spacing.js   (server must be SIGKILLed after)
 */
const db = require('../server/db/init');
const SLUG = 'basic-demo';
const PORTAL_ID = 'a2b58e37-c08f-4e18-9181-f5c65885d80b';

const store = db.loadTenantStore(SLUG);
const portal = (store.portals || []).find(p => p.id === PORTAL_ID);
if (!portal) { console.error('portal not found'); process.exit(1); }

const rows = portal.pages?.[0]?.rows || [];
let changed = 0;
for (const r of rows) {
  const wt = r.cells?.[0]?.widgetType;
  if (wt === 'rich_text' && r.padding !== 'sm') { r.padding = 'sm'; changed++; console.log('rich_text row -> pad sm'); }
  if (wt === 'form') { r.style = { ...(r.style || {}), maxWidth: '620px' }; changed++; console.log('form row -> maxWidth 620px'); }
}
portal.updated_at = new Date().toISOString();
db.saveStoreNow(SLUG);
console.log(`done, ${changed} change(s), saved ${SLUG}`);
process.exit(0);
