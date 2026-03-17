import { useState, useEffect } from 'react'
import { css, Badge, Btn, Avatar, Input, Section, STATUS_COLORS, recordTitle } from './shared.jsx'

const SubmitForm = ({ job, portal, onClose, onSubmitted }) => {
  const c = css(portal.branding)
  const [form, setForm] = useState({ first_name:'', last_name:'', email:'', phone:'', current_title:'', note:'' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const set = (k, v) => setForm(f => ({...f, [k]:v}))

  const handleSubmit = async () => {
    if (!form.first_name || !form.email) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1200))
    setSubmitting(false)
    setDone(true)
    setTimeout(() => { setDone(false); onSubmitted(); onClose() }, 2500)
  }

  if (done) return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,41,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:40, textAlign:'center', maxWidth:380 }}>
        <div style={{ fontSize:56, marginBottom:12 }}>✅</div>
        <h3 style={{ margin:'0 0 8px', fontSize:18, fontWeight:800 }}>Candidate Submitted!</h3>
        <p style={{ color:'#9DA8C7', fontSize:13 }}>{form.first_name} has been submitted for this role.</p>
      </div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,41,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'28px', width:520, maxWidth:'95vw', maxHeight:'90vh', overflow:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <h3 style={{ margin:'0 0 2px', fontSize:16, fontWeight:800, color:'#0F1729' }}>Submit Candidate</h3>
            <p style={{ margin:0, fontSize:12, color:'#9DA8C7' }}>For: {job?.data?.job_title || 'Open Role'}</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#9DA8C7', lineHeight:1 }}>✕</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="First Name *" value={form.first_name} onChange={v=>set('first_name',v)} required/>
            <Input label="Last Name" value={form.last_name} onChange={v=>set('last_name',v)}/>
          </div>
          <Input label="Email *" type="email" value={form.email} onChange={v=>set('email',v)} required/>
          <Input label="Phone" type="tel" value={form.phone} onChange={v=>set('phone',v)}/>
          <Input label="Current Title" value={form.current_title} onChange={v=>set('current_title',v)}/>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <label style={{ fontSize:13, fontWeight:600, color:'#4B5675' }}>Submission Note</label>
            <textarea value={form.note} onChange={e=>set('note',e.target.value)} rows={3}
              placeholder="Why is this candidate a great fit?"
              style={{ padding:'10px 14px', borderRadius:10, border:'1.5px solid #E8ECF8', fontSize:13, fontFamily:'inherit', resize:'vertical', outline:'none' }}
              onFocus={e=>e.target.style.borderColor=c.primary} onBlur={e=>e.target.style.borderColor='#E8ECF8'}/>
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Btn outline color="#9DA8C7" onClick={onClose}>Cancel</Btn>
            <Btn color={c.button} onClick={handleSubmit} disabled={submitting||!form.first_name||!form.email}>
              {submitting ? 'Submitting…' : 'Submit Candidate'}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AgencyPortal({ portal, api }) {
  const c = css(portal.branding)
  const br = portal.branding || {}
  const [jobs, setJobs] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('roles')
  const [submitJob, setSubmitJob] = useState(null)

  useEffect(() => {
    api.get(`/records?environment_id=${portal.environment_id}&limit=50`)
      .then(d => {
        const records = d.records || []
        setJobs(records.filter(r => r.data?.job_title && (r.data?.status === 'Open' || !r.data?.status)))
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:c.font }}>
      {submitJob && <SubmitForm job={submitJob} portal={portal} onClose={()=>setSubmitJob(null)} onSubmitted={()=>setSubmissions(s=>[...s,{id:Date.now(),job:submitJob,status:'Submitted'}])}/>}

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg, #1a1a2e, #16213e)', padding:'20px 0' }}>
        <Section>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {br.logo_url
                ? <img src={br.logo_url} style={{ height:32, objectFit:'contain' }} alt="logo"/>
                : <div style={{ width:36, height:36, borderRadius:10, background:c.primary, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:900 }}>A</div>}
              <div>
                <div style={{ color:'white', fontSize:15, fontWeight:700 }}>{br.company_name || 'Agency'} Portal</div>
                <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>Recruiter Submission Access</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {[['roles','Open Roles'],['submissions','My Submissions']].map(([t,l]) => (
                <button key={t} onClick={()=>setTab(t)} style={{
                  padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:c.font,
                  fontSize:12, fontWeight:700, background: tab===t ? c.primary : 'rgba(255,255,255,0.1)',
                  color: tab===t ? 'white' : 'rgba(255,255,255,0.55)',
                }}>{l}</button>
              ))}
            </div>
          </div>
        </Section>
      </div>

      <Section style={{ padding:'32px 24px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'#9DA8C7' }}>Loading…</div>
        ) : tab === 'roles' ? (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:'#0F1729' }}>Open Roles</h2>
              <span style={{ fontSize:13, color:'#9DA8C7', fontWeight:600 }}>{jobs.length} available</span>
            </div>
            {jobs.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 0', color:'#9DA8C7' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
                <p style={{ fontSize:15, fontWeight:600, color:'#0F1729', marginBottom:4 }}>No open roles</p>
                <p style={{ fontSize:13 }}>Check back soon for new opportunities</p>
              </div>
            ) : jobs.map(job => (
              <div key={job.id} style={{ background:'#fff', borderRadius:16, border:'1.5px solid #E8ECF8', padding:'20px 24px', marginBottom:12, display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:16, fontWeight:700, color:'#0F1729', marginBottom:6 }}>{job.data?.job_title}</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {job.data?.department && <Badge color="#6366F1">{job.data.department}</Badge>}
                    {job.data?.location && <Badge color="#0CA678">{job.data.location}</Badge>}
                    {job.data?.work_type && <Badge color="#F79009">{job.data.work_type}</Badge>}
                    {job.data?.employment_type && <Badge color="#9DA8C7">{job.data.employment_type}</Badge>}
                  </div>
                </div>
                <Btn color={c.button} onClick={() => setSubmitJob(job)}>Submit Candidate →</Btn>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <h2 style={{ margin:'0 0 20px', fontSize:18, fontWeight:800, color:'#0F1729' }}>My Submissions</h2>
            {submissions.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 0', color:'#9DA8C7' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>📤</div>
                <p style={{ fontSize:15, fontWeight:600, color:'#0F1729', marginBottom:4 }}>No submissions yet</p>
                <p style={{ fontSize:13 }}>Submit candidates against open roles to track them here</p>
              </div>
            ) : submissions.map(sub => (
              <div key={sub.id} style={{ background:'#fff', borderRadius:14, border:'1.5px solid #E8ECF8', padding:'16px 20px', marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#0F1729' }}>Candidate submitted</div>
                  <div style={{ fontSize:12, color:'#9DA8C7', marginTop:2 }}>For: {sub.job?.data?.job_title}</div>
                </div>
                <Badge color="#0CAF77">Submitted</Badge>
              </div>
            ))}
          </div>
        )}
      </Section>
      <div style={{ borderTop:'1px solid #E8ECF8', padding:'20px', textAlign:'center', marginTop:40 }}>
        <p style={{ margin:0, fontSize:11, color:'#9DA8C7' }}>Agency Portal · Powered by TalentOS</p>
      </div>
    </div>
  )
}
