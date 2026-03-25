// client/src/portals/FeedbackWidget.jsx
// Floating per-page feedback widget for published portals
// Reads config from portal.feedback, submits to /api/portal-feedback/:portalId
import { useState, useEffect } from 'react';

const DEFAULT_REASONS = [
  'Found what I needed',
  'Page was confusing',
  'Information missing',
  'Slow or broken',
  'Great experience',
  'Other',
];

// Simple star SVG
const Star = ({ filled, hovered, size = 28, onClick, onMouseEnter, onMouseLeave }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" onClick={onClick}
    onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
    style={{ cursor: 'pointer', transition: 'transform 0.15s', transform: (hovered || filled) ? 'scale(1.12)' : 'scale(1)' }}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      fill={filled ? '#F59E0B' : hovered ? '#FCD34D' : '#E5E7EB'}
      stroke={filled ? '#D97706' : hovered ? '#F59E0B' : '#D1D5DB'}
      strokeWidth="1.2" strokeLinejoin="round"/>
  </svg>
);

// Lucide-style icons as inline SVGs (no emoji)
const IcFeedback = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const IcCheck = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IcX = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IcChevDown = ({ size = 12, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// Generate a simple session ID per page load
const getSessionId = () => {
  if (!window.__fbSessionId) window.__fbSessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return window.__fbSessionId;
};

export default function FeedbackWidget({ portal, currentPageSlug, api, visitor }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [name, setName] = useState(visitor?.name || '');
  const [email, setEmail] = useState(visitor?.email || '');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);

  const config = portal?.feedback || {};
  const theme = portal?.theme || {};
  const accent = theme.primaryColor || '#4361EE';
  const font = theme.fontFamily || "'Geist', -apple-system, sans-serif";
  const reasons = config.reasons?.length ? config.reasons : DEFAULT_REASONS;
  const collectIdentity = config.collect_identity !== false;
  const identityRequired = config.identity_required === true;

  // Reset when page changes
  useEffect(() => {
    setSubmitted(false);
    setRating(0);
    setReason('');
    setComment('');
    setOpen(false);
    setDismissed(false);
  }, [currentPageSlug]);

  // Don't show if not enabled or page not selected
  if (!config.enabled) return null;
  const pages = config.pages || [];
  if (pages.length > 0 && !pages.includes('__all__') && !pages.includes(currentPageSlug)) return null;
  if (dismissed) return null;

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      await api.post(`/portal-feedback/${portal.id}`, {
        page_slug: currentPageSlug || '/',
        rating,
        reason: reason || null,
        comment: comment || null,
        visitor_name: name || null,
        visitor_email: email || null,
        session_id: getSessionId(),
      });
      setSubmitted(true);
      setTimeout(() => { setOpen(false); setDismissed(true); }, 2800);
    } catch (e) {
      console.error('Feedback submit failed:', e);
    }
    setSubmitting(false);
  };

  // Widget position
  const position = config.position || 'bottom-right';
  const posStyle = {
    'bottom-right': { bottom: 20, right: 20 },
    'bottom-left':  { bottom: 20, left: 20 },
    'bottom-center': { bottom: 20, left: '50%', transform: 'translateX(-50%)' },
  }[position] || { bottom: 20, right: 20 };

  // ── Collapsed tab ──
  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{
          position: 'fixed', ...posStyle, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '10px 18px', borderRadius: 50,
          background: accent, color: 'white', border: 'none',
          fontSize: 13, fontWeight: 700, fontFamily: font,
          cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,.2)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = (posStyle.transform || '') + ' scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,0,0,.25)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = posStyle.transform || ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.2)'; }}
      >
        <IcFeedback size={15} color="white"/>
        {config.button_text || 'Feedback'}
      </button>
    );
  }

  // ── Expanded form ──
  return (
    <div style={{
      position: 'fixed', ...posStyle, zIndex: 9999,
      width: 340, maxHeight: '80vh', overflowY: 'auto',
      background: 'white', borderRadius: 16,
      boxShadow: '0 12px 48px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.06)',
      fontFamily: font,
      animation: 'fbSlideUp 0.25s ease-out',
    }}>
      <style>{`
        @keyframes fbSlideUp { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }
        @keyframes fbPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '14px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #F3F4F6',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IcFeedback size={14} color={accent}/>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
            {config.title || 'How was this page?'}
          </span>
        </div>
        <button onClick={() => { setOpen(false); setDismissed(true); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}
          onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <IcX size={16} color="#9CA3AF"/>
        </button>
      </div>

      {submitted ? (
        /* ── Thank you state ── */
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: '#ECFDF5', margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fbPulse 0.5s ease-out',
          }}>
            <IcCheck size={24} color="#059669"/>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
            {config.thank_you_title || 'Thank you!'}
          </div>
          <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>
            {config.thank_you_text || 'Your feedback helps us improve this experience.'}
          </div>
        </div>
      ) : (
        /* ── Form ── */
        <div style={{ padding: '16px' }}>
          {/* Star rating */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, fontWeight: 500 }}>
              {config.rating_label || 'Rate your experience'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <Star key={n}
                  filled={n <= rating}
                  hovered={n <= hoverRating && n > rating}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                />
              ))}
            </div>
            {rating > 0 && (
              <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginTop: 6 }}>
                {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}
              </div>
            )}
          </div>

          {/* Reason selector — only show after rating */}
          {rating > 0 && (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Reason
                </div>
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setReasonOpen(!reasonOpen)}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      border: '1.5px solid #E5E7EB', background: 'white',
                      fontSize: 13, color: reason ? '#111827' : '#9CA3AF',
                      textAlign: 'left', cursor: 'pointer', fontFamily: font,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                    <span>{reason || 'Select a reason...'}</span>
                    <IcChevDown size={12} color="#9CA3AF"/>
                  </button>
                  {reasonOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                      background: 'white', borderRadius: 10, border: '1px solid #E5E7EB',
                      boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 10, overflow: 'hidden',
                    }}>
                      {reasons.map(r => (
                        <button key={r}
                          onClick={() => { setReason(r); setReasonOpen(false); }}
                          style={{
                            width: '100%', padding: '9px 14px', border: 'none', background: reason === r ? `${accent}0A` : 'white',
                            fontSize: 13, color: reason === r ? accent : '#374151',
                            textAlign: 'left', cursor: 'pointer', fontFamily: font,
                            fontWeight: reason === r ? 600 : 400,
                          }}
                          onMouseEnter={e => { if (reason !== r) e.currentTarget.style.background = '#F9FAFB'; }}
                          onMouseLeave={e => { if (reason !== r) e.currentTarget.style.background = 'white'; }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Comment */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Additional comments <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
                </div>
                <textarea value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Tell us more..."
                  rows={3}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: '1.5px solid #E5E7EB', fontSize: 13, fontFamily: font,
                    resize: 'vertical', outline: 'none', color: '#111827',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = accent}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>

              {/* Identity fields */}
              {collectIdentity && (
                <div style={{ marginBottom: 14, display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', marginBottom: 4 }}>
                      Name {identityRequired && <span style={{ color: '#EF4444' }}>*</span>}
                    </div>
                    <input value={name} onChange={e => setName(e.target.value)}
                      placeholder="Your name"
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: 7,
                        border: '1.5px solid #E5E7EB', fontSize: 12, fontFamily: font,
                        outline: 'none', color: '#111827', boxSizing: 'border-box',
                      }}
                      onFocus={e => e.target.style.borderColor = accent}
                      onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', marginBottom: 4 }}>
                      Email {identityRequired && <span style={{ color: '#EF4444' }}>*</span>}
                    </div>
                    <input value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com" type="email"
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: 7,
                        border: '1.5px solid #E5E7EB', fontSize: 12, fontFamily: font,
                        outline: 'none', color: '#111827', boxSizing: 'border-box',
                      }}
                      onFocus={e => e.target.style.borderColor = accent}
                      onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                    />
                  </div>
                </div>
              )}

              {/* Submit */}
              <button onClick={handleSubmit}
                disabled={submitting || !rating || (identityRequired && (!name.trim() || !email.trim()))}
                style={{
                  width: '100%', padding: '10px', borderRadius: 10,
                  background: accent, color: 'white', border: 'none',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: font, opacity: (!rating || submitting) ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}>
                {submitting ? 'Sending...' : 'Submit feedback'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
