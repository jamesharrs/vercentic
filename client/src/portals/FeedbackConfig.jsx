// client/src/portals/FeedbackConfig.jsx
// Two exports:
//   FeedbackConfigPanel — portal builder settings tab for configuring the feedback widget
//   FeedbackReports     — analytics/reports view for portal feedback data
import { useState, useEffect, useCallback } from 'react';

const F = "'Geist','DM Sans',-apple-system,sans-serif";

// Shared Lucide-style icons
const Ic = ({ d, s = 16, c = 'currentColor' }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
);
const ICONS = {
  star:    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  chat:    'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  check:   'M20 6L9 17l-5-5',
  x:       'M18 6L6 18M6 6l12 12',
  plus:    'M12 5v14M5 12h14',
  trash:   'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  eye:     'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  globe:   'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  user:    'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  mail:    'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
  filter:  'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
};

const DEFAULT_REASONS = [
  'Found what I needed',
  'Page was confusing',
  'Information missing',
  'Slow or broken',
  'Great experience',
  'Other',
];

// ─── Shared styles ───────────────────────────────────────────────────────────
const label = { fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 };
const inp = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, fontFamily: F, outline: 'none', boxSizing: 'border-box', color: '#111827' };
const toggle = (on, accent = '#4361EE') => ({
  width: 36, height: 20, borderRadius: 10, background: on ? accent : '#D1D5DB',
  position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0, border: 'none',
});
const toggleDot = (on) => ({
  position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16,
  borderRadius: '50%', background: 'white', transition: 'left 0.2s',
  boxShadow: '0 1px 3px rgba(0,0,0,.2)',
});

// ═══════════════════════════════════════════════════════════════════════════════
// FeedbackConfigPanel — lives inside portal builder / portal settings
// ═══════════════════════════════════════════════════════════════════════════════
export function FeedbackConfigPanel({ portal, onChange, accent = '#4361EE' }) {
  const fb = portal?.feedback || {};
  const pages = portal?.pages || [];

  const update = (key, val) => {
    const updated = { ...portal, feedback: { ...fb, [key]: val } };
    onChange(updated);
  };

  const selectedPages = fb.pages || [];
  const isAllPages = selectedPages.includes('__all__') || selectedPages.length === 0;

  const togglePage = (slug) => {
    if (slug === '__all__') {
      update('pages', ['__all__']);
      return;
    }
    let next = selectedPages.filter(s => s !== '__all__');
    if (next.includes(slug)) next = next.filter(s => s !== slug);
    else next = [...next, slug];
    update('pages', next.length ? next : ['__all__']);
  };

  const [newReason, setNewReason] = useState('');
  const reasons = fb.reasons?.length ? fb.reasons : DEFAULT_REASONS;

  const addReason = () => {
    if (!newReason.trim()) return;
    update('reasons', [...reasons, newReason.trim()]);
    setNewReason('');
  };
  const removeReason = (idx) => {
    update('reasons', reasons.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: F }}>
      {/* Enable toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: fb.enabled ? '#F0FDF4' : '#F9FAFB', borderRadius: 12, border: `1px solid ${fb.enabled ? '#BBF7D0' : '#E5E7EB'}` }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Visitor Feedback</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Show a floating feedback widget on portal pages</div>
        </div>
        <button onClick={() => update('enabled', !fb.enabled)} style={toggle(fb.enabled, accent)}>
          <div style={toggleDot(fb.enabled)}/>
        </button>
      </div>

      {fb.enabled && (
        <>
          {/* Page selection */}
          <div>
            <div style={label}>Show on pages</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button onClick={() => togglePage('__all__')}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: F,
                  border: `1.5px solid ${isAllPages ? accent : '#E5E7EB'}`,
                  background: isAllPages ? `${accent}0A` : 'white',
                  color: isAllPages ? accent : '#6B7280', cursor: 'pointer',
                }}>
                All pages
              </button>
              {pages.map(pg => {
                const slug = pg.slug || `/${pg.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                const active = !isAllPages && selectedPages.includes(slug);
                return (
                  <button key={pg.id} onClick={() => togglePage(slug)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: active ? 600 : 400, fontFamily: F,
                      border: `1.5px solid ${active ? accent : '#E5E7EB'}`,
                      background: active ? `${accent}0A` : 'white',
                      color: active ? accent : '#6B7280', cursor: 'pointer',
                    }}>
                    {pg.name || slug}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Widget text */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={label}>Button text</div>
              <input value={fb.button_text || ''} onChange={e => update('button_text', e.target.value)} placeholder="Feedback" style={inp}/>
            </div>
            <div>
              <div style={label}>Widget title</div>
              <input value={fb.title || ''} onChange={e => update('title', e.target.value)} placeholder="How was this page?" style={inp}/>
            </div>
          </div>

          {/* Position */}
          <div>
            <div style={label}>Widget position</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ id: 'bottom-right', label: 'Bottom right' }, { id: 'bottom-left', label: 'Bottom left' }, { id: 'bottom-center', label: 'Bottom center' }].map(pos => {
                const active = (fb.position || 'bottom-right') === pos.id;
                return (
                  <button key={pos.id} onClick={() => update('position', pos.id)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: active ? 700 : 400,
                      border: `1.5px solid ${active ? accent : '#E5E7EB'}`, fontFamily: F,
                      background: active ? `${accent}0A` : 'white', color: active ? accent : '#6B7280', cursor: 'pointer',
                    }}>
                    {pos.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reasons */}
          <div>
            <div style={label}>Feedback reasons</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {reasons.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #F3F4F6' }}>
                  <span style={{ flex: 1, fontSize: 13, color: '#374151' }}>{r}</span>
                  <button onClick={() => removeReason(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
                    <Ic d={ICONS.x} s={12} c="#9CA3AF"/>
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <input value={newReason} onChange={e => setNewReason(e.target.value)}
                  placeholder="Add custom reason..." style={{ ...inp, flex: 1 }}
                  onKeyDown={e => { if (e.key === 'Enter') addReason(); }}/>
                <button onClick={addReason} style={{ padding: '0 14px', borderRadius: 8, background: accent, border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: F }}>Add</button>
              </div>
            </div>
          </div>

          {/* Identity collection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Collect visitor details</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>Show name & email fields if visitor is known or opts in</div>
              </div>
              <button onClick={() => update('collect_identity', !(fb.collect_identity !== false))} style={toggle(fb.collect_identity !== false, accent)}>
                <div style={toggleDot(fb.collect_identity !== false)}/>
              </button>
            </div>
            {fb.collect_identity !== false && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Require name & email</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>Won't allow submission without identity</div>
                </div>
                <button onClick={() => update('identity_required', !fb.identity_required)} style={toggle(fb.identity_required, accent)}>
                  <div style={toggleDot(fb.identity_required)}/>
                </button>
              </div>
            )}
          </div>

          {/* Thank you customisation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={label}>Thank you title</div>
              <input value={fb.thank_you_title || ''} onChange={e => update('thank_you_title', e.target.value)} placeholder="Thank you!" style={inp}/>
            </div>
            <div>
              <div style={label}>Thank you message</div>
              <input value={fb.thank_you_text || ''} onChange={e => update('thank_you_text', e.target.value)} placeholder="Your feedback helps us improve." style={inp}/>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// FeedbackReports — analytics view shown in portal admin
// ═══════════════════════════════════════════════════════════════════════════════

const StarDisplay = ({ rating, size = 14 }) => (
  <span style={{ display: 'inline-flex', gap: 1 }}>
    {[1,2,3,4,5].map(n => (
      <svg key={n} width={size} height={size} viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill={n <= rating ? '#F59E0B' : '#E5E7EB'} stroke={n <= rating ? '#D97706' : '#D1D5DB'} strokeWidth="1"/>
      </svg>
    ))}
  </span>
);

const RATING_COLORS = { 1: '#EF4444', 2: '#F97316', 3: '#EAB308', 4: '#22C55E', 5: '#059669' };

export function FeedbackReports({ portalId, accent = '#4361EE', api }) {
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [pageFilter, setPageFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        api.get(`/portal-feedback/${portalId}/stats?days=${days}`),
        api.get(`/portal-feedback/${portalId}?days=${days}&limit=100`),
      ]);
      setStats(s);
      setItems(r?.items || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [portalId, days]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontFamily: F }}>Loading feedback data...</div>;
  if (!stats || stats.total === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', fontFamily: F }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FEF3C7', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ic d={ICONS.star} s={22} c="#D97706"/>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>No feedback yet</div>
        <div style={{ fontSize: 13, color: '#6B7280' }}>Feedback will appear here once visitors start rating pages.</div>
      </div>
    );
  }

  const filteredItems = items.filter(f => {
    if (pageFilter && f.page_slug !== pageFilter) return false;
    if (ratingFilter && f.rating !== ratingFilter) return false;
    return true;
  });

  const maxDist = Math.max(...Object.values(stats.rating_distribution));

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Period selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>Feedback Overview</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{
                padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: days === d ? 700 : 400,
                border: `1.5px solid ${days === d ? accent : '#E5E7EB'}`, fontFamily: F,
                background: days === d ? `${accent}0A` : 'white', color: days === d ? accent : '#6B7280', cursor: 'pointer',
              }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total responses', value: stats.total, color: accent },
          { label: 'Average rating', value: stats.avg_rating + ' / 5', color: '#F59E0B' },
          { label: 'NPS Score', value: stats.nps > 0 ? '+' + stats.nps : stats.nps, color: stats.nps >= 0 ? '#059669' : '#EF4444' },
          { label: 'Identified', value: stats.identified + ' / ' + stats.total, color: '#8B5CF6' },
        ].map(kpi => (
          <div key={kpi.label} style={{ padding: '16px', background: 'white', borderRadius: 12, border: '1px solid #F3F4F6' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color, marginTop: 4 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Rating distribution */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #F3F4F6', padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Rating Distribution</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[5, 4, 3, 2, 1].map(n => {
            const count = stats.rating_distribution[n] || 0;
            const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 60, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <StarDisplay rating={n} size={12}/>
                </div>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${maxDist ? (count / maxDist) * 100 : 0}%`, background: RATING_COLORS[n], borderRadius: 4, transition: 'width 0.3s' }}/>
                </div>
                <div style={{ width: 40, fontSize: 12, fontWeight: 600, color: '#374151', textAlign: 'right' }}>{count}</div>
                <div style={{ width: 36, fontSize: 11, color: '#9CA3AF', textAlign: 'right' }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* By page */}
      {stats.by_page.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #F3F4F6', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>By Page</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {stats.by_page.map(pg => (
              <div key={pg.slug} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#F9FAFB' }}>
                <Ic d={ICONS.globe} s={14} c="#9CA3AF"/>
                <span style={{ flex: 1, fontSize: 13, color: '#374151', fontWeight: 500 }}>{pg.slug}</span>
                <StarDisplay rating={Math.round(pg.avg_rating)} size={12}/>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', width: 40, textAlign: 'right' }}>{pg.avg_rating}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF', width: 50, textAlign: 'right' }}>{pg.count} resp.</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By reason */}
      {stats.by_reason.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #F3F4F6', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Top Reasons</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {stats.by_reason.map(r => (
              <div key={r.reason} style={{ padding: '6px 14px', borderRadius: 20, background: `${accent}0A`, border: `1px solid ${accent}20`, fontSize: 12, color: accent, fontWeight: 600 }}>
                {r.reason} <span style={{ color: '#9CA3AF', fontWeight: 400 }}>({r.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + feed */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', flex: 1 }}>Recent Feedback</div>
          {stats.by_page.length > 1 && (
            <select value={pageFilter} onChange={e => setPageFilter(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: 7, border: '1.5px solid #E5E7EB', fontSize: 12, fontFamily: F, color: '#374151' }}>
              <option value="">All pages</option>
              {stats.by_page.map(pg => <option key={pg.slug} value={pg.slug}>{pg.slug}</option>)}
            </select>
          )}
          <select value={ratingFilter} onChange={e => setRatingFilter(parseInt(e.target.value))}
            style={{ padding: '5px 10px', borderRadius: 7, border: '1.5px solid #E5E7EB', fontSize: 12, fontFamily: F, color: '#374151' }}>
            <option value={0}>All ratings</option>
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} star{n !== 1 ? 's' : ''}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredItems.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No feedback matching filters.</div>
          )}
          {filteredItems.map(f => (
            <div key={f.id} style={{ padding: '12px 14px', background: 'white', borderRadius: 10, border: '1px solid #F3F4F6', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {/* Rating badge */}
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: `${RATING_COLORS[f.rating]}14`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 800, color: RATING_COLORS[f.rating],
              }}>
                {f.rating}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <StarDisplay rating={f.rating} size={11}/>
                  {f.reason && <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, background: '#F3F4F6', color: '#6B7280' }}>{f.reason}</span>}
                  <span style={{ fontSize: 10, color: '#D1D5DB', marginLeft: 'auto' }}>{f.page_slug}</span>
                </div>
                {f.comment && <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginTop: 2 }}>{f.comment}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  {(f.visitor_name || f.visitor_email) ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Ic d={ICONS.user} s={11} c="#9CA3AF"/>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>
                        {f.visitor_name || ''} {f.visitor_email ? `(${f.visitor_email})` : ''}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: '#D1D5DB', fontStyle: 'italic' }}>Anonymous</span>
                  )}
                  <span style={{ fontSize: 10, color: '#D1D5DB' }}>
                    {new Date(f.created_at).toLocaleDateString()} {new Date(f.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
