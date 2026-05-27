// server/lib/pii.js
// Central PII field definitions used by the record_shares privacy engine.
// Auto-stripped from records when share is anonymised. Extendable per-environment later.

const DEFAULT_PII_FIELDS = [
  'first_name', 'last_name', 'full_name', 'name',
  'email', 'personal_email', 'work_email',
  'phone', 'mobile', 'phone_number', 'home_phone',
  'address', 'street_address', 'home_address',
  'date_of_birth', 'dob', 'birth_date',
  'photo', 'avatar', 'profile_picture', 'profile_photo',
  'linkedin', 'linkedin_url', 'twitter', 'github',
  'national_id', 'passport_number', 'ssn', 'nin',
  'nationality', 'gender', 'marital_status',
  'emergency_contact', 'next_of_kin',
];

/**
 * Apply privacy rules to a record's data before exposing it.
 * @param {object} recordData - raw record.data object
 * @param {object} options - { privacy_mode, visible_fields, pii_fields }
 * @returns {object} sanitised data
 */
function applyPrivacy(recordData, options = {}) {
  if (!recordData) return {};
  const { privacy_mode = 'full', visible_fields = [], pii_fields = DEFAULT_PII_FIELDS } = options;

  if (privacy_mode === 'full') {
    return { ...recordData };
  }

  if (privacy_mode === 'custom_allowlist') {
    // Only include fields explicitly on the allowlist
    const out = {};
    for (const key of visible_fields) {
      if (recordData[key] !== undefined) out[key] = recordData[key];
    }
    return out;
  }

  // anonymised — strip PII fields
  const out = { ...recordData };
  for (const key of pii_fields) {
    delete out[key];
  }
  // Add an anonymous display label so the UI can still show *something*
  out._anonymous_label = generateAnonymousLabel(recordData);
  return out;
}

/**
 * Generate a stable anonymous identifier so the same candidate
 * shows the same label across views (e.g. "Candidate A37").
 */
function generateAnonymousLabel(recordData) {
  const seed = (recordData.id || recordData.email || JSON.stringify(recordData)).toString();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const num = Math.abs(hash) % 1000;
  return `Candidate ${String.fromCharCode(65 + (num % 26))}${num}`;
}

module.exports = { DEFAULT_PII_FIELDS, applyPrivacy, generateAnonymousLabel };
