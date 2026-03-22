const express = require('express');
const router = express.Router();
const { query, insert, update, remove, getStore, saveStore } = require('../db/init');
const { v4: uuidv4 } = require('uuid');

function seedReleaseNotes() {
  const store = getStore();
  if (!store.release_notes) store.release_notes = [];
  if (store.release_notes.length > 0) return;
  const notes = [
    { id: uuidv4(), version: '1.0.0', title: 'Platform Launch', summary: 'Initial release of the Vercentic platform.', category: 'feature', features: ['Dynamic data model with custom objects and fields', 'People, Jobs, and Talent Pools core objects', 'Record list view with search and filtering', 'Settings with user and role management'], published: true, published_at: '2026-03-07T00:00:00.000Z', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: uuidv4(), version: '1.1.0', title: 'AI Copilot & Record Management', summary: 'Introduced the AI Copilot and enhanced record management.', category: 'feature', features: ['AI Copilot with natural language record creation', 'People to Job AI matching engine with score rings', 'Full record detail page with 2-column layout', 'Communications panel — email, SMS, WhatsApp, call logging', 'Workflow builder with pipeline stages'], published: true, published_at: '2026-03-08T00:00:00.000Z', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: uuidv4(), version: '1.2.0', title: 'Portal Builder & Search', summary: 'External portals for career sites, plus universal search.', category: 'feature', features: ['Portal builder with Career Site, HM Portal, Agency Portal types', 'Global search bar with live results across all objects', 'Advanced filter builder with saved lists', 'Dashboard with interactive charts', 'Column picker and view customisation on list pages'], published: true, published_at: '2026-03-09T00:00:00.000Z', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: uuidv4(), version: '1.3.0', title: 'Org Chart & People Graph', summary: 'Visual org chart with people relationships and department drill-down.', category: 'feature', features: ['Visual org chart with company structure and people graph', 'Reporting relationships (Reports To, Manages, Dotted-line)', 'Department drill-down with people filter', 'Open roles shown as amber nodes in the org chart', 'Person Type field with conditional employment fields', 'PDF export for org chart views'], published: true, published_at: '2026-03-13T00:00:00.000Z', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: uuidv4(), version: '1.4.0', title: 'Interviews, Forms & Document Intelligence', summary: 'Full interview scheduling, form builder, CV parsing, and document extraction.', category: 'feature', features: ['Interview module — Calendly-style interview types', 'Schedule interviews via natural language in the Copilot', 'Form builder — create custom forms with any field type', 'CV parsing — DOCX and PDF support via AI', 'Document Intelligence — extract data from IDs and documents', 'File type admin with AI extraction field mappings', 'People field type — link person records from any field'], published: true, published_at: '2026-03-15T00:00:00.000Z', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: uuidv4(), version: '1.5.0', title: 'Offer Management', summary: 'End-to-end offer lifecycle with multi-approver chains.', category: 'feature', features: ['Offer creation wizard — candidate search, compensation builder, approval chain', 'Multi-approver sequential approval workflow', 'Offer lifecycle — Draft to Pending Approval to Sent to Accepted/Declined', 'Compensation package calculator with base, bonus, equity, benefits', 'Copilot offer creation via natural language'], published: true, published_at: '2026-03-16T00:00:00.000Z', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: uuidv4(), version: '1.6.0', title: 'Release Notes & News', summary: 'In-app release notes so users always know what\'s new in the platform.', category: 'feature', features: ['What\'s New bell icon in the top bar with unread count badge', 'Release notes panel with full version history', 'Release Notes admin in Super Admin console', 'Category tagging — Feature, Fix, Improvement, Security', 'All new features will include release notes going forward'], published: true, published_at: '2026-03-20T00:00:00.000Z', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: uuidv4(), version: '1.7.0', title: 'Portal Builder v2', summary: 'Major portal builder upgrade with five new capabilities for building rich, interactive career sites and external experiences.', category: 'feature', features: ['Multi-step Form widget — step-by-step forms with progress indicator, field validation, and conditional fields', 'Nav & Footer editors — configure logo, links, colours, sticky behaviour, and footer columns directly from the builder', 'Section Library — 15+ pre-built row templates across 7 categories, insert with one click', 'Portal Analytics — automatic tracking of page views, job clicks, applications, and form events; stats strip on every portal card', 'Conditional Row Visibility — show or hide any row based on URL parameters for audience segmentation or A/B testing'], published: true, published_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];
  store.release_notes = notes;
  saveStore();
  console.log('Seeded ' + notes.length + ' release notes');
}

router.get('/', (req, res) => {
  try {
    seedReleaseNotes();
    const { published_only } = req.query;
    let notes = query('release_notes', () => true)
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    if (published_only !== 'false') notes = notes.filter(n => n.published);
    res.json(notes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', (req, res) => {
  const note = query('release_notes', n => n.id === req.params.id)[0];
  if (!note) return res.status(404).json({ error: 'Not found' });
  res.json(note);
});

router.post('/', (req, res) => {
  try {
    const { version, title, summary, category = 'feature', features = [], published = false } = req.body;
    if (!version || !title) return res.status(400).json({ error: 'version and title required' });
    const note = { id: uuidv4(), version, title, summary: summary || '', category, features: Array.isArray(features) ? features : [], published: !!published, published_at: published ? new Date().toISOString() : null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    insert('release_notes', note);
    res.status(201).json(note);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id', (req, res) => {
  try {
    const existing = query('release_notes', n => n.id === req.params.id)[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    if (updates.published && !existing.published) updates.published_at = new Date().toISOString();
    update('release_notes', n => n.id === req.params.id, updates);
    res.json({ ...existing, ...updates });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    remove('release_notes', n => n.id === req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
