// client/src/EngagementScore.jsx
import { useState, useEffect, useCallback } from "react";
import api from "./apiClient";
const C = {
  accent:      'var(--t-accent, #4361EE)',
  accentLight: 'var(--t-accentLight, #EEF2FF)',
  text1:       'var(--t-text1, #111827)',
  text2:       'var(--t-text2, #374151)',
  text3:       'var(--t-text3, #9ca3af)',
  border:      'var(--t-border, #e5e7eb)',
  surface:     'var(--t-surface, #ffffff)',
  bg:          'var(--t-bg, #f5f7ff)',
};
const F = "'DM Sans', -apple-system, sans-serif";

function ScoreRing({ score, color, size = 44 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(100, Math.max(0, score)) / 100;
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={5}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round"/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:size<40?11:13, fontWeight:800, color, lineHeight:1 }}>{score}</span>
        {size>=40 && <span style={{ fontSize:8, color:C.text3, fontWeight:600, marginTop:1 }}>/ 100</span>}
      </div>
    </div>
  );
}

function BucketRow({ label, score, weight, color, details, expanded, onToggle }) {
  const contribution = Math.round(score * weight);
  return (
    <div>
      <div onClick={onToggle} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', cursor:'pointer', userSelect:'none' }}>
        <ScoreRing score={score} color={color} size={32}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontSize:12, fontWeight:600, color:C.text2 }}>{label}</span>
            <span style={{ fontSize:11, color:C.text3 }}>{Math.round(weight*100)}% weight · +{contribution} pts</span>
          </div>
          <div style={{ height:4, borderRadius:99, background:'#f0f0f0', overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:99, background:color, width:`${score}%`, transition:'width 0.6s cubic-bezier(.4,0,.2,1)' }}/>
          </div>
        </div>
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth={2.5}
          style={{ transform:expanded?'rotate(180deg)':'none', transition:'transform .2s', flexShrink:0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {expanded && details?.length > 0 && (
        <div style={{ marginLeft:42, marginBottom:6, padding:'8px 10px', background:C.bg, borderRadius:8, border:`1px solid ${C.border}` }}>
          {details.map((d,i) => <div key={i} style={{ fontSize:11, color:C.text2, lineHeight:1.7 }}>· {d}</div>)}
        </div>
      )}
    </div>
  );
}

// ── Compact badge for the identity/functionality bar ─────────────────────────
export function EngagementBadge({ recordId, onClick }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!recordId) return;
    api.get(`/engagement/${recordId}`).then(d => setData(d)).catch(() => {});
  }, [recordId]);
  if (!data) return null;
  return (
    <div onClick={onClick} title={`Engagement: ${data.grade}`}
      style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:99,
        background:data.color+'15', border:`1.5px solid ${data.color}30`,
        cursor:onClick?'pointer':'default', transition:'opacity .15s', userSelect:'none' }}
      onMouseEnter={e=>{ if(onClick) e.currentTarget.style.opacity='.8'; }}
      onMouseLeave={e=>{ e.currentTarget.style.opacity='1'; }}>
      <ScoreRing score={data.score} color={data.color} size={22}/>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:11, fontWeight:700, color:data.color, lineHeight:1 }}>{data.score}</div>
        <div style={{ fontSize:9, color:data.color+'aa', fontWeight:600, lineHeight:1, marginTop:1, whiteSpace:'nowrap' }}>{data.grade}</div>
      </div>
    </div>
  );
}

// ── Full breakdown panel ──────────────────────────────────────────────────────
export function EngagementPanel({ recordId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded,setExpanded]= useState({});

  const load = useCallback(() => {
    if (!recordId) return;
    setLoading(true);
    api.get(`/engagement/${recordId}`).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [recordId]);
  useEffect(() => { load(); }, [load]);

  const toggle = (key) => setExpanded(e => ({ ...e, [key]:!e[key] }));

  if (loading) return <div style={{ padding:'20px 0', textAlign:'center', color:C.text3, fontSize:13 }}>Computing score…</div>;
  if (!data)   return <div style={{ padding:'20px 0', textAlign:'center', color:C.text3, fontSize:13 }}>Could not compute score.</div>;

  const BUCKET_COLORS = { communications:'#4361EE', process:'#7c3aed', responsiveness:'#0891b2', profile:'#059669' };
  const lastContact = data.meta.last_contact
    ? new Date(data.meta.last_contact).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
    : 'Never';

  return (
    <div style={{ fontFamily:F }}>
      {/* Header card */}
      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'16px', borderRadius:12,
        background:`linear-gradient(135deg,${data.color}12,${data.color}06)`, border:`1.5px solid ${data.color}25`, marginBottom:16 }}>
        <ScoreRing score={data.score} color={data.color} size={56}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:18, fontWeight:800, color:data.color, lineHeight:1 }}>{data.grade}</div>
          <div style={{ fontSize:12, color:C.text3, marginTop:4 }}>Last contact: {lastContact}</div>
          <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
            {[`${data.meta.comms_count} comms`,`${data.meta.interviews_count} interviews`,`${data.meta.links_count} links`,`${data.meta.forms_count} forms`].map(m=>(
              <span key={m} style={{ fontSize:10, fontWeight:600, color:C.text3, background:C.bg, borderRadius:99, padding:'2px 8px', border:`1px solid ${C.border}` }}>{m}</span>
            ))}
          </div>
        </div>
        <button onClick={load} title="Recalculate" style={{ background:'none', border:'none', cursor:'pointer', padding:4, color:C.text3 }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        </button>
      </div>

      {/* Buckets */}
      <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:'4px 14px' }}>
        {Object.entries(data.buckets).map(([key,bucket],i,arr)=>(
          <div key={key}>
            <BucketRow label={bucket.label} score={bucket.score} weight={bucket.weight}
              color={BUCKET_COLORS[key]||C.accent} details={bucket.details}
              expanded={!!expanded[key]} onToggle={()=>toggle(key)}/>
            {i<arr.length-1 && <div style={{ height:1, background:C.border, margin:'0 -2px' }}/>}
          </div>
        ))}
      </div>
      <div style={{ fontSize:10, color:C.text3, marginTop:8, textAlign:'right' }}>Computed {new Date(data.meta.computed_at).toLocaleString()}</div>
    </div>
  );
}

export default EngagementPanel;
