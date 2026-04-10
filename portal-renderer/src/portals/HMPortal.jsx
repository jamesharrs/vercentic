import { useState, useEffect } from 'react'
import { css, Badge, Btn, Avatar, Section, STATUS_COLORS, recordTitle } from './shared.jsx'
import WizardRenderer from './WizardRenderer.jsx'

const ScoreBtn = ({ n, active, color, onClick }) => (
  <button onClick={onClick} style={{
    width:36, height:36, borderRadius:8, border:`2px solid ${active ? color : '#E8ECF8'}`,
    background: active ? color : 'transparent', color: active ? 'white' : '#9DA8C7',
    fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .15s'
  }}>{n}</button>
)

// File extension helpers (self-contained — no import from Records.jsx)
const extOf = f => (f.ext || f.name?.split('.').pop() || '').toLowerCase()
const isImageFile = f => ['jpg','jpeg','png','gif','webp','bmp'].includes(extOf(f))
const isPdfFile   = f => extOf(f) === 'pdf'
const iconFor = f => { const e = extOf(f); if (isImageFile(f)) return '🖼️'; if (isPdfFile(f)) return '📄'; if (['doc','docx'].includes(e)) return '📝'; if (['xls','xlsx'].includes(e)) return '📊'; return '📁'; }
const fmtSz = b => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : b > 1024 ? `${Math.round(b/1024)} KB` : ''

const FilePreview = ({ att, onClose }) => {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])
  const url = att.url && att.url !== '#' ? att.url : null
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:9999,
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:14, overflow:'hidden',
        display:'flex', flexDirection:'column',
        width: isImageFile(att) ? 'auto' : '90vw',
        maxWidth: isImageFile(att) ? '92vw' : 860, maxHeight:'90vh',
        boxShadow:'0 32px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px',
          borderBottom:'1px solid #E8ECF8', flexShrink:0 }}>
          <div style={{ flex:1, fontSize:13, fontWeight:700, color:'#0F1729',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{att.name}</div>
          {url && <a href={url} download={att.name}
            style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #E8ECF8', color:'#374151',
              fontSize:11, fontWeight:600, textDecoration:'none' }}>↓ Download</a>}
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:18,
            color:'#9CA3AF', cursor:'pointer', padding:'0 4px' }}>✕</button>
        </div>
        <div style={{ flex:1, overflow:'auto', minHeight:0,
          background: isImageFile(att) ? '#1a1a2e' : '#F8F9FF',
          display:'flex', alignItems: isImageFile(att)?'center':'stretch',
          justifyContent: isImageFile(att)?'center':'stretch' }}>
          {!url ? (
            <div style={{ padding:40, color:'#9CA3AF', fontSize:13, textAlign:'center' }}>File not available.</div>
          ) : isImageFile(att) ? (
            <img src={url} alt={att.name} style={{ maxWidth:'100%', maxHeight:'80vh', objectFit:'contain' }}/>
          ) : isPdfFile(att) ? (
            <iframe src={url} title={att.name} style={{ width:'100%', height:'74vh', border:'none' }}/>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              padding:48, gap:14, textAlign:'center' }}>
              <div style={{ fontSize:48 }}>{iconFor(att)}</div>
              <div style={{ fontSize:13, color:'#6B7280' }}>{extOf(att).toUpperCase()} files cannot be previewed in the browser.</div>
              <a href={url} download={att.name} style={{ padding:'9px 18px', borderRadius:9, background:'#4361EE',
                color:'#fff', fontSize:13, fontWeight:700, textDecoration:'none' }}>Download</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const CandidateCard = ({ record, color, api, portal, allowedFileTypes }) => {
  const d = record.data || {}
  const name = recordTitle(record)
  const [score,    setScore]    = useState(d.rating || null)
  const [note,     setNote]     = useState('')
  const [expanded, setExpanded] = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [files,    setFiles]    = useState(null)   // null = not yet loaded
  const [preview,  setPreview]  = useState(null)

  // Load attachments lazily when card first expands
  useEffect(() => {
    if (!expanded || files !== null) return
    api.get(`/attachments?record_id=${record.id}`)
      .then(data => {
        let items = Array.isArray(data) ? data.filter(f => f.url && f.url !== '#') : []
        if (allowedFileTypes?.length) {
          items = items.filter(f => allowedFileTypes.some(t =>
            (f.file_type_name||'').toLowerCase().includes(t.toLowerCase())
          ))
        }
        setFiles(items)
      })
      .catch(() => setFiles([]))
  }, [expanded, record.id])

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
          {files?.length > 0 && (
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:6,
              background:'#EEF2FF', color:'#4361EE' }}>
              {files.length} file{files.length!==1?'s':''}
            </span>
          )}
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

          {/* Documents section */}
          {files === null ? (
            <div style={{ fontSize:12, color:'#9DA8C7', marginBottom:16 }}>Loading files…</div>
          ) : files.length > 0 ? (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#4B5675', marginBottom:10 }}>Documents</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {files.map(att => (
                  <div key={att.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                    background:'#F8F9FF', borderRadius:10, border:'1px solid #E8ECF8' }}>
                    <span style={{ fontSize:18 }}>{iconFor(att)}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div
                        onClick={() => setPreview(att)}
                        style={{ fontSize:13, fontWeight:600, color:'#4361EE', cursor:'pointer',
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                          textDecoration:'underline', textDecorationColor:'#4361EE40' }}>
                        {att.name}
                      </div>
                      <div style={{ fontSize:10, color:'#9DA8C7', marginTop:1 }}>
                        {[att.file_type_name, fmtSz(att.size)].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                      <button onClick={() => setPreview(att)}
                        style={{ background:'none', border:'1px solid #E8ECF8', borderRadius:7, cursor:'pointer',
                          padding:'5px 9px', color:'#4361EE', fontSize:11, fontWeight:600, fontFamily:'inherit' }}>
                        Preview
                      </button>
                      <a href={att.url} download={att.name} target="_blank" rel="noreferrer"
                        style={{ border:'1px solid #E8ECF8', borderRadius:7, cursor:'pointer',
                          padding:'5px 9px', color:'#374151', fontSize:11, fontWeight:600, textDecoration:'none',
                          display:'flex', alignItems:'center' }}>
                        ↓
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Score */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#4B5675', marginBottom:8 }}>Your Score</div>
            <div style={{ display:'flex', gap:6 }}>
              {[1,2,3,4,5].map(n => <ScoreBtn key={n} n={n} active={score===n} color={color} onClick={()=>setScore(n)}/>)}
            </div>
          </div>

          {/* Feedback */}
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

      {preview && <FilePreview att={preview} onClose={() => setPreview(null)}/>}
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
  const [showCreateWizard, setShowCreateWizard] = useState(false)

  // Show job creation wizard when configured
  if (showCreateWizard && portal.wizard?.enabled && portal.wizard?.pages?.length) {
    return <WizardRenderer wizard={portal.wizard} portal={portal} job={null} api={api}
      onBack={()=>setShowCreateWizard(false)} onSuccess={()=>{ setShowCreateWizard(false); }}/>;
  }

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
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:'#0F1729' }}>My Requisitions</h2>
              {portal.wizard?.enabled && portal.wizard?.pages?.length>0 && (
                <button onClick={()=>setShowCreateWizard(true)}
                  style={{ padding:'8px 16px', borderRadius:9, background:c.primary, color:'white', fontSize:13, fontWeight:700, border:'none', cursor:'pointer', fontFamily:c.font }}>
                  + New Requisition
                </button>
              )}
            </div>
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
              : candidates.map(r => <CandidateCard key={r.id} record={r} color={c.primary} api={api} portal={portal}/>)
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
