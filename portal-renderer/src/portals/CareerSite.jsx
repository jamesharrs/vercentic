/**
 * CareerSite.jsx — Vercentic Portal Renderer
 * Full career site: job board → job detail → multi-step application → Person record created
 */
import { useState, useEffect } from 'react'

// ── Design tokens ────────────────────────────────────────────────────────────
const css = (br = {}) => ({
  primary:  br.primary_color   || '#4361EE',
  accent:   br.accent_color    || '#7C3AED',
  bg:       br.bg_color        || '#F8F7FF',
  font:     br.font_family     || "'DM Sans', -apple-system, sans-serif",
})

const DEPT_COLORS = {
  Engineering:'#4361EE', Data:'#7C3AED', Product:'#0CA678', Finance:'#F59F00',
  HR:'#E03131', Sales:'#1C7ED6', Marketing:'#D6336C', Design:'#7950F2',
  Operations:'#2F9E44', Legal:'#5C7CFA', 'Customer Success':'#0CA678',
}
const STATUS_COLORS = { Open:'#0CA678', Interviewing:'#4361EE', 'On Hold':'#F59F00', Filled:'#868E96', Draft:'#ADB5BD' }

// ── Shared components ─────────────────────────────────────────────────────────
const Section = ({ children, style = {} }) => (
  <div style={{ maxWidth:1080, margin:'0 auto', padding:'0 24px', ...style }}>{children}</div>
)

const Badge = ({ children, color = '#9DA8C7', large }) => (
  <span style={{
    display:'inline-flex', alignItems:'center', padding: large ? '5px 12px' : '3px 10px',
    borderRadius:99, fontSize: large ? 13 : 11, fontWeight:700,
    background:`${color}18`, color, border:`1px solid ${color}30`, whiteSpace:'nowrap',
  }}>{children}</span>
)

const Btn = ({ children, color, onClick, disabled, outline, small, style={} }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: small ? '8px 18px' : '13px 28px', borderRadius:10,
    border: outline ? `2px solid ${color}` : 'none',
    background: disabled ? '#E8ECF8' : outline ? 'transparent' : color,
    color: disabled ? '#ADB5BD' : outline ? color : 'white',
    fontSize: small ? 13 : 15, fontWeight:700, cursor: disabled ? 'default' : 'pointer',
    fontFamily:'inherit', transition:'all .15s', whiteSpace:'nowrap', ...style,
  }}>{children}</button>
)

const Inp = ({ id, label, value, onChange, placeholder, type='text', required, multiline, rows=4, hint, autoComplete }) => (
  <div style={{ marginBottom:20 }}>
    <label htmlFor={id} style={{ display:'block', fontSize:13, fontWeight:700, color:'#0D0D0F', marginBottom:6 }}>
      {label}{required && <><span aria-hidden="true" style={{ color:'#E03131', marginLeft:3 }}>*</span><span style={{position:'absolute',width:1,height:1,overflow:'hidden',clip:'rect(0,0,0,0)'}}> (required)</span></>}
    </label>
    {hint && <p style={{ fontSize:12, color:'#9DA8C7', margin:'0 0 8px' }}>{hint}</p>}
    {multiline
      ? <textarea id={id} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} required={required} aria-required={required?'true':'false'}
          style={{ width:'100%', padding:'12px 16px', borderRadius:10, border:'1.5px solid #E8ECF8',
            fontSize:14, fontFamily:'inherit', resize:'vertical', boxSizing:'border-box' }}
          onFocus={e=>e.target.style.borderColor='#4361EE'} onBlur={e=>e.target.style.borderColor='#E8ECF8'}/>
      : <input id={id} type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required} aria-required={required?'true':'false'} autoComplete={autoComplete||'off'}
          style={{ width:'100%', padding:'12px 16px', borderRadius:10, border:'1.5px solid #E8ECF8',
            fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }}
          onFocus={e=>e.target.style.borderColor='#4361EE'} onBlur={e=>e.target.style.borderColor='#E8ECF8'}/>
    }
  </div>
)

const Sel = ({ label, value, onChange, options, required }) => (
  <div style={{ marginBottom:20 }}>
    <label style={{ display:'block', fontSize:13, fontWeight:700, color:'#0D0D0F', marginBottom:6 }}>
      {label}{required && <span style={{ color:'#E03131', marginLeft:3 }}>*</span>}
    </label>
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ width:'100%', padding:'12px 16px', borderRadius:10, border:'1.5px solid #E8ECF8',
        fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', background:'white' }}>
      <option value="">Select…</option>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  </div>
)

// ── Job Card ──────────────────────────────────────────────────────────────────
const JobCard = ({ job, color, onClick }) => {
  const d = job.data || {}
  const deptColor = DEPT_COLORS[d.department] || color
  const [hov, setHov] = useState(false)
  const deptIcon = d.department === 'Engineering' ? '⚙️' : d.department === 'Data' ? '📊' :
    d.department === 'Product' ? '🎯' : d.department === 'Design' ? '🎨' :
    d.department === 'Finance' ? '💰' : d.department === 'HR' ? '👥' :
    d.department === 'Sales' ? '📈' : d.department === 'Marketing' ? '📣' : '💼'
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      aria-label={`View job: ${d.job_title || 'Open Role'}${d.department ? ', ' + d.department : ''}`}
      style={{ background:'white', borderRadius:16, border:`1.5px solid ${hov?color:'#E8ECF8'}`,
        padding:'22px 24px', cursor:'pointer', transition:'all .2s',
        boxShadow:hov?`0 8px 32px ${color}18`:'0 2px 8px rgba(0,0,0,0.04)',
        transform:hov?'translateY(-2px)':'none', width:'100%', textAlign:'left', fontFamily:'inherit' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:`${deptColor}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{deptIcon}</div>
            <div>
              <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:'#0D0D0F', lineHeight:1.2 }}>{d.job_title || 'Open Role'}</h3>
              {d.department && <div style={{ fontSize:12, color:deptColor, fontWeight:600 }}>{d.department}</div>}
            </div>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {d.location        && <Badge color="#4361EE">📍 {d.location}</Badge>}
            {d.work_type       && <Badge color="#0CA678">{d.work_type}</Badge>}
            {d.employment_type && <Badge color="#F59F00">{d.employment_type}</Badge>}
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
          {d.salary_min && d.salary_max && (
            <div style={{ fontSize:13, fontWeight:700, color:'#0D0D0F' }}>
              {d.salary_currency||'$'}{(d.salary_min/1000).toFixed(0)}k–{(d.salary_max/1000).toFixed(0)}k
            </div>
          )}
          <span style={{ fontSize:13, fontWeight:700, color }}>{hov?'Apply now →':'View role →'}</span>
        </div>
      </div>
      {d.description && (
        <p style={{ margin:'12px 0 0', fontSize:13, color:'#4B5675', lineHeight:1.6,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {d.description}
        </p>
      )}
    </button>
  )
}

// ── Job Detail ────────────────────────────────────────────────────────────────
const JobDetail = ({ job, portal, onApply, onBack }) => {
  const c = css(portal.branding)
  const d = job.data || {}
  const deptColor = DEPT_COLORS[d.department] || c.primary
  useEffect(()=>{ window.scrollTo(0,0) },[])
  return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:c.font }}>
      <div style={{ background:c.primary, padding:'16px 0' }}>
        <Section>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            {portal.branding?.logo_url
              ? <img src={portal.branding.logo_url} style={{ height:32, objectFit:'contain' }} alt="logo"/>
              : <div style={{ color:'white', fontWeight:800, fontSize:16 }}>{portal.branding?.company_name||'Careers'}</div>}
            <button onClick={onBack} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'white',
              padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              ← All Jobs
            </button>
          </div>
        </Section>
      </div>
      <Section style={{ padding:'40px 24px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:32, alignItems:'start' }}>
          <div>
            <div style={{ background:'white', borderRadius:20, border:'1.5px solid #E8ECF8', padding:'32px', marginBottom:24 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:24, flexWrap:'wrap' }}>
                <div style={{ width:56, height:56, borderRadius:14, background:`${deptColor}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>
                  {d.department==='Engineering'?'⚙️':d.department==='Data'?'📊':d.department==='Product'?'🎯':d.department==='Design'?'🎨':d.department==='Finance'?'💰':'💼'}
                </div>
                <div style={{ flex:1 }}>
                  <h1 style={{ margin:'0 0 8px', fontSize:28, fontWeight:900, color:'#0D0D0F', lineHeight:1.2 }}>{d.job_title}</h1>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {d.department && <Badge color={deptColor} large>{d.department}</Badge>}
                    {d.status     && <Badge color={STATUS_COLORS[d.status]||'#868E96'} large>{d.status}</Badge>}
                  </div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:28, padding:'20px', background:'#F8F7FF', borderRadius:12 }}>
                {[
                  { icon:'📍', label:'Location',   val:d.location },
                  { icon:'🏢', label:'Work Type',  val:d.work_type },
                  { icon:'⏱️', label:'Type',       val:d.employment_type },
                  { icon:'🎓', label:'Experience', val:d.experience_min_years?`${d.experience_min_years}+ years`:null },
                  { icon:'💰', label:'Salary',     val:d.salary_min&&d.salary_max?`${d.salary_currency||'$'}${(d.salary_min/1000).toFixed(0)}k–${(d.salary_max/1000).toFixed(0)}k`:null },
                  { icon:'📅', label:'Posted',     val:d.open_date?new Date(d.open_date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):null },
                ].filter(x=>x.val).map(({icon,label,val})=>(
                  <div key={label}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#9DA8C7', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>{icon} {label}</div>
                    <div style={{ fontSize:14, fontWeight:600, color:'#0D0D0F' }}>{val}</div>
                  </div>
                ))}
              </div>
              {d.description && (
                <div style={{ marginBottom:24 }}>
                  <h3 style={{ margin:'0 0 12px', fontSize:16, fontWeight:800, color:'#0D0D0F' }}>About the role</h3>
                  <p style={{ margin:0, fontSize:15, color:'#4B5675', lineHeight:1.8 }}>{d.description}</p>
                </div>
              )}
              {d.required_skills && d.required_skills.length > 0 && (
                <div style={{ marginBottom:24 }}>
                  <h3 style={{ margin:'0 0 12px', fontSize:16, fontWeight:800, color:'#0D0D0F' }}>Required skills</h3>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {(Array.isArray(d.required_skills)?d.required_skills:d.required_skills.split(',')).map(s=>(
                      <Badge key={s} color={c.primary} large>{s.trim()}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {d.benefits && d.benefits.length > 0 && (
                <div>
                  <h3 style={{ margin:'0 0 12px', fontSize:16, fontWeight:800, color:'#0D0D0F' }}>Benefits</h3>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {(Array.isArray(d.benefits)?d.benefits:d.benefits.split(',')).map(b=>(
                      <div key={b} style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, color:'#4B5675' }}>
                        <span style={{ color:'#0CA678', fontWeight:700 }}>✓</span>{b.trim()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div style={{ position:'sticky', top:24 }}>
            <div style={{ background:'white', borderRadius:20, border:`2px solid ${c.primary}`, padding:'28px', boxShadow:`0 8px 32px ${c.primary}18` }}>
              <h3 style={{ margin:'0 0 6px', fontSize:18, fontWeight:800, color:'#0D0D0F' }}>Interested?</h3>
              <p style={{ margin:'0 0 20px', fontSize:14, color:'#4B5675', lineHeight:1.6 }}>Apply now and our team will be in touch within 5 business days.</p>
              {d.visa_sponsorship && (
                <div style={{ padding:'10px 14px', borderRadius:10, background:'#0CA67810', border:'1px solid #0CA67830', marginBottom:16, fontSize:13, color:'#0CA678', fontWeight:600 }}>
                  ✓ Visa sponsorship available
                </div>
              )}
              <Btn color={c.primary} onClick={onApply} style={{ width:'100%', textAlign:'center', display:'block' }}>Apply for this role →</Btn>
              {d.hiring_manager && <p style={{ margin:'14px 0 0', fontSize:12, color:'#9DA8C7', textAlign:'center' }}>Hiring manager: {d.hiring_manager}</p>}
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}

// ── Multi-step Application Form ────────────────────────────────────────────────
const STEPS = ['About You','Experience','Your Application','Review & Submit']

const ApplyForm = ({ job, portal, onBack, onSuccess, api }) => {
  const c = css(portal.branding)
  const d = job.data || {}
  const [step, setStep]         = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState('')
  const [form, setForm]         = useState({
    first_name:'', last_name:'', email:'', phone:'', location:'', linkedin_url:'',
    current_title:'', current_company:'', years_experience:'', skills:'', notice_period:'',
    cover_letter:'', salary_expectation:'', work_type_preference:'', hear_about_us:'', gdpr_consent:false,
  })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  useEffect(()=>{ window.scrollTo(0,0) },[step])

  const stepValid = () => {
    if (step===0) return form.first_name && form.last_name && form.email
    if (step===1) return form.current_title
    if (step===2) return form.cover_letter && form.gdpr_consent
    return true
  }

  const handleSubmit = async () => {
    if (!stepValid()) return
    setSubmitting(true); setError('')
    try {
      const payload = {
        ...form,
        skills: form.skills ? form.skills.split(',').map(s=>s.trim()).filter(Boolean) : [],
        years_experience: parseInt(form.years_experience)||0,
        salary_expectation: parseInt(form.salary_expectation)||0,
        job_id: job.id, job_title: d.job_title||'',
        source:'Career Site', status:'Active', person_type:'Candidate',
        gdpr_consent:true, gdpr_consent_date:new Date().toISOString().split('T')[0],
      }
      const result = await api.post(`/portals/${portal.id}/apply`, payload)
      if (result.error) { setError(result.error); setSubmitting(false); return }
      setDone(true)
    } catch { setError('Something went wrong. Please try again.'); setSubmitting(false) }
  }

  if (done) return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:c.font, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', padding:'60px 40px', maxWidth:480 }}>
        <div style={{ width:80, height:80, borderRadius:'50%', background:'#0CA67810', border:'2px solid #0CA678',
          display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:36 }}>🎉</div>
        <h2 style={{ fontSize:28, fontWeight:900, color:'#0D0D0F', marginBottom:12 }}>Application Submitted!</h2>
        <p style={{ fontSize:16, color:'#4B5675', lineHeight:1.7, marginBottom:28 }}>
          Thanks {form.first_name}! We've received your application for <strong>{d.job_title}</strong>. Our team will be in touch within 5 business days.
        </p>
        <Btn color={c.primary} onClick={onSuccess}>← Browse more roles</Btn>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:c.font }}>
      <div style={{ background:c.primary, padding:'16px 0' }}>
        <Section>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            {portal.branding?.logo_url
              ? <img src={portal.branding.logo_url} style={{ height:32, objectFit:'contain' }} alt="logo"/>
              : <div style={{ color:'white', fontWeight:800, fontSize:16 }}>{portal.branding?.company_name||'Careers'}</div>}
            <button onClick={onBack} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'white',
              padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              ← Back to role
            </button>
          </div>
        </Section>
      </div>
      <Section style={{ padding:'40px 24px', maxWidth:680 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
          <div style={{ fontSize:13, color:'#4B5675' }}>Applying for</div>
          <Badge color={c.primary} large>{d.job_title}</Badge>
          {d.location && <Badge color="#4361EE">{d.location}</Badge>}
        </div>
        {/* Progress bar */}
        <div style={{ marginBottom:36 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            {STEPS.map((s,i)=>(
              <div key={s} style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:13, fontWeight:700, marginBottom:6,
                  background:i<step?'#0CA678':i===step?c.primary:'#E8ECF8',
                  color:i<=step?'white':'#9DA8C7' }}>
                  {i<step?'✓':i+1}
                </div>
                <div style={{ fontSize:11, fontWeight:600, color:i===step?c.primary:'#9DA8C7', textAlign:'center' }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ height:4, borderRadius:99, background:'#E8ECF8', overflow:'hidden' }}>
            <div style={{ height:'100%', background:c.primary, borderRadius:99, width:`${((step+1)/STEPS.length)*100}%`, transition:'width .4s ease' }}/>
          </div>
        </div>
        <div style={{ background:'white', borderRadius:20, border:'1.5px solid #E8ECF8', padding:'32px' }}>
          <h2 style={{ margin:'0 0 6px', fontSize:22, fontWeight:800, color:'#0D0D0F' }}>{STEPS[step]}</h2>
          <p style={{ margin:'0 0 28px', fontSize:14, color:'#9DA8C7' }}>
            {step===0&&'Tell us a bit about yourself.'}{step===1&&'Share your professional background.'}{step===2&&'Why are you the right fit?'}{step===3&&'Review before submitting.'}
          </p>
          {step===0 && <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              <Inp id="af-first" label="First name" autoComplete="given-name" value={form.first_name} onChange={v=>set('first_name',v)} placeholder="Jane" required/>
              <Inp id="af-last"  label="Last name"  autoComplete="family-name" value={form.last_name}  onChange={v=>set('last_name',v)}  placeholder="Smith" required/>
            </div>
            <Inp id="af-email" label="Email address" type="email" autoComplete="email" value={form.email} onChange={v=>set('email',v)} placeholder="jane@example.com" required/>
            <Inp id="af-phone" label="Phone number"  type="tel"   autoComplete="tel"   value={form.phone} onChange={v=>set('phone',v)} placeholder="+1 (555) 000-0000"/>
            <Inp id="af-loc"   label="Location"      autoComplete="address-level2"      value={form.location} onChange={v=>set('location',v)} placeholder="London, UK"/>
            <Inp id="af-li"    label="LinkedIn URL"  type="url"   autoComplete="url"   value={form.linkedin_url} onChange={v=>set('linkedin_url',v)} placeholder="https://linkedin.com/in/yourname" hint="Optional — helps us learn more about you"/>
          </>}
          {step===1 && <>
            <Inp label="Current job title"  value={form.current_title}   onChange={v=>set('current_title',v)}   placeholder="e.g. Senior Software Engineer" required/>
            <Inp label="Current company"    value={form.current_company} onChange={v=>set('current_company',v)} placeholder="e.g. Acme Corp"/>
            <Inp label="Years of relevant experience" type="number" value={form.years_experience} onChange={v=>set('years_experience',v)} placeholder="e.g. 5"/>
            <Inp label="Key skills" value={form.skills} onChange={v=>set('skills',v)} placeholder="e.g. React, Node.js, AWS" hint="Separate with commas"/>
            <Sel label="Notice period" value={form.notice_period} onChange={v=>set('notice_period',v)}
              options={['Immediate','1 month','2 months','3 months','4 months','6 months']}/>
          </>}
          {step===2 && <>
            <Inp label="Cover letter / Why this role?" value={form.cover_letter} onChange={v=>set('cover_letter',v)}
              multiline rows={6} required placeholder={`Tell us why you're excited about the ${d.job_title} role…`}/>
            <Inp label="Salary expectation (annual)" type="number" value={form.salary_expectation} onChange={v=>set('salary_expectation',v)}
              placeholder="e.g. 120000"
              hint={d.salary_min&&d.salary_max?`Advertised range: ${d.salary_currency||'$'}${(d.salary_min/1000).toFixed(0)}k–${(d.salary_max/1000).toFixed(0)}k`:''}/>
            <Sel label="Preferred work type" value={form.work_type_preference} onChange={v=>set('work_type_preference',v)}
              options={['Remote','Hybrid','On-site','Flexible']}/>
            <Sel label="How did you hear about this role?" value={form.hear_about_us} onChange={v=>set('hear_about_us',v)}
              options={['LinkedIn','Indeed','Glassdoor','Company website','Referral','Social media','Other']}/>
            <div style={{ padding:'16px', borderRadius:10, background:'#F8F7FF', border:'1.5px solid #E8ECF8', marginBottom:20 }}>
              <label style={{ display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer' }}>
                <input type="checkbox" checked={form.gdpr_consent} onChange={e=>set('gdpr_consent',e.target.checked)}
                  style={{ marginTop:2, width:18, height:18, accentColor:c.primary, flexShrink:0 }}/>
                <span style={{ fontSize:13, color:'#4B5675', lineHeight:1.6 }}>
                  I consent to {portal.branding?.company_name||'this company'} storing and processing my personal data for recruitment purposes. <span style={{ color:'#E03131' }}>*</span>
                </span>
              </label>
            </div>
          </>}
          {step===3 && (
            <div>
              {[
                { heading:'Personal details', rows:[['Name',`${form.first_name} ${form.last_name}`],['Email',form.email],['Phone',form.phone],['Location',form.location]] },
                { heading:'Experience',        rows:[['Current role',`${form.current_title}${form.current_company?` at ${form.current_company}`:''}`],['Experience',form.years_experience?`${form.years_experience} years`:'—'],['Notice',form.notice_period||'—']] },
                { heading:'Application',       rows:[['Cover letter',form.cover_letter.slice(0,120)+(form.cover_letter.length>120?'…':'')],['Work pref',form.work_type_preference||'—'],['Salary',form.salary_expectation?`${d.salary_currency||'$'}${Number(form.salary_expectation).toLocaleString()}`:'—']] },
              ].map(sec=>(
                <div key={sec.heading} style={{ marginBottom:20 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:c.primary, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>{sec.heading}</div>
                  {sec.rows.filter(([,v])=>v).map(([k,v])=>(
                    <div key={k} style={{ display:'flex', gap:12, padding:'8px 0', borderBottom:'1px solid #E8ECF8', fontSize:14 }}>
                      <span style={{ width:130, flexShrink:0, color:'#9DA8C7', fontWeight:600 }}>{k}</span>
                      <span style={{ color:'#0D0D0F' }}>{v}</span>
                    </div>
                  ))}
                </div>
              ))}
              {error && <p style={{ color:'#E03131', fontSize:13 }}>{error}</p>}
            </div>
          )}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:20 }}>
          <Btn outline color={c.primary} onClick={step===0?onBack:()=>setStep(s=>s-1)} small>{step===0?'← Back to role':'← Previous'}</Btn>
          {step < STEPS.length-1
            ? <Btn color={c.primary} onClick={()=>setStep(s=>s+1)} disabled={!stepValid()} small>Next: {STEPS[step+1]} →</Btn>
            : <Btn color={c.primary} onClick={handleSubmit} disabled={submitting||!stepValid()} small>{submitting?'Submitting…':'Submit Application →'}</Btn>
          }
        </div>
      </Section>
    </div>
  )
}

// ── Main Career Site ───────────────────────────────────────────────────────────
export default function CareerSite({ portal, objects, api }) {
  const c = css(portal.branding)
  const br = portal.branding || {}
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [dept, setDept]       = useState('')
  const [workType, setWorkType] = useState('')
  const [view, setView]       = useState('list')
  const [selected, setSelected] = useState(null)

  const jobObj = objects.find(o=>o.slug==='jobs')

  useEffect(()=>{
    if (!jobObj) { setLoading(false); return }
    api.get(`/records?object_id=${jobObj.id}&environment_id=${portal.environment_id}&limit=100`)
      .then(d=>{ setJobs((d.records||[]).filter(j=>['Open','Interviewing'].includes(j.data?.status)||!j.data?.status)); setLoading(false) })
      .catch(()=>setLoading(false))
  },[jobObj?.id])

  const depts     = [...new Set(jobs.map(j=>j.data?.department).filter(Boolean))].sort()
  const workTypes = [...new Set(jobs.map(j=>j.data?.work_type).filter(Boolean))].sort()

  const filtered = jobs.filter(j=>{
    const t = (j.data?.job_title||'').toLowerCase()
    return (!search || t.includes(search.toLowerCase()) || (j.data?.department||'').toLowerCase().includes(search.toLowerCase()))
      && (!dept     || j.data?.department===dept)
      && (!workType || j.data?.work_type===workType)
  })

  const grouped = {}
  filtered.forEach(j=>{ const d=j.data?.department||'Other'; if(!grouped[d]) grouped[d]=[]; grouped[d].push(j) })

  if (view==='apply')  return <ApplyForm  job={selected} portal={portal} api={api} onBack={()=>setView('detail')} onSuccess={()=>{ setView('list'); setSelected(null) }}/>
  if (view==='detail') return <JobDetail  job={selected} portal={portal} onApply={()=>setView('apply')} onBack={()=>setView('list')}/>

  return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:c.font }}>
      {/* Hero */}
      <div style={{ background:`linear-gradient(135deg, ${c.primary}, ${c.accent||c.primary}cc)`, padding:'64px 0 52px' }}>
        <Section>
          {br.logo_url && <img src={br.logo_url} alt="logo" style={{ height:44, marginBottom:24, objectFit:'contain' }}/>}
          <h1 style={{ margin:'0 0 12px', fontSize:42, fontWeight:900, color:'white', letterSpacing:'-1.5px', lineHeight:1.1 }}>
            {br.tagline || `Join ${br.company_name||'Our Team'}`}
          </h1>
          <p style={{ margin:'0 0 36px', fontSize:17, color:'rgba(255,255,255,0.8)', maxWidth:540, lineHeight:1.7 }}>
            {br.company_name
              ? `${br.company_name} is hiring talented people to help us build the future.`
              : "We're building something special. Find your next opportunity below."}
          </p>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', maxWidth:700 }}>
            <div style={{ flex:1, minWidth:220, position:'relative' }}>
              <svg style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', opacity:0.6 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search roles…"
                style={{ width:'100%', padding:'13px 16px 13px 42px', borderRadius:12, border:'none', fontSize:14,
                  fontFamily:c.font, outline:'none', boxSizing:'border-box', background:'rgba(255,255,255,0.18)', color:'white' }}/>
            </div>
            {depts.length>1 && (
              <select value={dept} onChange={e=>setDept(e.target.value)}
                style={{ padding:'13px 14px', borderRadius:12, border:'none', fontSize:13, fontFamily:c.font, background:'rgba(255,255,255,0.18)', color:'white', cursor:'pointer' }}>
                <option value="">All departments</option>
                {depts.map(d=><option key={d} style={{ color:'#0D0D0F' }}>{d}</option>)}
              </select>
            )}
            {workTypes.length>1 && (
              <select value={workType} onChange={e=>setWorkType(e.target.value)}
                style={{ padding:'13px 14px', borderRadius:12, border:'none', fontSize:13, fontFamily:c.font, background:'rgba(255,255,255,0.18)', color:'white', cursor:'pointer' }}>
                <option value="">All work types</option>
                {workTypes.map(w=><option key={w} style={{ color:'#0D0D0F' }}>{w}</option>)}
              </select>
            )}
          </div>
        </Section>
      </div>

      {/* Filter bar */}
      <div style={{ background:'white', borderBottom:'1px solid #E8ECF8' }}>
        <Section>
          <div style={{ display:'flex', gap:24, padding:'12px 0', overflowX:'auto', alignItems:'center' }}>
            <div style={{ fontSize:13, color:'#4B5675', fontWeight:600, whiteSpace:'nowrap', flexShrink:0 }}>
              <span style={{ fontWeight:800, color:c.primary, fontSize:17 }}>{filtered.length}</span> open position{filtered.length!==1?'s':''}
            </div>
            {depts.slice(0,7).map(d=>(
              <button key={d} onClick={()=>setDept(dept===d?'':d)}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:c.font,
                  color:dept===d?c.primary:'#9DA8C7', whiteSpace:'nowrap', padding:'0 0 2px',
                  borderBottom:dept===d?`2px solid ${c.primary}`:'2px solid transparent' }}>
                {d} ({jobs.filter(j=>j.data?.department===d).length})
              </button>
            ))}
          </div>
        </Section>
      </div>

      {/* Job list */}
      <Section style={{ padding:'40px 24px' }}>
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {[1,2,3,4].map(i=>(
              <div key={i} style={{ height:110, borderRadius:16, background:'white', border:'1.5px solid #E8ECF8', overflow:'hidden', position:'relative' }}>
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,#F8F7FF 25%,#E8ECF8 50%,#F8F7FF 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite' }}/>
                <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
              </div>
            ))}
          </div>
        ) : filtered.length===0 ? (
          <div style={{ textAlign:'center', padding:'80px 0' }}>
            <div style={{ fontSize:40, marginBottom:16 }}>🔍</div>
            <p style={{ fontSize:17, fontWeight:700, color:'#0D0D0F', marginBottom:8 }}>No roles found</p>
            <p style={{ fontSize:14, color:'#9DA8C7', marginBottom:24 }}>Try adjusting your search or removing filters</p>
            <Btn outline color={c.primary} onClick={()=>{ setSearch(''); setDept(''); setWorkType('') }} small>Clear filters</Btn>
          </div>
        ) : (dept||search) ? (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {filtered.map(job=><JobCard key={job.id} job={job} color={c.primary} onClick={()=>{ setSelected(job); setView('detail') }}/>)}
          </div>
        ) : (
          Object.entries(grouped).map(([deptName,deptJobs])=>(
            <div key={deptName} style={{ marginBottom:40 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <div style={{ width:4, height:24, borderRadius:99, background:DEPT_COLORS[deptName]||c.primary }}/>
                <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:'#0D0D0F' }}>{deptName}</h2>
                <span style={{ fontSize:13, color:'#9DA8C7', fontWeight:600 }}>{deptJobs.length} role{deptJobs.length!==1?'s':''}</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {deptJobs.map(job=><JobCard key={job.id} job={job} color={DEPT_COLORS[deptName]||c.primary} onClick={()=>{ setSelected(job); setView('detail') }}/>)}
              </div>
            </div>
          ))
        )}
      </Section>

      {/* Footer */}
      <div style={{ borderTop:'1px solid #E8ECF8', padding:'28px 0', background:'white' }}>
        <Section>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <div style={{ fontSize:13, color:'#9DA8C7' }}>
              {br.company_name&&<span style={{ fontWeight:600, color:'#4B5675' }}>{br.company_name} · </span>}Powered by Vercentic
            </div>
            <div style={{ display:'flex', gap:16 }}>
              <span style={{ fontSize:13, color:'#9DA8C7' }}>Privacy Policy</span>
              <span style={{ fontSize:13, color:'#9DA8C7' }}>GDPR</span>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
