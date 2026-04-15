// client/src/ActivationChecklist.jsx
import { useState, useEffect } from 'react';
import { tFetch } from './apiClient.js';

const C = { accent:'#4361EE', accentL:'#EEF2FF', text1:'#0D0D0F', text2:'#374151', text3:'#6b7280', border:'#e5e7eb', green:'#10b981', white:'#ffffff' };
const F = "'DM Sans', -apple-system, sans-serif";

const ICONS = {
  building:"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  globe:"M12 2a10 10 0 100 20A10 10 0 0012 2zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  briefcase:"M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  'user-plus':"M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM20 8v6M23 11h-6",
  mail:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  'check-circle':"M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3",
  check:"M20 6L9 17l-5-5", x:"M18 6L6 18M6 6l12 12",
};
const Ic = ({n,s=16,c='currentColor'}) => {
  const d = ICONS[n]||'';
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d.split('M').filter(Boolean).map((seg,i)=><path key={i} d={`M${seg}`}/>)}
  </svg>;
};

function ProgressRing({pct,size=68,stroke=5}){
  const r=size/2-stroke; const circ=2*Math.PI*r; const offset=circ*(1-pct/100);
  return(
    <svg width={size} height={size} style={{transform:'rotate(-90deg)',flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.accent} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{transition:'stroke-dashoffset .5s ease'}}/>
    </svg>
  );
}

export default function ActivationChecklist({ environmentId, compact=false }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const load = () => {
    if (!environmentId) return;
    tFetch(`/api/onboarding/${environmentId}`)
      .then(r=>r.json()).then(d=>{ setData(d); setLoading(false); })
      .catch(()=>setLoading(false));
  };

  useEffect(load, [environmentId]);

  const dismiss = async () => {
    await tFetch(`/api/onboarding/${environmentId}/dismiss`,{method:'POST'});
    setDismissed(true);
  };

  const handleCta = async (step) => {
    if (step.cta_action.startsWith('navigate:')) {
      const target = step.cta_action.replace('navigate:','');
      window.dispatchEvent(new CustomEvent('talentos:navigate',{detail:target}));
    } else if (step.cta_action === 'create_job') {
      window.dispatchEvent(new CustomEvent('talentos:quick-create',{detail:'jobs'}));
    } else if (step.cta_action === 'create_person') {
      window.dispatchEvent(new CustomEvent('talentos:quick-create',{detail:'people'}));
    }
    // Mark step complete
    await tFetch(`/api/onboarding/${environmentId}/complete`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({step_id:step.id}),
    });
    load();
  };

  if (dismissed || loading || !data) return null;
  if (data.progress?.all_done && !compact) {
    // Auto-dismiss after all done
    setTimeout(dismiss, 2000);
    return null;
  }

  const { steps, progress } = data;
  const incomplete = steps.filter(s=>!s.completed);
  const next = incomplete[0];

  if (compact) {
    return (
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',
        borderRadius:12,border:`1.5px solid ${C.border}`,background:C.white,cursor:'pointer',fontFamily:F}}
        onClick={()=>window.dispatchEvent(new CustomEvent('talentos:open-checklist'))}>
        <ProgressRing pct={progress.percentage} size={44} stroke={4}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:700,color:C.text1}}>Setup {progress.percentage}% complete</div>
          {next&&<div style={{fontSize:11,color:C.text3,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>Next: {next.title}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{background:C.white,borderRadius:16,border:`1.5px solid ${C.border}`,overflow:'hidden',fontFamily:F,marginBottom:24}}>
      {/* Header */}
      <div style={{padding:'18px 20px',background:`linear-gradient(135deg,#4361EE,#7c3aed)`,display:'flex',alignItems:'center',gap:14}}>
        <ProgressRing pct={progress.percentage} size={64} stroke={5}/>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:800,color:'white'}}>
            {progress.percentage===100 ? '🎉 All set up!' : `Get started — ${progress.percentage}% complete`}
          </div>
          <div style={{fontSize:12,color:'rgba(255,255,255,.8)',marginTop:3}}>
            {progress.completed_count}/{progress.total_count} steps · {progress.points_earned} pts earned
          </div>
        </div>
        <button onClick={dismiss}
          style={{background:'rgba(255,255,255,.15)',border:'none',borderRadius:8,padding:'5px 8px',cursor:'pointer',color:'white',display:'flex'}}>
          <Ic n="x" s={14} c="white"/>
        </button>
      </div>

      {/* Steps */}
      <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:4}}>
        {steps.map(step=>(
          <div key={step.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',
            borderRadius:10,background:step.completed?'#f0fdf4':C.white,
            border:`1px solid ${step.completed?'#86efac':C.border}`,transition:'all .2s'}}>
            <div style={{width:28,height:28,borderRadius:8,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
              background:step.completed?C.green:C.accentL}}>
              {step.completed
                ? <Ic n="check" s={14} c="white"/>
                : <Ic n={step.icon} s={14} c={C.accent}/>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:step.completed?500:600,color:step.completed?C.text3:C.text1,
                textDecoration:step.completed?'line-through':'none'}}>{step.title}</div>
              {!step.completed&&<div style={{fontSize:11,color:C.text3,marginTop:1}}>{step.description}</div>}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              <span style={{fontSize:10,fontWeight:700,color:step.completed?C.green:C.text3}}>{step.points}pts</span>
              {!step.completed&&step.cta&&(
                <button onClick={()=>handleCta(step)}
                  style={{padding:'4px 10px',borderRadius:7,border:`1.5px solid ${C.accent}`,background:C.accentL,
                    color:C.accent,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:F,whiteSpace:'nowrap'}}>
                  {step.cta}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
