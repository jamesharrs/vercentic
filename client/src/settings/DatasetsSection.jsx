// client/src/settings/DatasetsSection.jsx
import { useState, useEffect, useCallback } from 'react';

const F = "'DM Sans', -apple-system, sans-serif";
const C = { accent:'#4361EE', accentLight:'#EEF2FF', bg:'#F7F8FA', text1:'#111827', text2:'#374151', text3:'#6B7280', text4:'#9CA3AF', border:'#E5E7EB', green:'#0CAF77', amber:'#F59F00', red:'#EF4444', purple:'#7C3AED' };
const api = { get: u => fetch(u).then(r=>r.json()), post:(u,b)=>fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()), patch:(u,b)=>fetch(u,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()), put:(u,b)=>fetch(u,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()), delete:u=>fetch(u,{method:'DELETE'}).then(r=>r.json()) };

const PATHS = { plus:'M12 5v14M5 12h14', trash:'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6', edit:'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z', x:'M18 6L6 18M6 6l12 12', check:'M20 6L9 17l-5-5', search:'M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z', grip:'M9 3h1v1H9V3zM14 3h1v1h-1V3zM9 8h1v1H9V8zM14 8h1v1h-1V8zM9 13h1v1H9v-1zM14 13h1v1h-1v-1z', copy:'M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-2M8 4h8a2 2 0 012 2v2M8 4a2 2 0 012-2h4a2 2 0 012 2', layers:'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' };
function Ic({ n, s=16, c=C.text3, style={} }) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d={PATHS[n]||''}/></svg>; }
function Btn({ children, onClick, variant='default', size='md', disabled, style={} }) {
  const sz = { sm:{padding:'5px 10px',fontSize:12}, md:{padding:'8px 14px',fontSize:13} };
  const vr = { default:{background:'white',color:C.text2,border:`1.5px solid ${C.border}`}, primary:{background:C.accent,color:'white',border:'none'}, danger:{background:'#FEF2F2',color:C.red,border:`1.5px solid #FECACA`}, ghost:{background:'transparent',color:C.text3,border:'none'} };
  return <button onClick={onClick} disabled={disabled} style={{ fontFamily:F, cursor:disabled?'not-allowed':'pointer', display:'inline-flex', alignItems:'center', gap:6, borderRadius:8, fontWeight:600, transition:'all .15s', opacity:disabled?0.5:1, ...sz[size], ...vr[variant], ...style }}>{children}</button>;
}
function Input({ value, onChange, placeholder, style={} }) { return <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{ fontFamily:F, fontSize:13, padding:'7px 10px', borderRadius:8, border:`1.5px solid ${C.border}`, outline:'none', background:'white', color:C.text1, width:'100%', boxSizing:'border-box', ...style }}/>; }
function Badge({ children, color=C.accent, light=false }) { return <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700, background:light?`${color}18`:color, color:light?color:'white', fontFamily:F }}>{children}</span>; }
function Modal({ open, onClose, title, width=540, children }) {
  if (!open) return null;
  return <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.35)' }} onClick={onClose}>
    <div style={{ background:'white', borderRadius:16, width, maxWidth:'95vw', maxHeight:'85vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }} onClick={e=>e.stopPropagation()}>
      <div style={{ padding:'18px 22px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:15, fontWeight:700, color:C.text1, fontFamily:F }}>{title}</span>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer' }}><Ic n="x" s={16} c={C.text3}/></button>
      </div>
      <div style={{ padding:'20px 22px' }}>{children}</div>
    </div>
  </div>;
}

// ── Colour picker presets ────────────────────────────────────────────────────
const OPTION_COLORS = ['#4361EE','#0CA678','#7C3AED','#F59F00','#EF4444','#1098AD','#E03131','#37B24D','#F76707','#845EF7','#6B7280','#111827'];

// ── DatasetEditor modal ──────────────────────────────────────────────────────
function DatasetEditor({ open, onClose, dataset, environment, onSaved }) {
  const [name, setName]     = useState('');
  const [desc, setDesc]     = useState('');
  const [opts, setOpts]     = useState([]);
  const [newOpt, setNewOpt] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);

  useEffect(() => {
    if (dataset) { setName(dataset.name); setDesc(dataset.description||''); setOpts((dataset.options||[]).map(o=>({ label:o.label, color:o.color||null }))); }
    else { setName(''); setDesc(''); setOpts([]); }
    setNewOpt('');
  }, [dataset, open]);

  function addOpt() {
    const trimmed = newOpt.trim();
    if (!trimmed) return;
    // Support pasting a comma-separated list
    const parts = trimmed.split(',').map(p=>p.trim()).filter(Boolean);
    setOpts(prev => [...prev, ...parts.map(p=>({ label:p, color:null }))]);
    setNewOpt('');
  }

  function removeOpt(i) { setOpts(prev=>prev.filter((_,idx)=>idx!==i)); }
  function setOptColor(i, color) { setOpts(prev=>prev.map((o,idx)=>idx===i?{...o,color}:o)); }

  function handleDragStart(i) { setDragIdx(i); }
  function handleDragOver(e, i) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    setOpts(prev => { const next=[...prev]; const [moved]=next.splice(dragIdx,1); next.splice(i,0,moved); return next; });
    setDragIdx(i);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    if (dataset) {
      await api.patch(`/api/datasets/${dataset.id}`, { name, description: desc });
      await api.put(`/api/datasets/${dataset.id}/options`, opts);
    } else {
      const created = await api.post('/api/datasets', { name, description: desc, options: opts.map(o=>o.label), environment_id: environment?.id });
      if (created.id && opts.some(o=>o.color)) {
        // Patch colors on newly created options
        const fresh = await api.get(`/api/datasets/${created.id}`);
        (fresh.options||[]).forEach((o,i) => { if (opts[i]?.color) api.patch(`/api/datasets/${created.id}/options/${o.id}`, { color: opts[i].color }); });
      }
    }
    setSaving(false); onSaved();
  }

  const isSystem = dataset?.is_system;

  return (
    <Modal open={open} onClose={onClose} title={dataset ? `Edit: ${dataset.name}` : 'New Data Set'} width={540}>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:600, color:C.text2, marginBottom:4, fontFamily:F }}>Name *</div>
        <Input value={name} onChange={setName} placeholder="e.g. Seniority Levels, Department List" style={{ opacity: isSystem ? 0.6 : 1 }} />
        {isSystem && <div style={{ fontSize:11, color:C.text4, marginTop:4, fontFamily:F }}>System datasets can have their options edited but not renamed.</div>}
      </div>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:12, fontWeight:600, color:C.text2, marginBottom:4, fontFamily:F }}>Description</div>
        <Input value={desc} onChange={setDesc} placeholder="Optional — describes when to use this list" />
      </div>

      {/* Options list */}
      <div style={{ marginBottom:6, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:12, fontWeight:700, color:C.text2, fontFamily:F }}>Options ({opts.length})</div>
        <div style={{ fontSize:11, color:C.text4, fontFamily:F }}>Drag to reorder · click colour dot to change</div>
      </div>

      <div style={{ maxHeight:280, overflowY:'auto', marginBottom:10, display:'flex', flexDirection:'column', gap:4 }}>
        {opts.map((opt, i) => (
          <div key={i} draggable onDragStart={()=>handleDragStart(i)} onDragOver={e=>handleDragOver(e,i)} onDragEnd={()=>setDragIdx(null)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'white', borderRadius:8, border:`1.5px solid ${C.border}`, cursor:'grab', opacity: dragIdx===i ? 0.5 : 1 }}>
            <Ic n="grip" s={14} c={C.text4}/>
            {/* Colour dot */}
            <div style={{ position:'relative' }}>
              <div style={{ width:16, height:16, borderRadius:'50%', background:opt.color||C.border, cursor:'pointer', flexShrink:0 }}
                onClick={e=>{ e.stopPropagation(); setOpts(prev=>prev.map((o,idx)=>idx===i?{...o,_showPicker:!o._showPicker}:o)); }}/>
              {opt._showPicker && (
                <div style={{ position:'absolute', top:22, left:0, zIndex:100, background:'white', borderRadius:10, padding:8, boxShadow:'0 4px 16px rgba(0,0,0,0.15)', display:'flex', flexWrap:'wrap', gap:4, width:140 }}>
                  {OPTION_COLORS.map(col=>(<div key={col} onClick={()=>{ setOptColor(i,col); setOpts(prev=>prev.map((o,idx)=>idx===i?{...o,_showPicker:false}:o)); }} style={{ width:20, height:20, borderRadius:'50%', background:col, cursor:'pointer', border: opt.color===col?'2px solid #111':'none' }}/>))}
                  <div onClick={()=>{ setOptColor(i,null); setOpts(prev=>prev.map((o,idx)=>idx===i?{...o,_showPicker:false}:o)); }} style={{ width:20, height:20, borderRadius:'50%', background:'white', border:`1.5px solid ${C.border}`, cursor:'pointer', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', color:C.text4 }}>✕</div>
                </div>
              )}
            </div>
            <span style={{ flex:1, fontSize:13, color:C.text1, fontFamily:F }}>{opt.label}</span>
            <button onClick={()=>removeOpt(i)} style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}><Ic n="x" s={13} c={C.red}/></button>
          </div>
        ))}
        {opts.length === 0 && <div style={{ textAlign:'center', padding:'16px 0', color:C.text4, fontSize:13, fontFamily:F }}>No options yet — add some below</div>}
      </div>

      {/* Add option input */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        <Input value={newOpt} onChange={setNewOpt} placeholder="Add option (or paste comma-separated list)" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addOpt();}}} style={{ flex:1 }}/>
        <Btn onClick={addOpt} disabled={!newOpt.trim()}><Ic n="plus" s={13} c={C.text2}/>Add</Btn>
      </div>

      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn onClick={handleSave} variant="primary" disabled={saving||!name.trim()}>
          <Ic n="check" s={13} c="white"/>{saving?'Saving…':dataset?'Save Changes':'Create Data Set'}
        </Btn>
      </div>
    </Modal>
  );
}

// ── Main DatasetsSection ──────────────────────────────────────────────────────
export default function DatasetsSection({ environment }) {
  const [datasets, setDatasets]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState(null); // null | { mode, dataset }
  const [expanded, setExpanded]   = useState({});
  const [copied, setCopied]       = useState(null);
  const envId = environment?.id;

  const load = useCallback(async () => {
    if (!envId) return;
    setLoading(true);
    const r = await api.get(`/api/datasets?environment_id=${envId}`);
    setDatasets(Array.isArray(r) ? r : []);
    setLoading(false);
  }, [envId]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(ds) {
    if (ds.is_system) return;
    if (!confirm(`Delete "${ds.name}"? This cannot be undone.`)) return;
    await api.delete(`/api/datasets/${ds.id}`);
    load();
  }

  function handleCopySlug(slug) {
    navigator.clipboard?.writeText(slug);
    setCopied(slug);
    setTimeout(() => setCopied(null), 1500);
  }

  const filtered = datasets.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase())
  );

  const system  = filtered.filter(d => d.is_system);
  const custom  = filtered.filter(d => !d.is_system);

  const DatasetCard = ({ ds }) => {
    const isExpanded = !!expanded[ds.id];
    const optCount = ds.options?.length || 0;
    return (
      <div style={{ background:'white', borderRadius:12, border:`1.5px solid ${C.border}`, overflow:'hidden', transition:'all .15s' }}>
        {/* Header row */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', cursor:'pointer' }} onClick={()=>setExpanded(e=>({...e,[ds.id]:!e[ds.id]}))}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:14, fontWeight:700, color:C.text1, fontFamily:F }}>{ds.name}</span>
              {ds.is_system && <Badge color={C.text4} light>system</Badge>}
              <Badge color={C.accent} light>{optCount} option{optCount!==1?'s':''}</Badge>
            </div>
            {ds.description && <div style={{ fontSize:12, color:C.text3, fontFamily:F, marginTop:2 }}>{ds.description}</div>}
          </div>
          {/* Slug copy */}
          <button onClick={e=>{e.stopPropagation();handleCopySlug(ds.slug);}} title="Copy slug" style={{ background:'none', border:'none', cursor:'pointer', padding:4, display:'flex', alignItems:'center', gap:4, fontSize:11, color:C.text4, fontFamily:F }}>
            <Ic n="copy" s={12} c={copied===ds.slug?C.green:C.text4}/>{copied===ds.slug?'Copied!':ds.slug}
          </button>
          <button onClick={e=>{e.stopPropagation();setModal({mode:'edit',dataset:ds});}} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}><Ic n="edit" s={14} c={C.text4}/></button>
          {!ds.is_system && <button onClick={e=>{e.stopPropagation();handleDelete(ds);}} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}><Ic n="trash" s={14} c={C.red}/></button>}
          <div style={{ fontSize:11, color:C.text4, fontFamily:F }}>{isExpanded?'▲':'▼'}</div>
        </div>

        {/* Expanded options */}
        {isExpanded && (
          <div style={{ borderTop:`1px solid ${C.border}`, padding:'10px 14px', display:'flex', flexWrap:'wrap', gap:6 }}>
            {(ds.options||[]).map((opt,i) => (
              <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:99, fontSize:12, fontWeight:600, fontFamily:F, background: opt.color ? `${opt.color}18` : C.bg, color: opt.color || C.text2, border:`1.5px solid ${opt.color||C.border}` }}>
                {opt.color && <div style={{ width:8, height:8, borderRadius:'50%', background:opt.color, flexShrink:0 }}/>}
                {opt.label}
              </span>
            ))}
            {optCount === 0 && <span style={{ fontSize:12, color:C.text4, fontFamily:F }}>No options — click Edit to add some</span>}
          </div>
        )}
      </div>
    );
  };

  const GroupHeader = ({ label, count }) => (
    <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8, marginTop:20, fontFamily:F, display:'flex', alignItems:'center', gap:8 }}>
      {label} <span style={{ fontSize:11, color:C.text4, fontWeight:400 }}>({count})</span>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16, gap:12 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, color:C.text1, fontFamily:F }}>Data Sets</div>
          <div style={{ fontSize:13, color:C.text3, fontFamily:F, marginTop:2, lineHeight:1.5 }}>
            Reusable option lists for select and multi-select fields. Define once, use anywhere in the data model.
          </div>
        </div>
        <Btn onClick={()=>setModal({mode:'create',dataset:null})} variant="primary" style={{ flexShrink:0 }}>
          <Ic n="plus" s={13} c="white"/>New Data Set
        </Btn>
      </div>

      {/* How to use callout */}
      <div style={{ padding:'10px 14px', background:C.accentLight, borderRadius:10, border:`1.5px solid ${C.accent}30`, fontSize:12, color:C.text2, fontFamily:F, marginBottom:16, display:'flex', gap:10, alignItems:'flex-start' }}>
        <Ic n="layers" s={16} c={C.accent} style={{ flexShrink:0, marginTop:1 }}/>
        <div>
          <strong style={{ color:C.accent }}>How to use:</strong> When configuring a Select or Multi-select field in the Data Model, choose a Data Set as the source. The field will always show the latest options from that set — update here once, and all linked fields update automatically.
        </div>
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:16 }}>
        <Ic n="search" s={13} c={C.text4} style={{ position:'absolute', left:10, top:9 }}/>
        <Input value={search} onChange={setSearch} placeholder="Search data sets…" style={{ paddingLeft:32 }}/>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:C.text3, fontFamily:F }}>Loading…</div>
      ) : (
        <div>
          {custom.length > 0 && (
            <>
              <GroupHeader label="Custom" count={custom.length}/>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:4 }}>
                {custom.map(d => <DatasetCard key={d.id} ds={d}/>)}
              </div>
            </>
          )}
          {custom.length === 0 && !search && (
            <div style={{ textAlign:'center', padding:'24px 0 8px', color:C.text3, fontSize:13, fontFamily:F }}>
              No custom data sets yet. Create one above or use the system defaults below.
            </div>
          )}
          {system.length > 0 && (
            <>
              <GroupHeader label="System (built-in)" count={system.length}/>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {system.map(d => <DatasetCard key={d.id} ds={d}/>)}
              </div>
            </>
          )}
        </div>
      )}

      <DatasetEditor
        open={!!modal}
        onClose={()=>setModal(null)}
        dataset={modal?.dataset}
        environment={environment}
        onSaved={()=>{ setModal(null); load(); }}
      />
    </div>
  );
}
