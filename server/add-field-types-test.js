/**
 * add-field-types-test.js
 * Adds one of every field type to the People object for testing.
 * Run: node add-field-types-test.js
 */
const { getStore, saveStore } = require('./db/init');
const { v4: uuidv4 } = require('uuid');

const store = getStore();

const env       = store.environments.find(e => e.is_default || e.name === 'Production');
const peopleObj = store.objects.find(o => o.slug === 'people' && o.environment_id === env.id);

if (!env || !peopleObj) { console.error('Could not find env or people object'); process.exit(1); }

const existingFields = store.fields.filter(f => f.object_id === peopleObj.id);
const existingNames  = new Set(existingFields.map(f => f.name));
let order = existingFields.length + 1;

const now = new Date().toISOString();
const base = { object_id: peopleObj.id, environment_id: env.id, is_system: false,
               is_required: false, show_in_list: false, show_in_detail: true,
               created_at: now, updated_at: now };

const TEST_FIELDS = [
  { name: '🧪 Text Field',        api_key: 'test_text',        field_type: 'text',        placeholder: 'Enter any text' },
  { name: '🧪 Textarea',          api_key: 'test_textarea',    field_type: 'textarea',    placeholder: 'Enter longer text…' },
  { name: '🧪 Rich Text',         api_key: 'test_rich_text',   field_type: 'rich_text',   placeholder: 'Supports **bold** and *italic*' },
  { name: '🧪 Number',            api_key: 'test_number',      field_type: 'number',      placeholder: '0' },
  { name: '🧪 Currency',          api_key: 'test_currency',    field_type: 'currency',    placeholder: '0.00' },
  { name: '🧪 Percent',           api_key: 'test_percent',     field_type: 'percent',     placeholder: '0' },
  { name: '🧪 Date',              api_key: 'test_date',        field_type: 'date' },
  { name: '🧪 DateTime',          api_key: 'test_datetime',    field_type: 'datetime' },
  { name: '🧪 Date Range',        api_key: 'test_date_range',  field_type: 'date_range',
    date_range_start_label: 'From', date_range_end_label: 'To' },
  { name: '🧪 Select',            api_key: 'test_select',      field_type: 'select',
    options: ['Option A', 'Option B', 'Option C'] },
  { name: '🧪 Multi Select',      api_key: 'test_multi_select',field_type: 'multi_select',
    options: ['Tag 1', 'Tag 2', 'Tag 3', 'Tag 4'] },
  { name: '🧪 Status',            api_key: 'test_status',      field_type: 'status',
    options: ['To Do', 'In Progress', 'Done', 'Blocked'] },
  { name: '🧪 Boolean',           api_key: 'test_boolean',     field_type: 'boolean' },
  { name: '🧪 Rating',            api_key: 'test_rating',      field_type: 'rating' },
  { name: '🧪 Progress',          api_key: 'test_progress',    field_type: 'progress' },
  { name: '🧪 Email',             api_key: 'test_email',       field_type: 'email',       placeholder: 'test@example.com' },
  { name: '🧪 URL',               api_key: 'test_url',         field_type: 'url',         placeholder: 'https://…' },
  { name: '🧪 Phone',             api_key: 'test_phone',       field_type: 'phone',       placeholder: '+971 50 123 4567' },
  { name: '🧪 Phone Intl',        api_key: 'test_phone_intl',  field_type: 'phone_intl' },
  { name: '🧪 Country',           api_key: 'test_country',     field_type: 'country' },
  { name: '🧪 Address',           api_key: 'test_address',     field_type: 'address',
    address_fields: ['street', 'city', 'state', 'country', 'postal_code'] },
  { name: '🧪 Social',            api_key: 'test_social',      field_type: 'social',      social_platform: 'linkedin' },
  { name: '🧪 Duration',          api_key: 'test_duration',    field_type: 'duration',    duration_unit: 'days' },
  { name: '🧪 People Lookup',     api_key: 'test_people',      field_type: 'people',
    related_object_slug: 'people', people_multi: true },
  { name: '🧪 Auto Number',       api_key: 'test_auto_number', field_type: 'auto_number' },
];

let added = 0, skipped = 0;

for (const def of TEST_FIELDS) {
  if (existingNames.has(def.name)) { console.log(`  SKIP (exists): ${def.name}`); skipped++; continue; }
  const field = { ...base, id: uuidv4(), field_order: order++, ...def };
  store.fields.push(field);
  console.log(`  ADD  ${def.field_type.padEnd(18)} → ${def.name}`);
  added++;
}

saveStore();
console.log(`\n✅ Done — added ${added} fields, skipped ${skipped} (already exist)`);
console.log(`   People object now has ${store.fields.filter(f=>f.object_id===peopleObj.id).length} total fields`);
