/**
 * DemoDataManager.jsx
 * client/src/superadmin/DemoDataManager.jsx
 */
import { useState, useEffect, useRef } from 'react';

// Railway URL — SSE streams don't work through Vercel's edge proxy (it buffers responses)
const RAILWAY_URL = 'https://talentos-production-4045.up.railway.app';
const apiUrl = (path) => `${RAILWAY_URL}/api${path}`;

const S = {
  page:  { fontFamily:"'DM Sans',-apple-system,sans-serif", color:'#e2e8f0', padding:32, maxWidth:860 },
  h1:    { fontSize:22, fontWeight:800, color:'#f8fafc', marginBottom:4 },
  sub:   { fontSize:14, color:'#94a3b8', marginBottom:32 },
  card:  { background:'#1e293b', border:'1px solid #334155', borderRadius:14, padding:24, marginBottom:20 },
  title: { fontSize:14, fontWeight:700, color:'#f1f5f9', marginBottom:4 },
  desc:  { fontSize:13, color:'#64748b', marginBottom:20 },
  label: { fontSize:12, fontWeight:600, color:'#94a3b8', display:'block', marginBottom:6 },
  select:{ width:'100%', padding:'10px 12px', borderRadius:8, fontSize:13,
           background:'#0f172a', border:'1px solid #334155', color:'#f1f5f9', outline:'none', marginBottom:16 },
  row:   { display:'flex', alignItems:'center', gap:10, marginBottom:12 },
  btn: v => ({
    padding:'10px 20px', borderRadius:8, border:'none', cursor:'pointer',
    fontSize:13, fontWeight:700, fontFamily:'inherit',
    ...(v==='primary' ? { background:'linear-gradient(135deg,#6366f1,#818cf8)', color:'white', boxShadow:'0 4px 12px rgba(99,102,241,.4)' }
      : v==='danger'  ? { background:'#7f1d1d', color:'#fca5a5', border:'1px solid #991b1b' }
      :                 { background:'#1e293b', color:'#94a3b8', border:'1px solid #334155' }),
  }),
  progressBar: pct => ({ height:'100%', borderRadius:99,
    background:'linear-gradient(90deg,#6366f1,#a78bfa)', width:`${pct}%`, transition:'width .4s ease' }),
  log:   { background:'#0f172a', border:'1px solid #1e293b', borderRadius:8, padding:14,
           maxHeight:260, overflowY:'auto', fontFamily:'monospace', fontSize:12, color:'#64748b', lineHeight:1.7 },
  grid:  { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginTop:20 },
  stat:  { background:'#0f172a', border:'1px solid #1e293b', borderRadius:10, padding:'14px 16px', textAlign:'center' },
};

function Stat({ label, value }) {
  return (
    <div style={S.stat}>
      <div style={{ fontSize:28, fontWeight:800, color:'#818cf8', lineHeight:1 }}>{Number(value).toLocaleString()}</div>
      <div style={{ fontSize:11, color:'#475569', marginTop:4 }}>{label}</div>
    </div>
  );
}

export default function DemoDataManager() {
  const [envs,       setEnvs]       = useState([]);
  const [envId,      setEnvId]      = useState('');
  const [clearFirst, setClearFirst] = useState(true);
  const [seeding,    setSeeding]    = useState(false);
  const [clearing,   setClearing]   = useState(false);
  const [pct,        setPct]        = useState(0);
  const [log,        setLog]        = useState([]);
  const [results,    setResults]    = useState(null);
  const [error,      setError]      = useState(null);
  const [status,     setStatus]     = useState(null);
  const logRef = useRef(null);

  useEffect(() => {
    fetch(apiUrl('/superadmin/demo/environments'))
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        // Sort: master Production first, then alphabetical
        const sorted = [...data].sort((a, b) => {
          if (a.name === 'Production') return -1;
          if (b.name === 'Production') return 1;
          return a.name.localeCompare(b.name);
        });
        setEnvs(sorted);
        // Only pre-select if nothing selected yet
        if (!envId && sorted.length > 0) setEnvId(sorted[0].id);
      })
      .catch(() => setError('Could not reach API'));
  }, []);

  useEffect(() => {
    if (!envId) return;
    setStatus(null);
    fetch(apiUrl(`/superadmin/demo/status?environment_id=${envId}`))
      .then(r => r.json()).then(setStatus).catch(() => {});
  }, [envId]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const addLog = (msg, type='info') => {
    const c = { info:'#94a3b8', success:'#4ade80', error:'#f87171', dim:'#475569' }[type];
    setLog(l => [...l, { msg, c }]);
  };

  async function handleSeed() {
    if (!envId) return;
    setSeeding(true); setResults(null); setError(null); setPct(0); setLog([]);
    const selectedEnv = envs.find(e => e.id === envId);
    addLog(`Seeding environment: ${selectedEnv?.name || envId}`, 'dim');
    console.log('[DemoSeed] Seeding environment_id:', envId, 'name:', selectedEnv?.name);
    try {
      const res = await fetch(apiUrl('/superadmin/demo/seed'), {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ environment_id:envId, clear_first:clearFirst }),
      });
      const reader  = res.body.getReader();
      const dec     = new TextDecoder();
      let   buf     = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream:true });
        const lines = buf.split('\n'); buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          try {
            const evt = JSON.parse(line.slice(5));
            if (evt.pct !== undefined) setPct(evt.pct);
            if (evt.message) addLog(evt.message, evt.step==='error'?'error':'info');
            if (evt.step === 'complete') {
              setResults(evt.results);
              addLog(`✓ Done! ${evt.results.candidates} candidates, ${evt.results.jobs} jobs`, 'success');
              fetch(apiUrl(`/superadmin/demo/status?environment_id=${envId}`)).then(r=>r.json()).then(setStatus);
            }
            if (evt.step === 'error') setError(evt.message);
          } catch {}
        }
      }
    } catch (err) { addLog(`Error: ${err.message}`, 'error'); setError(err.message); }
    setSeeding(false);
  }

  async function handleClear() {
    if (!envId) return;
    if (!window.confirm('Remove all demo data from this environment?')) return;
    setClearing(true); addLog('Clearing demo data…', 'dim');
    try {
      const res = await fetch(apiUrl('/superadmin/demo/clear'), {
        method:'DELETE', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ environment_id:envId }),
      });
      const data = await res.json();
      addLog(`Removed ${data.removed} records`, 'success');
      setStatus({ has_demo_data:false, counts:{records:0,links:0,notes:0,communications:0} });
      setResults(null);
    } catch (err) { addLog(`Error: ${err.message}`, 'error'); }
    setClearing(false);
  }

  return (
    <div style={S.page}>
      <div style={S.h1}>Demo Data Generator</div>
      <div style={S.sub}>Generate 300 candidates with real profile photos, 50 jobs, 4 workflows, pipeline links, notes and emails.</div>

      <div style={S.card}>
        <div style={S.title}>Configuration</div>
        <div style={S.desc}>Select an environment to seed. Runs against any provisioned environment.</div>
        <label style={S.label}>Target Environment</label>
        <select style={S.select} value={envId} onChange={e=>setEnvId(e.target.value)} disabled={seeding}>
          {envs.map(e => {
            const clientLabel = e.client_name ? `${e.client_name}  /  ${e.name}` : `⭐ ${e.name} (master)`;
            const demoNote = e.demo_count > 0 ? ` [${e.demo_count} demo]` : '';
            return <option key={e.id} value={e.id}>{clientLabel} — {e.record_count} records{demoNote}</option>;
          })}
        </select>
        {status && (
          <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8,
            background:status.has_demo_data?'#1c1917':'#0f172a',
            border:`1px solid ${status.has_demo_data?'#78350f':'#1e293b'}` }}>
            {(() => {
              const e = envs.find(ev=>ev.id===envId);
              const label = e ? (e.client_name ? `${e.client_name} / ${e.name}` : e.name) : envId;
              return status.has_demo_data
                ? <span style={{fontSize:12,color:'#d97706'}}>
                    ⚠ Demo data exists in <strong>{label}</strong> — <strong>{status.counts.records}</strong> records, <strong>{status.counts.links}</strong> pipeline links
                  </span>
                : <span style={{fontSize:12,color:'#4ade80'}}>✓ No demo data in <strong>{label}</strong></span>;
            })()}
          </div>
        )}
        <div style={S.row}>
          <input type="checkbox" id="clf" style={{accentColor:'#818cf8',width:16,height:16}}
            checked={clearFirst} onChange={e=>setClearFirst(e.target.checked)} disabled={seeding}/>
          <label htmlFor="clf" style={{fontSize:13,color:'#cbd5e1'}}>Replace existing demo data</label>
        </div>
        <div style={{display:'flex',gap:10,marginTop:8}}>
          <button style={S.btn('primary')} onClick={handleSeed} disabled={seeding||!envId}>
            {seeding?'⏳ Generating…':'⚡ Generate Demo Data'}
          </button>
          {status?.has_demo_data && (
            <button style={S.btn('danger')} onClick={handleClear} disabled={clearing||seeding}>
              {clearing?'Clearing…':'✕ Clear Demo Data'}
            </button>
          )}
        </div>
      </div>

      {(seeding||log.length>0) && (
        <div style={S.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={S.title}>Progress</div>
            <span style={{fontSize:13,fontWeight:700,color:'#818cf8'}}>{pct}%</span>
          </div>
          <div style={{background:'#0f172a',borderRadius:99,height:8,overflow:'hidden',marginBottom:12}}>
            <div style={S.progressBar(pct)}/>
          </div>
          <div ref={logRef} style={S.log}>
            {log.map((l,i) => <div key={i} style={{color:l.c}}>{l.msg}</div>)}
            {seeding && <div style={{color:'#475569'}}>▋</div>}
          </div>
        </div>
      )}

      {results && (
        <div style={S.card}>
          <div style={S.title}>✓ Demo Data Generated</div>
          {(() => {
            const e = envs.find(ev=>ev.id===envId);
            const label = e ? (e.client_name ? `${e.client_name} / ${e.name}` : e.name) : envId;
            return (
              <div style={{padding:'8px 12px',borderRadius:8,background:'#0f172a',border:'1px solid #1e293b',marginBottom:12,fontSize:12,color:'#94a3b8'}}>
                📍 Seeded to: <strong style={{color:'#a5b4fc'}}>{label}</strong> — to view this data, log into that environment in the main app and select <strong style={{color:'#a5b4fc'}}>{e?.name||'this environment'}</strong> from the environment selector.
              </div>
            );
          })()}
          <div style={S.grid}>
            <Stat label="Candidates"     value={results.candidates}/>
            <Stat label="Jobs"           value={results.jobs}/>
            <Stat label="Workflows"      value={results.workflows}/>
            <Stat label="Pipeline Links" value={results.links}/>
            <Stat label="Notes"          value={results.notes}/>
            <Stat label="Communications" value={results.communications}/>
          </div>
          <div style={{marginTop:16,fontSize:12,color:'#475569'}}>
            Profile photos from <a href="https://randomuser.me" target="_blank" rel="noreferrer" style={{color:'#818cf8'}}>randomuser.me</a>. All names and emails are fictional. Demo records are tagged and can be cleared at any time.
          </div>
        </div>
      )}

      {error && (
        <div style={{...S.card,borderColor:'#7f1d1d',background:'#1c0606'}}>
          <div style={{color:'#f87171',fontSize:14,fontWeight:700}}>Error</div>
          <div style={{color:'#fca5a5',fontSize:13,marginTop:6}}>{error}</div>
        </div>
      )}

      <div style={S.card}>
        <div style={S.title}>What gets generated</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:12}}>
          {[
            ['💼','50 Jobs','20 Engineering, 20 Finance, 10 HR across global locations with salary bands'],
            ['👤','300 Candidates','Real photos from randomuser.me, skills, experience, pipeline status'],
            ['🔀','4 Workflows','Standard, Executive, Technical Engineering, Graduate — each with 7–10 stages'],
            ['🔗','Pipeline Links','2–12 candidates per job spread across pipeline stages'],
            ['📝','Notes','1–3 recruiter notes per candidate with realistic feedback'],
            ['✉️','Communications','1–4 emails per candidate — applications, invites, outreach'],
          ].map(([icon,title,desc]) => (
            <div key={title} style={{display:'flex',gap:12}}>
              <div style={{fontSize:22,flexShrink:0}}>{icon}</div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#f1f5f9'}}>{title}</div>
                <div style={{fontSize:12,color:'#64748b',lineHeight:1.5,marginTop:2}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
