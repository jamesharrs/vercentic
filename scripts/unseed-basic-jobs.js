'use strict';
/* Remove the sample Job records seeded into basic-demo so the career site only
 * shows real jobs created in the app. Run then SIGKILL-restart the server.
 */
const db = require('../server/db/init');
const SLUG = 'basic-demo';
const JOB_OBJECT_ID = '300e25a0-a81c-4939-b2b9-3619f505ad29';

const store = db.loadTenantStore(SLUG);
const before = (store.records || []).length;
store.records = (store.records || []).filter(r => r.object_id !== JOB_OBJECT_ID);
const removed = before - store.records.length;
db.saveStoreNow(SLUG);
console.log(`removed ${removed} job record(s); ${store.records.length} record(s) remain`);
process.exit(0);
