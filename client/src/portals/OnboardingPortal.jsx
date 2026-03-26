import { useState } from 'react'
import { css, Badge, Btn, Section } from './shared.jsx'

const STEPS = [
  { id:'welcome',   icon:'👋', label:'Welcome',         desc:'Get started with your onboarding journey' },
  { id:'docs',      icon:'📄', label:'Documents',       desc:'Upload required documents and forms' },
  { id:'profile',   icon:'👤', label:'Your Profile',    desc:'Complete your profile information' },
  { id:'equipment', icon:'💻', label:'Equipment',       desc:'Select and confirm your equipment needs' },
  { id:'complete',  icon:'🎉', label:'All Done!',       desc:"You're ready to start" },
]

const WelcomeStep = ({ portal, name, onNext }) => {
  const c = css(portal.branding)
  const br = portal.branding || {}
  return (
    <div style={{ textAlign:'center', padding:'48px 24px' }}>
      <div style={{ fontSize:72, marginBottom:20 }}>👋</div>
      <h1 style={{ fontSize:28, fontWeight:900, color:'#0F1729', margin:'0 0 12px', letterSpacing:'-0.5px' }}>
        Welcome{name ? `, ${name}` : ''}!
      </h1>
      <p style={{ fontSize:16, color:'#4B5675', lineHeight:1.7, maxWidth:480, margin:'0 auto 32px' }}>
        We're thrilled to have you joining {br.company_name || 'us'}. This portal will guide you through everything you need to complete before your first day.
      </p>
      <div style={{ display:'flex', flexDirection:'column', gap:10, maxWidth:420, margin:'0 auto 32px', textAlign:'left' }}>
        {STEPS.slice(1, -1).map(s => (
          <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'#F8FAFF', borderRadius:12 }}>
            <span style={{ fontSize:20 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#0F1729' }}>{s.label}</div>
              <div style={{ fontSize:11, color:'#9DA8C7' }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <Btn color={c.button} onClick={onNext}>Let's Get Started →</Btn>
    </div>
  )
}

const DocStep = ({ portal, onNext, onBack }) => {
  const c = css(portal.branding)
  const [uploads, setUploads] = useState({})
  const docs = [
    { id:'id', label:'Government ID', required:true, desc:'Passport, national ID, or driving licence' },
    { id:'address', label:'Proof of Address', required:true, desc:'Utility bill or bank statement (last 3 months)' },
    { id:'qualifications', label:'Qualifications', required:false, desc:'Degree certificates or professional qualifications' },
    { id:'bank', label:'Bank Details', required:true, desc:'Voided cheque or bank letter for payroll setup' },
  ]
  const requiredDone = docs.filter(d => d.required).every(d => uploads[d.id])
  return (
    <div style={{ padding:'32px 0' }}>
      <h2 style={{ fontSize:22, fontWeight:800, color:'#0F1729', margin:'0 0 6px' }}>Document Upload</h2>
      <p style={{ fontSize:13, color:'#9DA8C7', margin:'0 0 28px' }}>Please upload the required documents to complete your pre-boarding</p>
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28 }}>
        {docs.map(doc => (
          <div key={doc.id} style={{ background:'#fff', borderRadius:14, border:`1.5px solid ${uploads[doc.id] ? '#0CAF77' : '#E8ECF8'}`, padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#0F1729' }}>
                {doc.label} {doc.required && <span style={{ color:'#EF4444', fontSize:12 }}>*</span>}
              </div>
              <div style={{ fontSize:12, color:'#9DA8C7', marginTop:2 }}>{doc.desc}</div>
            </div>
            {uploads[doc.id]
              ? <div style={{ display:'flex', alignItems:'center', gap:6, color:'#0CAF77', fontSize:13, fontWeight:700 }}><span>✓</span> Uploaded</div>
              : <button onClick={() => setUploads(u => ({...u, [doc.id]: true}))}
                  style={{ padding:'7px 16px', borderRadius:8, border:`1.5px solid ${c.primary}`, background:'transparent', color:c.primary, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  Upload
                </button>
            }
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <Btn outline color="#9DA8C7" onClick={onBack}>← Back</Btn>
        <Btn color={c.button} onClick={onNext} disabled={!requiredDone}>{requiredDone ? 'Continue →' : 'Upload required docs to continue'}</Btn>
      </div>
    </div>
  )
}

const ProfileStep = ({ portal, onNext, onBack }) => {
  const c = css(portal.branding)
  const [form, setForm] = useState({ emergency_name:'', emergency_phone:'', tshirt:'M', dietary:'' })
  const set = (k, v) => setForm(f => ({...f, [k]:v}))
  return (
    <div style={{ padding:'32px 0' }}>
      <h2 style={{ fontSize:22, fontWeight:800, color:'#0F1729', margin:'0 0 6px' }}>Complete Your Profile</h2>
      <p style={{ fontSize:13, color:'#9DA8C7', margin:'0 0 28px' }}>Help us prepare for your arrival</p>
      <div style={{ display:'flex', flexDirection:'column', gap:16, marginBottom:28 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#4B5675', borderBottom:'1px solid #E8ECF8', paddingBottom:8 }}>Emergency Contact</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <label style={{ fontSize:13, fontWeight:600, color:'#4B5675' }}>Contact Name</label>
            <input value={form.emergency_name} onChange={e=>set('emergency_name',e.target.value)}
              style={{ padding:'10px 14px', borderRadius:10, border:'1.5px solid #E8ECF8', fontSize:13, fontFamily:'inherit', outline:'none' }}
              onFocus={e=>e.target.style.borderColor=c.primary} onBlur={e=>e.target.style.borderColor='#E8ECF8'}/>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <label style={{ fontSize:13, fontWeight:600, color:'#4B5675' }}>Contact Phone</label>
            <input value={form.emergency_phone} onChange={e=>set('emergency_phone',e.target.value)}
              style={{ padding:'10px 14px', borderRadius:10, border:'1.5px solid #E8ECF8', fontSize:13, fontFamily:'inherit', outline:'none' }}
              onFocus={e=>e.target.style.borderColor=c.primary} onBlur={e=>e.target.style.borderColor='#E8ECF8'}/>
          </div>
        </div>
        <div style={{ fontSize:13, fontWeight:700, color:'#4B5675', borderBottom:'1px solid #E8ECF8', paddingBottom:8, marginTop:4 }}>Preferences</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <label style={{ fontSize:13, fontWeight:600, color:'#4B5675' }}>T-shirt Size (for welcome kit)</label>
          <select value={form.tshirt} onChange={e=>set('tshirt',e.target.value)}
            style={{ padding:'10px 14px', borderRadius:10, border:'1.5px solid #E8ECF8', fontSize:13, fontFamily:'inherit', background:'white' }}>
            {['XS','S','M','L','XL','XXL'].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <label style={{ fontSize:13, fontWeight:600, color:'#4B5675' }}>Dietary Requirements</label>
          <input value={form.dietary} onChange={e=>set('dietary',e.target.value)} placeholder="e.g. Vegetarian, Halal, Gluten-free…"
            style={{ padding:'10px 14px', borderRadius:10, border:'1.5px solid #E8ECF8', fontSize:13, fontFamily:'inherit', outline:'none' }}
            onFocus={e=>e.target.style.borderColor=c.primary} onBlur={e=>e.target.style.borderColor='#E8ECF8'}/>
        </div>
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <Btn outline color="#9DA8C7" onClick={onBack}>← Back</Btn>
        <Btn color={c.button} onClick={onNext}>Continue →</Btn>
      </div>
    </div>
  )
}

const EquipmentStep = ({ portal, onNext, onBack }) => {
  const c = css(portal.branding)
  const [selected, setSelected] = useState({})
  const items = [
    { id:'macbook', label:'MacBook Pro 14"', icon:'💻', desc:'M3 Pro, 16GB RAM' },
    { id:'windows', label:'Dell XPS 15', icon:'🖥️', desc:'Intel i7, 16GB RAM' },
    { id:'iphone',  label:'iPhone 15 Pro', icon:'📱', desc:'Company mobile device' },
    { id:'headset', label:'Noise-cancelling Headset', icon:'🎧', desc:'Bose QC45 or equivalent' },
    { id:'monitor', label:'External Monitor', icon:'🖥️', desc:'27" 4K display' },
    { id:'standing', label:'Standing Desk', icon:'🪑', desc:'Adjustable height' },
  ]
  const toggle = id => setSelected(s => ({...s, [id]:!s[id]}))
  return (
    <div style={{ padding:'32px 0' }}>
      <h2 style={{ fontSize:22, fontWeight:800, color:'#0F1729', margin:'0 0 6px' }}>Equipment Selection</h2>
      <p style={{ fontSize:13, color:'#9DA8C7', margin:'0 0 28px' }}>Choose the equipment you need to do your best work</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:28 }}>
        {items.map(item => (
          <div key={item.id} onClick={() => toggle(item.id)}
            style={{ background: selected[item.id] ? `${c.primary}08` : '#fff', borderRadius:14, border:`2px solid ${selected[item.id] ? c.primary : '#E8ECF8'}`,
              padding:'16px', cursor:'pointer', transition:'all .15s' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>{item.icon}</div>
            <div style={{ fontSize:13, fontWeight:700, color:'#0F1729', marginBottom:2 }}>{item.label}</div>
            <div style={{ fontSize:11, color:'#9DA8C7' }}>{item.desc}</div>
            {selected[item.id] && <div style={{ marginTop:8, fontSize:11, fontWeight:700, color:c.primary }}>✓ Selected</div>}
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <Btn outline color="#9DA8C7" onClick={onBack}>← Back</Btn>
        <Btn color={c.button} onClick={onNext}>Confirm Selection →</Btn>
      </div>
    </div>
  )
}

const CompleteStep = ({ portal, name }) => {
  const br = portal.branding || {}
  return (
    <div style={{ textAlign:'center', padding:'60px 24px' }}>
      <div style={{ fontSize:80, marginBottom:20 }}>🎉</div>
      <h1 style={{ fontSize:28, fontWeight:900, color:'#0F1729', margin:'0 0 12px' }}>You're all set{name ? `, ${name}` : ''}!</h1>
      <p style={{ fontSize:15, color:'#4B5675', lineHeight:1.7, maxWidth:480, margin:'0 auto 28px' }}>
        Your pre-boarding is complete. {br.company_name || 'The team'} will be in touch with your first-day details. We can't wait to have you on board!
      </p>
      <div style={{ display:'inline-flex', flexDirection:'column', gap:10, textAlign:'left', background:'#F8FAFF', borderRadius:16, padding:'20px 28px', marginBottom:32 }}>
        {['Documents received ✓', 'Profile complete ✓', 'Equipment ordered ✓', 'Welcome kit being prepared ✓'].map(s => (
          <div key={s} style={{ fontSize:14, fontWeight:600, color:'#0CAF77' }}>{s}</div>
        ))}
      </div>
      <p style={{ fontSize:12, color:'#9DA8C7' }}>Questions? Contact your HR team at {br.company_name || 'your new employer'}</p>
    </div>
  )
}

export default function OnboardingPortal({ portal }) {
  const c = css(portal.branding)
  const br = portal.branding || {}
  const [step, setStep] = useState(0)
  const [name] = useState('')

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const back = () => setStep(s => Math.max(s - 1, 0))

  const STEP_COMPONENTS = [
    <WelcomeStep portal={portal} name={name} onNext={next}/>,
    <DocStep portal={portal} onNext={next} onBack={back}/>,
    <ProfileStep portal={portal} onNext={next} onBack={back}/>,
    <EquipmentStep portal={portal} onNext={next} onBack={back}/>,
    <CompleteStep portal={portal} name={name}/>,
  ]

  return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:c.font }}>
      {/* Header */}
      <div style={{ background:c.primary, padding:'16px 0' }}>
        <Section>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {br.logo_url
                ? <img src={br.logo_url} style={{ height:28, objectFit:'contain' }} alt="logo"/>
                : <div style={{ color:'white', fontSize:15, fontWeight:800 }}>{br.company_name || 'Onboarding'}</div>}
            </div>
            <div style={{ color:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:600 }}>
              Step {step + 1} of {STEPS.length}
            </div>
          </div>
        </Section>
      </div>

      {/* Progress bar */}
      <div style={{ background:'#E8ECF8', height:4 }}>
        <div style={{ height:4, background:c.primary, width:`${((step) / (STEPS.length - 1)) * 100}%`, transition:'width .4s ease' }}/>
      </div>

      {/* Step nav */}
      <div style={{ background:'white', borderBottom:'1px solid #E8ECF8' }}>
        <Section>
          <div style={{ display:'flex', gap:0, overflowX:'auto', padding:'0' }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'14px 16px',
                borderBottom:`2px solid ${i === step ? c.primary : 'transparent'}`,
                opacity: i > step ? 0.4 : 1, flexShrink:0 }}>
                <span style={{ fontSize:16 }}>{i < step ? '✅' : s.icon}</span>
                <span style={{ fontSize:12, fontWeight: i === step ? 700 : 500, color: i === step ? c.primary : '#4B5675', whiteSpace:'nowrap' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section style={{ maxWidth:680, margin:'0 auto', padding:'0 24px' }}>
        {STEP_COMPONENTS[step]}
      </Section>

      <div style={{ borderTop:'1px solid #E8ECF8', padding:'20px', textAlign:'center', marginTop:40 }}>
        <p style={{ margin:0, fontSize:11, color:'#9DA8C7' }}>Onboarding Portal · Powered by Vercentic</p>
      </div>
    </div>
  )
}
