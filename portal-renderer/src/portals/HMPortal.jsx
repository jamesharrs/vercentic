/**
 * HMPortal.jsx — Vercentic Portal Renderer
 * Hiring Manager: dashboard → pipeline kanban → candidate scorecard
 */
import { useState, useEffect, useCallback, useMemo } from 'react'

const css = (br={}) => ({
  primary: br.primary_color || '#1E293B',
  accent:  br.accent_color  || '#6366F1',
  bg:      '#F1F5F9',
  font:    br.font_family || "'Inter','DM Sans',-apple-system,sans-serif",
})

const STAGE_COLORS = {
  'Applied':             { bg:'#F1F5F9', text:'#64748B', dot:'#94A3B8' },
  'CV Review':           { bg:'#EFF6FF', text:'#3B82F6', dot:'#3B82F6' },
  'Phone Screen':        { bg:'#F0FDF4', text:'#16A34A', dot:'#22C55E' },
  'Recruiter Call':      { bg:'#F0FDF4', text:'#16A34A', dot:'#22C55E' },
  'Technical Screen':    { bg:'#FFF7ED', text:'#EA580C', dot:'#F97316' },
  'Take-Home Task':      { bg:'#FFF7ED', text:'#EA580C', dot:'#F97316' },
  'Technical Interview': { bg:'#FEF3C7', text:'#D97706', dot:'#F59E0B' },
  'Manager Review':      { bg:'#EDE9FE', text:'#7C3AED', dot:'#8B5CF6' },
  'Final Interview':     { bg:'#EDE9FE', text:'#7C3AED', dot:'#8B5CF6' },
  'Culture Fit':         { bg:'#FCE7F3', text:'#DB2777', dot:'#EC4899' },
  'Assessment Centre':   { bg:'#FCE7F3', text:'#DB2777', dot:'#EC4899' },
  'Offer':               { bg:'#D1FAE5', text:'#065F46', dot:'#10B981' },
  'Hired':               { bg:'#D1FAE5', text:'#065F46', dot:'#10B981' },
  'Placed':              { bg:'#D1FAE5', text:'#065F46', dot:'#10B981' },
  'Accepted':            { bg:'#D1FAE5', text:'#065F46', dot:'#10B981' },
  'Rejected':            { bg:'#FEE2E2', text:'#DC2626', dot:'#EF4444' },
  'Withdrawn':           { bg:'#F8FAFC', text:'#94A3B8', dot:'#CBD5E1' },
}
const RATING_LABELS = { 1:'Strong No', 2:'No', 3:'Maybe', 4:'Yes', 5:'Strong Yes' }
const RATING_COLORS = { 1:'#EF4444', 2:'#F97316', 3:'#F59E0B', 4:'#22C55E', 5:'#16A34A' }
const HM_STAGES     = ['Manager Review','Final Interview','Culture Fit','Assessment Centre','Offer']
const STAGE_ORDER   = ['Applied','CV Review','Phone Screen','Recruiter Call','Technical Screen','Take-Home Task','Technical Interview','Manager Review','Final Interview','Culture Fit','Assessment Centre','Offer','Hired','Placed','Accepted']

const Section = ({ children, style={} }) => (
  <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px', ...style }}>{children}</div>
)

const Badge = ({ children, color='#94A3B8' }) => (
  <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:99,
    fontSize:11, fontWeight:700, background:`${color}18`, color, whiteSpace:'nowrap' }}>{children}</span>
)

const StageBadge = ({ stage }) => {
  const s = STAGE_COLORS[stage] || { bg:'#F1F5F9', text:'#64748B', dot:'#94A3B8' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:99, fontSize:11, fontWeight:700, background:s.bg, color:s.text }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.dot, flexShrink:0 }}/>
      {stage}
    </span>
  )
}

const Avatar = ({ name, photo, size=38, color='#6366F1' }) => {
  const initials = name?.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()||'?'
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:`${color}20`, flexShrink:0, overflow:'hidden',
      display:'flex', alignItems:'center', justifyContent:'center', border:`2px solid ${color}30` }}>
      {photo
        ? <img src={photo} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{ e.target.style.display='none' }}/>
        : <span style={{ fontSize:size*0.35, fontWeight:700, color }}>{initials}</span>}
    </div>
  )
}

// ── Stage column (kanban) ─────────────────────────────────────────────────────
const StageColumn = ({ stage, candidates, color, onSelect, dimmed }) => {
  const sc = STAGE_COLORS[stage] || { bg:'#F1F5F9', text:'#64748B', dot:'#94A3B8' }
  return (
    <div style={{ minWidth:210, flex:1, opacity:dimmed?0.35:1, transition:'opacity .2s' }}>
      <div style={{ padding:'8px 12px', borderRadius:10, background:sc.bg, border:`1px solid ${sc.dot}30`,
        marginBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:sc.dot }}/>
          <span style={{ fontSize:12, fontWeight:700, color:sc.text }}>{stage}</span>
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:sc.dot, background:'white', padding:'2px 8px', borderRadius:99, border:`1px solid ${sc.dot}30` }}>
          {candidates.length}
        </span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {candidates.length===0 ? (
          <div style={{ padding:'18px 12px', textAlign:'center', fontSize:12, color:'#CBD5E1',
            borderRadius:10, border:'1.5px dashed #E2E8F0', background:'#FAFBFC' }}>No candidates</div>
        ) : candidates.map(c=>(
          <div key={c.person_id||c.id} onClick={()=>onSelect(c)}
            style={{ background:'white', borderRadius:10, border:'1.5px solid #E2E8F0', padding:'12px 14px', cursor:'pointer', transition:'all .15s' }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=color; e.currentTarget.style.boxShadow=`0 4px 12px ${color}18`; e.currentTarget.style.transform='translateY(-1px)' }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <Avatar name={c.name} photo={c.photo} size={32} color={color}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#0F172A', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name||'Unknown'}</div>
                <div style={{ fontSize:11, color:'#94A3B8', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.title||c.company||''}</div>
              </div>
              {c.rating && (
                <div style={{ width:22, height:22, borderRadius:'50%', background:RATING_COLORS[c.rating],
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'white', flexShrink:0 }}>
                  {c.rating}
                </div>
              )}
            </div>
            {c.location && <div style={{ fontSize:11, color:'#94A3B8' }}>📍 {c.location}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Candidate scorecard panel ─────────────────────────────────────────────────
const CandidatePanel = ({ candidate, job, onClose, color, api, portal }) => {
  const [score, setScore]   = useState(candidate.rating||0)
  const [note, setNote]     = useState('')
  const [saved, setSaved]   = useState(false)
  const [saving, setSaving] = useState(false)
  const d = candidate

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post(`/portals/${portal.id}/feedback`, {
        person_id: d.id, job_id: job?.id, job_title: job?.data?.job_title,
        rating: score, note, stage: d.stage,
      })
    } catch {}
    setSaved(true); setSaving(false)
    setTimeout(()=>setSaved(false), 3000)
  }

  const skills   = Array.isArray(d.skills) ? d.skills : (d.skills?d.skills.split(',').map(s=>s.trim()):[])
  const required = job ? (Array.isArray(job.data?.required_skills)?job.data.required_skills:(job.data?.required_skills||'').split(',').map(s=>s.trim()).filter(Boolean)) : []
  const matched  = skills.filter(s=>required.some(r=>r.toLowerCase().includes(s.toLowerCase())||s.toLowerCase().includes(r.toLowerCase())))
  const matchPct = required.length ? Math.round((matched.length/required.length)*100) : 0

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex' }}>
      <div onClick={onClose} style={{ flex:1, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)' }}/>
      <div style={{ width:480, background:'white', height:'100%', overflowY:'auto', boxShadow:'-8px 0 48px rgba(0,0,0,0.18)', display:'flex', flexDirection:'column' }}>
        {/* Header */}
        <div style={{ padding:'24px', borderBottom:'1px solid #E2E8F0', background:`linear-gradient(135deg,${color}08,${color}03)`, flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
            <StageBadge stage={d.stage||'Unknown'}/>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#94A3B8', lineHeight:1 }}>✕</button>
          </div>
          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            <Avatar name={d.name} photo={d.photo} size={56} color={color}/>
            <div>
              <h2 style={{ margin:'0 0 4px', fontSize:20, fontWeight:800, color:'#0F172A' }}>{d.name}</h2>
              <div style={{ fontSize:14, color:'#475569' }}>{d.title}{d.company?` · ${d.company}`:''}</div>
              {d.location && <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>📍 {d.location}</div>}
            </div>
          </div>
        </div>
        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          {/* Quick stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
            {[
              { label:'Experience',    val:d.years_experience?`${d.years_experience} years`:'—' },
              { label:'Notice Period', val:d.notice_period||'—' },
              { label:'Email',         val:d.email||'—' },
              { label:'Phone',         val:d.phone||'—' },
            ].map(({label,val})=>(
              <div key={label} style={{ padding:'10px 14px', borderRadius:10, background:'#F8FAFC', border:'1px solid #E2E8F0' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:13, fontWeight:600, color:'#0F172A', wordBreak:'break-all' }}>{val}</div>
              </div>
            ))}
          </div>
          {d.summary && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#0F172A', marginBottom:8 }}>Summary</div>
              <p style={{ margin:0, fontSize:14, color:'#475569', lineHeight:1.7, padding:'12px 16px', background:'#F8FAFC', borderRadius:10, border:'1px solid #E2E8F0' }}>{d.summary}</p>
            </div>
          )}
          {skills.length>0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#0F172A', marginBottom:8 }}>Skills</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {skills.map(s=><Badge key={s} color={color}>{s}</Badge>)}
              </div>
            </div>
          )}
          {/* Match score */}
          {required.length>0 && skills.length>0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#0F172A', marginBottom:8 }}>Match to Role</div>
              <div style={{ padding:'14px 16px', borderRadius:10, background:`${color}08`, border:`1px solid ${color}20` }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>Skills match</span>
                  <span style={{ fontSize:15, fontWeight:800, color:matchPct>=70?'#16A34A':matchPct>=40?'#F59E0B':'#EF4444' }}>{matchPct}%</span>
                </div>
                <div style={{ height:6, borderRadius:99, background:'#E2E8F0', overflow:'hidden', marginBottom:10 }}>
                  <div style={{ height:'100%', borderRadius:99, width:`${matchPct}%`,
                    background:matchPct>=70?'#22C55E':matchPct>=40?'#F59E0B':'#EF4444', transition:'width .6s ease' }}/>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {required.slice(0,8).map(r=>{
                    const hit = skills.some(s=>s.toLowerCase().includes(r.toLowerCase())||r.toLowerCase().includes(s.toLowerCase()))
                    return (
                      <span key={r} style={{ fontSize:11, padding:'3px 8px', borderRadius:99, fontWeight:600,
                        background:hit?'#D1FAE5':'#FEE2E2', color:hit?'#065F46':'#DC2626' }}>
                        {hit?'✓':'✗'} {r}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          {d.linkedin_url && (
            <div style={{ marginBottom:20 }}>
              <a href={d.linkedin_url} target="_blank" rel="noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:13, color:'#0A66C2', fontWeight:600, textDecoration:'none' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                View LinkedIn Profile
              </a>
            </div>
          )}
        </div>
        {/* Scorecard footer */}
        <div style={{ padding:'20px 24px', borderTop:'1px solid #E2E8F0', background:'#FAFBFC', flexShrink:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#0F172A', marginBottom:10 }}>Your Assessment</div>
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            {[1,2,3,4,5].map(n=>(
              <button key={n} onClick={()=>setScore(n)}
                style={{ flex:1, padding:'10px 4px', borderRadius:10,
                  border:`2px solid ${score>=n?RATING_COLORS[n]:'#E2E8F0'}`,
                  background:score===n?RATING_COLORS[n]:score>n?`${RATING_COLORS[n]}20`:'white',
                  color:score>=n?(score===n?'white':RATING_COLORS[n]):'#94A3B8',
                  cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit', transition:'all .15s' }}>
                {n}
              </button>
            ))}
          </div>
          {score>0 && (
            <div style={{ padding:'8px 12px', borderRadius:8, background:`${RATING_COLORS[score]}15`,
              color:RATING_COLORS[score], fontSize:12, fontWeight:700, textAlign:'center', marginBottom:12 }}>
              {RATING_LABELS[score]}
            </div>
          )}
          <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3}
            placeholder="Add interview notes, feedback, or observations…"
            style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:13,
              fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box', marginBottom:12 }}
            onFocus={e=>e.target.style.borderColor=color} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
          <button onClick={handleSave} disabled={saving||(!score&&!note)}
            style={{ width:'100%', padding:'12px', borderRadius:10, border:'none',
              background:saved?'#22C55E':(!score&&!note)?'#E2E8F0':color,
              color:(!score&&!note)?'#94A3B8':'white',
              fontSize:14, fontWeight:700, cursor:(!score&&!note)?'default':'pointer', fontFamily:'inherit' }}>
            {saved?'✓ Feedback Saved':saving?'Saving…':'Save Feedback'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Inline icons (no emoji) ──────────────────────────────────────────────────
const Icon = ({ d, size=14, color='currentColor', stroke=2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
)
const ICON_SHARE   = "M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"
const ICON_LOCK    = "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4"
const ICON_CLOCK   = "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2"
const ICON_CHECK   = "M20 6L9 17l-5-5"
const ICON_X       = "M18 6L6 18M6 6l12 12"
const ICON_CHEV_R  = "M9 18l6-6-6-6"

// ── Share Inbox section — renders pending shares on the dashboard ────────────
function ShareInboxSection({ shares, accent, onOpen }) {
  return (
    <div style={{ marginBottom:28 }}>
      <h2 style={{ margin:'0 0 16px', fontSize:17, fontWeight:800, color:'#0F172A', display:'flex', alignItems:'center', gap:10 }}>
        <Icon d={ICON_SHARE} size={18} color={accent}/>
        Review Requests
        <span style={{ fontSize:12, fontWeight:700, color:'white', background:accent, padding:'2px 10px', borderRadius:99 }}>{shares.length}</span>
      </h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:14 }}>
        {shares.map(share => {
          const data = share.record_summary?.data || {}
          const isAnon = share.privacy_mode === 'anonymised'
          const displayName = isAnon
            ? (data._anon_label || 'Anonymous Candidate')
            : (`${data.first_name||''} ${data.last_name||''}`.trim() || 'Untitled record')
          const subtitle = isAnon
            ? (data.current_title || data.location || '')
            : (data.current_title || data.email || '')
          const ctaLabel = share.cta_type === 'form'
            ? 'Submit feedback form'
            : share.cta_type === 'approve_reject'
              ? 'Approve or reject'
              : 'Provide feedback'
          const expiresIn = share.expires_at
            ? Math.max(0, Math.ceil((new Date(share.expires_at).getTime() - Date.now()) / 86400000))
            : null
          return (
            <div key={share.id} onClick={() => onOpen(share)}
              style={{ background:'white', borderRadius:14, padding:'18px 20px', cursor:'pointer',
                border:'1.5px solid #E2E8F0', borderLeft:`4px solid ${accent}`, transition:'all .15s' }}
              onMouseEnter={e=>{ e.currentTarget.style.boxShadow=`0 4px 16px ${accent}22`; e.currentTarget.style.borderColor=accent }}
              onMouseLeave={e=>{ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor='#E2E8F0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                {isAnon && (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, color:'#0E7490', background:'#ECFEFF', padding:'2px 8px', borderRadius:99, border:'1px solid #A5F3FC' }}>
                    <Icon d={ICON_LOCK} size={10}/> Anonymised
                  </span>
                )}
                <Badge color={accent}>{ctaLabel}</Badge>
                {expiresIn !== null && expiresIn <= 3 && (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, color:'#B91C1C', background:'#FEE2E2', padding:'2px 8px', borderRadius:99 }}>
                    <Icon d={ICON_CLOCK} size={10}/> {expiresIn === 0 ? 'Expires today' : `${expiresIn}d left`}
                  </span>
                )}
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:'#0F172A', marginBottom:3 }}>{displayName}</div>
              {subtitle && <div style={{ fontSize:12, color:'#64748B', marginBottom:10 }}>{subtitle}</div>}
              {share.message && (
                <div style={{ fontSize:12, color:'#475569', background:'#F8FAFC', padding:'8px 10px', borderRadius:8, marginBottom:10, lineHeight:1.5, fontStyle:'italic' }}>
                  &ldquo;{share.message}&rdquo;
                </div>
              )}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:6, fontSize:12, fontWeight:700, color:accent }}>
                Review <Icon d={ICON_CHEV_R} size={14}/>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Share Detail Panel — slide-over for reviewing & completing a share ───────
function ShareDetailPanel({ share, viewerEmail, accent, onClose, onCompleted, api }) {
  const [detail, setDetail]     = useState(null)
  const [formData, setFormData] = useState({})
  const [feedback, setFeedback] = useState('')
  const [decision, setDecision] = useState(null) // 'approved' | 'rejected'
  const [busy, setBusy]         = useState(false)
  const [err, setErr]           = useState(null)

  useEffect(() => {
    if (!share?.id || !viewerEmail) return
    api.get(`/record-shares/${share.id}?as_email=${encodeURIComponent(viewerEmail)}`)
      .then(d => setDetail(d))
      .catch(() => setErr('Unable to load this review'))
  }, [share?.id, viewerEmail, api])

  const submit = async () => {
    setBusy(true); setErr(null)
    try {
      let payload = { as_email: viewerEmail }
      if (share.cta_type === 'form')               payload.response_data = formData
      else if (share.cta_type === 'approve_reject'){ payload.decision = decision; payload.response_data = { decision, note: feedback } }
      else if (share.cta_type === 'free_text_feedback') payload.response_data = { feedback }

      const res = await fetch(`/api/record-shares/${share.id}/complete?as_email=${encodeURIComponent(viewerEmail)}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload),
      })
      if (!res.ok) {
        const e = await res.json().catch(()=>({}))
        throw new Error(e.error || `HTTP ${res.status}`)
      }
      onCompleted()
    } catch (e) {
      setErr(e.message); setBusy(false)
    }
  }

  const canSubmit =
    (share.cta_type === 'form' && Object.keys(formData).length > 0) ||
    (share.cta_type === 'approve_reject' && decision) ||
    (share.cta_type === 'free_text_feedback' && feedback.trim().length > 0)

  const recordData = detail?.record?.data || share.record_summary?.data || {}
  const isAnon = share.privacy_mode === 'anonymised'
  const displayName = isAnon
    ? (recordData._anon_label || 'Anonymous Candidate')
    : (`${recordData.first_name||''} ${recordData.last_name||''}`.trim() || 'Untitled record')

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', zIndex:1000,
      display:'flex', justifyContent:'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width:'min(680px, 100%)', height:'100%', background:'#F8FAFC', overflowY:'auto', boxShadow:'-8px 0 32px rgba(0,0,0,0.15)' }}>
        {/* Header */}
        <div style={{ position:'sticky', top:0, zIndex:2, background:'white', borderBottom:'1px solid #E2E8F0', padding:'18px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:accent, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:3 }}>Review Request</div>
            <div style={{ fontSize:18, fontWeight:800, color:'#0F172A' }}>{displayName}</div>
          </div>
          <button onClick={onClose} style={{ width:36, height:36, borderRadius:8, border:'none', background:'#F1F5F9', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon d={ICON_X} size={16} color="#64748B"/>
          </button>
        </div>

        <div style={{ padding:'24px' }}>
          {/* Message from sender */}
          {share.message && (
            <div style={{ background:'white', border:'1.5px solid #E2E8F0', borderRadius:12, padding:'14px 16px', marginBottom:20, fontSize:13, color:'#475569', lineHeight:1.6, fontStyle:'italic' }}>
              &ldquo;{share.message}&rdquo;
            </div>
          )}

          {/* Privacy badge */}
          {isAnon && (
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11, fontWeight:700, color:'#0E7490', background:'#ECFEFF', padding:'5px 12px', borderRadius:99, border:'1px solid #A5F3FC', marginBottom:20 }}>
              <Icon d={ICON_LOCK} size={12}/> Anonymised — personal details have been hidden
            </div>
          )}

          {/* Record fields */}
          <div style={{ background:'white', border:'1.5px solid #E2E8F0', borderRadius:12, padding:'20px', marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:14 }}>Record Details</div>
            {Object.keys(recordData).filter(k => !k.startsWith('_')).length === 0 ? (
              <div style={{ fontSize:13, color:'#94A3B8' }}>No details available.</div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'140px 1fr', gap:'10px 16px' }}>
                {Object.entries(recordData).filter(([k]) => !k.startsWith('_')).map(([k, v]) => (
                  <RecordField key={k} keyName={k} value={v}/>
                ))}
              </div>
            )}
          </div>

          {/* CTA */}
          <div style={{ background:'white', border:`2px solid ${accent}`, borderRadius:12, padding:'20px', marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:accent, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:14 }}>Your Response</div>

            {share.cta_type === 'form' && detail?.form && (
              <FormRunner form={detail.form} value={formData} onChange={setFormData}/>
            )}
            {share.cta_type === 'form' && !detail?.form && (
              <div style={{ fontSize:13, color:'#94A3B8' }}>Loading form…</div>
            )}

            {share.cta_type === 'approve_reject' && (
              <div>
                {share.cta_config?.prompt && (
                  <div style={{ fontSize:14, fontWeight:600, color:'#0F172A', marginBottom:14 }}>{share.cta_config.prompt}</div>
                )}
                <div style={{ display:'flex', gap:10, marginBottom:14 }}>
                  <button onClick={() => setDecision('approved')}
                    style={{ flex:1, padding:'12px', borderRadius:10, border:`2px solid ${decision==='approved'?'#10B981':'#E2E8F0'}`,
                      background:decision==='approved'?'#10B981':'white', color:decision==='approved'?'white':'#475569',
                      fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    <Icon d={ICON_CHECK} size={14}/> Approve
                  </button>
                  <button onClick={() => setDecision('rejected')}
                    style={{ flex:1, padding:'12px', borderRadius:10, border:`2px solid ${decision==='rejected'?'#EF4444':'#E2E8F0'}`,
                      background:decision==='rejected'?'#EF4444':'white', color:decision==='rejected'?'white':'#475569',
                      fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    <Icon d={ICON_X} size={14}/> Reject
                  </button>
                </div>
                <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
                  placeholder="Optional notes…" rows={3}
                  style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:13, fontFamily:'inherit', resize:'vertical', boxSizing:'border-box' }}/>
              </div>
            )}

            {share.cta_type === 'free_text_feedback' && (
              <div>
                {share.cta_config?.prompt && (
                  <div style={{ fontSize:14, fontWeight:600, color:'#0F172A', marginBottom:10 }}>{share.cta_config.prompt}</div>
                )}
                <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
                  placeholder="Share your thoughts…" rows={6}
                  style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:13, fontFamily:'inherit', resize:'vertical', boxSizing:'border-box' }}/>
              </div>
            )}
          </div>

          {err && (
            <div style={{ background:'#FEE2E2', color:'#B91C1C', padding:'10px 14px', borderRadius:8, fontSize:12, marginBottom:14, border:'1px solid #FECACA' }}>{err}</div>
          )}

          <button onClick={submit} disabled={!canSubmit || busy}
            style={{ width:'100%', padding:'14px', borderRadius:12, border:'none',
              background:(!canSubmit||busy) ? '#E2E8F0' : accent,
              color:(!canSubmit||busy) ? '#94A3B8' : 'white',
              fontSize:14, fontWeight:700, cursor:(!canSubmit||busy)?'default':'pointer' }}>
            {busy ? 'Submitting…' : 'Submit Response'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Display a single field key/value with sensible formatting ────────────────
function RecordField({ keyName, value }) {
  const label = keyName.replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase())
  let display = value
  if (value === null || value === undefined || value === '') display = '—'
  else if (Array.isArray(value)) display = value.join(', ') || '—'
  else if (typeof value === 'object') display = JSON.stringify(value)
  else display = String(value)
  return (
    <>
      <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.04em', paddingTop:2 }}>{label}</div>
      <div style={{ fontSize:13, color:'#0F172A', wordBreak:'break-word' }}>{display}</div>
    </>
  )
}

// ── Minimal form runner — renders a form spec & captures values ──────────────
function FormRunner({ form, value, onChange }) {
  const fields = form?.fields || form?.schema?.fields || []
  if (!fields.length) {
    return <div style={{ fontSize:13, color:'#94A3B8' }}>This form has no fields configured.</div>
  }
  const setField = (key, v) => onChange({ ...value, [key]: v })
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {fields.map(f => {
        const k = f.api_key || f.key || f.id
        const v = value[k] ?? ''
        const label = <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:5 }}>{f.name || f.label || k}{f.required && <span style={{ color:'#EF4444' }}> *</span>}</div>
        const baseInput = { width:'100%', padding:'9px 11px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:13, fontFamily:'inherit', boxSizing:'border-box' }
        if (f.type === 'textarea' || f.field_type === 'textarea' || f.type === 'long_text') {
          return <div key={k}>{label}<textarea value={v} onChange={e => setField(k, e.target.value)} rows={4} style={{ ...baseInput, resize:'vertical' }}/></div>
        }
        if (f.type === 'select' || f.field_type === 'select' || f.type === 'dropdown') {
          const opts = f.options || []
          return <div key={k}>{label}
            <select value={v} onChange={e => setField(k, e.target.value)} style={baseInput}>
              <option value="">— Select —</option>
              {opts.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
            </select>
          </div>
        }
        if (f.type === 'rating' || f.field_type === 'rating') {
          return <div key={k}>{label}
            <div style={{ display:'flex', gap:5 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => setField(k, n)}
                  style={{ width:36, height:36, borderRadius:8, border:`1.5px solid ${v===n?'#F59E0B':'#E2E8F0'}`,
                    background:v===n?'#F59E0B':'white', color:v===n?'white':'#94A3B8', fontSize:14, fontWeight:700, cursor:'pointer' }}>{n}</button>
              ))}
            </div>
          </div>
        }
        return <div key={k}>{label}<input type={f.type === 'number' ? 'number' : 'text'} value={v} onChange={e => setField(k, e.target.value)} style={baseInput}/></div>
      })}
    </div>
  )
}

// ── HM session helpers ────────────────────────────────────────────────────────
function makeHmApi(portalId, token) {
  const base    = `/api/portals/${portalId}/hm`
  const headers = { 'Content-Type': 'application/json', 'x-portal-token': token }
  return {
    get: (p) => fetch(`${base}${p}`, { headers })
      .then(async r => { const j = await r.json().catch(()=>({})); if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`); return j }),
    post: (p, b) => fetch(`${base}${p}`, { method:'POST', headers, body: JSON.stringify(b) })
      .then(async r => { const j = await r.json().catch(()=>({})); if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`); return j }),
  }
}
function verifyPortalSession(portalId, token) {
  return fetch(`/api/portals/${portalId}/session`, { headers: { 'x-portal-token': token } })
    .then(async r => { if (!r.ok) throw new Error('invalid'); return r.json() })
}
const SESSION_KEY = portalId => `hm_session_${portalId}`

// ── Login screen ───────────────────────────────────────────────────────────────
function LoginScreen({ portal, c, onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy]         = useState(false)
  const [err, setErr]           = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!email || !password) return
    setBusy(true); setErr(null)
    try {
      const res = await fetch(`/api/portals/${portal.id}/session`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Invalid credentials')
      onLogin({ token: data.token, user: data.user, expires_at: data.expires_at })
    } catch (e2) {
      setErr(e2.message || 'Unable to sign in'); setBusy(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:c.font,
      display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          {portal.branding?.logo_url
            ? <img src={portal.branding.logo_url} alt={portal.name} style={{ height:40, marginBottom:16 }}/>
            : <div style={{ width:52, height:52, borderRadius:14, background:c.primary, margin:'0 auto 16px',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'white' }}>
                {(portal.branding?.company_name || portal.name || 'H')[0]}
              </div>}
          <h1 style={{ margin:'0 0 6px', fontSize:22, fontWeight:800, color:c.primary }}>
            {portal.branding?.company_name || portal.name}
          </h1>
          <div style={{ fontSize:13, color:'#64748B' }}>Hiring Manager Portal</div>
        </div>
        <form onSubmit={submit} style={{ background:'white', borderRadius:16, padding:'28px 26px',
          border:'1.5px solid #E2E8F0', boxShadow:'0 8px 32px rgba(15,23,42,0.06)' }}>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#475569', marginBottom:6 }}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoFocus
              placeholder="you@company.com"
              style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:'1.5px solid #E2E8F0',
                fontSize:14, fontFamily:'inherit', boxSizing:'border-box', outline:'none' }}
              onFocus={e=>e.target.style.borderColor=c.accent} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#475569', marginBottom:6 }}>Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required
              placeholder="••••••••"
              style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:'1.5px solid #E2E8F0',
                fontSize:14, fontFamily:'inherit', boxSizing:'border-box', outline:'none' }}
              onFocus={e=>e.target.style.borderColor=c.accent} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
          </div>
          {err && (
            <div style={{ background:'#FEE2E2', color:'#B91C1C', padding:'9px 13px', borderRadius:8,
              fontSize:12, marginBottom:16, border:'1px solid #FECACA' }}>{err}</div>
          )}
          <button type="submit" disabled={busy || !email || !password}
            style={{ width:'100%', padding:'13px', borderRadius:10, border:'none',
              background:(busy||!email||!password) ? '#E2E8F0' : c.accent,
              color:(busy||!email||!password) ? '#94A3B8' : 'white',
              fontSize:14, fontWeight:700, cursor:(busy||!email||!password)?'default':'pointer', fontFamily:'inherit' }}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div style={{ textAlign:'center', fontSize:12, color:'#94A3B8', marginTop:18 }}>
          Trouble signing in? Contact your recruiting team.
        </div>
      </div>
    </div>
  )
}

// ── New Job panel — 3 creation modes: plain form / similar role / assistant ──
function NewJobPanel({ portal, c, hmApi, onClose, onCreated }) {
  const [mode, setMode] = useState(null) // 'form' | 'similar' | 'chat'

  // -- Plain form state --
  const [f, setF] = useState({
    job_title:'', department:'', location:'', employment_type:'Full-time',
    description:'', requirements:'', required_skills:'',
  })
  const setField = (k,v) => setF(prev=>({ ...prev, [k]:v }))

  // -- Similar role state --
  const [tplQuery, setTplQuery]   = useState('')
  const [tplResults, setTplResults] = useState([])
  const [tplBusy, setTplBusy]     = useState(false)
  const [tplPicked, setTplPicked] = useState(null)
  const [tplTitle, setTplTitle]   = useState('')

  useEffect(() => {
    if (mode !== 'similar') return
    setTplBusy(true)
    const t = setTimeout(() => {
      hmApi.get(`/similar-jobs?q=${encodeURIComponent(tplQuery)}`)
        .then(d => setTplResults(d.jobs || []))
        .catch(() => setTplResults([]))
        .finally(() => setTplBusy(false))
    }, 300)
    return () => clearTimeout(t)
  }, [mode, tplQuery, hmApi])

  // -- Chat state --
  const [chatMsgs, setChatMsgs]     = useState([{ role:'assistant', content:"Hi! Tell me about the role you'd like to open — I can draft it from scratch or find a similar past role to reuse." }])
  const [chatInput, setChatInput]   = useState('')
  const [chatBusy, setChatBusy]     = useState(false)
  const [chatDraft, setChatDraft]   = useState(null)
  const [chatSimilar, setChatSimilar] = useState(null)

  const extractTag = (text, tag) => {
    const m = text.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
    if (!m) return null
    try { return JSON.parse(m[1]) } catch { return null }
  }
  const stripTags = (text) => text.replace(/<SIMILAR_JOBS>[\s\S]*?<\/SIMILAR_JOBS>/g, '').replace(/<JOB_DRAFT>[\s\S]*?<\/JOB_DRAFT>/g, '').trim()

  const sendChat = async () => {
    if (!chatInput.trim() || chatBusy) return
    const next = [...chatMsgs, { role:'user', content: chatInput.trim() }]
    setChatMsgs(next); setChatInput(''); setChatBusy(true)
    try {
      const { reply } = await hmApi.post('/chat', { messages: next })
      const similar = extractTag(reply, 'SIMILAR_JOBS')
      const draft    = extractTag(reply, 'JOB_DRAFT')
      const clean    = stripTags(reply)
      setChatMsgs(m => [...m, { role:'assistant', content: clean || '…' }])
      if (similar) setChatSimilar(similar)
      if (draft)   setChatDraft(draft)
    } catch (e) {
      setChatMsgs(m => [...m, { role:'assistant', content: "Sorry, I hit an error — please try again." }])
    } finally {
      setChatBusy(false)
    }
  }

  // -- Unified create --
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState(null)
  const create = async (data, sourceJobId) => {
    setCreating(true); setCreateErr(null)
    try {
      const { job } = await hmApi.post('/jobs', { source_job_id: sourceJobId || undefined, data })
      onCreated(job)
    } catch (e) {
      setCreateErr(e.message || 'Failed to create role')
    } finally {
      setCreating(false)
    }
  }

  const baseInput = { width:'100%', padding:'10px 13px', borderRadius:9, border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'inherit', boxSizing:'border-box', outline:'none' }
  const label = t => <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:5 }}>{t}</div>

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex' }}>
      <div onClick={onClose} style={{ flex:1, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)' }}/>
      <div style={{ width:560, maxWidth:'100%', background:'white', height:'100%', overflowY:'auto',
        boxShadow:'-8px 0 48px rgba(0,0,0,0.18)', display:'flex', flexDirection:'column' }}>
        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #E2E8F0', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            {mode && (
              <button onClick={()=>setMode(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, color:c.accent, padding:0, marginBottom:6 }}>
                ← Choose a different way
              </button>
            )}
            <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:'#0F172A' }}>New Role</h2>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#94A3B8', lineHeight:1 }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'22px 24px' }}>
          {!mode && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { id:'form',    title:'Start from scratch',   desc:'Fill in a plain form with all the role details yourself.' },
                { id:'similar', title:'Use a similar role',   desc:'Search past roles and clone one as your starting point.' },
                { id:'chat',    title:'Ask the assistant',    desc:'Describe the role in your own words — the assistant will find similar past roles or draft a new one for you.' },
              ].map(opt => (
                <button key={opt.id} onClick={()=>setMode(opt.id)}
                  style={{ textAlign:'left', padding:'18px 20px', borderRadius:12, border:'1.5px solid #E2E8F0', background:'white', cursor:'pointer', transition:'all .15s' }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=c.accent; e.currentTarget.style.boxShadow=`0 4px 16px ${c.accent}18` }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.boxShadow='none' }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'#0F172A', marginBottom:4 }}>{opt.title}</div>
                  <div style={{ fontSize:12, color:'#64748B', lineHeight:1.5 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          )}

          {mode === 'form' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>{label('Job Title *')}<input style={baseInput} value={f.job_title} onChange={e=>setField('job_title', e.target.value)} placeholder="e.g. Senior Product Designer"/></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>{label('Department')}<input style={baseInput} value={f.department} onChange={e=>setField('department', e.target.value)}/></div>
                <div>{label('Location')}<input style={baseInput} value={f.location} onChange={e=>setField('location', e.target.value)}/></div>
              </div>
              <div>{label('Employment Type')}
                <select style={baseInput} value={f.employment_type} onChange={e=>setField('employment_type', e.target.value)}>
                  {['Full-time','Part-time','Contract','Internship'].map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>{label('Job Description')}<textarea style={{ ...baseInput, resize:'vertical' }} rows={5} value={f.description} onChange={e=>setField('description', e.target.value)}/></div>
              <div>{label('Requirements')}<textarea style={{ ...baseInput, resize:'vertical' }} rows={3} value={f.requirements} onChange={e=>setField('requirements', e.target.value)}/></div>
              <div>{label('Skills (comma separated)')}<input style={baseInput} value={f.required_skills} onChange={e=>setField('required_skills', e.target.value)}/></div>
              {createErr && <div style={{ background:'#FEE2E2', color:'#B91C1C', padding:'9px 13px', borderRadius:8, fontSize:12 }}>{createErr}</div>}
              <button onClick={()=>create(f)} disabled={!f.job_title || creating}
                style={{ padding:'13px', borderRadius:10, border:'none',
                  background:(!f.job_title||creating) ? '#E2E8F0' : c.accent,
                  color:(!f.job_title||creating) ? '#94A3B8' : 'white',
                  fontSize:14, fontWeight:700, cursor:(!f.job_title||creating)?'default':'pointer' }}>
                {creating ? 'Creating…' : 'Create Role'}
              </button>
            </div>
          )}

          {mode === 'similar' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {!tplPicked ? (
                <>
                  <input style={baseInput} value={tplQuery} onChange={e=>setTplQuery(e.target.value)}
                    placeholder="Search past roles by title, department, skill…" autoFocus/>
                  {tplBusy && <div style={{ fontSize:12, color:'#94A3B8' }}>Searching…</div>}
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {tplResults.map(job => (
                      <button key={job.id} onClick={()=>{ setTplPicked(job); setTplTitle(job.title) }}
                        style={{ textAlign:'left', padding:'14px 16px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'white', cursor:'pointer' }}
                        onMouseEnter={e=>e.currentTarget.style.borderColor=c.accent}
                        onMouseLeave={e=>e.currentTarget.style.borderColor='#E2E8F0'}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{job.title}</span>
                          <Badge color={c.accent}>{job.status}</Badge>
                        </div>
                        <div style={{ fontSize:12, color:'#64748B' }}>{[job.department, job.location].filter(Boolean).join(' · ')}</div>
                        {job.job_description_snippet && (
                          <div style={{ fontSize:11, color:'#94A3B8', marginTop:6, lineHeight:1.5 }}>{job.job_description_snippet}</div>
                        )}
                      </button>
                    ))}
                    {!tplBusy && tplResults.length===0 && (
                      <div style={{ fontSize:12, color:'#94A3B8', textAlign:'center', padding:'20px 0' }}>No matching roles found.</div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ padding:'14px 16px', borderRadius:10, background:`${c.accent}08`, border:`1px solid ${c.accent}20`, marginBottom:6 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:c.accent, textTransform:'uppercase', marginBottom:4 }}>Cloning from</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>{tplPicked.title}</div>
                    <button onClick={()=>setTplPicked(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, color:c.accent, padding:0, marginTop:6 }}>Choose a different role</button>
                  </div>
                  <div>{label('New Job Title')}<input style={baseInput} value={tplTitle} onChange={e=>setTplTitle(e.target.value)}/></div>
                  {createErr && <div style={{ background:'#FEE2E2', color:'#B91C1C', padding:'9px 13px', borderRadius:8, fontSize:12 }}>{createErr}</div>}
                  <button onClick={()=>create({ job_title: tplTitle }, tplPicked.id)} disabled={!tplTitle || creating}
                    style={{ padding:'13px', borderRadius:10, border:'none',
                      background:(!tplTitle||creating) ? '#E2E8F0' : c.accent,
                      color:(!tplTitle||creating) ? '#94A3B8' : 'white',
                      fontSize:14, fontWeight:700, cursor:(!tplTitle||creating)?'default':'pointer' }}>
                    {creating ? 'Creating…' : 'Create Role from Template'}
                  </button>
                </>
              )}
            </div>
          )}

          {mode === 'chat' && (
            <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
                {chatMsgs.map((m,i)=>(
                  <div key={i} style={{ alignSelf:m.role==='user'?'flex-end':'flex-start', maxWidth:'85%' }}>
                    <div style={{ padding:'10px 14px', borderRadius:12,
                      background:m.role==='user'?c.accent:'#F1F5F9',
                      color:m.role==='user'?'white':'#0F172A',
                      fontSize:13, lineHeight:1.5, whiteSpace:'pre-wrap' }}>{m.content}</div>
                  </div>
                ))}
                {chatBusy && <div style={{ fontSize:12, color:'#94A3B8' }}>Thinking…</div>}

                {chatSimilar && chatSimilar.length > 0 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
                    {chatSimilar.map(job => (
                      <button key={job.id} onClick={()=>{ setTplPicked(job); setTplTitle(job.title); setMode('similar') }}
                        style={{ textAlign:'left', padding:'12px 14px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'white', cursor:'pointer' }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{job.title}</div>
                        <div style={{ fontSize:11, color:'#64748B' }}>{[job.department, job.location].filter(Boolean).join(' · ')}</div>
                      </button>
                    ))}
                  </div>
                )}

                {chatDraft && (
                  <div style={{ padding:'16px', borderRadius:12, background:`${c.accent}08`, border:`1.5px solid ${c.accent}30`, marginTop:4 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:c.accent, textTransform:'uppercase', marginBottom:8 }}>Draft Role</div>
                    <div style={{ fontSize:15, fontWeight:800, color:'#0F172A', marginBottom:4 }}>{chatDraft.job_title}</div>
                    <div style={{ fontSize:12, color:'#64748B', marginBottom:10 }}>{[chatDraft.department, chatDraft.location, chatDraft.employment_type].filter(Boolean).join(' · ')}</div>
                    {chatDraft.description && <p style={{ fontSize:12, color:'#475569', lineHeight:1.6, margin:'0 0 10px' }}>{chatDraft.description}</p>}
                    {chatDraft.required_skills && (
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                        {(Array.isArray(chatDraft.required_skills) ? chatDraft.required_skills : String(chatDraft.required_skills).split(',').map(s=>s.trim()).filter(Boolean)).map(s=>(
                          <Badge key={s} color={c.accent}>{s}</Badge>
                        ))}
                      </div>
                    )}
                    {createErr && <div style={{ background:'#FEE2E2', color:'#B91C1C', padding:'9px 13px', borderRadius:8, fontSize:12, marginBottom:10 }}>{createErr}</div>}
                    <button onClick={()=>create(chatDraft)} disabled={creating}
                      style={{ width:'100%', padding:'11px', borderRadius:9, border:'none',
                        background:creating?'#E2E8F0':c.accent, color:creating?'#94A3B8':'white',
                        fontSize:13, fontWeight:700, cursor:creating?'default':'pointer' }}>
                      {creating ? 'Creating…' : 'Create This Role'}
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:8, position:'sticky', bottom:0, background:'white', paddingTop:8 }}>
                <input style={{ ...baseInput, flex:1 }} value={chatInput}
                  onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); sendChat() } }}
                  placeholder="Describe the role you need…" disabled={chatBusy}/>
                <button onClick={sendChat} disabled={chatBusy || !chatInput.trim()}
                  style={{ padding:'0 18px', borderRadius:9, border:'none',
                    background:(chatBusy||!chatInput.trim())?'#E2E8F0':c.accent,
                    color:(chatBusy||!chatInput.trim())?'#94A3B8':'white',
                    fontSize:13, fontWeight:700, cursor:(chatBusy||!chatInput.trim())?'default':'pointer' }}>
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Interview feedback (scorecard) ────────────────────────────────────────────
const RECOMMENDATIONS = [
  { id:'strong_no',  label:'Strong No',  color:'#DC2626' },
  { id:'no',         label:'No',         color:'#F97316' },
  { id:'yes',        label:'Yes',        color:'#16A34A' },
  { id:'strong_yes', label:'Strong Yes', color:'#059669' },
]

function InterviewFeedbackModal({ interview, c, hmApi, onClose, onSubmitted }) {
  const [recommendation, setRecommendation] = useState(null)
  const [comments, setComments] = useState('')
  const [highlights, setHighlights] = useState('')
  const [redFlags, setRedFlags] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const submit = async () => {
    if (!recommendation) return
    setBusy(true); setErr(null)
    try {
      await hmApi.post('/scorecard', {
        interview_id: interview.id,
        candidate_record_id: interview.candidate_id,
        job_record_id: interview.job_id,
        recommendation,
        overall_comments: comments,
        highlights,
        red_flags: redFlags,
        responses: [],
        status: 'submitted',
      })
      onSubmitted()
    } catch (e) {
      setErr(e.message || 'Failed to submit feedback'); setBusy(false)
    }
  }

  const baseInput = { width:'100%', padding:'10px 13px', borderRadius:9, border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'inherit', boxSizing:'border-box', outline:'none', resize:'vertical' }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex' }}>
      <div onClick={onClose} style={{ flex:1, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)' }}/>
      <div style={{ width:480, maxWidth:'100%', background:'white', height:'100%', overflowY:'auto',
        boxShadow:'-8px 0 48px rgba(0,0,0,0.18)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'22px 24px', borderBottom:'1px solid #E2E8F0', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:c.accent, textTransform:'uppercase', letterSpacing:'.06em' }}>Interview Feedback</div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#94A3B8', lineHeight:1 }}>✕</button>
          </div>
          <h2 style={{ margin:'0 0 4px', fontSize:18, fontWeight:800, color:'#0F172A' }}>{interview.candidate_name}</h2>
          <div style={{ fontSize:13, color:'#64748B' }}>{interview.job_name}{interview.interview_type_name?` · ${interview.interview_type_name}`:''}</div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'22px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Recommendation *</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {RECOMMENDATIONS.map(r => (
                <button key={r.id} onClick={()=>setRecommendation(r.id)}
                  style={{ padding:'12px', borderRadius:10, border:`2px solid ${recommendation===r.id?r.color:'#E2E8F0'}`,
                    background:recommendation===r.id?r.color:'white', color:recommendation===r.id?'white':'#475569',
                    fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:6 }}>Overall Comments</div>
            <textarea style={baseInput} rows={4} value={comments} onChange={e=>setComments(e.target.value)} placeholder="Overall impressions…"/>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:6 }}>Highlights</div>
            <textarea style={baseInput} rows={2} value={highlights} onChange={e=>setHighlights(e.target.value)} placeholder="What stood out positively?"/>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:6 }}>Red Flags</div>
            <textarea style={baseInput} rows={2} value={redFlags} onChange={e=>setRedFlags(e.target.value)} placeholder="Any concerns?"/>
          </div>
          {err && <div style={{ background:'#FEE2E2', color:'#B91C1C', padding:'9px 13px', borderRadius:8, fontSize:12 }}>{err}</div>}
        </div>
        <div style={{ padding:'18px 24px', borderTop:'1px solid #E2E8F0', flexShrink:0 }}>
          <button onClick={submit} disabled={!recommendation || busy}
            style={{ width:'100%', padding:'13px', borderRadius:10, border:'none',
              background:(!recommendation||busy) ? '#E2E8F0' : c.accent,
              color:(!recommendation||busy) ? '#94A3B8' : 'white',
              fontSize:14, fontWeight:700, cursor:(!recommendation||busy)?'default':'pointer' }}>
            {busy ? 'Submitting…' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Job summary card (My Jobs / Dashboard) ────────────────────────────────────
function JobCard({ job, color, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background:'white', borderRadius:14, border:'1.5px solid #E2E8F0', padding:'18px 20px', cursor:'pointer', transition:'all .15s' }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor=color; e.currentTarget.style.boxShadow=`0 4px 16px ${color}18` }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.boxShadow='none' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8, gap:8 }}>
        <div style={{ fontSize:15, fontWeight:800, color:'#0F172A' }}>{job.title}</div>
        <Badge color={job.status==='Open'?'#16A34A':'#94A3B8'}>{job.status}</Badge>
      </div>
      <div style={{ fontSize:12, color:'#64748B', marginBottom:14 }}>{[job.department, job.location].filter(Boolean).join(' · ') || '—'}</div>
      <div style={{ display:'flex', gap:16 }}>
        <div>
          <div style={{ fontSize:17, fontWeight:800, color:'#0F172A' }}>{job.pipeline_count ?? 0}</div>
          <div style={{ fontSize:10, color:'#94A3B8', fontWeight:600, textTransform:'uppercase' }}>In pipeline</div>
        </div>
        <div>
          <div style={{ fontSize:17, fontWeight:800, color:'#0F172A' }}>{job.upcoming_interviews ?? 0}</div>
          <div style={{ fontSize:10, color:'#94A3B8', fontWeight:600, textTransform:'uppercase' }}>Interviews</div>
        </div>
        <div>
          <div style={{ fontSize:17, fontWeight:800, color:'#0F172A' }}>{job.pending_offers ?? 0}</div>
          <div style={{ fontSize:10, color:'#94A3B8', fontWeight:600, textTransform:'uppercase' }}>Offers</div>
        </div>
      </div>
    </div>
  )
}

// ── Main HMPortal ─────────────────────────────────────────────────────────────
export default function HMPortal({ portal, objects, api, viewerEmail }) {
  const c   = css(portal.branding)
  const br  = portal.branding || {}

  // -- Session / auth --
  const [session, setSession]               = useState(null)
  const [sessionChecked, setSessionChecked]  = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY(portal.id))
    if (!raw) { setSessionChecked(true); return }
    let saved
    try { saved = JSON.parse(raw) } catch { localStorage.removeItem(SESSION_KEY(portal.id)); setSessionChecked(true); return }
    verifyPortalSession(portal.id, saved.token)
      .then(d => setSession({ token: saved.token, user: d.user }))
      .catch(() => localStorage.removeItem(SESSION_KEY(portal.id)))
      .finally(() => setSessionChecked(true))
  }, [portal.id])

  const handleLogin = (data) => {
    localStorage.setItem(SESSION_KEY(portal.id), JSON.stringify({ token: data.token }))
    setSession({ token: data.token, user: data.user })
  }
  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY(portal.id))
    setSession(null)
  }

  const hmApi = useMemo(() => session ? makeHmApi(portal.id, session.token) : null, [portal.id, session])

  // -- Object lookups (for full unscoped record reads, filtered client-side) --
  const matchObj = (re) => (objects||[]).find(o => re.test(o.api_slug || o.slug || o.object_slug || o.name || o.singular_name || o.plural_name || ''))
  const jobsObj   = matchObj(/job/i)
  const peopleObj = matchObj(/^(people|person)/i)

  // -- Scoped data --
  const [myJobs, setMyJobs]           = useState([])
  const [includeClosed, setIncludeClosed] = useState(false)
  const [shortlist, setShortlist]     = useState([])
  const [shortlistView, setShortlistView] = useState(null)
  const [interviews, setInterviews]   = useState([])
  const [includePast, setIncludePast] = useState(false)
  const [onboarding, setOnboarding]   = useState([])
  const [reqs, setReqs]               = useState([])          // full job records (HM's own)
  const [allCandidates, setAllCandidates] = useState([])       // full people records
  const [links, setLinks]             = useState([])           // people_links scoped to HM's jobs
  const [loading, setLoading]         = useState(true)

  const reload = useCallback(async () => {
    if (!hmApi) return
    setLoading(true)
    try {
      const [mj, sl, iv, ob] = await Promise.all([
        hmApi.get(`/my-jobs${includeClosed ? '?include_closed=1' : ''}`),
        hmApi.get('/shortlist'),
        hmApi.get(`/interviews${includePast ? '?include_past=1' : ''}`),
        hmApi.get('/onboarding'),
      ])
      const jobs = mj.jobs || []
      setMyJobs(jobs)
      setShortlist(sl.candidates || [])
      setShortlistView(sl.saved_view || null)
      setInterviews(iv.interviews || [])
      setOnboarding(ob.onboarding || [])

      const jobIds = new Set(jobs.map(j => j.id))
      if (jobsObj && portal.environment_id) {
        try {
          const rd = await api.get(`/records?object_id=${jobsObj.id}&environment_id=${portal.environment_id}`)
          const list = rd.records || rd || []
          setReqs(list.filter(r => jobIds.has(r.id)))
        } catch { setReqs([]) }
      }
      if (peopleObj && portal.environment_id) {
        try {
          const pd = await api.get(`/records?object_id=${peopleObj.id}&environment_id=${portal.environment_id}`)
          setAllCandidates(pd.records || pd || [])
        } catch { setAllCandidates([]) }
      }
      if (portal.environment_id) {
        try {
          const ld = await api.get(`/people-links?environment_id=${portal.environment_id}`)
          const allLinks = ld.links || ld || []
          setLinks(allLinks.filter(l => jobIds.has(l.target_record_id || l.job_id)))
        } catch { setLinks([]) }
      }
    } catch (e) {
      console.error('HM portal reload failed', e)
    } finally {
      setLoading(false)
    }
  }, [hmApi, includeClosed, includePast])

  useEffect(() => { if (session) reload() }, [session, reload])

  // -- Share Inbox (independent of session; keyed off viewerEmail) --
  const [shares, setShares]           = useState([])
  const [activeShare, setActiveShare] = useState(null)
  const reloadShares = useCallback(() => {
    if (!viewerEmail) { setShares([]); return }
    api.get(`/record-shares?as_email=${encodeURIComponent(viewerEmail)}&status=pending`)
      .then(d => setShares(d.shares || d || []))
      .catch(() => setShares([]))
  }, [viewerEmail, api])
  useEffect(() => { reloadShares() }, [reloadShares])

  // -- Nav / view state --
  const [view, setView]           = useState('dashboard') // dashboard | jobs | pipeline | shortlist | interviews | onboarding
  const [activeReq, setActiveReq] = useState(null)
  const [selected, setSelected]   = useState(null)
  const [filterStage, setFilterStage] = useState(null)
  const [showNewJob, setShowNewJob]   = useState(false)
  const [feedbackFor, setFeedbackFor] = useState(null)

  const openPipeline = (jobSummary) => {
    const full = reqs.find(r => r.id === jobSummary.id) || jobSummary
    setActiveReq(full)
    setFilterStage(null)
    setView('pipeline')
  }

  // -- Candidate adapters --
  const buildCandidate = (person, link) => {
    const d = person?.data || {}
    return {
      id: person?.id, person_id: person?.id,
      name: [d.first_name, d.last_name].filter(Boolean).join(' ') || d.full_name || d.name || 'Unknown',
      title: d.current_title || d.job_title || d.title || '',
      company: d.current_company || d.company || '',
      location: d.location || d.city || '',
      photo: d.photo_url || d.avatar_url || '',
      rating: link?.rating || d.rating || null,
      stage: link?.current_stage_name || link?.stage_name || link?.stage || 'Applied',
      years_experience: d.years_experience || d.experience_years || '',
      notice_period: d.notice_period || '',
      email: d.email || '', phone: d.phone || d.mobile || '',
      summary: d.summary || d.bio || '', skills: d.skills || '',
      linkedin_url: d.linkedin_url || d.linkedin || '',
    }
  }
  const shortlistToCandidate = (row, jobId) => {
    const full = allCandidates.find(p => p.id === row.id)
    const d = full?.data || {}
    const jobEntry = (row.jobs||[]).find(j => j.job_id === jobId) || (row.jobs||[])[0]
    return {
      id: row.id, person_id: row.id, name: row.name || 'Unknown',
      title: row.current_title || d.current_title || '',
      company: d.current_company || d.company || '',
      location: row.location || d.location || '',
      photo: d.photo_url || d.avatar_url || '',
      rating: d.rating || null,
      stage: jobEntry?.stage || row.status || 'Applied',
      years_experience: d.years_experience || '',
      notice_period: d.notice_period || '',
      email: row.email || d.email || '', phone: d.phone || '',
      summary: d.summary || d.bio || '', skills: d.skills || '',
      linkedin_url: d.linkedin_url || '',
    }
  }

  // -- Pipeline (current drilled-in job) --
  const pipelineCandidates = useMemo(() => {
    if (!activeReq) return []
    return links
      .filter(l => (l.target_record_id || l.job_id) === activeReq.id)
      .map(l => {
        const personId = l.person_record_id || l.person_id
        const person = allCandidates.find(p => p.id === personId)
        return person ? buildCandidate(person, l) : null
      })
      .filter(Boolean)
  }, [links, activeReq, allCandidates])

  const pipelineStages = useMemo(() => {
    const present = new Set(pipelineCandidates.map(cd => cd.stage))
    return STAGE_ORDER.filter(s => present.has(s))
  }, [pipelineCandidates])

  // -- Needs attention (dashboard) --
  const attentionCandidates = useMemo(() => {
    const myJobIds = new Set(myJobs.map(j => j.id))
    return links
      .filter(l => myJobIds.has(l.target_record_id || l.job_id) &&
        HM_STAGES.includes(l.current_stage_name || l.stage_name || l.stage))
      .map(l => {
        const personId = l.person_record_id || l.person_id
        const person = allCandidates.find(p => p.id === personId)
        if (!person) return null
        const jobId = l.target_record_id || l.job_id
        const job = reqs.find(r => r.id === jobId)
        return { candidate: buildCandidate(person, l), job }
      })
      .filter(Boolean)
  }, [links, myJobs, allCandidates, reqs])

  const openReqCount        = myJobs.filter(j => j.status !== 'Closed' && j.status !== 'Filled').length
  const totalInPipeline     = links.length
  const upcomingInterviewCount = interviews.filter(iv => iv.status !== 'completed' && iv.status !== 'cancelled').length

  const NAV = [
    { id:'dashboard',   label:'Dashboard' },
    { id:'jobs',        label:'My Jobs' },
    { id:'shortlist',   label:'Shortlist' },
    { id:'interviews',  label:'Interviews' },
    { id:'onboarding',  label:'Onboarding' },
  ]

  if (!sessionChecked) return null
  if (!session) return <LoginScreen portal={portal} c={c} onLogin={handleLogin}/>


  const hmName = session.user ? [session.user.first_name, session.user.last_name].filter(Boolean).join(' ') : ''

  return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:c.font }}>
      {/* Top nav */}
      <div style={{ background:c.primary, position:'sticky', top:0, zIndex:100 }}>
        <Section style={{ display:'flex', alignItems:'center', height:64, gap:28 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            {portal.branding?.logo_url
              ? <img src={portal.branding.logo_url} alt="" style={{ height:26 }}/>
              : <div style={{ width:30, height:30, borderRadius:8, background:c.accent,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'white' }}>
                  {(portal.branding?.company_name || portal.name || 'H')[0]}
                </div>}
            <span style={{ fontSize:14, fontWeight:800, color:'white' }}>{portal.branding?.company_name || portal.name}</span>
          </div>
          <div style={{ display:'flex', gap:4, flex:1 }}>
            {NAV.map(n => {
              const active = view === n.id || (n.id==='jobs' && view==='pipeline')
              return (
                <button key={n.id} onClick={()=>{ setView(n.id); if(n.id!=='pipeline') setActiveReq(null) }}
                  style={{ padding:'8px 16px', borderRadius:9, border:'none', cursor:'pointer',
                    background:active ? 'rgba(255,255,255,0.14)' : 'transparent',
                    color:active ? 'white' : 'rgba(255,255,255,0.6)',
                    fontSize:13, fontWeight:700, fontFamily:'inherit', transition:'all .15s' }}>
                  {n.label}
                </button>
              )
            })}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
            <span style={{ fontSize:13, color:'rgba(255,255,255,0.75)' }}>{hmName}</span>
            <button onClick={handleLogout}
              style={{ padding:'7px 14px', borderRadius:8, border:'1px solid rgba(255,255,255,0.25)',
                background:'transparent', color:'rgba(255,255,255,0.85)', fontSize:12, fontWeight:700,
                cursor:'pointer', fontFamily:'inherit' }}>
              Sign out
            </button>
          </div>
        </Section>
      </div>

      <Section style={{ padding:'28px 24px 60px' }}>
        {/* Stats strip */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:28 }}>
          {[
            { label:'Open Requisitions',   value:openReqCount },
            { label:'Total in Pipeline',   value:totalInPipeline },
            { label:'Needs Attention',     value:attentionCandidates.length },
            { label:'Upcoming Interviews', value:upcomingInterviewCount },
          ].map(s => (
            <div key={s.label} style={{ background:'white', borderRadius:14, border:'1.5px solid #E2E8F0', padding:'18px 20px' }}>
              <div style={{ fontSize:26, fontWeight:800, color:'#0F172A', marginBottom:4 }}>{s.value}</div>
              <div style={{ fontSize:12, color:'#64748B', fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign:'center', padding:'60px 0', color:'#94A3B8', fontSize:13 }}>Loading…</div>
        )}

        {!loading && view === 'dashboard' && (
          <>
            {shares.length > 0 && (
              <ShareInboxSection shares={shares} accent={c.accent} onOpen={setActiveShare}/>
            )}

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:'#0F172A' }}>My Open Requisitions</h2>
              <button onClick={()=>setShowNewJob(true)}
                style={{ padding:'9px 16px', borderRadius:9, border:'none', background:c.accent, color:'white',
                  fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                + New Role
              </button>
            </div>
            {myJobs.filter(j => j.status !== 'Closed' && j.status !== 'Filled').length === 0 ? (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'#94A3B8', fontSize:13,
                background:'white', borderRadius:14, border:'1.5px dashed #E2E8F0', marginBottom:32 }}>
                No open requisitions yet.
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14, marginBottom:32 }}>
                {myJobs.filter(j => j.status !== 'Closed' && j.status !== 'Filled').map(job => (
                  <JobCard key={job.id} job={job} color={c.accent} onClick={()=>openPipeline(job)}/>
                ))}
              </div>
            )}

            <h2 style={{ margin:'0 0 16px', fontSize:17, fontWeight:800, color:'#0F172A' }}>Needs Attention</h2>
            {attentionCandidates.length === 0 ? (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'#94A3B8', fontSize:13,
                background:'white', borderRadius:14, border:'1.5px dashed #E2E8F0' }}>
                Nothing needs your review right now.
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:12 }}>
                {attentionCandidates.map(({ candidate, job }) => (
                  <div key={candidate.person_id} onClick={()=>{ if(job){ setActiveReq(job); setView('pipeline') } setSelected(candidate) }}
                    style={{ background:'white', borderRadius:12, border:'1.5px solid #E2E8F0', padding:'14px 16px', cursor:'pointer', transition:'all .15s' }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor=c.accent; e.currentTarget.style.boxShadow=`0 4px 14px ${c.accent}18` }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.boxShadow='none' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                      <Avatar name={candidate.name} photo={candidate.photo} size={34} color={c.accent}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{candidate.name}</div>
                        <div style={{ fontSize:11, color:'#94A3B8' }}>{job?.data?.job_title || job?.title || ''}</div>
                      </div>
                    </div>
                    <StageBadge stage={candidate.stage}/>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && view === 'jobs' && (
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:'#0F172A' }}>My Jobs</h2>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#64748B', cursor:'pointer' }}>
                  <input type="checkbox" checked={includeClosed} onChange={e=>setIncludeClosed(e.target.checked)}/>
                  Include closed
                </label>
                <button onClick={()=>setShowNewJob(true)}
                  style={{ padding:'9px 16px', borderRadius:9, border:'none', background:c.accent, color:'white',
                    fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  + New Role
                </button>
              </div>
            </div>
            {myJobs.length === 0 ? (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'#94A3B8', fontSize:13,
                background:'white', borderRadius:14, border:'1.5px dashed #E2E8F0' }}>
                No jobs yet — create your first role.
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14 }}>
                {myJobs.map(job => (
                  <JobCard key={job.id} job={job} color={c.accent} onClick={()=>openPipeline(job)}/>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && view === 'pipeline' && activeReq && (
          <>
            <button onClick={()=>{ setView('jobs'); setActiveReq(null) }}
              style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer',
                color:'#64748B', fontSize:13, fontWeight:600, fontFamily:'inherit', padding:0, marginBottom:16 }}>
              <span style={{ fontSize:14, lineHeight:1 }}>←</span> Back to My Jobs
            </button>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <h2 style={{ margin:'0 0 4px', fontSize:20, fontWeight:800, color:'#0F172A' }}>
                  {activeReq.data?.job_title || activeReq.title || 'Untitled Role'}
                </h2>
                <div style={{ fontSize:13, color:'#64748B' }}>
                  {[activeReq.data?.department, activeReq.data?.location].filter(Boolean).join(' · ')}
                </div>
              </div>
              <Badge color={c.accent}>{pipelineCandidates.length} in pipeline</Badge>
            </div>
            {pipelineStages.length > 0 && (
              <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
                <button onClick={()=>setFilterStage(null)}
                  style={{ padding:'6px 13px', borderRadius:99, border:`1.5px solid ${!filterStage?c.accent:'#E2E8F0'}`,
                    background:!filterStage?c.accent:'white', color:!filterStage?'white':'#64748B',
                    fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  All Stages
                </button>
                {pipelineStages.map(s => (
                  <button key={s} onClick={()=>setFilterStage(filterStage===s?null:s)}
                    style={{ padding:'6px 13px', borderRadius:99, border:`1.5px solid ${filterStage===s?c.accent:'#E2E8F0'}`,
                      background:filterStage===s?c.accent:'white', color:filterStage===s?'white':'#64748B',
                      fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {pipelineCandidates.length === 0 ? (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'#94A3B8', fontSize:13,
                background:'white', borderRadius:14, border:'1.5px dashed #E2E8F0' }}>
                No candidates in this pipeline yet.
              </div>
            ) : (
              <div style={{ display:'flex', gap:14, overflowX:'auto', paddingBottom:8 }}>
                {STAGE_ORDER.filter(s => pipelineStages.includes(s)).map(stage => (
                  <StageColumn key={stage} stage={stage}
                    candidates={pipelineCandidates.filter(cd => cd.stage === stage)}
                    color={c.accent} onSelect={setSelected}
                    dimmed={filterStage ? filterStage !== stage : false}/>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && view === 'shortlist' && (
          <>
            <div style={{ marginBottom:16 }}>
              <h2 style={{ margin:'0 0 4px', fontSize:17, fontWeight:800, color:'#0F172A' }}>Shortlist</h2>
              {shortlistView?.name && (
                <div style={{ fontSize:12, color:'#94A3B8' }}>Based on saved view: <strong style={{ color:'#64748B' }}>{shortlistView.name}</strong></div>
              )}
            </div>
            {shortlist.length === 0 ? (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'#94A3B8', fontSize:13,
                background:'white', borderRadius:14, border:'1.5px dashed #E2E8F0' }}>
                No candidates on your shortlist right now.
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:12 }}>
                {shortlist.map(row => (
                  <div key={row.id} style={{ background:'white', borderRadius:12, border:'1.5px solid #E2E8F0', padding:'14px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <Avatar name={row.name} size={34} color={c.accent}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{row.name}</div>
                        <div style={{ fontSize:11, color:'#94A3B8' }}>{row.current_title || row.location || ''}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {(row.jobs||[]).map(j => (
                        <button key={j.job_id} onClick={()=>{
                            const full = reqs.find(r=>r.id===j.job_id)
                            if (full) setActiveReq(full)
                            setSelected(shortlistToCandidate(row, j.job_id))
                          }}
                          style={{ padding:'5px 10px', borderRadius:8, border:'1px solid #E2E8F0', background:'#F8FAFC',
                            fontSize:11, fontWeight:600, color:'#475569', cursor:'pointer', fontFamily:'inherit' }}>
                          {j.job_title} · {j.stage}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && view === 'interviews' && (
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:'#0F172A' }}>Interviews</h2>
              <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#64748B', cursor:'pointer' }}>
                <input type="checkbox" checked={includePast} onChange={e=>setIncludePast(e.target.checked)}/>
                Include past
              </label>
            </div>
            {interviews.length === 0 ? (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'#94A3B8', fontSize:13,
                background:'white', borderRadius:14, border:'1.5px dashed #E2E8F0' }}>
                No interviews scheduled.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {interviews.map(iv => {
                  const isPast = iv.status === 'completed' || iv.status === 'cancelled' ||
                    (iv.date && new Date(iv.date) < new Date(new Date().toDateString()))
                  return (
                    <div key={iv.id} style={{ background:'white', borderRadius:12, border:'1.5px solid #E2E8F0',
                      padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, opacity:isPast?0.65:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:14, minWidth:0, flex:1 }}>
                        <Avatar name={iv.candidate_name} size={36} color={c.accent}/>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{iv.candidate_name}</div>
                          <div style={{ fontSize:11, color:'#94A3B8' }}>
                            {iv.job_name}{iv.interview_type_name?` · ${iv.interview_type_name}`:''}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'#0F172A' }}>{iv.date}</div>
                        <div style={{ fontSize:11, color:'#94A3B8' }}>{iv.time}</div>
                      </div>
                      <button onClick={()=>setFeedbackFor(iv)}
                        style={{ padding:'8px 14px', borderRadius:8, border:'none', background:c.accent, color:'white',
                          fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
                        Give Feedback
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {!loading && view === 'onboarding' && (
          <>
            <h2 style={{ margin:'0 0 16px', fontSize:17, fontWeight:800, color:'#0F172A' }}>Onboarding</h2>
            {onboarding.length === 0 ? (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'#94A3B8', fontSize:13,
                background:'white', borderRadius:14, border:'1.5px dashed #E2E8F0' }}>
                No candidates onboarding right now.
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14 }}>
                {onboarding.map(o => (
                  <div key={o.offer_id} style={{ background:'white', borderRadius:14, border:'1.5px solid #E2E8F0', padding:'18px 20px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                      <Avatar name={o.candidate_name} size={36} color="#059669"/>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:'#0F172A' }}>{o.candidate_name}</div>
                        <div style={{ fontSize:11, color:'#94A3B8' }}>{o.job_title}</div>
                      </div>
                    </div>
                    <Badge color="#059669">Accepted</Badge>
                    <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6 }}>
                      {o.base_salary && (
                        <div style={{ fontSize:12, color:'#64748B' }}>
                          Salary: <strong style={{ color:'#0F172A' }}>{o.currency||''} {Number(o.base_salary).toLocaleString()}</strong>
                        </div>
                      )}
                      {o.start_date && (
                        <div style={{ fontSize:12, color:'#64748B' }}>
                          Start date: <strong style={{ color:'#0F172A' }}>{o.start_date}</strong>
                        </div>
                      )}
                      {o.accepted_at && (
                        <div style={{ fontSize:11, color:'#94A3B8' }}>
                          Accepted {new Date(o.accepted_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Section>

      {/* Modals */}
      {selected && (
        <CandidatePanel candidate={selected} job={activeReq} onClose={()=>setSelected(null)} color={c.accent} api={api} portal={portal}/>
      )}
      {activeShare && (
        <ShareDetailPanel share={activeShare} viewerEmail={viewerEmail} accent={c.accent}
          onClose={()=>setActiveShare(null)}
          onCompleted={()=>{ setActiveShare(null); reloadShares() }}
          api={api}/>
      )}
      {showNewJob && hmApi && (
        <NewJobPanel portal={portal} c={c} hmApi={hmApi}
          onClose={()=>setShowNewJob(false)}
          onCreated={()=>{ setShowNewJob(false); reload() }}/>
      )}
      {feedbackFor && hmApi && (
        <InterviewFeedbackModal interview={feedbackFor} c={c} hmApi={hmApi}
          onClose={()=>setFeedbackFor(null)}
          onSubmitted={()=>{ setFeedbackFor(null); reload() }}/>
      )}
    </div>
  )
}
