// server/routes/portal_feedback.js
// Portal visitor feedback — collect per-page ratings, reasons, and optional identity
const express = require('express');
const router = express.Router();
const { v4: uid } = require('uuid');
const { getStore, saveStore } = require('../db/init');

const ensure = () => { const s = getStore(); if (!s.portal_feedback) { s.portal_feedback = []; saveStore(); } };

// ── PUBLIC: Submit feedback (no auth — portal visitors) ──────────────────────
router.post('/:portalId', (req, res) => {
  ensure();
  const { portalId } = req.params;
  const { page_slug, rating, reason, comment, visitor_name, visitor_email, session_id } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1-5 required' });
  if (!page_slug) return res.status(400).json({ error: 'page_slug required' });

  const store = getStore();
  const portal = (store.portals || []).find(p => p.id === portalId && !p.deleted_at);
  if (!portal) return res.status(404).json({ error: 'Portal not found' });

  // Check feedback is enabled for this page
  const fbConfig = portal.feedback || {};
  if (!fbConfig.enabled) return res.status(403).json({ error: 'Feedback not enabled' });
  const allowedPages = fbConfig.pages || [];
  if (allowedPages.length > 0 && !allowedPages.includes('__all__') && !allowedPages.includes(page_slug)) {
    return res.status(403).json({ error: 'Feedback not enabled for this page' });
  }

  const entry = {
    id: uid(),
    portal_id: portalId,
    environment_id: portal.environment_id,
    page_slug,
    rating: parseInt(rating),
    reason: reason || null,
    comment: comment || null,
    visitor_name: visitor_name || null,
    visitor_email: visitor_email || null,
    session_id: session_id || null,
    user_agent: req.headers['user-agent'] || null,
    ip: req.ip || null,
    created_at: new Date().toISOString(),
  };

  store.portal_feedback.push(entry);
  saveStore();
  res.status(201).json({ id: entry.id, message: 'Thank you for your feedback' });
});

// ── ADMIN: Get all feedback for a portal ─────────────────────────────────────
router.get('/:portalId', (req, res) => {
  ensure();
  const store = getStore();
  const { page_slug, rating, days, limit, offset } = req.query;
  let items = (store.portal_feedback || []).filter(f => f.portal_id === req.params.portalId);

  // Filters
  if (page_slug) items = items.filter(f => f.page_slug === page_slug);
  if (rating) items = items.filter(f => f.rating === parseInt(rating));
  if (days) {
    const cutoff = new Date(Date.now() - parseInt(days) * 86400000).toISOString();
    items = items.filter(f => f.created_at >= cutoff);
  }

  // Sort newest first
  items.sort((a, b) => b.created_at.localeCompare(a.created_at));

  const total = items.length;
  const lim = parseInt(limit) || 50;
  const off = parseInt(offset) || 0;
  items = items.slice(off, off + lim);

  res.json({ items, total, limit: lim, offset: off });
});

// ── ADMIN: Aggregated stats for a portal ─────────────────────────────────────
router.get('/:portalId/stats', (req, res) => {
  ensure();
  const store = getStore();
  const { days } = req.query;
  const cutoff = days ? new Date(Date.now() - parseInt(days) * 86400000).toISOString() : null;
  let items = (store.portal_feedback || []).filter(f => f.portal_id === req.params.portalId);
  if (cutoff) items = items.filter(f => f.created_at >= cutoff);

  if (!items.length) {
    return res.json({
      total: 0, avg_rating: 0, rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      by_page: [], by_reason: [], recent: [], trend: [],
    });
  }

  // Rating distribution
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  items.forEach(f => { dist[f.rating] = (dist[f.rating] || 0) + 1; });

  // Average
  const avg = items.reduce((s, f) => s + f.rating, 0) / items.length;

  // By page
  const pageMap = {};
  items.forEach(f => {
    if (!pageMap[f.page_slug]) pageMap[f.page_slug] = { slug: f.page_slug, count: 0, total_rating: 0, ratings: [] };
    pageMap[f.page_slug].count++;
    pageMap[f.page_slug].total_rating += f.rating;
    pageMap[f.page_slug].ratings.push(f.rating);
  });
  const byPage = Object.values(pageMap).map(p => ({
    ...p,
    avg_rating: Math.round((p.total_rating / p.count) * 10) / 10,
    ratings: undefined, total_rating: undefined,
  })).sort((a, b) => b.count - a.count);

  // By reason
  const reasonMap = {};
  items.filter(f => f.reason).forEach(f => {
    reasonMap[f.reason] = (reasonMap[f.reason] || 0) + 1;
  });
  const byReason = Object.entries(reasonMap).map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  // Daily trend (last 30 days)
  const trend = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const dayItems = items.filter(f => f.created_at.startsWith(dateStr));
    trend.push({
      date: dateStr,
      count: dayItems.length,
      avg: dayItems.length ? Math.round((dayItems.reduce((s, f) => s + f.rating, 0) / dayItems.length) * 10) / 10 : null,
    });
  }

  // NPS-like score: % of 4-5 ratings minus % of 1-2 ratings
  const promoters = items.filter(f => f.rating >= 4).length;
  const detractors = items.filter(f => f.rating <= 2).length;
  const nps = Math.round(((promoters - detractors) / items.length) * 100);

  // Identified vs anonymous
  const identified = items.filter(f => f.visitor_email).length;

  res.json({
    total: items.length,
    avg_rating: Math.round(avg * 10) / 10,
    nps,
    identified,
    anonymous: items.length - identified,
    rating_distribution: dist,
    by_page: byPage,
    by_reason: byReason,
    trend,
    recent: items.slice(0, 10).map(f => ({
      id: f.id, page_slug: f.page_slug, rating: f.rating,
      reason: f.reason, comment: f.comment,
      visitor_name: f.visitor_name, visitor_email: f.visitor_email,
      created_at: f.created_at,
    })),
  });
});

// ── ADMIN: Delete a feedback entry ───────────────────────────────────────────
router.delete('/:portalId/:feedbackId', (req, res) => {
  ensure();
  const store = getStore();
  const idx = (store.portal_feedback || []).findIndex(
    f => f.id === req.params.feedbackId && f.portal_id === req.params.portalId
  );
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  store.portal_feedback.splice(idx, 1);
  saveStore();
  res.json({ deleted: true });
});

module.exports = router;
