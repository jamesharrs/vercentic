#!/usr/bin/env node
/**
 * Patch: Update AI Copilot with Report Builder v2 capabilities
 *   1. Update system prompt — correct chart types (funnel, stacked, scatter etc.)
 *   2. Update SUGGESTED_ACTIONS for reports context
 *   3. Add new quick action chips for the reports page
 *   4. Update MODIFY_REPORT to include new chart types
 *
 * Run from: ~/projects/talentos
 *   node patch_copilot_reports_v2.js
 */
const fs   = require('fs');
const path = require('path');

const AI = path.join(__dirname, 'client/src/AI.jsx');

if (!fs.existsSync(AI)) {
  console.error('ERROR: client/src/AI.jsx not found. Run from ~/projects/talentos');
  process.exit(1);
}

function patch(label, oldStr, newStr) {
  let src = fs.readFileSync(AI, 'utf8');
  if (!src.includes(oldStr)) {
    console.log(`SKIP  ${label} — anchor not found`);
    return;
  }
  fs.writeFileSync(AI, src.replace(oldStr, newStr));
  console.log(`✓     ${label}`);
}

// ── 1. Update the report creation system prompt with correct chart types ──────
patch(
  'Update chart types in report system prompt',
  `Chart types: bar (comparisons), area (trends over time), pie (proportions)`,
  `Chart types:
- bar       — comparisons between categories (most common)
- stacked   — breakdown of a category by a second dimension (e.g. status per department)
- funnel    — pipeline stage conversion, shows drop-off between stages
- scatter   — two-variable correlation (e.g. salary vs experience)
- line      — trends over time
- area      — trends over time with fill
- pie       — proportional breakdown`
);

// ── 2. Add cross-object join and form reports to system prompt ────────────────
patch(
  'Add cross-object join and form sources to report prompt',
  `Available objects (use slug): people, jobs, talent-pools, and any custom objects.`,
  `Available objects (use slug): people, jobs, talent-pools, and any custom objects.

Advanced features:
- Cross-object join: you can add "join_object" to merge two objects via pipeline links
  e.g. join people + jobs to report on salary vs candidate status
- Form responses: set "data_source": "forms" and "form_name" to report on interview
  scorecard data, surveys, or any custom form
- Formulas: add "formulas" array with {name, expression} entries using functions like
  SUM({field}), AVG({field}), DIFF({a},{b}), ROUND({f},N), COUNT(), IF({f}=v,a,b)
  Field refs use {api_key} curly-brace syntax`
);

// ── 3. Update the example in the system prompt to include new chart types ─────
patch(
  'Update example chart_type in system prompt example',
  `  "chart_type": "bar",
  "sort_by": "_count",
  "sort_dir": "desc",
  "filters": [],
  "description": "Breakdown of candidates by pipeline stage"
}
</CREATE_REPORT>

Rules:
- If the user is vague, ask ONE clarifying question (which object?) before outputting the block
- "object" must be a slug (people, jobs, talent-pools)
- "group_by" must be a snake_case field api_key
- Filter values should be lowercase unless a proper noun
- Always suggest a sensible chart_type for the data shape`,
  `  "chart_type": "bar",
  "sort_by": "_count",
  "sort_dir": "desc",
  "filters": [],
  "description": "Breakdown of candidates by pipeline stage"
}
</CREATE_REPORT>

Funnel chart example (best for pipeline stages):
<CREATE_REPORT>
{
  "title": "Candidate Pipeline Funnel",
  "object": "people",
  "group_by": "status",
  "chart_type": "funnel",
  "sort_by": "_count",
  "sort_dir": "desc",
  "filters": [],
  "description": "Funnel showing candidate drop-off through pipeline stages"
}
</CREATE_REPORT>

Rules:
- If the user is vague, ask ONE clarifying question (which object?) before outputting the block
- "object" must be a slug (people, jobs, talent-pools)
- "group_by" must be a snake_case field api_key
- Filter values should be lowercase unless a proper noun
- Choose chart_type intelligently: funnel for pipeline/stages, stacked for two-dimension breakdown, scatter for two numeric fields, bar for most other comparisons
- For pipeline/stage/funnel requests — ALWAYS use chart_type "funnel" (it is natively supported)`
);

// ── 4. Update SUGGESTED_ACTIONS for the reports context ──────────────────────
patch(
  'Update SUGGESTED_ACTIONS for reports page',
  `  reports: [
    { label: "Filter by status",   prompt: "Add a filter to show only active records" },
    { label: "Group differently",  prompt: "Change the grouping of this report" },
    { label: "Change chart type",  prompt: "Change this to a pie chart" },
    { label: "Save this report",   prompt: "Save this report with a name" },
  ],`,
  `  reports: [
    { label: "Pipeline funnel",    prompt: "Create a funnel chart of candidates by pipeline status" },
    { label: "Time-to-fill report",prompt: "Build a report showing jobs by time open — group by department" },
    { label: "Source breakdown",   prompt: "Show a pie chart of candidates by source" },
    { label: "Filter active only", prompt: "Add a filter to exclude rejected and withdrawn candidates" },
    { label: "Change chart type",  prompt: "Change this to a funnel chart" },
    { label: "Add a formula",      prompt: "Add a formula column to calculate something from my data" },
    { label: "Pin to dashboard",   prompt: "Save and pin this report to the dashboard" },
    { label: "Schedule this",      prompt: "Schedule this report to email me weekly" },
  ],`
);

// ── 5. Add funnel/stacked/scatter to MODIFY_REPORT system prompt hint ────────
patch(
  'Update MODIFY_REPORT chart type hint',
  `      "setChartType": "bar",`,
  `      "setChartType": "funnel",`
);

// ── 6. Update CREATE_ACTIONS quick buttons — improve the Build a report action ─
patch(
  'Update Build a report quick action label',
  `  { id:"new-report",     icon:"bar-chart-2", label:"Build a report",   prompt:"I want to build a report" },`,
  `  { id:"new-report",     icon:"bar-chart-2", label:"Build a report",   prompt:"I want to build a report showing " },`
);

// ── Verify final state ────────────────────────────────────────────────────────
const finalSrc = fs.readFileSync(AI, 'utf8');
console.log('\nVerification:');
console.log('  funnel in chart types list:  ', finalSrc.includes('funnel    — pipeline'));
console.log('  stacked in chart types list: ', finalSrc.includes('stacked   —'));
console.log('  scatter in chart types list: ', finalSrc.includes('scatter   —'));
console.log('  funnel example block:        ', finalSrc.includes('Funnel chart example'));
console.log('  cross-object join docs:      ', finalSrc.includes('Cross-object join'));
console.log('  Pipeline funnel suggestion:  ', finalSrc.includes('Pipeline funnel'));
console.log('  Schedule suggestion:         ', finalSrc.includes('Schedule this report to email'));

console.log('\n✅  Done. Now build and deploy:');
console.log('   cd client && npx vite build 2>&1 | grep -E "error|✓"');
console.log('   cd .. && git add -A && git commit -m "feat: copilot knows report builder v2 — funnel/stacked/scatter charts, join, schedule" && git push origin main\n');
