// server/routes/test_scripts.js
// POST /api/test-scripts/generate  — AI-generate UAT test script → DOCX download
// GET  /api/test-scripts            — list previously generated scripts
// GET  /api/test-scripts/:id/download — re-download a script
// DELETE /api/test-scripts/:id      — remove a script

const express   = require('express');
const router    = express.Router();
const path      = require('path');
const fs        = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
const { getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');
const { MODEL_DEFAULT } = require('../config/ai_models');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageNumber, Footer,
} = require('docx');

const OUTPUTS_DIR = path.join(__dirname, '../test_script_outputs');
if (!fs.existsSync(OUTPUTS_DIR)) fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

// ── Schema context ────────────────────────────────────────────────────────────
function buildSchemaContext(environmentId) {
  const store = getStore();
  const env = (store.environments || []).find(e => e.id === environmentId);
  if (!env) throw new Error('Environment not found');

  const objects   = (store.objects || []).filter(o => o.environment_id === environmentId && !o.deleted_at);
  const allFields = (store.fields  || []).filter(f => f.environment_id === environmentId);

  const fieldsByObject = {};
  for (const obj of objects) {
    fieldsByObject[obj.slug] = allFields
      .filter(f => f.object_id === obj.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(f => ({
        name: f.name, api_key: f.api_key, field_type: f.field_type,
        is_required: !!f.is_required, options: f.options || null,
        condition_field: f.condition_field || null, condition_value: f.condition_value || null,
      }));
  }

  const workflows = (store.workflows || [])
    .filter(w => w.environment_id === environmentId && !w.deleted_at)
    .map(w => ({
      name: w.name,
      object_name: objects.find(o => o.id === w.object_id)?.name || 'Unknown',
      steps: (w.steps || []).map(s => ({ name: s.name, automation_type: s.automation_type || null })),
    }));

  const portals = (store.portals || [])
    .filter(p => p.environment_id === environmentId && !p.deleted_at)
    .map(p => ({ name: p.name, type: p.type || 'career_site', status: p.status, slug: p.slug }));

  const roles = (store.roles || []).filter(r => !r.deleted_at).map(r => ({ name: r.name, slug: r.slug }));
  const forms = (store.forms  || []).filter(f => f.environment_id === environmentId && !f.deleted_at).map(f => ({ name: f.name, category: f.category }));

  return { env, objects, fieldsByObject, workflows, portals, roles, forms };
}

// ── AI generation ─────────────────────────────────────────────────────────────
async function generateTestCases(ctx, options = {}) {
  const { env, objects, fieldsByObject, workflows, portals, roles, forms } = ctx;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const schemaDesc = objects.map(obj => {
    const fields = (fieldsByObject[obj.slug] || []);
    const lines  = fields.map(f =>
      `    - ${f.name} (${f.field_type}${f.is_required ? ', REQUIRED' : ''}${f.options ? `, options: ${f.options}` : ''}${f.condition_field ? `, shown when ${f.condition_field}=${f.condition_value}` : ''})`
    ).join('\n');
    return `  Object: ${obj.plural_name} (${obj.slug})\n  Fields:\n${lines || '    (none)'}`;
  }).join('\n\n');

  const scope   = options.scope   || 'full';
  const depth   = options.depth   || 'standard';
  const company = options.company || env.name;

  const response = await client.messages.create({
    model: MODEL_DEFAULT,
    max_tokens: 8192,
    system: `You are a senior QA consultant specialising in enterprise recruitment software UAT.
Write practical test scripts that non-technical users can follow step-by-step.
Always return valid JSON only — no markdown, no backticks, no explanation text outside the JSON.`,
    messages: [{
      role: 'user',
      content: `Generate a UAT test script for this Vercentic platform configuration.

COMPANY / ENVIRONMENT: ${company} — ${env.name}

OBJECTS AND FIELDS:
${schemaDesc}

WORKFLOWS:
${workflows.length ? workflows.map(w => `  - ${w.name} (${w.object_name}): ${w.steps.map(s => s.name).join(' → ')}`).join('\n') : '  None configured'}

PORTALS:
${portals.length ? portals.map(p => `  - ${p.name} (${p.type}, ${p.status}, slug: ${p.slug})`).join('\n') : '  None'}

ROLES:
${roles.map(r => `  - ${r.name}`).join('\n')}

${forms.length ? `FORMS:\n${forms.map(f => `  - ${f.name} (${f.category})`).join('\n')}` : ''}

SCOPE: ${scope === 'full' ? 'Cover all areas' : `Focus on: ${scope}`}
DEPTH: ${depth === 'quick' ? '3-5 cases per section' : depth === 'comprehensive' ? '12-15 cases per section' : '6-10 cases per section'}

Return JSON with this exact structure:
{
  "title": "UAT Test Script — [company name]",
  "summary": "2-3 sentence overview",
  "sections": [
    {
      "id": "TC-AUTH",
      "title": "Authentication & Role Access",
      "description": "Brief section description",
      "cases": [
        {
          "id": "TC-001",
          "title": "Short descriptive title",
          "role": "Role to test as",
          "priority": "Critical|High|Medium|Low",
          "preconditions": "Setup needed, or null",
          "steps": ["Plain English step 1", "Step 2"],
          "expected": "What tester should see if the test passes",
          "test_data": "Sample data to use, or null"
        }
      ]
    }
  ]
}

Include sections for:
1. Authentication & Role Access (each configured role)
2. One section per configured Object (create, read, edit, delete, search, required field validation)
3. Conditional field display (if any)
4. Workflows (if any — stage progression through the pipeline)
5. Portal / Candidate Journey (if portals exist — public apply flow, confirmation, appears in admin)
6. AI Copilot (creating records via chat, natural language search)
7. Reports & Global Search

Use actual field names, stage names, portal slugs and role names from the configuration above.`,
    }],
  });

  const raw     = response.content[0]?.text || '{}';
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

// ── DOCX builder ──────────────────────────────────────────────────────────────
async function buildDocx(config, testScript, options = {}) {
  const W = 9360;
  const COLORS = {
    primary:'3B5BDB', dark:'0F1729', light:'EEF2FF', border:'E2E8F0',
    critical:'EF4444', high:'F59F00', medium:'3B82F6', low:'6B7280',
    pass:'D1FAE5', fail:'FEE2E2', white:'FFFFFF', hdr:'1E293B',
  };
  const bThin  = { style: BorderStyle.SINGLE, size: 1, color: COLORS.border };
  const bNone  = { style: BorderStyle.NONE };
  const borders = { top: bThin, bottom: bThin, left: bThin, right: bThin };
  const cm = { top: 100, bottom: 100, left: 150, right: 150 };
  const pColor = p => ({ Critical: COLORS.critical, High: COLORS.high, Medium: COLORS.medium }[p] || COLORS.low);

  const tr = (text, opts = {}) => new TextRun({
    text: String(text || ''), font: 'Arial', size: opts.size || 22,
    bold: opts.bold || false, color: opts.color || COLORS.dark,
  });

  const pp = (children, opts = {}) => new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.before ?? 60, after: opts.after ?? 60 },
    heading: opts.heading, border: opts.border, pageBreakBefore: opts.pb || false,
    children: Array.isArray(children) ? children : [children],
  });

  const hRow = (labels, widths) => new TableRow({ tableHeader: true,
    children: labels.map((l, i) => new TableCell({
      borders, width: { size: widths[i], type: WidthType.DXA }, margins: cm,
      shading: { fill: COLORS.hdr, type: ShadingType.CLEAR },
      children: [pp(tr(l, { bold: true, color: COLORS.white, size: 20 }))],
    }))
  });

  const dc = (content, width, opts = {}) => new TableCell({
    borders, width: { size: width, type: WidthType.DXA }, margins: cm,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    children: Array.isArray(content) ? content : [pp(tr(content, { size: 20, color: opts.color || COLORS.dark }))],
  });

  const company  = options.company || config.env.name;
  const children = [];

  // ── Cover ──────────────────────────────────────────────────────────────────
  children.push(
    pp(tr(company, { size: 56, bold: true }), { before: 1800, after: 120 }),
    pp(tr('User Acceptance Testing (UAT) Script', { size: 36, bold: true, color: COLORS.primary }), { before: 0, after: 80 }),
    pp(tr(`Environment: ${config.env.name}  ·  Generated: ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}`, { size: 20, color: '64748B' }), { before: 0, after: 1600 }),
    pp(tr(''), { border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary, space: 1 } } }),
  );

  if (testScript.summary) {
    children.push(
      pp(tr('About This Script', { size: 28, bold: true }), { before: 260, after: 100, heading: HeadingLevel.HEADING_2 }),
      pp(tr(testScript.summary, { size: 22 }), { before: 0, after: 220 }),
    );
  }

  // ── Config summary ─────────────────────────────────────────────────────────
  children.push(
    pp(tr('Platform Configuration', { size: 28, bold: true }), { before: 200, after: 100, heading: HeadingLevel.HEADING_2 }),
    new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [2800, 6560], rows: [
      new TableRow({ children: [dc('Objects', 2800, { fill: COLORS.light }), dc(config.objects.map(o => o.plural_name).join(', '), 6560)] }),
      new TableRow({ children: [dc('Workflows', 2800, { fill: COLORS.light }), dc(config.workflows.map(w => w.name).join(', ') || 'None', 6560)] }),
      new TableRow({ children: [dc('Portals', 2800, { fill: COLORS.light }), dc(config.portals.filter(p => p.status === 'published').map(p => p.name).join(', ') || 'None published', 6560)] }),
      new TableRow({ children: [dc('Roles', 2800, { fill: COLORS.light }), dc(config.roles.map(r => r.name).join(', '), 6560)] }),
      new TableRow({ children: [dc('Total Test Cases', 2800, { fill: COLORS.light }), dc(String((testScript.sections||[]).reduce((a,s)=>a+(s.cases||[]).length,0)), 6560)] }),
    ]}),
  );

  // ── Priority guide ─────────────────────────────────────────────────────────
  children.push(
    pp(tr('Priority Guide', { size: 28, bold: true }), { before: 280, after: 100, heading: HeadingLevel.HEADING_2 }),
    new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [1800, 3560, 2200, 1800], rows: [
      hRow(['Priority', 'Meaning', 'Required for sign-off?', 'Defect SLA'], [1800, 3560, 2200, 1800]),
      new TableRow({ children: [dc('Critical', 1800, { color: COLORS.critical }), dc('Core function — blocks all work if broken', 3560), dc('Yes', 2200), dc('Same day', 1800)] }),
      new TableRow({ children: [dc('High', 1800, { color: COLORS.high }), dc('Important feature — major impact if broken', 3560), dc('Yes', 2200), dc('24 hours', 1800)] }),
      new TableRow({ children: [dc('Medium', 1800, { color: COLORS.medium }), dc('Useful feature — workaround exists', 3560), dc('Recommended', 2200), dc('3 days', 1800)] }),
      new TableRow({ children: [dc('Low', 1800, { color: COLORS.low }), dc('Nice-to-have or edge case', 3560), dc('No', 2200), dc('Next sprint', 1800)] }),
    ]}),
  );

  // ── Test case sections ─────────────────────────────────────────────────────
  for (const section of (testScript.sections || [])) {
    children.push(pp(tr(''), { pb: true }));
    children.push(pp(tr(section.title, { size: 36, bold: true }), { before: 0, after: 80, heading: HeadingLevel.HEADING_1 }));
    if (section.description) children.push(pp(tr(section.description, { size: 22, color: '64748B' }), { before: 0, after: 200 }));

    for (const tc of (section.cases || [])) {
      // Case header
      children.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [1600, 4760, 1600, 1400], rows: [
        new TableRow({ children: [
          dc(tc.id, 1600, { fill: COLORS.light }),
          dc(tc.title, 4760, { fill: COLORS.light }),
          new TableCell({ borders, width: { size: 1600, type: WidthType.DXA }, margins: cm,
            shading: { fill: COLORS.light, type: ShadingType.CLEAR },
            children: [pp([tr('Priority: ', { bold: true, size: 20 }), tr(tc.priority || 'Medium', { bold: true, size: 20, color: pColor(tc.priority) })])],
          }),
          new TableCell({ borders, width: { size: 1400, type: WidthType.DXA }, margins: cm,
            shading: { fill: COLORS.light, type: ShadingType.CLEAR },
            children: [pp([tr('Role: ', { bold: true, size: 20 }), tr(tc.role || 'Recruiter', { size: 20 })])],
          }),
        ]}),
      ]}));

      // Preconditions / test data
      const extras = [];
      if (tc.preconditions) extras.push(['Preconditions', tc.preconditions]);
      if (tc.test_data)     extras.push(['Test Data',     tc.test_data]);
      if (extras.length) {
        children.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [1600, 7760], rows:
          extras.map(([label, value]) => new TableRow({ children: [dc(label, 1600, { fill: COLORS.light }), dc(value, 7760)] }))
        }));
      }

      // Steps table
      children.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [480, 5680, 3200], rows: [
        hRow(['#', 'Test Step', 'Actual Result / Notes'], [480, 5680, 3200]),
        ...(tc.steps || []).map((step, i) => new TableRow({ children: [
          dc(String(i + 1), 480, { fill: COLORS.light }),
          dc(step, 5680),
          dc('', 3200),
        ]})),
      ]}));

      // Expected + pass/fail
      children.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [1200, 5160, 1500, 1500], rows: [
        new TableRow({ children: [
          dc('Expected Result', 1200, { fill: COLORS.light }),
          dc(tc.expected || '', 5160),
          new TableCell({ borders, width: { size: 1500, type: WidthType.DXA }, margins: cm,
            shading: { fill: COLORS.pass, type: ShadingType.CLEAR },
            children: [pp(tr('☐  Pass', { size: 20, color: '065F46' }))],
          }),
          new TableCell({ borders, width: { size: 1500, type: WidthType.DXA }, margins: cm,
            shading: { fill: COLORS.fail, type: ShadingType.CLEAR },
            children: [pp(tr('☐  Fail', { size: 20, color: '991B1B' }))],
          }),
        ]}),
      ]}));

      // Defect notes
      children.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [1200, 8160], rows: [
        new TableRow({ children: [dc('Defect / Notes', 1200, { fill: COLORS.light }), dc('', 8160)] }),
      ]}));

      children.push(pp(tr(''), { before: 120, after: 0 }));
    }
  }

  // ── Sign-off ───────────────────────────────────────────────────────────────
  children.push(pp(tr(''), { pb: true }));
  children.push(pp(tr('Sign-Off Record', { size: 36, bold: true }), { before: 0, after: 100, heading: HeadingLevel.HEADING_1 }));
  children.push(pp(tr('All Critical and High priority cases must be marked Pass before sign-off can be granted.', { size: 22 }), { before: 0, after: 240 }));
  children.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [2340, 2340, 2340, 2340], rows: [
    hRow(['Name', 'Role', 'Signature', 'Date Signed'], [2340, 2340, 2340, 2340]),
    ...[...config.roles.map(r => r.name), 'Project Manager', 'Business Owner'].map(role =>
      new TableRow({ children: [dc('', 2340), dc(role, 2340), dc('', 2340), dc('', 2340)] })
    ),
  ]}));

  // ── Build Document ─────────────────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 40, bold: true, font: 'Arial', color: COLORS.dark },
          paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: 'Arial', color: COLORS.dark },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
      ],
    },
    sections: [{
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } },
      },
      footers: {
        default: new Footer({ children: [
          new Table({ width: { size: 10080, type: WidthType.DXA }, columnWidths: [3360, 3360, 3360], rows: [
            new TableRow({ children: [
              new TableCell({ borders: { top: bThin, bottom: bNone, left: bNone, right: bNone }, width: { size: 3360, type: WidthType.DXA }, margins: { top: 60 },
                children: [pp(tr(`${company} — UAT Test Script`, { size: 18, color: '64748B' }))],
              }),
              new TableCell({ borders: { top: bThin, bottom: bNone, left: bNone, right: bNone }, width: { size: 3360, type: WidthType.DXA }, margins: { top: 60 },
                children: [pp(tr(config.env.name, { size: 18, color: '64748B' }), { align: AlignmentType.CENTER })],
              }),
              new TableCell({ borders: { top: bThin, bottom: bNone, left: bNone, right: bNone }, width: { size: 3360, type: WidthType.DXA }, margins: { top: 60 },
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 60 },
                  children: [tr('Page ', { size: 18, color: '64748B' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '64748B', font: 'Arial' }), tr(' of ', { size: 18, color: '64748B' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '64748B', font: 'Arial' })],
                })],
              }),
            ]}),
          ]}),
        ]}),
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/test-scripts/generate
router.post('/generate', async (req, res) => {
  // Extend timeout for this long-running AI route (120s)
  req.setTimeout && req.setTimeout(120000);
  res.setTimeout && res.setTimeout(120000);
  if (req.socket) req.socket.setTimeout(120000);
  try {
    const { environment_id, scope = 'full', depth = 'standard', company } = req.body;
    if (!environment_id) return res.status(400).json({ error: 'environment_id required' });

    const ctx        = buildSchemaContext(environment_id);
    const testScript = await generateTestCases(ctx, { scope, depth, company });
    const buffer     = await buildDocx(
      { env: ctx.env, objects: ctx.objects, workflows: ctx.workflows, portals: ctx.portals, roles: ctx.roles },
      testScript,
      { company: company || ctx.env.name },
    );

    // Persist record
    const scriptId = uuidv4();
    const filename = `uat-script-${ctx.env.slug}-${Date.now()}.docx`;
    const filePath = path.join(OUTPUTS_DIR, filename);
    fs.writeFileSync(filePath, buffer);

    const store = getStore();
    if (!store.test_scripts) store.test_scripts = [];
    store.test_scripts.push({
      id: scriptId, environment_id,
      environment_name: ctx.env.name,
      filename, title: testScript.title || `UAT Script — ${ctx.env.name}`,
      scope, depth, company,
      case_count:    (testScript.sections || []).reduce((a, s) => a + (s.cases || []).length, 0),
      section_count: (testScript.sections || []).length,
      created_by:    req.currentUser?.id || 'system',
      created_at:    new Date().toISOString(),
    });
    saveStore();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Script-Id', scriptId);
    res.send(buffer);
  } catch (err) {
    console.error('[test-scripts] generate error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate test script' });
  }
});

// GET /api/test-scripts
router.get('/', (req, res) => {
  const { environment_id } = req.query;
  const store = getStore();
  let scripts = store.test_scripts || [];
  if (environment_id) scripts = scripts.filter(s => s.environment_id === environment_id);
  res.json(scripts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

// GET /api/test-scripts/:id/download
router.get('/:id/download', (req, res) => {
  const store  = getStore();
  const script = (store.test_scripts || []).find(s => s.id === req.params.id);
  if (!script) return res.status(404).json({ error: 'Script not found' });
  const filePath = path.join(OUTPUTS_DIR, script.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File no longer available — please regenerate' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${script.filename}"`);
  res.sendFile(filePath);
});

// DELETE /api/test-scripts/:id
router.delete('/:id', (req, res) => {
  const store = getStore();
  const idx   = (store.test_scripts || []).findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  try { fs.unlinkSync(path.join(OUTPUTS_DIR, store.test_scripts[idx].filename)); } catch {}
  store.test_scripts.splice(idx, 1);
  saveStore();
  res.json({ deleted: true });
});

module.exports = router;
