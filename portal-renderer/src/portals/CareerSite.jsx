import { useState, useEffect } from 'react'
import { css, Badge, Btn, Input, Section, STATUS_COLORS, recordTitle } from './shared.jsx'

const JobCard = ({ job, color, onClick }) => {
  const d = job.data || {}
  return (
    <div onClick={onClick} style={{ background:'#fff', borderRadius:16, border:'1.5px solid #E8ECF8',
      padding:'20px 24px', cursor:'pointer', transition:'all .2s', display:'flex', alignItems:'center', gap:16 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 4px 20px ${color}20` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8ECF8'; e.currentTarget.style.boxShadow = 'none' }}>
      <div style={{ width:48, height:48, borderRadius:14, background:`${color}14`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span style={{ fontSize:22 }}>💼</span>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:16, fontWeight:700, color:'#0F1729', marginBottom:4 }}>{d.job_title || 'Open Role'}</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {d.department && <Badge color="#6366F1">{d.department}</Badge>}
          {d.location && <Badge color="#0CA678">{d.location}</Badge>}
          {d.work_type && <Badge color="#F79009">{d.work_type}</Badge>}
          {d.employment_type && <Badge color="#9DA8C7">{d.employment_type}</Badge>}
        </div>
      </div>
      <div style={{ padding:'8px 18px', borderRadius:10, background:color, color:'white', fontSize:13, fontWeight:700, flexShrink:0 }}>
        View Role →
      </div>
    </div>
  )
}

const JobDetail = ({ job, portal, onApply, onBack }) => {
  const c = css(portal.branding)
  const d = job.data || {}
  return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:c.font }}>
      <div style={{ background:c.primary, padding:'16px 0' }}>
        <Section>
          <button onClick={onBack} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.8)', cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6, fontFamily:c.font }}>
            ← Back to all jobs
          </button>
        </Section>
      </div>
      <Section style={{ padding:'40px 24px' }}>
        <div style={{ maxWidth:760, margin:'0 auto' }}>
          <div style={{ background:'#fff', borderRadius:20, border:'1px solid #E8ECF8', padding:'32px', marginBottom:20 }}>
            <h1 style={{ margin:'0 0 12px', fontSize:28, fontWeight:800, color:'#0F1729' }}>{d.job_title || 'Open Role'}</h1>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
              {d.department && <Badge color="#6366F1">{d.department}</Badge>}
              {d.location && <Badge color="#0CA678">{d.location}</Badge>}
              {d.work_type && <Badge color="#F79009">{d.work_type}</Badge>}
              {d.status && <Badge color={STATUS_COLORS[d.status]||'#9DA8C7'}>{d.status}</Badge>}
            </div>
            {d.summary && <p style={{ fontSize:15, color:'#4B5675', lineHeight:1.7, marginBottom:24 }}>{d.summary}</p>}
            <Btn color={c.button} onClick={onApply}>Apply for this role →</Btn>
          </div>
        </div>
      </Section>
    </div>
  )
}

const ApplyForm = ({ job, portal, onBack, onSuccess, api }) => {
  const c = css(portal.branding)
  const d = job.data || {}
  const [form, setForm] = useState({ first_name:'', last_name:'', email:'', phone:'', cover_note:'' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({...f, [k]:v}))

  const handleSubmit = async () => {
    if (!form.first_name || !form.email) return
    setSubmitting(true); setError('')
    try {
      const result = await api.post(`/portals/${portal.id}/apply`, {
        ...form,
        job_id: job.id,
        job_title: d.job_title || '',
      })
      if (result.error) { setError(result.error); setSubmitting(false); return }
      setDone(true)
      setTimeout(onSuccess, 2500)
    } catch (e) {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (done) return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:c.font, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', padding:40 }}>
        <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
        <h2 style={{ fontSize:24, fontWeight:800, color:'#0F1729', marginBottom:8 }}>Application Submitted!</h2>
        <p style={{ color:'#6B7280' }}>Thank you {form.first_name}. We'll be in touch soon.</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:c.font }}>
      <div style={{ background:c.primary, padding:'16px 0' }}>
        <Section><button onClick={onBack} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.8)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:c.font }}>← Back</button></Section>
      </div>
      <Section style={{ padding:'40px 24px' }}>
        <div style={{ maxWidth:580, margin:'0 auto', background:'#fff', borderRadius:20, border:'1px solid #E8ECF8', padding:'32px' }}>
          <h2 style={{ margin:'0 0 4px', fontSize:22, fontWeight:800, color:'#0F1729' }}>Apply — {job.data?.job_title}</h2>
          <p style={{ margin:'0 0 24px', fontSize:13, color:'#9DA8C7' }}>{portal.branding?.company_name}</p>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Input label="First Name" value={form.first_name} onChange={v=>set('first_name',v)} required/>
              <Input label="Last Name" value={form.last_name} onChange={v=>set('last_name',v)}/>
            </div>
            <Input label="Email" type="email" value={form.email} onChange={v=>set('email',v)} required/>
            <Input label="Phone" type="tel" value={form.phone} onChange={v=>set('phone',v)} placeholder="+971 50 000 0000"/>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <label style={{ fontSize:13, fontWeight:600, color:'#4B5675' }}>Cover Note</label>
              <textarea value={form.cover_note} onChange={e=>set('cover_note',e.target.value)} rows={4}
                placeholder="Tell us why you're a great fit…"
                style={{ padding:'10px 14px', borderRadius:10, border:'1.5px solid #E8ECF8', fontSize:14, fontFamily:c.font, resize:'vertical', outline:'none' }}
                onFocus={e=>e.target.style.borderColor=c.primary} onBlur={e=>e.target.style.borderColor='#E8ECF8'}/>
            </div>
            <Btn color={c.button} onClick={handleSubmit} disabled={submitting||!form.first_name||!form.email} full>
              {submitting ? 'Submitting…' : 'Submit Application'}
            </Btn>
            {error && <p style={{ color:'#dc2626', fontSize:13, margin:'8px 0 0', textAlign:'center' }}>{error}</p>}
          </div>
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
  const [view, setView] = useState('list')   // 'list' | 'detail' | 'apply'
  const [selected, setSelected] = useState(null)

  const jobObj = objects.find(o => o.slug === 'jobs')

  // Extract savedListId from the jobs widget in the page builder, or from portal config
  const jobsWidgetConfig = (() => {
    for (const page of (portal.pages || [])) {
      for (const row of (page.rows || [])) {
        for (const cell of (row.cells || [])) {
          if (cell.widgetType === 'jobs' && cell.widgetConfig?.savedListId) return cell.widgetConfig;
        }
      }
    }
    return {};
  })();
  const savedListId = jobsWidgetConfig.savedListId || null;

  useEffect(() => {
    if (!jobObj) { setLoading(false); return }

    const loadJobs = async () => {
      try {
        // Fetch all jobs first
        const d = await api.get(`/records?object_id=${jobObj.id}&environment_id=${portal.environment_id}&limit=200`);
        let allJobs = (d.records || []).filter(j => j.data?.status === 'Open' || !j.data?.status);

        // If a saved list is configured, fetch its filters and apply them
        if (savedListId) {
          try {
            const views = await api.get(`/saved-views?object_id=${jobObj.id}&environment_id=${portal.environment_id}`);
            const savedView = (Array.isArray(views) ? views : []).find(v => v.id === savedListId);
            if (savedView) {
              // Apply filter_chip
              if (savedView.filter_chip) {
                const fc = savedView.filter_chip;
                if (fc.fieldKey === '__ids__') {
                  const ids = fc.fieldValue.split(',').map(s => s.trim()).filter(Boolean);
                  allJobs = allJobs.filter(r => ids.includes(r.id));
                } else {
                  allJobs = allJobs.filter(r => {
                    const v = r.data?.[fc.fieldKey];
                    if (Array.isArray(v)) return v.some(i => String(i).toLowerCase() === fc.fieldValue.toLowerCase());
                    return String(v || '').toLowerCase() === fc.fieldValue.toLowerCase();
                  });
                }
              }
              // Apply activeFilters (these use fieldId, need to resolve to api_key)
              if (savedView.filters?.length) {
                // Fetch fields to resolve fieldId -> api_key
                let fieldMap = {};
                try {
                  const fields = await api.get(`/fields?object_id=${jobObj.id}`);
                  if (Array.isArray(fields)) fields.forEach(f => { fieldMap[f.id] = f.api_key; });
                } catch {}

                allJobs = allJobs.filter(record => savedView.filters.every(filt => {
                  const apiKey = fieldMap[filt.fieldId] || filt.fieldKey || '';
                  const rawVal = record.data?.[apiKey];
                  const op = filt.op;
                  const fv = filt.value;
                  if (op === 'is empty') return !rawVal;
                  if (op === 'is not empty') return !!rawVal;
                  const strVal = String(rawVal ?? '').toLowerCase();
                  const strFv = String(fv ?? '').toLowerCase();
                  if (op === 'contains') return strVal.includes(strFv);
                  if (op === 'is') return strVal === strFv;
                  if (op === 'is not') return strVal !== strFv;
                  if (op === 'includes') return Array.isArray(rawVal) ? rawVal.some(v => String(v).toLowerCase() === strFv) : strVal === strFv;
                  return true;
                }));
              }
            }
          } catch (e) { console.warn('Failed to load saved view filters:', e); }
        }

        setJobs(allJobs);
      } catch (e) { console.error('Failed to load jobs:', e); }
      setLoading(false);
    };
    loadJobs();
  }, [jobObj?.id, savedListId])

  const depts = [...new Set(jobs.map(j => j.data?.department).filter(Boolean))]
  const filtered = jobs.filter(j => {
    const title = (j.data?.job_title || '').toLowerCase()
    const matchSearch = !search || title.includes(search.toLowerCase())
    const matchDept = !dept || j.data?.department === dept
    return matchSearch && matchDept
  })

  if (view === 'apply') return <ApplyForm job={selected} portal={portal} api={api} onBack={()=>setView('detail')} onSuccess={()=>setView('list')}/>
  if (view === 'detail') return <JobDetail job={selected} portal={portal} onApply={()=>setView('apply')} onBack={()=>setView('list')}/>

  return (
    <div style={{ minHeight:'100vh', background:c.bg, fontFamily:c.font }}>
      {/* Hero */}
      <div style={{ background:`linear-gradient(135deg, ${c.primary}ee, ${c.primary})`, padding:'56px 0 48px' }}>
        <Section>
          {br.logo_url && <img src={br.logo_url} alt="logo" style={{ height:40, marginBottom:20, objectFit:'contain' }}/>}
          <h1 style={{ margin:'0 0 10px', fontSize:38, fontWeight:900, color:'white', letterSpacing:'-1px', lineHeight:1.15 }}>
            {br.tagline || `Join ${br.company_name || 'Us'}`}
          </h1>
          <p style={{ margin:'0 0 32px', fontSize:16, color:'rgba(255,255,255,0.75)', maxWidth:520 }}>
            {br.company_name ? `${br.company_name} is hiring. Find your next opportunity below.` : 'Explore our open positions and find your next opportunity.'}
          </p>
          {/* Search bar */}
          <div style={{ display:'flex', gap:8, maxWidth:580 }}>
            <div style={{ flex:1, position:'relative' }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search roles…"
                style={{ width:'100%', padding:'12px 16px 12px 44px', borderRadius:12, border:'none', fontSize:14, fontFamily:c.font, outline:'none', boxSizing:'border-box' }}/>
              <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', fontSize:16 }}>🔍</span>
            </div>
            {depts.length > 0 && (
              <select value={dept} onChange={e=>setDept(e.target.value)}
                style={{ padding:'12px 14px', borderRadius:12, border:'none', fontSize:13, fontFamily:c.font, background:'white', cursor:'pointer' }}>
                <option value="">All departments</option>
                {depts.map(d => <option key={d}>{d}</option>)}
              </select>
            )}
          </div>
        </Section>
      </div>

      {/* Job list */}
      <Section style={{ padding:'40px 24px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <p style={{ margin:0, fontSize:14, color:c.text3, fontWeight:600 }}>
            {loading ? 'Loading…' : `${filtered.length} open position${filtered.length!==1?'s':''}`}
          </p>
        </div>
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[1,2,3].map(i => <div key={i} style={{ height:88, borderRadius:16, background:'#fff', border:'1.5px solid #E8ECF8', animation:'pulse 1.5s ease-in-out infinite' }}/>)}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 0' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
            <p style={{ fontSize:16, fontWeight:700, color:'#0F1729', marginBottom:4 }}>No roles found</p>
            <p style={{ fontSize:13, color:'#9DA8C7' }}>Try adjusting your search or filter</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {filtered.map(job => <JobCard key={job.id} job={job} color={c.primary} onClick={()=>{ setSelected(job); setView('detail') }}/>)}
          </div>
        )}
      </Section>

      {/* Footer */}
      <div style={{ borderTop:'1px solid #E8ECF8', padding:'24px', textAlign:'center', marginTop:40 }}>
        <p style={{ margin:0, fontSize:12, color:'#9DA8C7' }}>Powered by TalentOS · {br.company_name || ''}</p>
      </div>
    </div>
  )
}
