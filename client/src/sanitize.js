/**
 * sanitize.js — Client-side HTML sanitisation via DOMPurify.
 *
 * Use these helpers everywhere dangerouslySetInnerHTML is used.
 * Never pass unsanitised strings to dangerouslySetInnerHTML.
 *
 * Usage:
 *   import { sanitizeHtml, sanitizeMarkdown } from './sanitize';
 *   <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }} />
 */
import DOMPurify from 'dompurify';

// ── Config: what tags / attributes are allowed ────────────────────────────────

/** Rich-text content (records, notes, portal pages).
 *  Allows safe formatting but strips scripts, iframes, event handlers. */
const RICH_TEXT_CONFIG = {
  ALLOWED_TAGS: [
    'p','br','b','i','em','strong','u','s','strike','del',
    'h1','h2','h3','h4','h5','h6',
    'ul','ol','li',
    'blockquote','pre','code',
    'table','thead','tbody','tr','th','td',
    'a','span','div','hr',
    'img',  // allow images (src is sanitised below)
  ],
  ALLOWED_ATTR: [
    'href','target','rel',   // links
    'src','alt','width','height',  // images
    'style','class',         // formatting
    'colspan','rowspan',     // tables
  ],
  // Force links to open safely
  FORCE_HTTPS: true,
  ADD_ATTR: ['target'],
};

/** Copilot / AI messages — same as rich text but also allow <table> constructs
 *  produced by the markdown renderer. */
const COPILOT_CONFIG = {
  ...RICH_TEXT_CONFIG,
  ALLOWED_TAGS: [...RICH_TEXT_CONFIG.ALLOWED_TAGS, 'mark', 'small', 'kbd'],
};

/** Minimal — plain text with basic inline formatting only (email previews). */
const INLINE_CONFIG = {
  ALLOWED_TAGS: ['b','i','em','strong','u','br','span','a'],
  ALLOWED_ATTR: ['href','target','rel','style'],
};

// ── Hooks applied once after DOM is ready ────────────────────────────────────
// Ensure all links open in a new tab with noopener (prevent tab-napping)
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel',    'noopener noreferrer');
  }
  // Block javascript: URLs on any element
  ['src','href','action'].forEach(attr => {
    if (node.hasAttribute(attr)) {
      const val = node.getAttribute(attr).trim().toLowerCase();
      if (val.startsWith('javascript:') || val.startsWith('data:text')) {
        node.removeAttribute(attr);
      }
    }
  });
});

// ── Public helpers ─────────────────────────────────────────────────────────

/** Sanitise arbitrary HTML for rich-text field rendering. */
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, RICH_TEXT_CONFIG);
}

/** Sanitise markdown-converted HTML from the AI copilot. */
export function sanitizeCopilot(html) {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, COPILOT_CONFIG);
}

/** Sanitise email / workflow preview content (inline only). */
export function sanitizeInline(html) {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, INLINE_CONFIG);
}

/** Strip ALL HTML — return plain text only. */
export function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
