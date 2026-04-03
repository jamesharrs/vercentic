// client/src/portals/CareerSite.jsx
import { useState, useEffect, useRef } from 'react'
import { css, Badge, Btn, Section, STATUS_COLORS, recordTitle } from './shared.jsx'

// ── Equal Opportunities templates ─────────────────────────────────────────────
const EO_TEMPLATES = {
  uk: {
    label: 'United Kingdom',
    intro: 'We are committed to equality and diversity. This information is collected anonymously and used only for monitoring purposes. It does not form part of your application.',
    fields: [
      { id:'eo_gender',      label:'Gender identity',     options:['Male','Female','Non-binary','Prefer to self-describe','Prefer not to say'] },
      { id:'eo_age',         label:'Age range',           options:['Under 25','25–34','35–44','45–54','55–64','65 or over','Prefer not to say'] },
      { id:'eo_ethnicity',   label:'Ethnic origin',       options:['Asian / Asian British','Black / African / Caribbean / Black British','Mixed / Multiple ethnic groups','White','Another ethnic group','Prefer not to say'] },
      { id:'eo_disability',  label:'Disability',          options:['Yes – visible condition','Yes – non-visible condition','No','Prefer not to say'] },
      { id:'eo_religion',    label:'Religion or belief',  options:['Buddhist','Christian','Hindu','Jewish','Muslim','Sikh','No religion','Another religion or belief','Prefer not to say'] },
      { id:'eo_orientation', label:'Sexual orientation',  options:['Bisexual','Gay or Lesbian','Heterosexual / Straight','Another sexual orientation','Prefer not to say'] },
    ],
  },
  us: {
    label: 'United States',
    intro: 'We are an Equal Opportunity Employer. Providing this information is voluntary and will not affect your application. It is used solely for EEO reporting purposes.',
    fields: [
      { id:'eo_gender',   label:'Gender',           options:['Male','Female','Non-binary','Prefer not to say'] },
      { id:'eo_race',     label:'Race / Ethnicity', options:['American Indian or Alaska Native','Asian','Black or African American','Hispanic or Latino','Native Hawaiian or Other Pacific Islander','White','Two or more races','Prefer not to say'] },
      { id:'eo_veteran',  label:'Veteran status',   options:['I am a protected veteran','I am not a protected veteran','Prefer not to say'] },
      { id:'eo_disability', label:'Disability status', options:['Yes, I have a disability (or previously had one)','No, I do not have a disability','Prefer not to say'] },
    ],
  },
  uae: {
    label: 'UAE / Middle East',
    intro: 'This information is collected voluntarily to support our diversity and inclusion initiatives.',
    fields: [
      { id:'eo_gender', label:'Gender',    options:['Male','Female','Prefer not to say'] },
      { id:'eo_age',    label:'Age range', options:['Under 25','25–34','35–44','45–54','55 or over','Prefer not to say'] },
    ],
  },
  generic: {
    label: 'Other / International',
    intro: 'This optional information helps us monitor equal opportunity. It does not affect your application.',
    fields: [
      { id:'eo_gender', label:'Gender identity', options:['Male','Female','Non-binary','Another gender identity','Prefer not to say'] },
      { id:'eo_age',    label:'Age range',        options:['Under 25','25–34','35–44','45–54','55 or over','Prefer not to say'] },
    ],
  },
};

const AppInput = ({ label, value, onChange, required, type='text', placeholder, rows, onBlur }) => {
  const [focused, setFocused] = useState(false)
  const style = {
    padding:'10px 14px', borderRadius:10,
    border:`1.5px solid ${focused ? '#4361EE' : '#E8ECF8'}`,
    fontSize:14, fontFamily:'inherit', outline:'none',
    width:'100%', boxSizing:'border-box', transition:'border-color .15s',
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      {label && <label style={{ fontSize:12, fontWeight:600, color:'#4B5675' }}>{label}{required && <span style={{ color:'#EF4444' }}> *</span>}</label>}
      {rows
        ? <textarea value={value} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder} style={{...style,resize:'vertical'}} onFocus={()=>setFocused(true)} onBlur={()=>{setFocused(false);onBlur&&onBlur();}}/>
        : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={style} onFocus={()=>setFocused(true)} onBlur={()=>{setFocused(false);onBlur&&onBlur();}}/>
      }
    </div>
  )
}

const AppSelect = ({ label, value, onChange, options }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
    {label && <label style={{ fontSize:12, fontWeight:600, color:'#4B5675' }}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ padding:'10px 14px', borderRadius:10, border:'1.5px solid #E8ECF8', fontSize:14,
        fontFamily:'inherit', outline:'none', width:'100%', boxSizing:'border-box', background:'white' }}>
      <option value="">Select…</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
)

const StepBar = ({ steps, current, color }) => (
  <div style={{ display:'flex', alignItems:'center', marginBottom:28 }}>
    {steps.map((s, i) => (
      <div key={i} style={{ display:'flex', alignItems:'center', flex: i < steps.length-1 ? 1 : 0 }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:12, fontWeight:700,
            background: i <= current ? color : '#E8ECF8',
            color: i <= current ? 'white' : '#9DA8C7', transition:'all .2s' }}>
            {i < current ? '✓' : i+1}
          </div>
          <div style={{ fontSize:10, fontWeight:600, color: i===current ? color : '#9DA8C7', marginTop:4, whiteSpace:'nowrap' }}>{s}</div>
        </div>
        {i < steps.length-1 && <div style={{ flex:1, height:2, background: i < current ? color : '#E8ECF8', margin:'0 6px 16px', transition:'background .3s' }}/>}
      </div>
    ))}
  </div>
)

const JobDetail = ({ job, portal, onApply, onBack }) => {
  const c = css(portal.branding)
  const d = job.data || {}
  return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:c.font }}>
      <div style={{ background:c.primary, padding:'14px 0' }}>
        <Section><button onClick={onBack} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.85)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:c.font }}>← Back to jobs</button></Section>
      </div>
      <Section style={{ padding:'40px 24px' }}>
        <div style={{ maxWidth:680, margin:'0 auto' }}>
          <h1 style={{ fontSize:28, fontWeight:900, color:'#0F1729', marginBottom:8, letterSpacing:'-0.5px' }}>{d.job_title}</h1>
          <div style={{ fontSize:14, color:'#6B7280', marginBottom:24 }}>{[d.department, d.location, d.work_type].filter(Boolean).join(' · ')}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:16, marginBottom:28, padding:'20px', background:'white', borderRadius:14, border:'1px solid #E8ECF8' }}>
            {[['Job title',d.job_title],['Department',d.department],['Location',d.location],['Work type',d.work_type],['Employment type',d.employment_type],['Priority',d.priority]].filter(([,v])=>v).map(([k,v])=>(
              <div key={k}><div style={{ fontSize:10, fontWeight:700, color:'#9DA8C7', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{k}</div><div style={{ fontSize:14, fontWeight:600, color:'#0F1729' }}>{v}</div></div>
            ))}
          </div>
          {d.description && <div style={{ marginBottom:24 }}><h3 style={{ fontSize:16, fontWeight:700, color:'#0F1729', marginBottom:10 }}>Description</h3><p style={{ fontSize:15, color:'#4B5675', lineHeight:1.7, margin:0 }}>{d.description}</p></div>}
          {d.required_skills?.length > 0 && <div style={{ marginBottom:28 }}><h3 style={{ fontSize:16, fontWeight:700, color:'#0F1729', marginBottom:10 }}>Required skills</h3><div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>{(Array.isArray(d.required_skills)?d.required_skills:d.required_skills.split(',')).map(s=><Badge key={s} color={c.primary}>{s.trim()}</Badge>)}</div></div>}
          <Btn color={c.button} onClick={onApply}>Apply for this role →</Btn>
        </div>
      </Section>
    </div>
  )
}

const DRAFT_KEY = (jobId) => `vercentic_draft_${jobId || 'general'}`

const ApplyForm = ({ job, portal, onBack, onSuccess, api }) => {
  const c = css(portal.branding)
  const color = c.primary || '#4361EE'
  const d = job.data || {}

  const [step, setStep] = useState(0)
  const [entryMethod, setEntryMethod] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [parsing, setParsing] = useState(false)
  const [cvFile, setCvFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedDraft, setSavedDraft] = useState(false)
  const [screeningQuestions, setScreeningQuestions] = useState([])
  const [knockedOut, setKnockedOut] = useState(false)
  const [knockoutQuestion, setKnockoutQuestion] = useState(null)
  const [emailCheck, setEmailCheck] = useState(null)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const emailCheckedRef = useRef('')

  const eoEnabled = portal.eo_enabled !== false

  // Derive EO template from job location, falling back to portal setting, then generic
  const resolveEoCountry = (location) => {
    const l = (location || '').toLowerCase()
    if (/\b(uk|united kingdom|england|scotland|wales|northern ireland|london|manchester|birmingham|leeds|glasgow|edinburgh)\b/.test(l)) return 'uk'
    if (/\b(us|usa|united states|new york|california|texas|florida|illinois|washington|chicago|los angeles|san francisco|boston|seattle|austin|denver)\b/.test(l)) return 'us'
    if (/\b(uae|dubai|abu dhabi|sharjah|ajman|ras al khaimah|fujairah|umm al quwain|middle east|gulf)\b/.test(l)) return 'uae'
    if (/\b(canada|toronto|vancouver|montreal|calgary|ottawa)\b/.test(l)) return 'generic'
    if (/\b(australia|sydney|melbourne|brisbane|perth|adelaide)\b/.test(l)) return 'generic'
    if (/\b(germany|france|spain|italy|netherlands|belgium|sweden|norway|denmark|finland|switzerland|austria|ireland)\b/.test(l)) return 'uk' // EU countries use UK-style EO
    return portal.eo_country || 'generic'
  }
  const eoCountry = resolveEoCountry(d.location)
  const eoTemplate = EO_TEMPLATES[eoCountry]
  const STEPS = ['Start', 'Your Details', 'Pre-screen', eoEnabled ? 'Equal Opps' : null, 'Review'].filter(Boolean)
  const STEP_SCREENING = 2
  const STEP_EO = eoEnabled ? 3 : null
  const STEP_REVIEW = eoEnabled ? 4 : 3

  const [form, setForm] = useState(() => {
    try {
      const draft = sessionStorage.getItem(DRAFT_KEY(job.id))
      return draft ? JSON.parse(draft) : { first_name:'', last_name:'', email:'', phone:'', location:'', current_title:'', linkedin_url:'', cover_letter:'', gdpr_consent:false }
    } catch { return {} }
  })

  const set = (k, v) => setForm(f => {
    const next = {...f, [k]:v}
    try { sessionStorage.setItem(DRAFT_KEY(job.id), JSON.stringify(next)) } catch {}
    return next
  })

  useEffect(() => {
    if (!job.id) return
    api.get(`/question-bank/jobs/${job.id}/questions`)
      .then(data => {
        const qs = Array.isArray(data) ? data : []
        setScreeningQuestions([...qs.filter(q=>q.type==='knockout'), ...qs.filter(q=>q.type!=='knockout')])
      })
      .catch(() => setScreeningQuestions([]))
  }, [job.id])

  const handleEmailBlur = async () => {
    const email = form.email?.toLowerCase().trim()
    if (!email || email === emailCheckedRef.current) return
    emailCheckedRef.current = email
    setCheckingEmail(true)
    try {
      const res = await api.get(`/portals/${portal.id}/apply/check-email?email=${encodeURIComponent(email)}&job_id=${job.id}`)
      setEmailCheck(res)
      if (res.exists && res.person) {
        const p = res.person
        setForm(f => ({ ...f, first_name:p.first_name||f.first_name, last_name:p.last_name||f.last_name, phone:p.phone||f.phone, location:p.location||f.location, current_title:p.current_title||f.current_title, linkedin_url:p.linkedin_url||f.linkedin_url }))
      }
    } catch {}
    setCheckingEmail(false)
  }

  const handleCvUpload = async (file) => {
    if (!file) return
    setCvFile(file); setParsing(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/cv-parse', { method:'POST', body:fd })
      if (res.ok) {
        const { result } = await res.json()
        if (result) setForm(f => {
          const next = { ...f, first_name:result.first_name||f.first_name, last_name:result.last_name||f.last_name, email:result.email||f.email, phone:result.phone||f.phone, location:result.location||f.location, current_title:result.current_title||f.current_title, linkedin_url:result.linkedin_url||f.linkedin_url }
          try { sessionStorage.setItem(DRAFT_KEY(job.id), JSON.stringify(next)) } catch {}
          return next
        })
      }
    } catch {}
    setParsing(false); setStep(1)
  }

  const handleSaveDraft = async () => {
    if (!form.email) { setError('Please enter your email before saving.'); return }
    setSaving(true); setError('')
    try {
      await api.post(`/portals/${portal.id}/draft`, { email:form.email, job_id:job.id, form_data:form, step })
      setSavedDraft(true); setTimeout(()=>setSavedDraft(false), 5000)
    } catch { setError('Could not save draft. Please try again.') }
    setSaving(false)
  }

  const validateScreening = () => {
    for (const q of screeningQuestions.filter(q=>q.type==='knockout')) {
      const answer = form[`sq_${q.id}`]
      if (q.pass_value && answer && answer !== q.pass_value) { setKnockedOut(true); setKnockoutQuestion(q); return false }
    }
    return true
  }

  const nextStep = () => {
    setError('')
    if (step===1 && (!form.first_name||!form.email)) { setError('First name and email are required.'); return }
    if (step===STEP_SCREENING && !validateScreening()) return
    if (step===STEP_REVIEW) { handleSubmit(); return }
    setStep(s=>s+1)
  }

  const handleSubmit = async () => {
    if (!form.gdpr_consent) { setError('Please accept the data processing consent.'); return }
    setSubmitting(true); setError('')
    try {
      let cvAttachmentId = null
      if (cvFile) {
        const fd = new FormData(); fd.append('file',cvFile); fd.append('file_type_name','CV / Resume'); fd.append('uploaded_by',`${form.first_name} ${form.last_name}`); fd.append('pending_for_job_id',job.id)
        try { const r2=await fetch('/api/attachments/upload',{method:'POST',body:fd}); if(r2.ok){const a=await r2.json();cvAttachmentId=a.id} } catch {}
      }
      const screeningAnswers = screeningQuestions.map(q => ({ question_id:q.id, question_text:q.text, type:q.type, answer:form[`sq_${q.id}`]||'', passed:!q.pass_value||form[`sq_${q.id}`]===q.pass_value }))
      const eoAnswers = eoEnabled ? Object.fromEntries(eoTemplate.fields.map(f=>[f.id, form[f.id]||''])) : {}
      const result = await api.post(`/portals/${portal.id}/apply`, { first_name:form.first_name, last_name:form.last_name, email:form.email, phone:form.phone, location:form.location, current_title:form.current_title, linkedin_url:form.linkedin_url, cover_letter:form.cover_letter, job_id:job.id, job_title:d.job_title||'', cv_attachment_id:cvAttachmentId, entry_method:entryMethod, screening_answers:screeningAnswers, equal_opps:eoAnswers })
      if (result.error) { setError(result.error); setSubmitting(false); return }
      try { sessionStorage.removeItem(DRAFT_KEY(job.id)) } catch {}
      setDone(true)
    } catch { setError('Something went wrong. Please try again.'); setSubmitting(false) }
  }

  if (done) return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:c.font, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', padding:40, maxWidth:480 }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:`${color}14`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:40 }}>🎉</div>
        <h2 style={{ fontSize:26, fontWeight:900, color:'#0F1729', marginBottom:8 }}>Application Submitted!</h2>
        <p style={{ color:'#6B7280', lineHeight:1.7, marginBottom:8 }}>Thanks {form.first_name} — your application for <strong>{d.job_title}</strong> is on its way{portal.branding?.company_name ? ` to ${portal.branding.company_name}` : ''}.</p>
        <p style={{ color:'#9CA3AF', fontSize:13, marginBottom:28 }}>A confirmation will be sent to <strong>{form.email}</strong>.</p>
        <button onClick={onSuccess} style={{ padding:'10px 24px', borderRadius:10, background:color, color:'white', fontSize:14, fontWeight:700, border:'none', cursor:'pointer', fontFamily:c.font }}>Back to jobs</button>
      </div>
    </div>
  )

  if (knockedOut) return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:c.font, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', padding:40, maxWidth:480 }}>
        <div style={{ fontSize:48, marginBottom:20 }}>🙏</div>
        <h2 style={{ fontSize:22, fontWeight:800, color:'#0F1729', marginBottom:12 }}>Thank you for your interest</h2>
        <p style={{ color:'#6B7280', lineHeight:1.7, marginBottom:28 }}>Based on your answers, we're unable to progress your application for this role at this time. We encourage you to check back for future opportunities.</p>
        {knockoutQuestion && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:12, padding:16, marginBottom:24, textAlign:'left' }}><p style={{ fontSize:12, fontWeight:700, color:'#DC2626', margin:'0 0 6px' }}>Eligibility requirement not met</p><p style={{ fontSize:13, color:'#374151', margin:0 }}>{knockoutQuestion.text}</p></div>}
        <button onClick={onBack} style={{ padding:'10px 24px', borderRadius:10, background:color, color:'white', fontSize:14, fontWeight:700, border:'none', cursor:'pointer', fontFamily:c.font }}>Back to jobs</button>
      </div>
    </div>
  )

  const fs = { padding:'10px 14px', borderRadius:10, border:'1.5px solid #E8ECF8', fontSize:14, fontFamily:c.font, outline:'none', width:'100%', boxSizing:'border-box' }

  return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:c.font }}>
      <div style={{ background:color, padding:'14px 0' }}>
        <Section>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <button onClick={step===0?onBack:()=>setStep(s=>Math.max(0,s-1))} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.85)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:c.font }}>← {step===0?'Back to role':'Back'}</button>
            <div style={{ color:'rgba(255,255,255,0.65)', fontSize:13 }}>Applying for <strong style={{ color:'white' }}>{d.job_title}</strong></div>
            {step>=1 && form.email && (
              <button onClick={handleSaveDraft} disabled={saving} style={{ background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.35)', borderRadius:8, color:'white', fontSize:12, fontWeight:600, cursor:'pointer', padding:'5px 12px', fontFamily:c.font }}>
                {saving?'Saving…':savedDraft?'✓ Saved! Check email':'💾 Save & return later'}
              </button>
            )}
          </div>
        </Section>
      </div>

      <Section style={{ padding:'32px 24px' }}>
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          {step>0 && <StepBar steps={STEPS} current={step} color={color}/>}
          {error && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'10px 14px', color:'#DC2626', fontSize:13, marginBottom:16 }}>{error}</div>}
          {savedDraft && <div style={{ background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:10, padding:'10px 14px', color:'#15803D', fontSize:13, marginBottom:16 }}>✓ Draft saved — a link to continue has been sent to {form.email}.</div>}

          {/* STEP 0: Entry */}
          {step===0 && (
            <div>
              <h2 style={{ fontSize:24, fontWeight:900, color:'#0F1729', marginBottom:6 }}>Apply for {d.job_title}</h2>
              <p style={{ color:'#6B7280', marginBottom:28 }}>How would you like to start your application?</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
                <label style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'16px 18px', background:'white', borderRadius:14, border:`2px solid ${color}`, cursor:'pointer', boxShadow:`0 2px 12px ${color}14` }}>
                  <input type="file" accept=".pdf,.doc,.docx" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)handleCvUpload(f);e.target.value='';}}/>
                  <div style={{ width:40, height:40, borderRadius:10, background:`${color}14`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:20 }}>📄</div>
                  <div><div style={{ fontSize:15, fontWeight:700, color:'#0F1729', marginBottom:2 }}>{parsing?'Reading your CV…':'Upload my CV / Resume'}</div><div style={{ fontSize:13, color:'#6B7280' }}>PDF, DOC or DOCX — we'll fill in your details automatically</div></div>
                </label>
                <button onClick={()=>{setEntryMethod('linkedin');setStep(1);}} style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'16px 18px', background:'white', borderRadius:14, border:'1.5px solid #E8ECF8', cursor:'pointer', textAlign:'left', width:'100%', fontFamily:c.font }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></div>
                  <div><div style={{ fontSize:15, fontWeight:700, color:'#0F1729', marginBottom:2 }}>Enter LinkedIn profile URL</div><div style={{ fontSize:13, color:'#6B7280' }}>Paste your LinkedIn URL — we'll note it for the team</div></div>
                </button>
                <button onClick={()=>{setEntryMethod('manual');setStep(1);}} style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'16px 18px', background:'white', borderRadius:14, border:'1.5px solid #E8ECF8', cursor:'pointer', textAlign:'left', width:'100%', fontFamily:c.font }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'#F8F9FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:20 }}>✏️</div>
                  <div><div style={{ fontSize:15, fontWeight:700, color:'#0F1729', marginBottom:2 }}>Fill in the form manually</div><div style={{ fontSize:13, color:'#6B7280' }}>Complete the application yourself</div></div>
                </button>
                <button onClick={()=>{setEntryMethod('returning');setStep(1);}} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', background:'#FAFBFF', borderRadius:14, border:'1.5px dashed #C7D0E8', cursor:'pointer', textAlign:'left', width:'100%', fontFamily:c.font }}>
                  <div style={{ fontSize:18 }}>🔑</div>
                  <div style={{ fontSize:14, color:'#6B7280' }}>Already applied before? <strong style={{ color }}>Continue or update your profile</strong></div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: Details */}
          {step===1 && (
            <div>
              <h3 style={{ fontSize:20, fontWeight:800, color:'#0F1729', marginBottom:4 }}>Your details</h3>
              <p style={{ color:'#6B7280', fontSize:13, marginBottom:20 }}>{entryMethod==='returning'?"Enter your email — we'll pre-fill what we have on file.":'Tell us about yourself.'}</p>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <AppInput label="First name" value={form.first_name} onChange={v=>set('first_name',v)} required placeholder="Jane"/>
                  <AppInput label="Last name" value={form.last_name} onChange={v=>set('last_name',v)} placeholder="Smith"/>
                </div>
                <div>
                  <AppInput label="Email address" type="email" value={form.email} onChange={v=>set('email',v)} required placeholder="jane@example.com" onBlur={handleEmailBlur}/>
                  {checkingEmail && <div style={{ fontSize:11, color:'#9CA3AF', marginTop:4 }}>Checking…</div>}
                  {emailCheck?.already_applied_this_job && <div style={{ marginTop:8, padding:'10px 12px', background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius:8, fontSize:12, color:'#92400E' }}>⚠️ You've already applied for this role. Submitting again will create a new application.</div>}
                  {emailCheck?.exists && !emailCheck?.already_applied_this_job && <div style={{ marginTop:8, padding:'10px 12px', background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:8, fontSize:12, color:'#15803D' }}>✓ Welcome back — we've pre-filled your details from your profile.</div>}
                </div>
                <AppInput label="Phone number" type="tel" value={form.phone||''} onChange={v=>set('phone',v)} placeholder="+971 50 000 0000"/>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <AppInput label="Location" value={form.location||''} onChange={v=>set('location',v)} placeholder="Dubai, UAE"/>
                  <AppInput label="Current job title" value={form.current_title||''} onChange={v=>set('current_title',v)} placeholder="Software Engineer"/>
                </div>
                <AppInput label="LinkedIn profile URL" type="url" value={form.linkedin_url||''} onChange={v=>set('linkedin_url',v)} placeholder="linkedin.com/in/yourprofile"/>
                <AppInput label="Cover letter / note" value={form.cover_letter||''} onChange={v=>set('cover_letter',v)} rows={4} placeholder="Tell us why you're a great fit for this role…"/>
              </div>
            </div>
          )}

          {/* STEP 2: Pre-screen */}
          {step===STEP_SCREENING && (
            <div>
              <h3 style={{ fontSize:20, fontWeight:800, color:'#0F1729', marginBottom:4 }}>Pre-screen questions</h3>
              <p style={{ color:'#6B7280', fontSize:13, marginBottom:20 }}>{screeningQuestions.length===0?'No additional questions for this role.':`Please answer ${screeningQuestions.length} question${screeningQuestions.length!==1?'s':''} to continue.`}</p>
              {screeningQuestions.length===0 && <div style={{ textAlign:'center', padding:'32px 0', color:'#9CA3AF', fontSize:14 }}>No screening questions set for this role. Click Continue.</div>}
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                {screeningQuestions.map((q,i)=>{
                  const isKO = q.type==='knockout'
                  return (
                    <div key={q.id} style={{ padding:16, background:'white', borderRadius:12, border:`1.5px solid ${isKO?'#FCA5A5':'#E8ECF8'}` }}>
                      {isKO && <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', background:'#FEF2F2', borderRadius:99, marginBottom:8 }}><span style={{ fontSize:10, fontWeight:700, color:'#DC2626' }}>ELIGIBILITY REQUIREMENT</span></div>}
                      <p style={{ fontSize:14, fontWeight:600, color:'#0F1729', margin:'0 0 12px', lineHeight:1.5 }}>{i+1}. {q.text}</p>
                      {q.options?.length>0 ? (
                        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                          {q.options.map(opt=>(
                            <label key={opt} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'8px 12px', borderRadius:8, background:form[`sq_${q.id}`]===opt?`${color}12`:'#F8F9FF', border:`1px solid ${form[`sq_${q.id}`]===opt?color:'#E8ECF8'}`, transition:'all .1s' }}>
                              <input type="radio" name={`sq_${q.id}`} value={opt} checked={form[`sq_${q.id}`]===opt} onChange={()=>set(`sq_${q.id}`,opt)} style={{ accentColor:color }}/>
                              <span style={{ fontSize:13, color:'#374151' }}>{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : <textarea value={form[`sq_${q.id}`]||''} onChange={e=>set(`sq_${q.id}`,e.target.value)} rows={3} placeholder="Your answer…" style={{...fs,resize:'vertical'}}/>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP EO: Equal Opportunities */}
          {eoEnabled && step===STEP_EO && (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <h3 style={{ fontSize:20, fontWeight:800, color:'#0F1729', margin:0 }}>Equal opportunities monitoring</h3>
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'#EEF2FF', color:'#4361EE' }}>Optional</span>
              </div>
              {d.location && (
                <div style={{ fontSize:11, color:'#6B7280', marginBottom:8 }}>
                  Monitoring form for: <strong>{d.location}</strong> ({eoTemplate.label})
                </div>
              )}
              <div style={{ background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:10, padding:'12px 16px', marginBottom:20 }}>
                <p style={{ fontSize:12, color:'#15803D', margin:0, lineHeight:1.6 }}>🔒 <strong>Anonymous & confidential.</strong> {eoTemplate.intro}</p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {eoTemplate.fields.map(f=><AppSelect key={f.id} label={f.label} value={form[f.id]||''} onChange={v=>set(f.id,v)} options={f.options}/>)}
              </div>
            </div>
          )}

          {/* STEP REVIEW */}
          {step===STEP_REVIEW && (
            <div>
              <h3 style={{ fontSize:20, fontWeight:800, color:'#0F1729', marginBottom:4 }}>Review & submit</h3>
              <p style={{ color:'#6B7280', fontSize:13, marginBottom:20 }}>Check everything looks right before submitting.</p>
              <div style={{ background:'white', borderRadius:12, border:'1px solid #E8ECF8', padding:'16px 20px', marginBottom:12 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#9DA8C7', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Personal details</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[['Name',[form.first_name,form.last_name].filter(Boolean).join(' ')],['Email',form.email],['Phone',form.phone],['Location',form.location],['Current title',form.current_title],['CV uploaded',cvFile?cvFile.name:'No']].filter(([,v])=>v).map(([k,v])=>(
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', gap:16, fontSize:13 }}>
                      <span style={{ color:'#6B7280', flexShrink:0 }}>{k}</span>
                      <span style={{ color:'#0F1729', fontWeight:500, textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'60%' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              {screeningQuestions.length>0 && (
                <div style={{ background:'white', borderRadius:12, border:'1px solid #E8ECF8', padding:'16px 20px', marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#9DA8C7', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Pre-screen answers</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {screeningQuestions.map(q=>(
                      <div key={q.id} style={{ display:'flex', justifyContent:'space-between', gap:16, fontSize:13 }}>
                        <span style={{ color:'#6B7280', flexShrink:0, maxWidth:'55%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.text.length>55?q.text.slice(0,55)+'…':q.text}</span>
                        <span style={{ color:'#0F1729', fontWeight:500 }}>{form[`sq_${q.id}`]||'—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ background:'#F8F9FF', borderRadius:12, border:'1px solid #E8ECF8', padding:'16px 20px', marginBottom:20 }}>
                <label style={{ display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer' }}>
                  <input type="checkbox" checked={!!form.gdpr_consent} onChange={e=>set('gdpr_consent',e.target.checked)} style={{ marginTop:2, accentColor:color, width:16, height:16, flexShrink:0 }}/>
                  <span style={{ fontSize:12, color:'#4B5675', lineHeight:1.6 }}>I consent to {portal.branding?.company_name||'this company'} storing and processing my personal data for recruitment purposes. I understand this can be withdrawn at any time. <span style={{ color:'#DC2626' }}>*</span></span>
                </label>
              </div>
            </div>
          )}

          {step>0 && (
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:28 }}>
              <button onClick={nextStep} disabled={submitting||(step===1&&(!form.first_name||!form.email))}
                style={{ padding:'12px 28px', borderRadius:10, background:color, color:'white', fontSize:15, fontWeight:700, border:'none', cursor:(submitting||(step===1&&(!form.first_name||!form.email)))?'not-allowed':'pointer', opacity:(submitting||(step===1&&(!form.first_name||!form.email)))?0.6:1, fontFamily:c.font }}>
                {submitting?'Submitting…':step===STEP_REVIEW?'Submit application →':'Continue →'}
              </button>
            </div>
          )}
        </div>
      </Section>
    </div>
  )
}

export default function CareerSite({ portal, objects, api }) {
  const c = css(portal.branding)
  const br = portal.branding || {}
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('')
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)

  const jobObj = objects.find(o => o.slug === 'jobs')

  useEffect(() => {
    if (!jobObj) { setLoading(false); return }
    api.get(`/records?object_id=${jobObj.id}&environment_id=${portal.environment_id}&limit=50`)
      .then(d => { setJobs((d.records||[]).filter(j=>j.data?.status==='Open'||!j.data?.status)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [jobObj?.id])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('resume_token')
    const jobId = params.get('job_id')
    if (!token || jobs.length===0) return
    api.get(`/portals/${portal.id}/draft/${token}`)
      .then(draft => {
        if (draft.form_data) { try { sessionStorage.setItem(`vercentic_draft_${jobId||'general'}`, JSON.stringify(draft.form_data)) } catch {} }
        const job = jobs.find(j=>j.id===jobId)
        if (job) { setSelected(job); setView('apply') }
      }).catch(()=>{})
  }, [jobs.length])

  const depts = [...new Set(jobs.map(j=>j.data?.department).filter(Boolean))]
  const filtered = jobs.filter(j=>(!search||(j.data?.job_title||'').toLowerCase().includes(search.toLowerCase()))&&(!dept||j.data?.department===dept))

  if (view==='apply') return <ApplyForm job={selected} portal={portal} api={api} onBack={()=>setView('detail')} onSuccess={()=>setView('list')}/>
  if (view==='detail') return <JobDetail job={selected} portal={portal} onApply={()=>setView('apply')} onBack={()=>setView('list')}/>

  return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:c.font }}>
      <div style={{ background:`linear-gradient(135deg, ${c.primary}ee, ${c.primary})`, padding:'56px 0 48px' }}>
        <Section>
          {br.logo_url && <img src={br.logo_url} alt="logo" style={{ height:40, marginBottom:20, objectFit:'contain' }}/>}
          <h1 style={{ margin:'0 0 10px', fontSize:38, fontWeight:900, color:'white', letterSpacing:'-1px', lineHeight:1.15 }}>{br.tagline||`Join ${br.company_name||'Us'}`}</h1>
          <p style={{ margin:'0 0 32px', fontSize:16, color:'rgba(255,255,255,0.75)', maxWidth:520 }}>{br.company_name?`${br.company_name} is hiring. Find your next opportunity below.`:'Explore our open positions.'}</p>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', maxWidth:600 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search roles…" style={{ flex:1, minWidth:200, padding:'12px 16px', borderRadius:10, border:'none', fontSize:14, fontFamily:c.font, outline:'none' }}/>
            {depts.length>0 && <select value={dept} onChange={e=>setDept(e.target.value)} style={{ padding:'12px 14px', borderRadius:10, border:'none', fontSize:14, fontFamily:c.font, background:'white', cursor:'pointer' }}><option value="">All departments</option>{depts.map(d=><option key={d} value={d}>{d}</option>)}</select>}
          </div>
        </Section>
      </div>
      <Section style={{ padding:'40px 24px' }}>
        {loading ? <div style={{ textAlign:'center', padding:60, color:'#9CA3AF' }}>Loading roles…</div>
        : filtered.length===0 ? <div style={{ textAlign:'center', padding:60, color:'#9CA3AF' }}>No open roles{search?` matching "${search}"`:''} right now.</div>
        : <div style={{ display:'flex', flexDirection:'column', gap:12, maxWidth:800, margin:'0 auto' }}>
            <div style={{ fontSize:13, color:'#9CA3AF', marginBottom:4 }}>{filtered.length} open role{filtered.length!==1?'s':''}</div>
            {filtered.map(job=>{
              const d=job.data||{}
              return (
                <div key={job.id} onClick={()=>{setSelected(job);setView('detail');}}
                  style={{ background:'white', borderRadius:14, border:'1.5px solid #E8ECF8', padding:'20px 24px', cursor:'pointer', transition:'all .15s', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}
                  onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.1)';e.currentTarget.style.borderColor=c.primary;}}
                  onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.04)';e.currentTarget.style.borderColor='#E8ECF8';}}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                    <div>
                      <div style={{ fontSize:17, fontWeight:700, color:'#0F1729', marginBottom:6 }}>{d.job_title}</div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {d.department&&<Badge color="#6366F1">{d.department}</Badge>}
                        {d.location&&<Badge color="#0CA678">{d.location}</Badge>}
                        {d.work_type&&<Badge color="#F79009">{d.work_type}</Badge>}
                        {d.employment_type&&<Badge color="#9DA8C7">{d.employment_type}</Badge>}
                      </div>
                    </div>
                    <div style={{ color:c.primary, fontSize:20, flexShrink:0 }}>→</div>
                  </div>
                  {d.description&&<p style={{ fontSize:13, color:'#6B7280', margin:'10px 0 0', lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{d.description}</p>}
                </div>
              )
            })}
          </div>
        }
      </Section>
    </div>
  )
}
