// client/src/superadmin/FeaturePacks.jsx
import { useState, useEffect, useCallback } from 'react';

const C = { bg:'#0D0F1A', surface:'#151828', surface2:'#1C2035', border:'#2A2F4A', text1:'#F0F4FF', text2:'#A8B4D8', text3:'#6B7599', accent:'#7C5CDB', green:'#0CA678', amber:'#F59F00' };
const F = "'DM Sans', sans-serif";

const PLAN_COLORS = {
  null:       { bg:'#1C2035', text:'#6B7599', label:'Always on'  },
  starter:    { bg:'#1C3520', text:'#0CA678', label:'Starter+'   },
  growth:     { bg:'#1C2535', text:'#7C5CDB', label:'Growth+'    },
  enterprise: { bg:'#2A1C35', text:'#C084FC', label:'Enterprise' },
};

function PackCard({ pack, enabled, onChange, saving }) {
  const planMeta = PLAN_COLORS[pack.min_plan] || PLAN_COLORS.null;
  return (
    <div style={{ background:C.surface2, border:`1.5px solid ${enabled?C.accent+'60':C.border}`, borderRadius:12, padding:'16px 18px', display:'flex', alignItems:'flex-start', gap:14, transition:'border-color 0.2s' }}>
      <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:enabled?C.accent+'25':'#1C2035', border:`1px solid ${enabled?C.accent+'40':C.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:15 }}>
          {pack.category === 'AI' ? '✦' : pack.category === 'Candidate Experience' ? '💬' : pack.category === 'Recruitment' ? '📋' : pack.category === 'Analytics' ? '📊' : pack.category === 'HR' ? '🏢' : '⚙'}
        </span>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ fontSize:13, fontWeight:700, color:C.text1 }}>{pack.name}</span>
          {pack.is_core
            ? <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'#1C3520', color:C.green }}>Core</span>
            : <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:planMeta.bg, color:planMeta.text }}>{planMeta.label}</span>
          }
        </div>
        <p style={{ fontSize:12, color:C.text3, margin:0, lineHeight:1.5 }}>{pack.description}</p>
      </div>
      <div style={{ flexShrink:0, paddingTop:2 }}>
        {pack.is_core
          ? <span style={{ fontSize:11, color:C.text3 }}>🔒 Always on</span>
          : <button onClick={() => !saving && onChange(!enabled)} disabled={saving} style={{ width:44, height:24, borderRadius:12, border:'none', background:enabled?C.accent:'#2A2F4A', cursor:saving?'wait':'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
              <div style={{ position:'absolute', top:3, left:enabled?23:3, width:18, height:18, borderRadius:'50%', background:'white', transition:'left 0.2s' }}/>
            </button>
        }
      </div>
    </div>
  );
}

export default function FeaturePacksAdmin({ environmentId, readOnly = false }) {
  const [catalogue, setCatalogue] = useState([]);
  const [saving,    setSaving]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/feature-packs?environment_id=${environmentId}`);
      const data = await res.json();
      setCatalogue(Array.isArray(data) ? data : []);
    } catch { setCatalogue([]); }
    setLoading(false);
  }, [environmentId]);

  useEffect(() => { if (environmentId) load(); }, [load, environmentId]);

  const handleToggle = async (key, newValue) => {
    if (readOnly || saving) return;
    setSaving(key);
    try {
      await fetch(`/api/feature-packs/${key}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ environment_id:environmentId, enabled:newValue }) });
      setCatalogue(c => c.map(p => p.key===key ? { ...p, enabled:newValue } : p));
    } catch { await load(); }
    setSaving(null);
  };

  if (loading) return <div style={{ padding:40, textAlign:'center', color:C.text3, fontSize:13 }}>Loading features…</div>;

  const categories   = [...new Set(catalogue.map(p => p.category))];
  const enabledCount = catalogue.filter(p => p.enabled).length;

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div>
            <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:C.text1 }}>Feature Packs</h3>
            <p style={{ margin:'4px 0 0', fontSize:12, color:C.text3 }}>{enabledCount} of {catalogue.length} packs enabled</p>
          </div>
          {!readOnly && (
            <button onClick={async () => {
              const keys = catalogue.filter(p => !p.is_core && !p.enabled).map(p => p.key);
              setSaving('bulk');
              await fetch('/api/feature-packs/bulk', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ environment_id:environmentId, keys }) });
              await load(); setSaving(null);
            }} style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F }}>
              Enable all
            </button>
          )}
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {['all', ...categories].map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{ padding:'4px 12px', borderRadius:20, border:'none', background:filter===cat?C.accent:C.surface2, color:filter===cat?'white':C.text3, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F }}>
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {catalogue.filter(p => filter==='all' || p.category===filter).map(pack => (
          <PackCard key={pack.key} pack={pack} enabled={pack.enabled} saving={saving===pack.key||saving==='bulk'} onChange={(val) => handleToggle(pack.key, val)}/>
        ))}
      </div>
    </div>
  );
}
