import { useState, useEffect, useCallback } from "react";

const C = {
  bg:"var(--t-bg,#EEF2FF)",card:"var(--t-card,#ffffff)",accent:"var(--t-accent,#4361EE)",
  accentLight:"var(--t-accent-light,#EEF2FF)",text1:"var(--t-text1,#111827)",
  text2:"var(--t-text2,#374151)",text3:"var(--t-text3,#9CA3AF)",border:"var(--t-border,#E5E7EB)",
};
const F = "'DM Sans',-apple-system,sans-serif";
const api = { get:(u)=>fetch(u).then(r=>r.json()) };

function Ic({n,s=16,c="currentColor"}){
  const paths={
    check:"M20 6L9 17l-5-5",x:"M18 6L6 18M6 6l12 12",warning:"M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
    refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
    loader:"M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
    zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",toggle:"M15 8a7 7 0 010 8M2 12h13",
    link:"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
    grid:"M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  };
  return(
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[n]||"M12 12h.01"}/>
    </svg>
  );
}

// ── Integration Monitor Component ─────────────────────────────────────────────
function IntegrationMonitor({ environment, connections, onRetest }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterProvider, setFilterProvider] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const envId = environment?.id;

  const load = useCallback(async () => {
    if (!envId) return;
    try {
      const d = await api.get(`/integrations/monitor?environment_id=${envId}&limit=300`);
      if (!d.error) setData(d);
    } catch {}
    setLoading(false);
  }, [envId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  const events = data?.events || [];
  const providers = data?.providers || [];
  const summary = data?.summary || {};

  // Filter events
  const visibleEvents = events.filter(e => {
    if (filterProvider !== 'all' && e.provider !== filterProvider) return false;
    if (filterStatus === 'success' && !e.ok) return false;
    if (filterStatus === 'error' && e.ok) return false;
    return true;
  });

  // Unique providers in event log
  const eventProviders = [...new Set(events.map(e => e.provider))];

  function relTime(ts) {
    if (!ts) return '—';
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
  }

  function actionLabel(action) {
    const map = {
      new_application:'New Application', interview_scheduled:'Interview Scheduled',
      offer_accepted:'Offer Accepted', stage_change:'Stage Change',
      create_meeting:'Meeting Created', message:'Message Sent',
    };
    return map[action] || action.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  }


  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300,color:C.text3,fontFamily:F,gap:10}}>
      <Ic n="loader" s={18} c={C.text3}/>Loading monitor…
    </div>
  );

  return (
    <div style={{fontFamily:F,display:'flex',flexDirection:'column',gap:20}}>

      {/* Summary strip */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10}}>
        {[
          {label:'Connected',     value:summary.active||0,          color:'#0CA678', icon:'check'},
          {label:'Errors',        value:summary.errors||0,          color:summary.errors?'#EF4444':C.text3, icon:'warning'},
          {label:'Pending Test',  value:summary.pending_test||0,    color:'#F59F00', icon:'zap'},
          {label:'Events Today',  value:summary.events_today||0,    color:C.accent,  icon:'refresh'},
          {label:'Success Today', value:summary.events_success_today||0, color:'#0CA678', icon:'check'},
          {label:'Errors Today',  value:summary.events_errors_today||0,  color:summary.events_errors_today?'#EF4444':C.text3, icon:'warning'},
        ].map(s=>(
          <div key={s.label} style={{background:C.card,borderRadius:14,padding:'12px 16px',border:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:s.color+'18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Ic n={s.icon} s={15} c={s.color}/>
            </div>
            <div>
              <div style={{fontSize:18,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:11,color:C.text3,marginTop:2}}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1.6fr',gap:16,alignItems:'start'}}>

        {/* Provider health cards */}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text1}}>Provider Health</div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:11,color:C.text3}}>{autoRefresh?'Auto-refreshing':'Paused'}</span>
              <button onClick={()=>setAutoRefresh(p=>!p)}
                style={{width:28,height:28,borderRadius:7,border:`1px solid ${C.border}`,background:autoRefresh?C.accentLight:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Ic n="toggle" s={13} c={autoRefresh?C.accent:C.text3}/>
              </button>
              <button onClick={load}
                style={{width:28,height:28,borderRadius:7,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Ic n="refresh" s={13} c={C.text3}/>
              </button>
            </div>
          </div>

          {providers.length === 0 ? (
            <div style={{padding:'32px 20px',textAlign:'center',color:C.text3,background:C.card,borderRadius:14,border:`1px solid ${C.border}`}}>
              <Ic n="link" s={28} c={C.text3}/>
              <div style={{marginTop:10,fontSize:13,fontWeight:600}}>No integrations connected</div>
              <div style={{fontSize:12,marginTop:4}}>Connect providers in the Library tab to see health here</div>
            </div>
          ) : providers.map(p => {
            const statusColor = p.status==='active'?'#0CA678':p.status==='error'?'#EF4444':'#F59F00';
            const successRate = p.success_rate !== null ? p.success_rate : null;
            return (
              <div key={p.id} style={{background:C.card,borderRadius:14,padding:'14px 16px',border:`1.5px solid ${p.status==='error'?'#FEE2E2':C.border}`,display:'flex',flexDirection:'column',gap:8}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:statusColor,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{p.provider_name}</div>
                    <div style={{fontSize:11,color:C.text3}}>{p.provider_category?.replace(/_/g,' ')}</div>
                  </div>
                  <button onClick={()=>onRetest(p.id)} title="Re-test connection"
                    style={{width:26,height:26,borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Ic n="zap" s={12} c={C.text3}/>
                  </button>
                </div>

                {/* Success rate bar */}
                {p.events_total > 0 && (
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:C.text3,marginBottom:4}}>
                      <span>{p.events_total} events</span>
                      <span style={{color:successRate>=90?'#0CA678':successRate>=70?'#F59F00':'#EF4444',fontWeight:600}}>{successRate}% success</span>
                    </div>
                    <div style={{height:4,borderRadius:99,background:C.border,overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:99,background:successRate>=90?'#0CA678':successRate>=70?'#F59F00':'#EF4444',width:`${successRate}%`,transition:'width .3s'}}/>
                    </div>
                    {p.events_errors > 0 && <div style={{fontSize:11,color:'#EF4444',marginTop:3}}>{p.events_errors} error{p.events_errors!==1?'s':''}</div>}
                  </div>
                )}

                <div style={{display:'flex',gap:12,fontSize:11,color:C.text3}}>
                  <span>Tested: {relTime(p.last_tested_at)}</span>
                  {p.last_event_at && <span>Last event: {relTime(p.last_event_at)}</span>}
                </div>

                {p.test_result && !p.test_result.ok && (
                  <div style={{padding:'6px 10px',borderRadius:8,background:'#FEE2E2',fontSize:11,color:'#991B1B',display:'flex',gap:6}}>
                    <Ic n="warning" s={12} c="#991B1B"/>
                    {p.test_result.message}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Event log */}
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text1,flex:1}}>Event Log</div>
            {/* Provider filter */}
            <select value={filterProvider} onChange={e=>setFilterProvider(e.target.value)}
              style={{padding:'5px 8px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F,color:C.text2,background:C.card,outline:'none'}}>
              <option value="all">All providers</option>
              {eventProviders.map(p=><option key={p} value={p}>{p.replace(/_/g,' ')}</option>)}
            </select>
            {/* Status filter */}
            {['all','success','error'].map(s=>(
              <button key={s} onClick={()=>setFilterStatus(s)}
                style={{padding:'4px 10px',borderRadius:99,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:F,border:'none',
                  background:filterStatus===s?(s==='error'?'#FEE2E2':s==='success'?'#D1FAE5':C.accentLight):'transparent',
                  color:filterStatus===s?(s==='error'?'#991B1B':s==='success'?'#065F46':C.accent):C.text3}}>
                {s.charAt(0).toUpperCase()+s.slice(1)}
              </button>
            ))}
          </div>

          {visibleEvents.length === 0 ? (
            <div style={{padding:'40px 20px',textAlign:'center',color:C.text3}}>
              <Ic n="refresh" s={24} c={C.text3}/>
              <div style={{marginTop:10,fontSize:13,fontWeight:600}}>No events yet</div>
              <div style={{fontSize:12,marginTop:4}}>Events will appear here when integrations fire</div>
            </div>
          ) : (
            <div style={{overflowY:'auto',maxHeight:520}}>
              {visibleEvents.map(ev=>(
                <div key={ev.id} style={{padding:'10px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'flex-start',gap:10}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.bg}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  {/* Status dot */}
                  <div style={{width:7,height:7,borderRadius:'50%',background:ev.ok?'#0CA678':'#EF4444',marginTop:5,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                      <span style={{fontSize:12,fontWeight:600,color:C.text1}}>{actionLabel(ev.action)}</span>
                      <span style={{padding:'1px 7px',borderRadius:99,fontSize:10,fontWeight:600,background:C.bg,color:C.text3}}>{ev.provider.replace(/_/g,' ')}</span>
                      {ev.duration_ms && <span style={{fontSize:10,color:C.text3}}>{ev.duration_ms}ms</span>}
                    </div>
                    {ev.detail && <div style={{fontSize:11,color:ev.ok?C.text3:'#991B1B',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{ev.detail}</div>}
                  </div>
                  <div style={{fontSize:11,color:C.text3,flexShrink:0,marginTop:1}}>{relTime(ev.timestamp)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export { IntegrationMonitor };
