'use strict';
/* Merge the live basic-demo EVP (rich_text) + standalone image rows into a
 * single paired two-column band (image left, text right) to match the mockup.
 * Preserves hero(full-width) + nav(overlay). Run then SIGKILL-restart server.
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../server/db/init');
const SLUG = 'basic-demo';
const PORTAL_ID = 'a2b58e37-c08f-4e18-9181-f5c65885d80b';

const store = db.loadTenantStore(SLUG);
const portal = (store.portals || []).find(p => p.id === PORTAL_ID);
const rows = portal.pages[0].rows;

const rtIdx  = rows.findIndex(r => r.cells?.[0]?.widgetType === 'rich_text');
const imgIdx = rows.findIndex(r => r.cells?.[0]?.widgetType === 'image');
if (rtIdx < 0 || imgIdx < 0) { console.error('rows not found', { rtIdx, imgIdx }); process.exit(1); }

const rtCfg  = rows[rtIdx].cells[0].widgetConfig || {};
const imgCfg = rows[imgIdx].cells[0].widgetConfig || {};

const merged = {
  id: uuidv4(), preset: '2', bgColor: '', padding: 'lg',
  cells: [
    { id: uuidv4(), widgetType: 'image', widgetConfig: {
      url: imgCfg.url, alt: imgCfg.alt || 'Our team at work',
      rounded: true, fit: 'cover', maxHeight: 340,
    }},
    { id: uuidv4(), widgetType: 'rich_text', widgetConfig: {
      label: rtCfg.label || 'Why join us', align: 'left', content: rtCfg.content,
    }},
  ],
};

// Remove both old rows, insert merged where the rich_text row was
const keep = rows.filter((_, i) => i !== rtIdx && i !== imgIdx);
const insertAt = Math.min(rtIdx, imgIdx);
keep.splice(insertAt, 0, merged);
portal.pages[0].rows = keep;
portal.updated_at = new Date().toISOString();

db.saveStoreNow(SLUG);
console.log('done — merged EVP+image into two-column band. Rows now:',
  keep.map(r => r.cells.map(c => c.widgetType).join('+')).join(' | '));
process.exit(0);
