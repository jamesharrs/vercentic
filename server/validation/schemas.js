// server/validation/schemas.js
// All Zod schemas in one place. z.object() strips unknown keys by default.
'use strict';
const { z } = require('zod');

// ── Shared primitives ─────────────────────────────────────────────────────────
const uuid    = () => z.string().uuid('Must be a valid UUID').trim();
const uuidOpt = () => z.string().uuid('Must be a valid UUID').trim().optional().nullable();
const str     = (max = 500) => z.string().trim().min(1, 'Required').max(max, `Max ${max} characters`);
const strOpt  = (max = 500) => z.string().trim().max(max, `Max ${max} characters`).optional().nullable();
const isoDate = () => z.string().trim()
  .regex(/^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/, 'Must be a valid date (YYYY-MM-DD or ISO 8601)')
  .optional().nullable();
const positiveNum = () =>
  z.number({ invalid_type_error: 'Must be a number' }).nonnegative('Must be >= 0').optional().nullable();
const hexColor = () =>
  z.string().trim().regex(/^#[0-9a-fA-F]{3,8}$/, 'Must be a valid hex colour').optional().nullable();
const boolInt  = () => z.union([z.boolean(), z.literal(0), z.literal(1)]).optional();

// ── Auth ──────────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().trim().email('Must be a valid email address').max(254),
  password: z.string().min(1, 'Password required').max(256),
});

// ── Users ─────────────────────────────────────────────────────────────────────
const createUserSchema = z.object({
  email:         z.string().trim().email('Must be a valid email address').max(254),
  first_name:    str(100),
  last_name:     str(100),
  role_id:       uuid(),
  auth_provider: z.enum(['local','google','azure','okta','saml']).optional().default('local'),
  org_unit_id:   uuidOpt(),
});

const patchUserSchema = z.object({
  first_name:  strOpt(100),
  last_name:   strOpt(100),
  role_id:     uuidOpt(),
  status:      z.enum(['active','invited','deactivated']).optional(),
  mfa_enabled: boolInt(),
  org_unit_id: uuidOpt(),
  password:    z.string().min(8, 'Password must be at least 8 characters').max(256).optional(),
});
const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').max(256),
});

// ── Fields ────────────────────────────────────────────────────────────────────
const VALID_FIELD_TYPES = [
  'text','textarea','number','email','phone','url','date','datetime',
  'boolean','select','multi_select','lookup','multi_lookup','file',
  'rich_text','currency','rating','people','formula','progress','address','phone_intl',
];
const createFieldSchema = z.object({
  object_id:        uuid(),
  environment_id:   uuid(),
  name:             str(100),
  api_key:          z.string().trim().min(1).max(50)
                     .regex(/^[a-z][a-z0-9_]*$/, 'api_key must be lowercase letters, numbers and underscores starting with a letter'),
  field_type:       z.enum(VALID_FIELD_TYPES, { errorMap: () => ({ message: 'Invalid field_type' }) }),
  is_required:      boolInt(),
  is_unique:        boolInt(),
  show_in_list:     boolInt(),
  show_in_form:     boolInt(),
  options:          z.array(z.string().trim().max(200)).max(500).optional().nullable(),
  lookup_object_id: uuidOpt(),
  default_value:    strOpt(1000),
  placeholder:      strOpt(200),
  help_text:        strOpt(500),
  sort_order:       z.number().int().nonnegative().optional(),
  condition_field:  strOpt(50),
  condition_value:  strOpt(200),
  related_object:   strOpt(50),
  multi:            z.boolean().optional(),
  // Section separator fields
  section_label:    strOpt(200),
  collapsible:      z.boolean().optional(),
  as_panel:         z.boolean().optional(),
}).passthrough();

const patchFieldSchema = z.object({
  name:             strOpt(100),
  api_key:          z.string().trim().min(1).max(50).regex(/^[a-z][a-z0-9_]*$/).optional(),
  field_type:       z.enum(VALID_FIELD_TYPES, { errorMap: () => ({ message: 'Invalid field_type' }) }).optional(),
  is_required:      boolInt(),
  is_unique:        boolInt(),
  show_in_list:     boolInt(),
  show_in_form:     boolInt(),
  options:          z.array(z.string().trim().max(200)).max(500).optional().nullable(),
  lookup_object_id: uuidOpt(),
  default_value:    strOpt(1000),
  placeholder:      strOpt(200),
  help_text:        strOpt(500),
  sort_order:       z.number().int().nonnegative().optional(),
  condition_field:  strOpt(50),
  condition_value:  strOpt(200),
  // Section separator fields
  section_label:    strOpt(200),
  collapsible:      z.boolean().optional(),
  as_panel:         z.boolean().optional(),
}).passthrough();

// ── Records ───────────────────────────────────────────────────────────────────
const recordDataValue = z.union([
  z.string().max(50000, 'Field value too long'),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.union([z.string().max(500), z.number(), z.boolean(), z.null()])).max(500),
  z.array(z.object({ id: z.string().max(200), name: z.string().max(200) })).max(200),
]);
const recordData = z.record(
  z.string().max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Field key must contain only letters, numbers, underscores, or hyphens'),
  recordDataValue
).optional();
const createRecordSchema = z.object({
  object_id:      uuid(),
  environment_id: uuid(),
  data:           recordData,
  created_by:     strOpt(200),
});
const patchRecordSchema = z.object({
  data:          recordData,
  updated_by:    strOpt(200),
  field_changes: z.array(z.object({
    field_key:  z.string().max(100),
    field_name: z.string().max(100),
    old_value:  recordDataValue.optional(),
    new_value:  recordDataValue.optional(),
  })).max(200).optional(),
});

// ── Objects ───────────────────────────────────────────────────────────────────
const createObjectSchema = z.object({
  environment_id:        uuid(),
  name:                  str(100),
  plural_name:           str(100),
  slug:                  z.string().trim().min(1).max(50)
                          .regex(/^[a-z][a-z0-9_-]*$/, 'Slug must be lowercase letters, numbers, hyphens, or underscores'),
  description:           strOpt(500),
  icon:                  strOpt(50),
  color:                 hexColor(),
  is_system:             boolInt(),
  relationships_enabled: boolInt(),
});

// ── Offers ────────────────────────────────────────────────────────────────────
const OFFER_STATUSES = ['draft','pending_approval','approved','sent','accepted','declined','expired','withdrawn'];
const approverSchema = z.object({
  user_id:   uuid(),
  user_name: str(200),
  status:    z.enum(['pending','approved','rejected']).optional().default('pending'),
  comment:   strOpt(2000),
});
const createOfferSchema = z.object({
  environment_id: uuid(),
  candidate_id:   uuid(),
  candidate_name: strOpt(200),
  job_id:         uuidOpt(),
  job_name:       strOpt(200),
  job_department: strOpt(100),
  base_salary:    positiveNum(),
  bonus_target:   positiveNum(),
  equity:         strOpt(200),
  currency:       z.string().trim().max(3).optional(),
  start_date:     isoDate(),
  expiry_date:    isoDate(),
  notes:          strOpt(5000),
  terms:          strOpt(10000),
  custom_fields:  z.record(z.string(), z.unknown()).optional(),
  approval_chain: z.array(approverSchema).max(20).optional(),
  status:         z.enum(OFFER_STATUSES, { errorMap: () => ({ message: 'Invalid offer status' }) }).optional().default('draft'),
  created_by:     strOpt(200),
});
const patchOfferSchema = z.object({
  base_salary:    positiveNum(),
  bonus_target:   positiveNum(),
  equity:         strOpt(200),
  currency:       z.string().trim().max(3).optional(),
  start_date:     isoDate(),
  expiry_date:    isoDate(),
  notes:          strOpt(5000),
  terms:          strOpt(10000),
  custom_fields:  z.record(z.string(), z.unknown()).optional(),
  approval_chain: z.array(approverSchema).max(20).optional(),
  status:         z.enum(OFFER_STATUSES, { errorMap: () => ({ message: 'Invalid offer status' }) }).optional(),
});

const offerApprovalSchema = z.object({
  approver_id:   uuid(),
  approver_name: str(200),
  decision:      z.enum(['approved','rejected'], { errorMap: () => ({ message: 'decision must be "approved" or "rejected"' }) }),
  comment:       strOpt(2000),
});
const offerStatusSchema = z.object({
  status: z.enum(OFFER_STATUSES, { errorMap: () => ({ message: 'Invalid offer status' }) }),
  reason: strOpt(2000),
});

// ── Interviews ────────────────────────────────────────────────────────────────
const INTERVIEW_FORMATS = ['video','phone','onsite','panel','assessment','other'];
const createInterviewTypeSchema = z.object({
  environment_id:       uuid(),
  name:                 str(100),
  interview_format:     z.enum(INTERVIEW_FORMATS, { errorMap: () => ({ message: 'Invalid interview_format' }) }).optional().default('video'),
  duration:             z.number().int().min(5).max(480).optional().default(30),
  format:               strOpt(100),
  description:          strOpt(2000),
  location:             strOpt(500),
  buffer_before:        z.number().int().min(0).max(120).optional().default(0),
  buffer_after:         z.number().int().min(0).max(120).optional().default(0),
  max_bookings_per_day: z.number().int().min(0).max(100).optional().default(0),
  interviewers:         z.array(z.object({ id: z.string().max(200), name: z.string().max(200) })).max(50).optional().default([]),
  availability:         z.record(z.string(), z.unknown()).optional().default({}),
  color:                hexColor(),
});
const createInterviewSchema = z.object({
  environment_id:    uuid(),
  interview_type_id: uuidOpt(),
  candidate_id:      uuid(),
  candidate_name:    strOpt(200),
  job_id:            uuidOpt(),
  job_name:          strOpt(200),
  date:              z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time:              z.string().trim().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  duration:          z.number().int().min(1).max(480).optional().default(30),
  format:            strOpt(100),
  location:          strOpt(500),
  interviewers:      z.array(z.object({ id: z.string().max(200), name: z.string().max(200) })).max(50).optional().default([]),
  notes:             strOpt(5000),
  status:            z.enum(['scheduled','completed','cancelled','no_show']).optional().default('scheduled'),
  created_by:        strOpt(200),
});

// ── Forms ─────────────────────────────────────────────────────────────────────
const FORM_FIELD_TYPES = ['short_text','long_text','number','email','phone','url','date','single_select','multi_select','rating','boolean','file','signature'];
const createFormSchema = z.object({
  environment_id: uuid(),
  name:           str(200),
  description:    strOpt(2000),
  category:       strOpt(100),
  applies_to:     z.array(z.string().max(50)).max(20).optional().default([]),
  is_shared:      boolInt(),
  fields:         z.array(z.object({
    id:          z.string().max(100).optional(),
    label:       str(200),
    field_type:  z.enum(FORM_FIELD_TYPES, { errorMap: () => ({ message: 'Invalid form field_type' }) }),
    required:    z.boolean().optional().default(false),
    options:     z.array(z.string().max(200)).max(200).optional(),
    placeholder: strOpt(200),
    help_text:   strOpt(500),
  })).max(200).optional().default([]),
  created_by: strOpt(200),
});

// ── Communications ────────────────────────────────────────────────────────────
const COMM_TYPES      = ['email','sms','whatsapp','call','note'];
const COMM_DIRECTIONS = ['inbound','outbound','logged'];
const createCommSchema = z.object({
  record_id:        uuid(),
  environment_id:   uuidOpt(),
  type:             z.enum(COMM_TYPES, { errorMap: () => ({ message: 'Invalid comm type' }) }),
  direction:        z.enum(COMM_DIRECTIONS, { errorMap: () => ({ message: 'Invalid direction' }) }).optional().default('outbound'),
  subject:          strOpt(500),
  body:             strOpt(50000),
  to:               strOpt(500),
  from:             strOpt(500),
  duration_seconds: z.number().int().min(0).max(86400).optional().nullable(),
  outcome:          strOpt(100),
  status:           z.enum(['sent','delivered','failed','received','simulated']).optional(),
  author:           strOpt(200),
});

// ── Workflows ─────────────────────────────────────────────────────────────────
const WORKFLOW_TYPES = ['record_pipeline','people_link','automation','onboarding'];
const createWorkflowSchema = z.object({
  environment_id: uuid(),
  name:           str(200),
  description:    strOpt(2000),
  object_id:      uuidOpt(),
  workflow_type:  z.enum(WORKFLOW_TYPES, { errorMap: () => ({ message: 'Invalid workflow_type' }) }).optional(),
  is_active:      boolInt(),
  steps:          z.array(z.object({
    id:              z.string().max(100).optional(),
    name:            str(200),
    automation_type: z.string().max(50).optional().nullable(),
    config:          z.record(z.string(), z.unknown()).optional().default({}),
    sort_order:      z.number().int().nonnegative().optional(),
  })).max(100).optional().default([]),
  created_by: strOpt(200),
});

// ── Cases ─────────────────────────────────────────────────────────────────────
const createCaseSchema = z.object({
  environment_id: uuidOpt(),
  client_id:      uuidOpt(),
  title:          str(300),
  description:    strOpt(10000),
  priority:       z.enum(['low','medium','high','critical']).optional().default('medium'),
  category:       strOpt(100),
  reporter_name:  strOpt(200),
  reporter_email: z.string().trim().email('Must be a valid email').max(254).optional().nullable(),
  assignee_id:    uuidOpt(),
  assignee_name:  strOpt(200),
});

// ── Org Units ─────────────────────────────────────────────────────────────────
const ORG_UNIT_TYPES = ['company','region','division','department','team','office'];
const createOrgUnitSchema = z.object({
  environment_id: uuid(),
  name:           str(200),
  type:           z.enum(ORG_UNIT_TYPES, { errorMap: () => ({ message: 'Invalid org unit type' }) }).optional().default('team'),
  parent_id:      uuidOpt(),
  color:          hexColor(),
});

// ── Relationships ─────────────────────────────────────────────────────────────
const REL_TYPES = ['reports_to','manages','dotted_line_to','interim_manager_of','mentors','works_with','placed_by','successor_to'];
const createRelationshipSchema = z.object({
  from_record_id: uuid(),
  to_record_id:   uuid(),
  type:           z.enum(REL_TYPES, { errorMap: () => ({ message: 'Invalid relationship type' }) }),
  notes:          strOpt(1000),
  start_date:     isoDate(),
  end_date:       isoDate(),
  environment_id: uuidOpt(),
});

// ── Notes ─────────────────────────────────────────────────────────────────────
const createNoteSchema = z.object({
  record_id: uuid(),
  content:   str(50000),
  author:    strOpt(200),
});

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  loginSchema,
  createUserSchema, patchUserSchema, resetPasswordSchema,
  createFieldSchema, patchFieldSchema,
  createRecordSchema, patchRecordSchema,
  createObjectSchema,
  createOfferSchema, patchOfferSchema, offerApprovalSchema, offerStatusSchema,
  createInterviewTypeSchema, createInterviewSchema,
  createFormSchema,
  createCommSchema,
  createWorkflowSchema,
  createCaseSchema,
  createOrgUnitSchema,
  createRelationshipSchema,
  createNoteSchema,
  helpers: { uuid, uuidOpt, str, strOpt, isoDate, positiveNum, hexColor, boolInt },
};
