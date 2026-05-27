'use strict';
/**
 * server/data/templates.js
 *
 * Single source of truth for all Vercentic environment templates.
 * Used by:
 *   - superadmin_clients.js  (new tenant provisioning)
 *   - init.js migrations     (boot-time upserts for existing environments)
 *   - scripts/provision-master-envs.js (one-time master env creation)
 *
 * Adding a new template: add an entry to TEMPLATES and export it.
 * Adding a field to an existing template: add it to the SCHEMA array
 * in the relevant template and bump TEMPLATE_VERSION.
 */

// ── Version ───────────────────────────────────────────────────────────────────
// Increment when any field definition changes so migrations can detect drift.
const TEMPLATE_VERSION = 1;

// ── Shared field-level helpers ────────────────────────────────────────────────
const F = (sort, api_key, name, field_type, opts = null, extra = {}) => ({
  sort_order: sort, api_key, name, field_type,
  options: opts,
  is_required:   extra.required   || false,
  show_in_list:  extra.list       || false,
  show_in_form:  field_type === 'section_separator' ? false : true,
  is_system:     extra.system     !== false,
  condition_field: extra.cf       || null,
  condition_value: extra.cv       || null,
  placeholder:   extra.placeholder || null,
  help_text:     extra.help       || null,
});

const SEP = (sort, api_key, name) => F(sort, api_key, name, 'section_separator');

// ─────────────────────────────────────────────────────────────────────────────
// PEOPLE SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * STARTER People schema — simplified, focused on recruitment essentials.
 * Skills use the `skills` field type (tag-based, not dropdown).
 */
const PEOPLE_STARTER = [
  SEP(1,  'section_identity',    'Identity'),
  F(3,  'first_name',       'First Name',          'text',        null, { required: false, list: true }),
  F(4,  'last_name',        'Last Name',           'text',        null, { required: false, list: true }),
  F(5,  'email',            'Email',               'email',       null, { list: true }),
  F(6,  'phone',            'Phone',               'phone'),
  F(7,  'current_title',    'Current Title',       'text',        null, { list: true }),
  F(8,  'location',         'Location',            'text',        null, { list: true }),
  F(9,  'linkedin_url',     'LinkedIn URL',        'url'),
  F(10, 'person_type',      'Person Type',         'select',
    ['Candidate','Employee','Contractor','Consultant','Contact'], { list: true }),

  SEP(20, 'section_professional', 'Professional'),
  F(21, 'skills',           'Skills',              'skills'),
  F(22, 'languages',        'Languages',           'multi_select',
    ['English','Arabic','French','German','Spanish','Mandarin','Portuguese','Hindi','Japanese','Other']),
  F(23, 'years_experience', 'Years Experience',    'number'),

  SEP(30, 'section_recruitment', 'Recruitment'),
  F(31, 'status',           'Status',              'select',
    ['New','Screening','Interviewing','Offer','Placed','Rejected','On Hold','Withdrawn'], { list: true }),
  F(32, 'source',           'Source',              'select',
    ['LinkedIn','Referral','Agency','Job Board','Direct','Portal','Event','Other'], { list: true }),
  F(33, 'rating',           'Rating',              'rating',      null, { list: true }),
  F(34, 'notice_period',    'Notice Period',       'select',
    ['Immediate','2 weeks','1 month','2 months','3 months','Negotiable']),
  F(35, 'salary_expectation','Salary Expectation', 'currency'),
  F(36, 'work_authorisation','Work Authorisation', 'select',
    ['Citizen','Permanent Resident','Work Visa','Requires Sponsorship']),

  // Employee-conditional fields
  SEP(40, 'section_employment', 'Employment'),
  F(41, 'job_title',        'Job Title',           'text',        null, { cf: 'person_type', cv: 'Employee' }),
  F(42, 'department',       'Department',          'select',
    ['Engineering','Product','Sales','Marketing','Finance','HR','Operations','Legal','Other'],
    { cf: 'person_type', cv: 'Employee' }),
  F(43, 'entity',           'Entity / Company',    'text',        null, { cf: 'person_type', cv: 'Employee' }),
  F(44, 'employment_type',  'Employment Type',     'select',
    ['Full-time','Part-time','Contract','Casual'],  { cf: 'person_type', cv: 'Employee' }),
  F(45, 'start_date',       'Start Date',          'date',        null, { cf: 'person_type', cv: 'Employee' }),
  F(46, 'end_date',         'End Date',            'date',        null, { cf: 'person_type', cv: 'Employee' }),
];

/**
 * STANDARD People schema — full schema from init.js migrateStandardCandidateFields.
 * Includes work history table, education table, DEI section, GDPR fields.
 * Skills use the `skills` field type.
 */
const PEOPLE_STANDARD = [
  SEP(1,  'section_identity',    'Identity'),
  F(3,  'first_name',         'First Name',           'text',        null, { required: false, list: true }),
  F(4,  'last_name',          'Last Name',            'text',        null, { required: false, list: true }),
  F(5,  'current_title',      'Current Title',        'text',        null, { list: true }),
  F(6,  'current_company',    'Current Company',      'text'),
  F(7,  'summary',            'Summary / Bio',        'textarea'),

  SEP(10, 'section_contact',     'Contact'),
  F(11, 'email',              'Email',                'email',       null, { list: true }),
  F(12, 'phone',              'Phone',                'phone'),
  F(13, 'person_type',        'Person Type',          'select',
    ['Candidate','Employee','Contractor','Consultant','Contact'], { list: true }),
  F(14, 'location',           'Location',             'text',        null, { list: true }),
  F(15, 'country',            'Country',              'country'),

  SEP(20, 'section_professional','Professional'),
  F(21, 'work_history',       'Work History',         'table'),
  F(22, 'education',          'Education',            'table'),
  F(23, 'years_experience',   'Years Experience',     'number'),
  F(24, 'skills',             'Skills',               'skills'),
  F(25, 'languages',          'Languages',            'multi_select',
    ['English','Arabic','French','German','Spanish','Mandarin','Portuguese','Hindi','Japanese','Other']),
  F(26, 'linkedin_url',       'LinkedIn URL',         'url'),

  SEP(30, 'section_availability','Availability'),
  F(31, 'notice_period',      'Notice Period',        'select',
    ['Immediate','2 weeks','1 month','2 months','3 months','Negotiable']),
  F(32, 'availability_date',  'Available From',       'date'),
  F(33, 'salary_expectation', 'Salary Expectation',   'currency'),
  F(34, 'work_type_preference','Work Type Preference','multi_select',
    ['On-site','Hybrid','Remote']),
  F(35, 'work_authorisation', 'Work Authorisation',   'select',
    ['Citizen','Permanent Resident','Work Visa','Requires Sponsorship']),

  SEP(40, 'section_employment', 'Employment'),
  F(41, 'job_title',          'Job Title',            'text',        null, { cf: 'person_type', cv: 'Employee' }),
  F(42, 'department',         'Department',           'select',
    ['Engineering','Product','Sales','Marketing','Finance','HR','Operations','Legal','Customer Success','Other'],
    { cf: 'person_type', cv: 'Employee' }),
  F(43, 'entity',             'Entity / Company',     'text',        null, { cf: 'person_type', cv: 'Employee' }),
  F(44, 'employment_type',    'Employment Type',       'select',
    ['Full-time','Part-time','Contract','Casual'],     { cf: 'person_type', cv: 'Employee' }),
  F(45, 'start_date',         'Start Date',           'date',        null, { cf: 'person_type', cv: 'Employee' }),
  F(46, 'end_date',           'End Date',             'date',        null, { cf: 'person_type', cv: 'Employee' }),

  SEP(50, 'section_recruitment','Recruitment'),
  F(51, 'status',             'Status',               'select',
    ['Active','Passive','Placed','On Hold','Blacklisted','Archived'], { list: true }),
  F(52, 'source',             'Source',               'select',
    ['LinkedIn','Referral','Agency','Job Board','Direct','Portal','Event','Other'], { list: true }),
  F(53, 'source_detail',      'Source Detail',        'text'),
  F(54, 'rating',             'Rating',               'rating',      null, { list: true }),
  F(55, 'do_not_contact',     'Do Not Contact',       'boolean'),
  F(56, 'gdpr_consent',       'GDPR Consent',         'boolean'),
  F(57, 'gdpr_consent_date',  'GDPR Consent Date',    'date'),

  SEP(60, 'section_dei',        'Diversity & Inclusion'),
  F(61, 'gender',             'Gender',               'select',
    ['Male','Female','Non-binary','Prefer not to say']),
  F(62, 'date_of_birth',      'Date of Birth',        'date'),
  F(63, 'nationality',        'Nationality',          'country'),
  F(70, 'cover_letter',       'Cover Letter',         'rich_text'),
];

// ─────────────────────────────────────────────────────────────────────────────
// JOBS SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * STARTER Jobs schema — essentials only.
 * Skills use the `skills` field type.
 */
const JOBS_STARTER = [
  SEP(1,  'section_overview',    'Overview'),
  F(2,  'job_title',          'Job Title',            'text',        null, { required: false, list: true }),
  F(3,  'department',         'Department',           'select',
    ['Engineering','Product','Design','Sales','Marketing','Finance','Operations','HR','Legal','Other'],
    { list: true }),
  F(4,  'location',           'Location',             'text',        null, { list: true }),
  F(5,  'work_type',          'Work Type',            'select',
    ['On-site','Hybrid','Remote'],                    { list: true }),
  F(6,  'employment_type',    'Employment Type',      'select',
    ['Full-time','Part-time','Contract','Internship'], { list: true }),
  F(7,  'status',             'Status',               'select',
    ['Draft','Open','On Hold','Filled','Cancelled'],   { list: true }),
  F(8,  'headcount',          'Headcount',            'number'),
  F(9,  'hiring_manager',     'Hiring Manager',       'people',      null, { list: true }),
  F(10, 'recruiter',          'Recruiter',            'people',      null, { list: true }),

  SEP(20, 'section_compensation','Compensation'),
  F(21, 'salary_min',         'Salary Min',           'currency'),
  F(22, 'salary_max',         'Salary Max',           'currency'),
  F(23, 'salary_currency',    'Currency',             'select',
    ['AED','USD','GBP','EUR','SAR','QAR','KWD','INR']),

  SEP(30, 'section_requirements','Requirements'),
  F(31, 'required_skills',    'Required Skills',      'skills'),
  F(32, 'experience_min_years','Min. Experience (yrs)','number'),
  F(33, 'education_level',    'Education Level',      'select',
    ['Any','High School','Degree','Masters','PhD','Professional Certification']),

  SEP(40, 'section_posting',    'Posting'),
  F(41, 'description',        'Job Description',      'rich_text'),
  F(42, 'career_site_visible','Career Site Visible',  'boolean'),
  F(43, 'application_deadline','Application Deadline','date'),
];

/**
 * STANDARD Jobs schema — full schema from init.js migrateStandardJobFields.
 */
const JOBS_STANDARD = [
  SEP(1,  'section_overview',    'Overview'),
  F(2,  'job_title',          'Job Title',            'text',        null, { required: false, list: true }),
  F(3,  'department',         'Department',           'select',
    ['Engineering','Product','Sales','Marketing','Finance','HR','Operations','Legal','Customer Success','Design','Data','Other'],
    { list: true }),
  F(4,  'sub_department',     'Sub-department',       'text'),
  F(5,  'location',           'Location',             'text',        null, { list: true }),
  F(6,  'work_type',          'Work Type',            'select',
    ['On-site','Hybrid','Remote'],                    { list: true }),
  F(7,  'employment_type',    'Employment Type',      'select',
    ['Full-time','Part-time','Contract','Freelance','Internship','Temporary'], { list: true }),
  F(8,  'status',             'Status',               'select',
    ['Draft','Open','On Hold','Filled','Cancelled'],   { list: true }),
  F(9,  'priority',           'Priority',             'select',
    ['Critical','High','Medium','Low']),
  F(10, 'job_code',           'Job Code / Req No.',   'text'),
  F(11, 'headcount',          'Headcount',            'number'),
  F(12, 'reason_for_hire',    'Reason for Hire',      'select',
    ['New Role','Backfill','Replacement','Expansion']),

  SEP(20, 'section_compensation','Compensation'),
  F(21, 'salary_min',         'Salary Min',           'currency'),
  F(22, 'salary_max',         'Salary Max',           'currency'),
  F(23, 'salary_currency',    'Currency',             'select',
    ['AED','USD','GBP','EUR','SAR','QAR','KWD','INR']),
  F(24, 'pay_frequency',      'Pay Frequency',        'select',
    ['Annual','Monthly','Hourly','Daily']),
  F(25, 'bonus_percent',      'Bonus (%)',            'number'),
  F(26, 'equity',             'Equity / Stock',       'boolean'),
  F(27, 'visa_sponsorship',   'Visa Sponsorship',     'boolean'),
  F(28, 'benefits',           'Benefits',             'multi_select',
    ['Health Insurance','Pension','Car Allowance','Housing Allowance','Annual Flights',
     'Gym','Remote Stipend','Childcare','Learning Budget']),

  SEP(30, 'section_requirements','Requirements'),
  F(31, 'experience_min_years','Min. Experience (yrs)','number'),
  F(32, 'education_level',    'Education Level',      'select',
    ['Any','High School','Degree','Masters','PhD','Professional Certification']),
  F(33, 'required_skills',    'Required Skills',      'skills'),
  F(34, 'nice_to_have_skills','Nice-to-have Skills',  'multi_select', []),
  F(35, 'languages_required', 'Languages Required',   'multi_select',
    ['English','Arabic','French','German','Spanish','Mandarin','Portuguese','Hindi','Japanese']),
  F(36, 'certifications',     'Certifications',       'text'),

  SEP(40, 'section_team',       'Team'),
  F(41, 'hiring_manager',     'Hiring Manager',       'people',      null, { list: true }),
  F(42, 'recruiter',          'Recruiter',            'people',      null, { list: true }),
  F(43, 'coordinator',        'Coordinator',          'people'),
  F(44, 'interviewers',       'Interviewers',         'multi_lookup'),
  F(45, 'sourcing_partner',   'Sourcing Partner',     'people'),

  SEP(50, 'section_posting',    'Posting'),
  F(51, 'posting_status',     'Posting Status',       'select',
    ['Not Posted','Draft','Live','Paused','Closed']),
  F(52, 'career_site_visible','Career Site Visible',  'boolean'),
  F(53, 'internal_only',      'Internal Only',        'boolean'),
  F(54, 'job_boards',         'Job Boards',           'multi_select',
    ['LinkedIn','Indeed','Glassdoor','Bayt','Naukri','Monster','Reed','Total Jobs',
     'Company Website','Referral','Other']),
  F(55, 'posted_date',        'Posted Date',          'date'),
  F(56, 'application_deadline','Application Deadline','date'),
  F(57, 'external_job_url',   'External Job URL',     'url'),
  F(58, 'referral_bonus',     'Referral Bonus',       'currency'),
  F(59, 'description',        'Job Description',      'rich_text'),

  SEP(60, 'section_process',    'Process & Timeline'),
  F(61, 'open_date',          'Open Date',            'date'),
  F(62, 'target_close_date',  'Target Close Date',    'date'),
  F(63, 'actual_close_date',  'Actual Close Date',    'date'),
  F(64, 'target_start_date',  'Target Start Date',    'date'),
  F(65, 'time_to_fill_target','Time-to-Fill Target (days)','number'),

  SEP(70, 'section_approval',   'Approval'),
  F(71, 'approval_status',    'Approval Status',      'select',
    ['Not Required','Pending','Approved','Rejected']),
  F(72, 'approved_by',        'Approved By',          'people'),
  F(73, 'approval_date',      'Approval Date',        'date'),
  F(74, 'cost_centre',        'Cost Centre',          'text'),
  F(75, 'budget_code',        'Budget Code',          'text'),
];

// ─────────────────────────────────────────────────────────────────────────────
// TALENT POOL SCHEMA (same for Starter and Standard)
// ─────────────────────────────────────────────────────────────────────────────
const TALENT_POOL_FIELDS = [
  F(1, 'pool_name',  'Pool Name',   'text',   null, { required: false, list: true }),
  F(2, 'category',   'Category',    'select',
    ['Talent Community','Alumni','Silver Medalists','Internal Mobility',
     'Graduates','Diversity','Referrals','Other'],   { list: true }),
  F(3, 'status',     'Status',      'select',
    ['Active','Inactive','Archived'],                { list: true }),
  F(4, 'description','Description', 'textarea'),
];

// ─────────────────────────────────────────────────────────────────────────────
// STANDARD CONFIG — seeded for every environment regardless of template
// ─────────────────────────────────────────────────────────────────────────────

/**
 * buildStandardConfig(envId, objectMap, now)
 *
 * Returns workflows, interview types, forms, file types, email templates
 * and portals that every environment gets on provisioning.
 *
 * @param {string}  tier      'starter' | 'standard' — controls which config set is returned
 * @param {string}  envId     UUID of the environment
 * @param {object}  objectMap { slug: objectId } — resolved after objects are created
 * @param {string}  now       ISO timestamp
 * @param {function} uid      UUID generator injected by caller
 */
function buildStandardConfig(tier, envId, objectMap, now, uid) {
  const jobsObjId = objectMap['jobs'];

  // ── WORKFLOWS ──────────────────────────────────────────────────────────────
  const workflows = [];
  if (jobsObjId) {
    workflows.push({
      id: uid(), environment_id: envId,
      name: 'Application Pipeline',
      description: 'Standard candidate journey through the hiring process',
      object_id: jobsObjId, workflow_type: 'linked_person', is_active: true,
      sharing: { visibility: 'all' },
      steps: [
        { id: uid(), name: 'Applied',         sort_order: 0, automation_type: null, automation_config: {} },
        { id: uid(), name: 'CV Review',        sort_order: 1, automation_type: null, automation_config: {} },
        { id: uid(), name: 'Phone Screen',     sort_order: 2, automation_type: null, automation_config: {} },
        { id: uid(), name: 'First Interview',  sort_order: 3, automation_type: null, automation_config: {} },
        ...(tier === 'standard' ? [
          { id: uid(), name: 'Second Interview', sort_order: 4, automation_type: null, automation_config: {} },
          { id: uid(), name: 'Final Interview',  sort_order: 5, automation_type: null, automation_config: {} },
        ] : []),
        { id: uid(), name: 'Offer',            sort_order: tier === 'standard' ? 6 : 4, automation_type: null, automation_config: {} },
        { id: uid(), name: 'Hired',            sort_order: tier === 'standard' ? 7 : 5, automation_type: null, automation_config: {} },
        { id: uid(), name: 'Rejected',         sort_order: tier === 'standard' ? 8 : 6, automation_type: null, automation_config: {} },
        { id: uid(), name: 'Withdrawn',        sort_order: tier === 'standard' ? 9 : 7, automation_type: null, automation_config: {} },
      ],
      created_at: now, updated_at: now, deleted_at: null,
    });

    if (tier === 'standard') {
      workflows.push({
        id: uid(), environment_id: envId,
        name: 'Job Status',
        description: 'Tracks the status of a job requisition from creation to close',
        object_id: jobsObjId, workflow_type: 'record_pipeline', is_active: true,
        sharing: { visibility: 'all' },
        steps: [
          { id: uid(), name: 'Draft',            sort_order: 0, automation_type: null, automation_config: {} },
          { id: uid(), name: 'Pending Approval', sort_order: 1, automation_type: null, automation_config: {} },
          { id: uid(), name: 'Open',             sort_order: 2, automation_type: null, automation_config: {} },
          { id: uid(), name: 'On Hold',          sort_order: 3, automation_type: null, automation_config: {} },
          { id: uid(), name: 'Filled',           sort_order: 4, automation_type: null, automation_config: {} },
          { id: uid(), name: 'Cancelled',        sort_order: 5, automation_type: null, automation_config: {} },
        ],
        created_at: now, updated_at: now, deleted_at: null,
      });
    }
  }

  // ── INTERVIEW TYPES ────────────────────────────────────────────────────────
  const interviewTypes = [
    { id: uid(), environment_id: envId, name: 'Phone Screen',
      type: 'phone',     duration_minutes: 30, format: 'phone',
      description: 'Initial screening call to assess basic fit and interest',
      color: '#4361EE', icon_name: 'phone',
      buffer_before: 5, buffer_after: 10, interviewers: [], availability: {},
      created_at: now, updated_at: now, deleted_at: null },
    { id: uid(), environment_id: envId, name: 'Video Interview',
      type: 'video',     duration_minutes: 45, format: 'video',
      description: 'Structured video interview to explore experience and motivations',
      color: '#7048E8', icon_name: 'video',
      buffer_before: 5, buffer_after: 15, interviewers: [], availability: {},
      created_at: now, updated_at: now, deleted_at: null },
    ...(tier === 'standard' ? [
      { id: uid(), environment_id: envId, name: 'Technical Interview',
        type: 'technical', duration_minutes: 60, format: 'video',
        description: 'In-depth technical assessment of skills and problem-solving',
        color: '#0891B2', icon_name: 'code',
        buffer_before: 10, buffer_after: 15, interviewers: [], availability: {},
        created_at: now, updated_at: now, deleted_at: null },
      { id: uid(), environment_id: envId, name: 'Panel Interview',
        type: 'panel', duration_minutes: 60, format: 'onsite',
        description: 'Interview with multiple stakeholders from the hiring team',
        color: '#F59E0B', icon_name: 'users',
        buffer_before: 10, buffer_after: 20, interviewers: [], availability: {},
        created_at: now, updated_at: now, deleted_at: null },
      { id: uid(), environment_id: envId, name: 'Final Interview',
        type: 'final', duration_minutes: 45, format: 'onsite',
        description: 'Final stage interview with senior leadership',
        color: '#0CAF77', icon_name: 'star',
        buffer_before: 10, buffer_after: 20, interviewers: [], availability: {},
        created_at: now, updated_at: now, deleted_at: null },
    ] : []),
  ];

  // ── FORMS ──────────────────────────────────────────────────────────────────
  const forms = [
    {
      id: uid(), environment_id: envId,
      name: 'Phone Screen', category: 'Interview', applies_to: ['people'],
      description: 'Quick screening form to capture key information from initial candidate call',
      sharing: { visibility: 'all' },
      fields: [
        { id: uid(), label: 'Overall Impression',      field_type: 'select',   required: true,  sort_order: 0, options: ['Strong Yes','Yes','Maybe','No','Strong No'] },
        { id: uid(), label: 'Availability to Start',   field_type: 'select',   required: false, sort_order: 1, options: ['Immediately','2 Weeks','1 Month','2 Months','3+ Months','Unknown'] },
        { id: uid(), label: 'Salary Expectation',      field_type: 'text',     required: false, sort_order: 2, placeholder: 'e.g. 80,000 AED' },
        { id: uid(), label: 'Notice Period',           field_type: 'select',   required: false, sort_order: 3, options: ['Immediately','1 Week','2 Weeks','1 Month','2 Months','3 Months','3+ Months'] },
        { id: uid(), label: 'Right to Work Confirmed', field_type: 'select',   required: false, sort_order: 4, options: ['Yes','No','Requires Sponsorship','Not Discussed'] },
        { id: uid(), label: 'Motivation for Move',     field_type: 'textarea', required: false, sort_order: 5 },
        { id: uid(), label: 'Key Strengths Noted',     field_type: 'textarea', required: false, sort_order: 6 },
        { id: uid(), label: 'Concerns or Gaps',        field_type: 'textarea', required: false, sort_order: 7 },
        { id: uid(), label: 'Proceed to Next Stage',   field_type: 'select',   required: true,  sort_order: 8, options: ['Yes — advance','Yes — with conditions','No — not suitable','Hold'] },
        { id: uid(), label: 'Recruiter Notes',         field_type: 'textarea', required: false, sort_order: 9 },
      ],
      created_at: now, updated_at: now, deleted_at: null,
    },
    {
      id: uid(), environment_id: envId,
      name: 'Interview Scorecard', category: 'Interview', applies_to: ['people'],
      description: 'Structured feedback form for interviewers to complete after each interview',
      sharing: { visibility: 'all' },
      fields: [
        { id: uid(), label: 'Overall Recommendation',     field_type: 'select',   required: true,  sort_order: 0,  options: ['Strong Hire','Hire','No Decision','No Hire','Strong No Hire'] },
        { id: uid(), label: 'Overall Rating',             field_type: 'rating',   required: true,  sort_order: 1 },
        { id: uid(), label: 'Communication Skills',       field_type: 'select',   required: true,  sort_order: 2,  options: ['Exceptional','Strong','Adequate','Needs Improvement','Poor'] },
        { id: uid(), label: 'Technical / Role Knowledge', field_type: 'select',   required: true,  sort_order: 3,  options: ['Exceptional','Strong','Adequate','Needs Improvement','Poor'] },
        { id: uid(), label: 'Cultural Fit',               field_type: 'select',   required: true,  sort_order: 4,  options: ['Exceptional','Strong','Adequate','Needs Improvement','Poor'] },
        ...(tier === 'standard' ? [
          { id: uid(), label: 'Problem Solving',          field_type: 'select',   required: false, sort_order: 5,  options: ['Exceptional','Strong','Adequate','Needs Improvement','Poor'] },
          { id: uid(), label: 'Leadership / Seniority',   field_type: 'select',   required: false, sort_order: 6,  options: ['Exceptional','Strong','Adequate','Needs Improvement','Poor','N/A'] },
        ] : []),
        { id: uid(), label: 'Key Strengths',              field_type: 'textarea', required: true,  sort_order: 7 },
        { id: uid(), label: 'Areas of Concern',           field_type: 'textarea', required: false, sort_order: 8 },
        ...(tier === 'standard' ? [
          { id: uid(), label: 'Questions to Explore',     field_type: 'textarea', required: false, sort_order: 9 },
        ] : []),
        { id: uid(), label: 'Additional Notes',           field_type: 'textarea', required: false, sort_order: tier === 'standard' ? 10 : 9 },
      ],
      created_at: now, updated_at: now, deleted_at: null,
    },
    ...(tier === 'standard' ? [{
      id: uid(), environment_id: envId,
      name: 'Offer Acceptance', category: 'Offer', applies_to: ['people'],
      description: 'Candidate acknowledgement and acceptance of the job offer',
      sharing: { visibility: 'all' },
      fields: [
        { id: uid(), label: 'Decision',             field_type: 'select',   required: true,  sort_order: 0, options: ['Accept','Decline','Negotiating'] },
        { id: uid(), label: 'Confirmed Start Date', field_type: 'date',     required: false, sort_order: 1 },
        { id: uid(), label: 'Decline Reason',       field_type: 'select',   required: false, sort_order: 2, options: ['Accepted another offer','Salary not competitive','Role not right fit','Personal reasons','Counter offer accepted','Location / travel','Other'] },
        { id: uid(), label: 'Candidate Comments',   field_type: 'textarea', required: false, sort_order: 3 },
      ],
      created_at: now, updated_at: now, deleted_at: null,
    }] : []),
  ];

  // ── FILE TYPES ─────────────────────────────────────────────────────────────
  const fileTypes = [
    { id: uid(), environment_id: envId, name: 'CV / Resume',      slug: 'cv_resume',       color: '#4361EE', icon: 'file-text',     description: 'Candidate CV or resume', allowed_formats: ['pdf','doc','docx'],           max_size_mb: 10, applies_to: ['people'], parse_enabled: true,  extract_enabled: false, mappings: [], created_at: now, updated_at: now, deleted_at: null },
    { id: uid(), environment_id: envId, name: 'Cover Letter',     slug: 'cover_letter',    color: '#7048E8', icon: 'mail',          description: 'Candidate cover letter',  allowed_formats: ['pdf','doc','docx'],           max_size_mb: 5,  applies_to: ['people'], parse_enabled: false, extract_enabled: false, mappings: [], created_at: now, updated_at: now, deleted_at: null },
    { id: uid(), environment_id: envId, name: 'Right to Work',    slug: 'right_to_work',   color: '#0CAF77', icon: 'shield',        description: 'Right to work document',  allowed_formats: ['pdf','jpg','jpeg','png'],     max_size_mb: 10, applies_to: ['people'], parse_enabled: false, extract_enabled: true,  mappings: [{ extracted_key:'full_name', target_field:'first_name', hint:'Full legal name' },{ extracted_key:'nationality', target_field:'nationality', hint:'Nationality or issuing country' },{ extracted_key:'document_type', target_field:'rtw_type', hint:'Type of document' },{ extracted_key:'expiry_date', target_field:'rtw_expiry', hint:'Document expiry date' }], created_at: now, updated_at: now, deleted_at: null },
    { id: uid(), environment_id: envId, name: 'ID Document',      slug: 'id_document',     color: '#F59E0B', icon: 'credit-card',   description: 'Passport, ID or Emirates ID', allowed_formats: ['pdf','jpg','jpeg','png'], max_size_mb: 10, applies_to: ['people'], parse_enabled: false, extract_enabled: true,  mappings: [{ extracted_key:'full_name', target_field:'first_name', hint:'Full name on ID' },{ extracted_key:'nationality', target_field:'nationality', hint:'Nationality' },{ extracted_key:'date_of_birth', target_field:'date_of_birth', hint:'DOB DD/MM/YYYY' },{ extracted_key:'id_number', target_field:'id_number', hint:'Passport or ID number' },{ extracted_key:'expiry_date', target_field:'id_expiry', hint:'Expiry date' },{ extracted_key:'gender', target_field:'gender', hint:'Gender on document' }], created_at: now, updated_at: now, deleted_at: null },
    ...(tier === 'standard' ? [
      { id: uid(), environment_id: envId, name: 'Offer Letter',   slug: 'offer_letter',    color: '#EF4444', icon: 'file',          description: 'Signed or unsigned offer letter', allowed_formats: ['pdf','doc','docx'],   max_size_mb: 10, applies_to: ['people'], parse_enabled: false, extract_enabled: false, mappings: [], created_at: now, updated_at: now, deleted_at: null },
      { id: uid(), environment_id: envId, name: 'Contract',       slug: 'contract',        color: '#334155', icon: 'file',          description: 'Employment contract',     allowed_formats: ['pdf','doc','docx'],           max_size_mb: 20, applies_to: ['people'], parse_enabled: false, extract_enabled: false, mappings: [], created_at: now, updated_at: now, deleted_at: null },
      { id: uid(), environment_id: envId, name: 'Reference Letter',slug:'reference_letter', color: '#9DA8C7', icon: 'message-square',description: 'Professional reference', allowed_formats: ['pdf','doc','docx'],           max_size_mb: 5,  applies_to: ['people'], parse_enabled: false, extract_enabled: false, mappings: [], created_at: now, updated_at: now, deleted_at: null },
    ] : []),
  ];

  // ── EMAIL TEMPLATES ────────────────────────────────────────────────────────
  const emailTemplates = [
    { id: uid(), environment_id: envId, name: 'Application Received', category: 'Application',
      subject: 'We received your application — {{job_title}}',
      body: 'Dear {{first_name}},\n\nThank you for applying for the {{job_title}} position.\n\nWe\'ll be in touch if your experience matches what we\'re looking for.\n\nBest regards,\nThe Talent Team',
      created_at: now, updated_at: now, deleted_at: null },
    { id: uid(), environment_id: envId, name: 'Interview Invitation', category: 'Interview',
      subject: 'Interview Invitation — {{job_title}} at {{company_name}}',
      body: 'Dear {{first_name}},\n\nWe\'d love to invite you to an interview for the {{job_title}} role.\n\nDate & Time: {{interview_date}} at {{interview_time}}\nFormat: {{interview_format}}\nDuration: {{interview_duration}} minutes\nLocation / Link: {{interview_location}}\n\nPlease confirm your availability by replying to this email.\n\nBest regards,\nThe Talent Team',
      created_at: now, updated_at: now, deleted_at: null },
    { id: uid(), environment_id: envId, name: 'Unsuccessful Application', category: 'Application',
      subject: 'Your application for {{job_title}}',
      body: 'Dear {{first_name}},\n\nThank you for applying for the {{job_title}} position.\n\nAfter careful consideration, we have decided to move forward with other candidates at this time.\n\nWe appreciate your interest and encourage you to apply for future positions.\n\nBest regards,\nThe Talent Team',
      created_at: now, updated_at: now, deleted_at: null },
    ...(tier === 'standard' ? [
      { id: uid(), environment_id: envId, name: 'Interview Confirmation', category: 'Interview',
        subject: 'Interview Confirmed — {{job_title}}',
        body: 'Dear {{first_name}},\n\nThis confirms your upcoming interview.\n\nRole: {{job_title}}\nDate & Time: {{interview_date}} at {{interview_time}}\nFormat: {{interview_format}}\nDuration: {{interview_duration}} minutes\nLocation / Link: {{interview_location}}\nInterviewer(s): {{interviewer_names}}\n\nGood luck!\n\nBest regards,\nThe Talent Team',
        created_at: now, updated_at: now, deleted_at: null },
      { id: uid(), environment_id: envId, name: 'Offer Letter Template', category: 'Offer',
        subject: 'Job Offer — {{job_title}} at {{company_name}}',
        body: 'Dear {{first_name}},\n\nWe are delighted to offer you the position of {{job_title}}.\n\nRole: {{job_title}}\nStart Date: {{start_date}}\nSalary: {{salary}}\nLocation: {{location}}\n\nPlease sign and return the attached offer letter by {{offer_expiry_date}}.\n\nBest regards,\nThe Talent Team',
        created_at: now, updated_at: now, deleted_at: null },
    ] : []),
  ];

  // ── PORTALS ────────────────────────────────────────────────────────────────
  const careerToken = uid();
  const hmToken     = uid();
  const portals = [
    {
      id: uid(), environment_id: envId,
      name: 'Career Site', slug: 'careers', type: 'career_site', status: 'draft',
      company_name: 'Your Company', tagline: 'Find your next opportunity',
      description: 'Configure branding before publishing',
      primary_color: '#4361EE', secondary_color: '#3451BE', accent_color: '#0CAF77',
      background_color: '#F8F9FF', text_color: '#0D0D0F',
      font_family: "'DM Sans', sans-serif",
      logo_url: '', show_apply_button: true, require_auth: false,
      show_salary: true, allow_cv_upload: true,
      exposed_objects: ['jobs','talent-pools'], access_token: careerToken,
      pages: [
        { id: uid(), name: 'Home', slug: '/', rows: [
          { id: uid(), preset: '1', bgColor: '#4361EE', padding: 'xl', cells: [{ id: uid(), widgetType: 'hero', widgetConfig: { headline: 'Join our team', subheading: "Explore opportunities and find your next role.", ctaText: 'See Open Roles' } }] },
          { id: uid(), preset: '1', bgColor: '', padding: 'lg', cells: [{ id: uid(), widgetType: 'jobs', widgetConfig: {} }] },
        ]},
        { id: uid(), name: 'Apply', slug: '/apply', rows: [
          { id: uid(), preset: '1', bgColor: '', padding: 'lg', cells: [{ id: uid(), widgetType: 'form', widgetConfig: { title: 'Submit Your Application' } }] },
        ]},
      ],
      created_at: now, updated_at: now, deleted_at: null,
    },
    ...(tier === 'standard' ? [{
      id: uid(), environment_id: envId,
      name: 'Hiring Manager Portal', slug: 'hiring', type: 'hm_portal', status: 'draft',
      company_name: 'Talent Team', tagline: 'Your hiring dashboard',
      description: 'Internal portal for hiring managers',
      primary_color: '#334155', secondary_color: '#475569', accent_color: '#4361EE',
      background_color: '#F8FAFC', text_color: '#0F172A',
      font_family: "'DM Sans', sans-serif",
      logo_url: '', show_apply_button: false, require_auth: true,
      show_salary: true, allow_cv_upload: false,
      exposed_objects: ['jobs','people'], access_token: hmToken,
      pages: [
        { id: uid(), name: 'Dashboard', slug: '/', rows: [
          { id: uid(), preset: '1', bgColor: '#1E293B', padding: 'md', cells: [{ id: uid(), widgetType: 'hero', widgetConfig: { headline: 'Hiring Manager Portal', subheading: 'Your candidates and open roles.' } }] },
          { id: uid(), preset: '1', bgColor: '', padding: 'md', cells: [{ id: uid(), widgetType: 'jobs', widgetConfig: {} }] },
        ]},
      ],
      created_at: now, updated_at: now, deleted_at: null,
    }] : []),
  ];

  return { workflows, interviewTypes, forms, fileTypes, emailTemplates, portals };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT ROLES (same for all templates)
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_ROLES = [
  { name: 'Super Admin',    slug: 'super_admin',    description: 'Full access to everything',                           color: '#e03131', is_system: 1 },
  { name: 'Admin',          slug: 'admin',          description: 'Manage users, settings and all data',                color: '#e67700', is_system: 1 },
  { name: 'Recruiter',      slug: 'recruiter',      description: 'Manage candidates, jobs and talent pools',           color: '#2f9e44', is_system: 1 },
  { name: 'Hiring Manager', slug: 'hiring_manager', description: 'View and provide feedback on candidates',            color: '#1971c2', is_system: 1 },
  { name: 'Read Only',      slug: 'read_only',      description: 'View data only, no edits',                          color: '#868e96', is_system: 1 },
];

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE REGISTRY
// ─────────────────────────────────────────────────────────────────────────────
const TEMPLATES = {

  // ── Recruitment Starter ───────────────────────────────────────────────────
  // Default for web signups. Simplified data model, focused on essentials.
  recruitment_starter: {
    key:         'recruitment_starter',
    label:       'Recruitment Starter',
    description: 'Simple recruitment tracking — candidates, jobs and talent pools. Best for teams getting started.',
    tier:        'starter',
    icon:        'rocket',
    is_default:  true,   // default for self-serve signups
    default_roles: DEFAULT_ROLES,
    objects: [
      {
        slug: 'people', name: 'Person', plural_name: 'People',
        icon: 'user', color: '#4361EE', is_system: true,
        fields: PEOPLE_STARTER,
      },
      {
        slug: 'jobs', name: 'Job', plural_name: 'Jobs',
        icon: 'briefcase', color: '#0CAF77', is_system: true,
        fields: JOBS_STARTER,
      },
      {
        slug: 'talent-pools', name: 'Talent Pool', plural_name: 'Talent Pools',
        icon: 'users', color: '#C87E8B', is_system: true,
        fields: TALENT_POOL_FIELDS,
      },
    ],
  },

  // ── Recruitment Standard ──────────────────────────────────────────────────
  // Full schema. Used for master demo env and clients wanting the complete feature set.
  recruitment_standard: {
    key:         'recruitment_standard',
    label:       'Recruitment Standard',
    description: 'Full-featured recruitment platform — complete data model with compensation, approval workflows, DEI tracking and advanced posting controls.',
    tier:        'standard',
    icon:        'layers',
    is_default:  false,
    default_roles: DEFAULT_ROLES,
    objects: [
      {
        slug: 'people', name: 'Person', plural_name: 'People',
        icon: 'user', color: '#4361EE', is_system: true,
        fields: PEOPLE_STANDARD,
      },
      {
        slug: 'jobs', name: 'Job', plural_name: 'Jobs',
        icon: 'briefcase', color: '#0CAF77', is_system: true,
        fields: JOBS_STANDARD,
      },
      {
        slug: 'talent-pools', name: 'Talent Pool', plural_name: 'Talent Pools',
        icon: 'users', color: '#C87E8B', is_system: true,
        fields: TALENT_POOL_FIELDS,
      },
    ],
  },

  // ── Recruitment Agency ────────────────────────────────────────────────────
  // Extends Standard. Adds Client Companies and Placements.
  agency: {
    key:         'agency',
    label:       'Recruitment Agency',
    description: 'Adds Client Companies and Placements on top of Recruitment Standard.',
    tier:        'standard',
    icon:        'briefcase',
    is_default:  false,
    extends:     'recruitment_standard',
    default_roles: DEFAULT_ROLES,
    extra_objects: [
      {
        slug: 'clients_co', name: 'Client Company', plural_name: 'Client Companies',
        icon: 'building', color: '#EF4444', is_system: false,
        fields: [
          F(1, 'company_name',  'Company Name', 'text',   null, { required: false, list: true }),
          F(2, 'industry',      'Industry',     'select',
            ['Technology','Finance','Healthcare','Retail','Manufacturing','Professional Services','Other'], { list: true }),
          F(3, 'status',        'Status',       'select',
            ['Prospect','Active','On Hold','Former'],      { list: true }),
          F(4, 'account_owner', 'Account Owner','text',   null, { list: true }),
          F(5, 'website',       'Website',      'url'),
          F(6, 'notes_text',    'Notes',        'textarea'),
        ],
      },
      {
        slug: 'placements', name: 'Placement', plural_name: 'Placements',
        icon: 'check-circle', color: '#0CAF77', is_system: false,
        fields: [
          F(1, 'candidate',   'Candidate',   'people',    null, { required: false, list: true }),
          F(2, 'job_title',   'Job Title',   'text',      null, { list: true }),
          F(3, 'start_date',  'Start Date',  'date',      null, { list: true }),
          F(4, 'salary',      'Salary',      'currency',  null, { list: true }),
          F(5, 'fee_pct',     'Fee %',       'number',    null, { list: true }),
          F(6, 'fee_amount',  'Fee Amount',  'currency',  null, { list: true }),
          F(7, 'status',      'Status',      'select',
            ['Pending','Confirmed','Invoiced','Paid','Cancelled'], { list: true }),
        ],
      },
    ],
  },

  // ── HR Platform ───────────────────────────────────────────────────────────
  // Extends Standard. Adds Employees and Leave Requests.
  hr_platform: {
    key:         'hr_platform',
    label:       'HR Platform',
    description: 'Adds Employees and Leave Requests on top of Recruitment Standard.',
    tier:        'standard',
    icon:        'users',
    is_default:  false,
    extends:     'recruitment_standard',
    default_roles: DEFAULT_ROLES,
    extra_objects: [
      {
        slug: 'employees', name: 'Employee', plural_name: 'Employees',
        icon: 'user', color: '#0891B2', is_system: false,
        fields: [
          F(1, 'first_name',   'First Name',   'text',     null, { required: false, list: true }),
          F(2, 'last_name',    'Last Name',    'text',     null, { required: false, list: true }),
          F(3, 'employee_id',  'Employee ID',  'text',     null, { list: true }),
          F(4, 'job_title',    'Job Title',    'text',     null, { list: true }),
          F(5, 'department',   'Department',   'text',     null, { list: true }),
          F(6, 'start_date',   'Start Date',   'date',     null, { list: true }),
          F(7, 'status',       'Status',       'select',
            ['Active','On Leave','Terminated'],            { list: true }),
          F(8, 'salary',       'Salary',       'currency'),
        ],
      },
      {
        slug: 'leave_requests', name: 'Leave Request', plural_name: 'Leave Requests',
        icon: 'calendar', color: '#F59E0B', is_system: false,
        fields: [
          F(1, 'employee',   'Employee',    'people',   null, { required: true, list: true }),
          F(2, 'leave_type', 'Leave Type',  'select',
            ['Annual','Sick','Parental','Unpaid','Other'], { required: true, list: true }),
          F(3, 'start_date', 'Start Date',  'date',     null, { required: true, list: true }),
          F(4, 'end_date',   'End Date',    'date',     null, { required: true, list: true }),
          F(5, 'days',       'Days',        'number',   null, { list: true }),
          F(6, 'status',     'Status',      'select',
            ['Pending','Approved','Rejected','Cancelled'], { list: true }),
          F(7, 'notes_text', 'Notes',       'textarea'),
        ],
      },
    ],
  },

  // ── RPO Provider ──────────────────────────────────────────────────────────
  // Extends Standard. Adds Client Companies with SLA tracking.
  rpo_provider: {
    key:         'rpo_provider',
    label:       'RPO Provider',
    description: 'Full RPO template — Client Companies with SLA tracking on top of Recruitment Standard.',
    tier:        'standard',
    icon:        'briefcase',
    is_default:  false,
    extends:     'recruitment_standard',
    default_roles: DEFAULT_ROLES,
    extra_objects: [
      {
        slug: 'client_companies', name: 'Client Company', plural_name: 'Client Companies',
        icon: 'building', color: '#EF4444', is_system: false,
        fields: [
          F(1, 'company_name',     'Company Name',      'text',   null, { required: true, list: true }),
          F(2, 'industry',         'Industry',          'select',
            ['Technology','Finance','Healthcare','Retail','Manufacturing','Professional Services','Government','Other'], { list: true }),
          F(3, 'account_status',   'Account Status',    'select',
            ['Prospect','Active','On Hold','Former'],    { list: true }),
          F(4, 'account_manager',  'Account Manager',   'text',   null, { list: true }),
          F(5, 'contract_start',   'Contract Start',    'date'),
          F(6, 'contract_end',     'Contract End',      'date'),
          F(7, 'default_sla_days', 'Default SLA Days',  'number', null, { list: true }),
          F(8, 'fee_structure',    'Fee Structure',      'select',
            ['Fixed Fee','Percentage','Retainer','Hybrid']),
          F(9, 'brief_status',     'Brief Status',       'select',
            ['Brief Received','Approved','Sourcing','Shortlisted','Interviewing','Offer Stage','Filled','Cancelled']),
        ],
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a template — merges extends chain and returns flat object list.
 */
function resolveTemplate(key) {
  const tpl = TEMPLATES[key] || TEMPLATES.recruitment_starter;
  let objects = JSON.parse(JSON.stringify(tpl.objects || []));

  if (tpl.extends) {
    const base = TEMPLATES[tpl.extends];
    objects = JSON.parse(JSON.stringify(base.objects || []));
    objects = [...objects, ...JSON.parse(JSON.stringify(tpl.extra_objects || []))];
  }

  return {
    key:           tpl.key,
    label:         tpl.label,
    description:   tpl.description,
    tier:          tpl.tier,
    icon:          tpl.icon,
    is_default:    tpl.is_default || false,
    objects,
    roles:         tpl.default_roles || DEFAULT_ROLES,
  };
}

/**
 * Get the default template key for web signups.
 */
function getDefaultTemplateKey() {
  const found = Object.values(TEMPLATES).find(t => t.is_default);
  return found ? found.key : 'recruitment_starter';
}

/**
 * List all templates (for UI display — no field data, just metadata).
 */
function listTemplates() {
  return Object.values(TEMPLATES).map(t => ({
    key:         t.key,
    label:       t.label,
    description: t.description,
    tier:        t.tier,
    icon:        t.icon,
    is_default:  t.is_default || false,
    object_count: (t.objects || []).length + (t.extra_objects || []).length,
  }));
}

module.exports = {
  TEMPLATE_VERSION,
  TEMPLATES,
  PEOPLE_STARTER,
  PEOPLE_STANDARD,
  JOBS_STARTER,
  JOBS_STANDARD,
  TALENT_POOL_FIELDS,
  DEFAULT_ROLES,
  resolveTemplate,
  getDefaultTemplateKey,
  buildStandardConfig,
  listTemplates,
};
