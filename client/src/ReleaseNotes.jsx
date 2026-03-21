// client/src/ReleaseNotes.jsx
import { useState, useEffect, useRef } from "react";

const F = "var(--t-font, 'Geist', sans-serif)";

const CATEGORY_META = {
  feature:     { label: 'New Feature',  color: 'var(--t-accent, #4361EE)',  bg: 'var(--t-accent-light, #EEF2FF)' },
  improvement: { label: 'Improvement',  color: '#0CAF77', bg: '#F0FDF4' },
  fix:         { label: 'Bug Fix',      color: '#F59F00', bg: '#FFFBEB' },
  security:    { label: 'Security',     color: '#EF4444', bg: '#FEF2F2' },
};

const PATHS = {
  bell:    "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  x:       "M18 6L6 18M6 6l12 12",
  check:   "M20 6L9 17l-5-5",
  plus:    "M12 5v14M5 12h14",
  edit:    "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:   "M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
  sparkle: "M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2",
  back:    "M19 12H5M12 19l-7-7 7-7",
};
const Ic = ({ n, s = 16, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
    stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n]} />
  </svg>
);

const api = {
  get:   async p => { const r = await fetch(`/api${p}`); return r.json(); },
  post:  async (p, b) => { const r = await fetch(`/api${p}`, { method:'POST',  headers:{'Content-Type':'application/json'}, body: JSON.stringify(b) }); return r.json(); },
  patch: async (p, b) => { const r = await fetch(`/api${p}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(b) }); return r.json(); },
  del:   async p =>    { const r = await fetch(`/api${p}`, { method:'DELETE' }); return r.json(); },
};

// ── WhatsNew bell button (for top bar) ───────────────────────────────────────
export function WhatsNewButton() {
  const [open,     setOpen]     = useState(false);
  const [notes,    setNotes]    = useState([]);
  const [lastSeen, setLastSeen] = useState(() => localStorage.getItem('vrc_news_seen') || '2000-01-01');
  const [selected, setSelected] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    api.get('/release-notes').then(d => setNotes(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    const handler = e => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unread = notes.filter(n => new Date(n.published_at) > new Date(lastSeen)).length;

  const handleOpen = () => {
    if (!open) { const now = new Date().toISOString(); localStorage.setItem('vrc_news_seen', now); setLastSeen(now); }
    setOpen(o => !o);
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0 }} ref={panelRef}>
      <button onClick={handleOpen} title="What's new" style={{
        width: 34, height: 34, borderRadius: 8, border: '1px solid var(--t-border, #E5E7EB)',
        background: open ? 'var(--t-accent-light, #EEF2FF)' : 'var(--t-surface, #fff)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', transition: 'all .15s',
      }}>
        <Ic n="bell" s={16} c={open ? 'var(--t-accent, #4361EE)' : 'var(--t-text3, #6B7280)'} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 99,
            background: 'var(--t-accent, #4361EE)', color: '#fff', fontSize: 9, fontWeight: 800,
            fontFamily: F, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--t-bg, #f7f8fc)',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 42, right: 0, width: 380, zIndex: 800,
          background: 'var(--t-surface, #fff)', borderRadius: 16,
          border: '1px solid var(--t-border, #E5E7EB)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.12)', overflow: 'hidden', fontFamily: F,
        }}>
          {selected ? (
            <NoteDetail note={selected} onBack={() => setSelected(null)} />
          ) : (
            <>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--t-border, #E5E7EB)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t-text1, #111827)' }}>What's New</div>
                  <div style={{ fontSize: 11, color: 'var(--t-text3, #6B7280)' }}>{notes.length} releases</div>
                </div>
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t-text3)', padding: 4 }}>
                  <Ic n="x" s={14} />
                </button>
              </div>
              <div style={{ maxHeight: 440, overflowY: 'auto' }}>
                {notes.length === 0
                  ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--t-text3)', fontSize: 13 }}>No release notes yet.</div>
                  : notes.map(note => {
                    const isNew = new Date(note.published_at) > new Date(lastSeen);
                    const meta  = CATEGORY_META[note.category] || CATEGORY_META.feature;
                    return (
                      <div key={note.id} onClick={() => setSelected(note)} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--t-border, #E5E7EB)', background: isNew ? '#FAFBFF' : 'transparent', transition: 'background .1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--t-accent-light, #EEF2FF)'}
                        onMouseLeave={e => e.currentTarget.style.background = isNew ? '#FAFBFF' : 'transparent'}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Ic n="sparkle" s={14} c={meta.color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-text1, #111827)', flex: 1 }}>{note.title}</span>
                              {isNew && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', background: 'var(--t-accent, #4361EE)', color: '#fff', borderRadius: 99 }}>NEW</span>}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--t-text3, #6B7280)', marginBottom: 3 }}>v{note.version} · {new Date(note.published_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</div>
                            <div style={{ fontSize: 12, color: 'var(--t-text2, #374151)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.summary}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NoteDetail({ note, onBack }) {
  const meta = CATEGORY_META[note.category] || CATEGORY_META.feature;
  return (
    <div>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--t-border, #E5E7EB)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}>
          <Ic n="back" s={14} c="var(--t-text3, #6B7280)" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-text1, #111827)' }}>{note.title}</div>
          <div style={{ fontSize: 11, color: 'var(--t-text3, #6B7280)' }}>v{note.version}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: meta.bg, color: meta.color }}>{meta.label}</span>
      </div>
      <div style={{ padding: '14px 16px', maxHeight: 400, overflowY: 'auto' }}>
        <div style={{ fontSize: 11, color: 'var(--t-text3)', marginBottom: 10 }}>
          {new Date(note.published_at).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </div>
        {note.summary && (
          <div style={{ fontSize: 13, color: 'var(--t-text2, #374151)', lineHeight: 1.6, marginBottom: 14, padding: '10px 12px', background: 'var(--t-bg, #f7f8fc)', borderRadius: 8 }}>
            {note.summary}
          </div>
        )}
        {note.features?.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>What's included</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {note.features.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--t-text2)', lineHeight: 1.5 }}>
                  <span style={{ color: meta.color, flexShrink: 0, marginTop: 2 }}><Ic n="check" s={13} c={meta.color} /></span>
                  {f}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Admin panel (for /superadmin only) ───────────────────────────────────────
export function ReleaseNotesAdmin() {
  const [notes,   setNotes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving,  setSaving]  = useState(false);

  const load = async () => {
    setLoading(true);
    const d = await api.get('/release-notes?published_only=false');
    setNotes(Array.isArray(d) ? d : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async form => {
    setSaving(true);
    try {
      if (form.id) await api.patch(`/release-notes/${form.id}`, form);
      else         await api.post('/release-notes', form);
      await load(); setEditing(null);
    } finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!confirm('Delete this release note?')) return;
    await api.del(`/release-notes/${id}`); await load();
  };

  const handleTogglePublish = async note => {
    await api.patch(`/release-notes/${note.id}`, { published: !note.published }); await load();
  };

  if (editing !== null) return <NoteEditor note={editing} onSave={handleSave} onCancel={() => setEditing(null)} saving={saving} />;

  return (
    <div style={{ padding: '24px 28px', fontFamily: F, color: 'var(--t-text1, #e2e8f0)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Release Notes</div>
          <div style={{ fontSize: 13, color: 'var(--t-text3, #94a3b8)', marginTop: 2 }}>Manage what's new notifications shown to all platform users.</div>
        </div>
        <button onClick={() => setEditing({})} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'#7C3AED', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F }}>
          <Ic n="plus" s={14} c="#fff" /> New Release Note
        </button>
      </div>
      {loading ? <div style={{ padding:40, textAlign:'center', color:'#64748b' }}>Loading…</div>
      : notes.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, color:'#64748b' }}>
          <div>No release notes yet.</div>
          <button onClick={() => setEditing({})} style={{ marginTop:12, padding:'8px 16px', background:'#7C3AED', color:'#fff', border:'none', borderRadius:8, fontSize:13, cursor:'pointer', fontFamily:F }}>Create First Note</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {notes.map(note => {
            const meta = CATEGORY_META[note.category] || CATEGORY_META.feature;
            return (
              <div key={note.id} style={{ background:'#1e293b', borderRadius:12, border:'1px solid #334155', padding:'14px 16px', display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background: meta.bg + '22', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Ic n="sparkle" s={16} c={meta.color} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:14, fontWeight:700, color:'#e2e8f0' }}>{note.title}</span>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background: meta.color + '22', color: meta.color }}>{meta.label}</span>
                    {!note.published && <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'#334155', color:'#94a3b8' }}>DRAFT</span>}
                  </div>
                  <div style={{ fontSize:12, color:'#64748b', marginBottom:3 }}>v{note.version} · {new Date(note.published_at || note.created_at).toLocaleDateString()} · {note.features?.length || 0} features</div>
                  <div style={{ fontSize:12, color:'#94a3b8' }}>{note.summary}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                  <button onClick={() => handleTogglePublish(note)} style={{ padding:'5px 10px', borderRadius:6, border:'1px solid #334155', background: note.published ? '#0CAF77' : 'transparent', color: note.published ? '#fff' : '#94a3b8', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:F }}>
                    {note.published ? 'Published' : 'Publish'}
                  </button>
                  <button onClick={() => setEditing(note)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:4, display:'flex' }}><Ic n="edit" s={14} /></button>
                  <button onClick={() => handleDelete(note.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444', padding:4, display:'flex' }}><Ic n="trash" s={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
