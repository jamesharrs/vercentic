import { useState, useEffect } from 'react'
import { css, Badge, Btn, Avatar, Section, STATUS_COLORS, recordTitle } from './shared.jsx'

const ScoreBtn = ({ n, active, color, onClick }) => (
  <button onClick={onClick} style={{
    width:36, height:36, borderRadius:8, border:`2px solid ${active ? color : '#E8ECF8'}`,
    background: active ? color : 'transparent', color: active ? 'white' : '#9DA8C7',
    fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .15s'
  }}>{n}</button>
)

const CandidateCard = ({ record, color, onScore }) => {
  const d = record.data || {}
  const name = recordTitle(record)
  const [score, setScore] = useState(d.rating || null)
  const [note, setNote] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div style={{ background:'#fff', borderRadius:16, border:'1.5px solid #E8ECF8', overflow:'hidden', marginBottom:12 }}>
      <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}
        onClick={() => setExpanded(e => !e)}>
        <Avatar name={name} color={color} size={44}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#0F1729' }}>{name}</div>
          <div style={{ fontSize:12, color:'#9DA8C7', marginTop:2 }}>
            {[d.current_title, d.current_company, d.location].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {d.status && <Badge color={STATUS_COLORS[d.status] || '#9DA8C7'}>{d.status}</Badge>}
          {score && <Badge color={color}>★ {score}/5</Badge>}
          <span style={{ color:'#9DA8C7', fontSize:18 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded && (
        <div style={{ borderTop:'1px solid #E8ECF8', padding:'20px' }}>
          {d.summary && <p style={{ fontSize:14, color:'#4B5675', lineHeight:1.6, marginBottom:16 }}>{d.summary}</p>}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
            {d.skills && (Array.isArray(d.skills) ? d.skills : d.skills.split(',')).map(s => (
              <Badge key={s} color="#6366F1">{s.trim()}</Badge>
            ))}
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#4B5675', marginBottom:8 }}>Your Score</div>
            <div style={{ display:'flex', gap:6 }}>
              {[1,2,3,4,5].map(n => <ScoreBtn key={n} n={n} active={score===n} color={color} onClick={()=>setScore(n)}/>)}
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#4B5675', marginBottom:6 }}>Feedback Note</div>
            <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3}
              placeholder="Add your interview notes or feedback…"
              style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1.5px solid #E8ECF8', fontSize:13,
                fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box' }}
              onFocus={e=>e.target.style.borderColor=color} onBlur={e=>e.target.style.borderColor='#E8ECF8'}/>
          </div>
          <Btn color={color} onClick={handleSave}>{saved ? '✓ Saved' : 'Save Feedback'}</Btn>
        </div>
      )}
    </div>
  )
}

export default function HMPortal({ portal, api }) {
  const c = css(portal.branding)
  const br = portal.branding || {}
  const [reqs, setReqs] = useState([])
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeReq, setActiveReq] = useState(null)
  const [tab, setTab] = useState('reqs')

  useEffect(() => {
    Promise.all([
      api.get(`/records?environment_id=${portal.environment_id}&limit=20`),
    ]).then(([all]) => {
      const records = all.records || []
      setReqs(records.filter(r => r.data?.job_title))
      setCandidates(records.filter(r => r.data?.first_name))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const openReqs = reqs.filter(r => r.data?.status === 'Open' || r.data?.status === 'Draft')

  return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:c.font }}>
      {/* Header */}
      <div style={{ background:'#1E2235', borderBottom:'1px solid #2D3148', padding:'0' }}>
        <Section>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {br.logo_url
                ? <img src={br.logo_url} style={{ height:32, objectFit:'contain' }} alt="logo"/>
                : <div style={{ width:36, height:36, borderRadius:10, background:c.primary, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:900, fontSize:16 }}>H</div>}
              <div>
                <div style={{ color:'white', fontSize:15, fontWeight:700 }}>{br.company_name || 'Hiring Manager'} Portal</div>
                <div style={{ color:'rgba(255,255,255,0.45)', fontSize:11 }}>Internal Review Access</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {['reqs','candidates'].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:c.font,
                  fontSize:12, fontWeight:700, textTransform:'capitalize',
                  background: tab===t ? c.primary : 'rgba(255,255,255,0.08)',
                  color: tab===t ? 'white' : 'rgba(255,255,255,0.55)',
                }}>{t === 'reqs' ? 'My Requisitions' : 'Candidates'}</button>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* Stat strip */}
      <div style={{ background:'white', borderBottom:'1px solid #E8ECF8' }}>
        <Section>
          <div style={{ display:'flex', gap:0, padding:'0' }}>
            {[
              { label:'Open Reqs', value:openReqs.length, color:c.primary },
              { label:'Candidates', value:candidates.length, color:'#0CAF77' },
              { label:'Pending Review', value:candidates.filter(c=>!c.data?.rating).length, color:'#F79009' },
            ].map((s,i) => (
              <div key={i} style={{ padding:'16px 28px', borderRight:'1px solid #E8ECF8' }}>
                <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:11, color:'#9DA8C7', fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section style={{ padding:'32px 24px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'#9DA8C7' }}>Loading…</div>
        ) : tab === 'reqs' ? (
          <div>
            <h2 style={{ margin:'0 0 20px', fontSize:18, fontWeight:800, color:'#0F1729' }}>My Requisitions</h2>
            {openReqs.length === 0 ? (
              <div style={{ textAlign:'center', padding:'48px 0', color:'#9DA8C7' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
                <p>No open requisitions assigned to you</p>
              </div>
            ) : openReqs.map(req => (
              <div key={req.id} onClick={() => { setActiveReq(req); setTab('candidates') }}
                style={{ background:'#fff', borderRadius:14, border:'1.5px solid #E8ECF8', padding:'18px 20px',
                  marginBottom:10, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center',
                  transition:'all .15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = c.primary}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#E8ECF8'}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#0F1729', marginBottom:4 }}>{req.data?.job_title || 'Untitled'}</div>
                  <div style={{ display:'flex', gap:6 }}>
                    {req.data?.department && <Badge color="#6366F1">{req.data.department}</Badge>}
                    {req.data?.status && <Badge color={STATUS_COLORS[req.data.status]||'#9DA8C7'}>{req.data.status}</Badge>}
                  </div>
                </div>
                <span style={{ color:c.primary, fontSize:20 }}>→</span>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:'#0F1729' }}>
                {activeReq ? `Candidates — ${activeReq.data?.job_title}` : 'All Candidates'}
              </h2>
              {activeReq && (
                <button onClick={() => { setActiveReq(null); setTab('reqs') }}
                  style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'#9DA8C7', fontFamily:c.font }}>
                  ← Back
                </button>
              )}
            </div>
            {candidates.length === 0
              ? <div style={{ textAlign:'center', padding:'48px 0', color:'#9DA8C7' }}><div style={{ fontSize:40, marginBottom:12 }}>👤</div><p>No candidates yet</p></div>
              : candidates.map(r => <CandidateCard key={r.id} record={r} color={c.primary} onScore={() => {}}/>)
            }
          </div>
        )}
      </Section>
      <div style={{ borderTop:'1px solid #E8ECF8', padding:'20px', textAlign:'center' }}>
        <p style={{ margin:0, fontSize:11, color:'#9DA8C7' }}>Hiring Manager Portal · Powered by Vercentic</p>
      </div>
    </div>
  )
}
