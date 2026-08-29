/**
 * pipelineStage.js
 * Shared helper for resolving a record's assigned "Linked Person" workflow
 * (a record_workflow_assignments row with type/assignment_type
 * 'people_link' | 'linked_person') and its sorted steps.
 *
 * Used by the public career-site endpoints so that a candidate who applies
 * lands on the correct first pipeline stage instead of a stage_id: null row
 * — the admin Application Pipeline widget (PeoplePipelineWidget in
 * Workflows.jsx) counts candidates per stage by matching people_links.stage_id
 * against the assigned workflow's step ids, so a null stage_id is never
 * counted in any column even though the "All" total includes it.
 */

const PEOPLE_LINK_TYPES = ['people_link', 'linked_person'];

/**
 * Find the workflow + sorted steps assigned to a record as its Linked
 * Person workflow. Returns { workflow, steps } — workflow is null and
 * steps is [] when the record has no such workflow assigned (or the
 * assigned workflow has no steps configured).
 */
function getLinkedPersonWorkflow(store, recordId) {
  if (!recordId) return { workflow: null, steps: [] };
  const assignment = (store.record_workflow_assignments || []).find(a =>
    a.record_id === recordId &&
    (PEOPLE_LINK_TYPES.includes(a.type) || PEOPLE_LINK_TYPES.includes(a.assignment_type))
  );
  if (!assignment) return { workflow: null, steps: [] };
  const workflow = (store.workflows || []).find(w => w.id === assignment.workflow_id && !w.deleted_at) || null;
  if (!workflow) return { workflow: null, steps: [] };
  const steps = (workflow.steps && workflow.steps.length > 0)
    ? workflow.steps.slice().sort((a, b) => (a.order_index || a.order || 0) - (b.order_index || b.order || 0))
    : (store.workflow_steps || []).filter(s => s.workflow_id === workflow.id).sort((a, b) => (a.order || 0) - (b.order || 0));
  return { workflow, steps };
}

/**
 * True if the record has a Linked Person workflow with at least one stage
 * — i.e. it's safe to bucket a new applicant into a real pipeline stage.
 */
function hasLinkedPersonWorkflow(store, recordId) {
  return getLinkedPersonWorkflow(store, recordId).steps.length > 0;
}

/**
 * Resolve the stage a newly-applied candidate should land on — the first
 * step of the record's Linked Person workflow. Falls back to
 * { stage_id: null, stage_name: fallbackName } when no workflow/steps are
 * assigned, so callers still get a sensible stage_name even in that case.
 */
function resolveFirstStage(store, recordId, fallbackName = 'Applied') {
  const { steps } = getLinkedPersonWorkflow(store, recordId);
  const first = steps[0];
  return { stage_id: first?.id || null, stage_name: first?.name || fallbackName };
}

module.exports = { PEOPLE_LINK_TYPES, getLinkedPersonWorkflow, hasLinkedPersonWorkflow, resolveFirstStage };
