// client/src/superadmin/ErrorLogViewer.jsx
import { useState, useEffect, useCallback } from 'react';

const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  bg:'#0F1729', card:'#1A2540', border:'#2D3F6B',
  text1:'#F1F5F9', text2:'#94A3B8', accent:'#818CF8',
  success:'#10B981', danger:'#EF4444', warning:'#F59E0B',
};

const SEV_META = {
  error:   { bg:'#FEF2F2', text:'#DC2626', border:'#FECACA' },
  warning: { bg:'#FFFBEB', text:'#D97706', border:'#FDE68A' },
  info:    { bg:'#EFF6FF', text:'#2563EB', border:'#BFDBFE' },
};

function SevBadge({ s }) {
  const m = SEV_META[s] || SEV_META.info;
  return <span style={{ padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700, background:m.bg, color:m.text, border:`1px solid ${m.border}`, textTransform:'uppercase', letterSpacing:'0.05em' }}>{s}</span>;
}

function timeAgo(ts) {
  const d = Date.now() - new Date(ts);
  const m = Math.floor(d/60000);
  if (m<1) return 'just now';
  if (m<60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h<24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

// Simple markdown bold renderer
function renderInlineBold(text) {
  if (!text) return text;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} style={{ color:'#F1F5F9', fontWeight:700 }}>{p.slice(2,-2)}</strong>
      : p
  );
}

export default function ErrorLogViewer() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState('');
  const [sevFilter, setSevFilter] = useState('all');
  const [resolvedFilter, setResolvedFilter] = useState('unresolved');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState({}); // { [logId]: { loading, result, error } }

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page, limit:50 });
    if (sevFilter !== 'all') p.set('severity', sevFilter);
    if (resolvedFilter !== 'all') p.set('resolved', resolvedFilter === 'resolved' ? 'true' : 'false');
    if (search) p.set('search', search);
    const [data, s] = await Promise.all([
      fetch(`/api/error-logs?${p}`).then(r=>r.json()),
      fetch('/api/error-logs/meta/stats').then(r=>r.json()),
    ]);
    setLogs(data.logs || []);
    setTotal(data.total || 0);
    setStats(s);
    setLoading(false);
  }, [page, sevFilter, resolvedFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (log, resolved = true) => {
    setResolving(true);
    await fetch(`/api/error-logs/${log.id}/resolve`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ resolved, resolution_note: note }),
    });
    setNote(''); setSelected(null); setResolving(false); load();
  };

  const handleDelete = async (log) => {
    if (!confirm('Delete this error log permanently?')) return;
    await fetch(`/api/error-logs/${log.id}`, { method:'DELETE' });
    setSelected(null); load();
  };

  const analyseError = async (log) => {
    setAiAnalysis(prev => ({ ...prev, [log.id]: { loading: true, result: null, error: null } }));
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `You are a senior full-stack engineer debugging a React + Express application called Vercentic (a talent acquisition platform).
Analyse the error below and provide:

1. **Root Cause** — what's actually wrong, in plain language
2. **Impact** — what this breaks for the user
3. **Fix** — the exact code change needed (file path, what to change)
4. **Prevention** — how to prevent this class of error in future

Keep your response concise and actionable. Use markdown formatting.
The tech stack is: React 19 + Vite (frontend), Express + JSON file store (backend), deployed on Vercel (client) + Railway (server).`,
          messages: [{
            role: 'user',
            content: `Analyse this error:

**Code:** ${log.code || 'N/A'}
**Severity:** ${log.severity}
**Message:** ${log.message}
**Component:** ${log.component || 'Unknown'}
**URL:** ${log.url || 'N/A'}
**Environment:** ${log.environment_name || 'N/A'}
**User:** ${log.user_email || 'Anonymous'}
**Time:** ${log.created_at}
${log.stack ? '\n**Stack Trace:**\n```\n' + log.stack + '\n```' : ''}
${log.context ? '\n**Additional Context:**\n' + JSON.stringify(log.context, null, 2) : ''}`
          }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(c => c.text || '').join('\n') || data.error || 'No response';
      setAiAnalysis(prev => ({ ...prev, [log.id]: { loading: false, result: text, error: null } }));
    } catch (e) {
      setAiAnalysis(prev => ({ ...prev, [log.id]: { loading: false, result: null, error: e.message } }));
    }
  };

  return (
    <div style={{ fontFamily:F, color:C.text1, minHeight:'100vh', background:C.bg }}>
      {/* Header */}
      <div style={{ padding:'20px 28px 16px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>Error Logs</h2>
            <p style={{ margin:'4px 0 0', fontSize:13, color:C.text2 }}>All application errors reported across environments</p>
          </div>
          <button onClick={load} style={{ padding:'8px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:12, cursor:'pointer', fontFamily:F }}>↻ Refresh</button>
        </div>
        {/* Stat cards */}
        {stats && (
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {[['Total', stats.total, C.accent], ['Unresolved', stats.unresolved, C.danger], ['Last 24h', stats.last_24h, C.warning], ['Last 7d', stats.last_7d, C.accent]].map(([l,v,col]) => (
              <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 18px', minWidth:110 }}>
                <div style={{ fontSize:24, fontWeight:800, color:col, lineHeight:1 }}>{v}</div>
                <div style={{ fontSize:12, color:C.text1, fontWeight:600, marginTop:4 }}>{l}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display:'flex', height:'calc(100vh - 240px)' }}>
        {/* List */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', borderRight:`1px solid ${C.border}` }}>
          {/* Filters */}
          <div style={{ padding:'12px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', gap:8, flexWrap:'wrap' }}>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search…"
              style={{ flex:1, minWidth:140, padding:'7px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:C.card, color:C.text1, fontSize:13, fontFamily:F }} />
            {[['resolvedFilter',resolvedFilter,setResolvedFilter,[['unresolved','Unresolved'],['resolved','Resolved'],['all','All']]],
              ['sevFilter',sevFilter,setSevFilter,[['all','All severities'],['error','Errors'],['warning','Warnings'],['info','Info']]]
            ].map(([key,val,setter,opts])=>(
              <select key={key} value={val} onChange={e=>{setter(e.target.value);setPage(1);}}
                style={{ padding:'7px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:C.card, color:C.text1, fontSize:12, fontFamily:F }}>
                {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            ))}
          </div>
          {/* Rows */}
          <div style={{ flex:1, overflowY:'auto' }}>
            {loading ? <div style={{ padding:40, textAlign:'center', color:C.text2 }}>Loading…</div>
            : logs.length===0 ? (
              <div style={{ padding:60, textAlign:'center', color:C.text2 }}>
                <div style={{ fontSize:36, marginBottom:12, opacity:.4 }}>✓</div>
                <div style={{ fontSize:14 }}>{resolvedFilter==='unresolved'?'All clear — no unresolved errors':'No errors match the current filters'}</div>
              </div>
            ) : logs.map(log => (
              <div key={log.id} onClick={()=>setSelected(s=>s?.id===log.id?null:log)}
                style={{ padding:'13px 18px', borderBottom:`1px solid ${C.border}`, cursor:'pointer',
                  background:selected?.id===log.id?'#1E2E50':'transparent', display:'flex', alignItems:'flex-start', gap:10 }}
                onMouseEnter={e=>{if(selected?.id!==log.id) e.currentTarget.style.background='#172038';}}
                onMouseLeave={e=>{if(selected?.id!==log.id) e.currentTarget.style.background='transparent';}}>
                <div style={{ width:7, height:7, borderRadius:'50%', marginTop:5, flexShrink:0,
                  background:log.severity==='error'?C.danger:log.severity==='warning'?C.warning:C.accent }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                    <code style={{ fontSize:11, padding:'1px 5px', borderRadius:4, background:'#0F1729', color:C.text2, fontFamily:'monospace' }}>{log.code}</code>
                    <SevBadge s={log.severity}/>
                    {log.resolved && <span style={{ fontSize:10, color:C.success, fontWeight:700 }}>✓ RESOLVED</span>}
                    <span style={{ marginLeft:'auto', fontSize:11, color:C.text2 }}>{timeAgo(log.created_at)}</span>
                  </div>
                  <div style={{ fontSize:13, color:C.text1, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.message}</div>
                  <div style={{ display:'flex', gap:10, fontSize:11, color:C.text2, marginTop:2 }}>
                    {log.component && <span>📌 {log.component}</span>}
                    {log.user_email && <span>👤 {log.user_email}</span>}
                    {log.environment_name && <span>🌐 {log.environment_name}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {total>50 && (
            <div style={{ padding:'10px 18px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:12, color:C.text2 }}>{total} total</span>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:12, cursor:'pointer', fontFamily:F }}>← Prev</button>
                <span style={{ fontSize:12, color:C.text2, padding:'4px 0' }}>Page {page}</span>
                <button onClick={()=>setPage(p=>p+1)} disabled={logs.length<50} style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:12, cursor:'pointer', fontFamily:F }}>Next →</button>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ width:400, overflowY:'auto', padding:'18px 22px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
              <div>
                <code style={{ fontSize:11, padding:'3px 7px', borderRadius:6, background:'#0F1729', color:C.text2, fontFamily:'monospace', display:'block', marginBottom:8 }}>{selected.code}</code>
                <SevBadge s={selected.severity}/>
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', color:C.text2, cursor:'pointer', fontSize:18, padding:4 }}>×</button>
            </div>
            <div style={{ background:'#0F1729', borderRadius:10, padding:'12px 14px', marginBottom:14, fontSize:13, color:C.text1, fontWeight:600, lineHeight:1.5 }}>{selected.message}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:18 }}>
              {[['Time',new Date(selected.created_at).toLocaleString()],['User',selected.user_email||'—'],
                ['Environment',selected.environment_name||'—'],['URL',selected.url||'—'],['Component',selected.component||'—']
              ].map(([k,v])=>(
                <div key={k} style={{ display:'flex', gap:8, fontSize:12 }}>
                  <span style={{ color:C.text2, minWidth:80, flexShrink:0 }}>{k}</span>
                  <span style={{ color:C.text1, wordBreak:'break-all' }}>{v}</span>
                </div>
              ))}
            </div>
            {selected.stack && (
              <details style={{ marginBottom:16 }}>
                <summary style={{ color:C.text2, fontSize:12, cursor:'pointer', marginBottom:6 }}>Stack trace</summary>
                <pre style={{ background:'#0F1729', borderRadius:8, padding:10, fontSize:11, color:'#CBD5E1', overflowX:'auto', lineHeight:1.6, whiteSpace:'pre-wrap', wordBreak:'break-all', border:`1px solid ${C.border}`, maxHeight:200 }}>{selected.stack}</pre>
              </details>
            )}
            {/* AI Analysis */}
            <div style={{ marginBottom:16 }}>
              {!aiAnalysis[selected.id]?.result && !aiAnalysis[selected.id]?.loading ? (
                <button onClick={()=>analyseError(selected)}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:`1.5px solid ${C.accent}`,
                    background:`${C.accent}12`, color:C.accent, fontSize:13, fontWeight:700,
                    cursor:'pointer', fontFamily:F, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    transition:'all .15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${C.accent}25`;}}
                  onMouseLeave={e=>{e.currentTarget.style.background=`${C.accent}12`;}}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  Analyse with Vercentic AI
                </button>
              ) : aiAnalysis[selected.id]?.loading ? (
                <div style={{ padding:'16px 14px', borderRadius:10, border:`1.5px solid ${C.accent}40`,
                  background:`${C.accent}08`, textAlign:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    <div style={{ width:14, height:14, border:`2px solid ${C.accent}40`, borderTop:`2px solid ${C.accent}`,
                      borderRadius:'50%', animation:'aiSpin 0.8s linear infinite' }}/>
                    <span style={{ fontSize:13, color:C.accent, fontWeight:600 }}>Analysing error...</span>
                  </div>
                  <style>{'@keyframes aiSpin { to { transform: rotate(360deg); } }'}</style>
                </div>
              ) : aiAnalysis[selected.id]?.error ? (
                <div style={{ padding:14, borderRadius:10, border:'1px solid #3F1F1F', background:'#1F1111' }}>
                  <div style={{ fontSize:12, color:'#EF4444', fontWeight:600, marginBottom:4 }}>Analysis failed</div>
                  <div style={{ fontSize:11, color:C.text2 }}>{aiAnalysis[selected.id].error}</div>
                  <button onClick={()=>analyseError(selected)} style={{ marginTop:8, padding:'4px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:11, cursor:'pointer', fontFamily:F }}>Retry</button>
                </div>
              ) : (
                <div style={{ borderRadius:12, border:`1.5px solid ${C.accent}30`, overflow:'hidden' }}>
                  <div style={{ padding:'10px 14px', background:`${C.accent}15`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      <span style={{ fontSize:12, fontWeight:700, color:C.accent }}>Vercentic AI Analysis</span>
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={()=>{ navigator.clipboard?.writeText(aiAnalysis[selected.id].result); }}
                        style={{ padding:'3px 8px', borderRadius:5, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:10, cursor:'pointer', fontFamily:F }}>Copy</button>
                      <button onClick={()=>analyseError(selected)}
                        style={{ padding:'3px 8px', borderRadius:5, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:10, cursor:'pointer', fontFamily:F }}>Re-analyse</button>
                    </div>
                  </div>
                  <div style={{ padding:'14px', fontSize:13, color:C.text1, lineHeight:1.7 }}>
                    {aiAnalysis[selected.id].result.split('\n').map((line, i) => {
                      if (line.startsWith('# '))  return <h3 key={i} style={{ fontSize:15, fontWeight:800, color:C.text1, margin:'14px 0 6px' }}>{line.slice(2)}</h3>;
                      if (line.startsWith('## ')) return <h4 key={i} style={{ fontSize:13, fontWeight:700, color:C.accent, margin:'12px 0 4px' }}>{line.slice(3)}</h4>;
                      if (line.startsWith('**') && line.endsWith('**')) return <div key={i} style={{ fontSize:13, fontWeight:700, color:C.accent, margin:'12px 0 4px' }}>{line.slice(2,-2)}</div>;
                      if (line.startsWith('- '))  return <div key={i} style={{ paddingLeft:12, position:'relative' }}><span style={{ position:'absolute', left:0, color:C.accent }}>•</span>{renderInlineBold(line.slice(2))}</div>;
                      if (line.startsWith('```')) return null;
                      if (line.trim() === '') return <div key={i} style={{ height:8 }}/>;
                      return <div key={i}>{renderInlineBold(line)}</div>;
                    })}
                  </div>
                  <div style={{ padding:'8px 14px', borderTop:`1px solid ${C.accent}20`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:10, color:C.text2 }}>AI suggestions may not be accurate — verify before applying</span>
                    <button onClick={()=>{setNote(aiAnalysis[selected.id].result.slice(0,500));}}
                      style={{ padding:'4px 10px', borderRadius:5, border:`1px solid ${C.accent}40`, background:`${C.accent}10`, color:C.accent, fontSize:10, fontWeight:600, cursor:'pointer', fontFamily:F }}>
                      Use as resolution note
                    </button>
                  </div>
                </div>
              )}
            </div>
            {selected.resolved ? (
              <div style={{ background:'#0B2D20', border:'1px solid #065F46', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
                <div style={{ color:C.success, fontSize:12, fontWeight:700, marginBottom:4 }}>✓ Resolved {selected.resolved_at?`— ${timeAgo(selected.resolved_at)}`:''}</div>
                {selected.resolved_by && <div style={{ color:'#6EE7B7', fontSize:12 }}>by {selected.resolved_by}</div>}
                {selected.resolution_note && <div style={{ color:'#A7F3D0', fontSize:12, marginTop:6, lineHeight:1.5 }}>"{selected.resolution_note}"</div>}
                <button onClick={()=>handleResolve(selected,false)} style={{ marginTop:10, padding:'6px 12px', borderRadius:6, border:'1px solid #065F46', background:'transparent', color:'#6EE7B7', fontSize:11, cursor:'pointer', fontFamily:F }}>Mark as unresolved</button>
              </div>
            ) : (
              <div style={{ marginBottom:14 }}>
                <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Resolution note (optional)…" rows={3}
                  style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:C.card, color:C.text1, fontSize:12, fontFamily:F, resize:'vertical', boxSizing:'border-box', marginBottom:8 }}/>
                <button onClick={()=>handleResolve(selected,true)} disabled={resolving}
                  style={{ width:'100%', padding:10, borderRadius:8, border:'none', background:C.success, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F, opacity:resolving?.7:1 }}>
                  {resolving?'Saving…':'✓ Mark as resolved'}
                </button>
              </div>
            )}
            <button onClick={()=>handleDelete(selected)} style={{ width:'100%', padding:8, borderRadius:8, border:'1px solid #3F1F1F', background:'transparent', color:'#EF4444', fontSize:12, cursor:'pointer', fontFamily:F }}>Delete log</button>
          </div>
        )}
      </div>
    </div>
  );
}
