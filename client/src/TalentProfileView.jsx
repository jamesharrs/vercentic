import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import apiClient from './apiClient.js';

const F = "'DM Sans', -apple-system, sans-serif";
const PURPLE = '#7c3aed';

// ── tiny icon helper ─────────────────────────────────────────────────────────
const ICON_PATHS = {
  x:          'M18 6L6 18M6 6l12 12',
  mail:       'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  phone:      'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5a19.79 19.79 0 01-3.07-8.63A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.97a16 16 0 006.72 6.72l1.33-1.33a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z',
  pin:        'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  briefcase:  'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2',
  award:      'M8.21 13.89L7 23l5-3 5 3-1.21-9.12M12 2a4 4 0 100 8 4 4 0 000-8z',
  book:       'M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5v-15A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5z',
  zap:        'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  paperclip:  'M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48',
  form:       'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
  edit:       'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  activity:   'M22 12h-4l-3 9L9 3l-3 9H2',
  list:       'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  align:      'M21 10H3M21 6H3M21 14H3M21 18H3',
  linkedin:   'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z',
  externalLink:'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3',
  chevD:      'M6 9l6 6 6-6',
  chevR:      'M9 18l6-6-6-6',
  star:       'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  clock:      'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2',
  user:       'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  download:   'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  check:      'M20 6L9 17l-5-5',
};
const Ic = ({ n, s=16, c='currentColor' }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={ICON_PATHS[n]||'M12 2a10 10 0 100 20A10 10 0 0012 2z'}/>
  </svg>
);

// ── Helpers ──────────────────────────────────────────────────────────────────
const relTime = (d) => {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(d).toLocaleDateString();
};

// ── Score ring ───────────────────────────────────────────────────────────────
const ScoreRing = ({ score }) => {
  if (score === null || score === undefined) return null;
  const r = 20; const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score, 0), 100);
  const col = pct >= 75 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';
  return (
    <div style={{ position:'relative', width:52, height:52, flexShrink:0 }}>
      <svg width={52} height={52} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={26} cy={26} r={r} fill="none" stroke="#e5e7eb" strokeWidth={3}/>
        <circle cx={26} cy={26} r={r} fill="none" stroke={col} strokeWidth={3}
          strokeDasharray={`${circ * pct / 100} ${circ}`} strokeLinecap="round"/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:13, fontWeight:800, color:col, lineHeight:1 }}>{pct}%</span>
        <span style={{ fontSize:8, color:'#9ca3af', lineHeight:1 }}>fit</span>
      </div>
    </div>
  );
};

// ── Section renderers ────────────────────────────────────────────────────────
const SectionShell = ({ icon, label, children, accent='#7c3aed' }) => (
  <div style={{ marginBottom:20, background:'white', borderRadius:12, border:'1px solid #f0edff', overflow:'hidden' }}>
    <div style={{ padding:'10px 16px', background:`${accent}08`, borderBottom:'1px solid #f0edff', display:'flex', alignItems:'center', gap:8 }}>
      <Ic n={icon} s={14} c={accent}/>
      <span style={{ fontSize:12, fontWeight:800, color:accent, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>
    </div>
    <div style={{ padding:'14px 16px' }}>{children}</div>
  </div>
);

const EmptyMsg = ({ msg='No data available.' }) => (
  <p style={{ fontSize:12, color:'#9ca3af', margin:0, fontStyle:'italic' }}>{msg}</p>
);

const ApplicationSection = ({ link, stageHistory }) => {
  const current = stageHistory?.[0];
  return (
    <SectionShell icon="briefcase" label="Application Details">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 16px', fontSize:13 }}>
        {link?.created_at && <div><span style={{ color:'#9ca3af', fontSize:11 }}>Applied</span><br/><b>{new Date(link.created_at).toLocaleDateString()}</b></div>}
        {link?.stage_name && <div><span style={{ color:'#9ca3af', fontSize:11 }}>Current stage</span><br/><b style={{ color:PURPLE }}>{link.stage_name}</b></div>}
        {current?.target_name && <div><span style={{ color:'#9ca3af', fontSize:11 }}>Role</span><br/><b>{current.target_name}</b></div>}
        {current?.workflow_name && <div><span style={{ color:'#9ca3af', fontSize:11 }}>Workflow</span><br/><b>{current.workflow_name}</b></div>}
      </div>
      {stageHistory?.length > 1 && (
        <div style={{ marginTop:12, borderTop:'1px solid #f3f0ff', paddingTop:10 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'#9ca3af', margin:'0 0 8px' }}>STAGE HISTORY</p>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {stageHistory.slice(0,5).map((h,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:PURPLE, flexShrink:0 }}/>
                <span style={{ color:'#374151', fontWeight:600 }}>{h.workflow_name}</span>
                <span style={{ color:'#6b7280' }}>→ {h.stage_name || 'stage ' + h.stage_id?.slice(0,6)}</span>
                <span style={{ color:'#9ca3af', marginLeft:'auto', fontSize:11 }}>{relTime(h.updated_at||h.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionShell>
  );
};

const SummarySection = ({ data }) => {
  const text = data.summary || data.bio || data.about || data.profile_summary || '';
  return (
    <SectionShell icon="align" label="Summary / Bio">
      {text ? <p style={{ fontSize:13, lineHeight:1.7, color:'#374151', margin:0, whiteSpace:'pre-wrap' }}>{text}</p> : <EmptyMsg msg="No summary added."/>}
    </SectionShell>
  );
};

const ExperienceSection = ({ data }) => {
  // Try parsed CV JSON or freetext field
  let items = null;
  if (data.work_experience && Array.isArray(data.work_experience)) items = data.work_experience;
  else if (data.cv_work_history) try { items = JSON.parse(data.cv_work_history); } catch {}
  const text = data.experience || data.work_history || '';
  return (
    <SectionShell icon="award" label="Work Experience">
      {items?.length > 0 ? (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {items.map((exp, i) => (
            <div key={i} style={{ paddingLeft:12, borderLeft:`2px solid ${PURPLE}30` }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#111827' }}>{exp.title || exp.role || exp.position}</div>
              {exp.company && <div style={{ fontSize:12, color:PURPLE, fontWeight:600 }}>{exp.company}</div>}
              {(exp.start || exp.period) && <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{exp.start||''}{exp.end?` — ${exp.end}`:''}{exp.period||''}</div>}
              {exp.description && <p style={{ fontSize:12, color:'#6b7280', marginTop:4, lineHeight:1.55 }}>{exp.description}</p>}
            </div>
          ))}
        </div>
      ) : text ? <p style={{ fontSize:13, lineHeight:1.65, color:'#374151', margin:0, whiteSpace:'pre-wrap' }}>{text}</p>
              : <EmptyMsg msg="No work experience recorded."/>}
    </SectionShell>
  );
};

const EducationSection = ({ data }) => {
  let items = null;
  if (data.education && Array.isArray(data.education)) items = data.education;
  else if (data.cv_education) try { items = JSON.parse(data.cv_education); } catch {}
  const text = data.education_text || (typeof data.education==='string'?data.education:'');
  return (
    <SectionShell icon="book" label="Education">
      {items?.length > 0 ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {items.map((ed, i) => (
            <div key={i} style={{ paddingLeft:12, borderLeft:`2px solid #3b82f630` }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#111827' }}>{ed.degree || ed.qualification || ed.course}</div>
              {ed.institution && <div style={{ fontSize:12, color:'#3b82f6', fontWeight:600 }}>{ed.institution}</div>}
              {(ed.year || ed.period || ed.start) && <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{ed.year||ed.period||ed.start}</div>}
            </div>
          ))}
        </div>
      ) : text ? <p style={{ fontSize:13, lineHeight:1.65, color:'#374151', margin:0 }}>{text}</p>
              : <EmptyMsg msg="No education recorded."/>}
    </SectionShell>
  );
};

const SkillsSection = ({ data }) => {
  let skills = [];
  if (Array.isArray(data.skills)) skills = data.skills;
  else if (typeof data.skills === 'string') skills = data.skills.split(/[,;|]+/).map(s=>s.trim()).filter(Boolean);
  else if (Array.isArray(data.skill_tags)) skills = data.skill_tags;
  return (
    <SectionShell icon="zap" label="Skills">
      {skills.length > 0
        ? <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {skills.map((s,i) => <span key={i} style={{ padding:'3px 10px', borderRadius:99, background:`${PURPLE}12`, color:PURPLE, fontSize:12, fontWeight:600 }}>{s}</span>)}
          </div>
        : <EmptyMsg msg="No skills recorded."/>}
    </SectionShell>
  );
};

const DocumentsSection = ({ attachments }) => (
  <SectionShell icon="paperclip" label="Documents & CV">
    {attachments?.length > 0
      ? <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {attachments.map((a,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:8, background:'#f9f7ff', border:'1px solid #ede9fe' }}>
              <Ic n="paperclip" s={14} c={PURPLE}/>
              <span style={{ flex:1, fontSize:13, color:'#374151', fontWeight:500 }}>{a.name||a.file_name||'File'}</span>
              {a.file_type && <span style={{ fontSize:10, color:'#9ca3af', background:'#f3f4f6', padding:'2px 6px', borderRadius:4 }}>{a.file_type}</span>}
              <span style={{ fontSize:11, color:'#9ca3af' }}>{relTime(a.created_at)}</span>
              {a.url && <a href={a.url} target="_blank" rel="noreferrer" style={{ color:PURPLE }}><Ic n="download" s={13} c={PURPLE}/></a>}
            </div>
          ))}
        </div>
      : <EmptyMsg msg="No documents uploaded."/>}
  </SectionShell>
);

const NotesSection = ({ notes }) => (
  <SectionShell icon="edit" label="Notes">
    {notes?.length > 0
      ? <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {notes.slice(0,5).map((n,i) => (
            <div key={i} style={{ padding:'8px 12px', borderRadius:8, background:'#fffbeb', borderLeft:`3px solid #f59e0b` }}>
              <p style={{ fontSize:13, color:'#374151', margin:'0 0 4px', lineHeight:1.55, whiteSpace:'pre-wrap' }}>{n.content||n.body||n.text}</p>
              <span style={{ fontSize:11, color:'#9ca3af' }}>{n.author||'User'} · {relTime(n.created_at)}</span>
            </div>
          ))}
        </div>
      : <EmptyMsg msg="No notes yet."/>}
  </SectionShell>
);

const ActivitySection = ({ activity, stageHistory }) => {
  const items = [...(activity||[])].slice(0,10);
  return (
    <SectionShell icon="activity" label="Stage History & Activity">
      {items.length > 0
        ? <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {items.map((a,i) => (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', fontSize:12 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:PURPLE+'60', flexShrink:0, marginTop:4 }}/>
                <div style={{ flex:1 }}>
                  <span style={{ color:'#374151', fontWeight:500 }}>{a.action||a.type||'Update'}</span>
                  {a.description && <span style={{ color:'#6b7280' }}> — {a.description}</span>}
                </div>
                <span style={{ color:'#9ca3af', fontSize:11, whiteSpace:'nowrap' }}>{relTime(a.created_at)}</span>
              </div>
            ))}
          </div>
        : <EmptyMsg msg="No activity recorded."/>}
    </SectionShell>
  );
};

const FormsSection = ({ formResponses }) => (
  <SectionShell icon="form" label="Form Responses">
    {formResponses?.length > 0
      ? <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {formResponses.map((resp, i) => (
            <div key={i} style={{ borderRadius:8, border:'1px solid #e9d5ff', overflow:'hidden' }}>
              <div style={{ padding:'6px 12px', background:PURPLE+'10', fontSize:12, fontWeight:700, color:PURPLE }}>{resp.form_name}</div>
              <div style={{ padding:'10px 12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 16px' }}>
                {(resp.responses||[]).map((r, j) => (
                  <div key={j}>
                    <div style={{ fontSize:10, color:'#9ca3af', fontWeight:600, textTransform:'uppercase' }}>{r.label||r.field_id}</div>
                    <div style={{ fontSize:12, color:'#374151', fontWeight:500, marginTop:1 }}>{Array.isArray(r.value)?r.value.join(', '):String(r.value||'—')}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      : <EmptyMsg msg="No form responses."/>}
  </SectionShell>
);

const CustomFieldsSection = ({ fields, data, fieldIds }) => {
  const visible = fields.filter(f => !fieldIds?.length || fieldIds.includes(f.id));
  return (
    <SectionShell icon="list" label="Profile Fields">
      {visible.length > 0
        ? <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 16px' }}>
            {visible.map(f => {
              const val = data[f.api_key];
              if (val === null || val === undefined || val === '') return null;
              const display = Array.isArray(val) ? val.join(', ') : String(val);
              return (
                <div key={f.id}>
                  <div style={{ fontSize:10, color:'#9ca3af', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{f.name}</div>
                  <div style={{ fontSize:13, color:'#374151', fontWeight:500, marginTop:1 }}>{display}</div>
                </div>
              );
            })}
          </div>
        : <EmptyMsg msg="No fields configured."/>}
    </SectionShell>
  );
};

// ── Main TalentProfileView modal ─────────────────────────────────────────────
export default function TalentProfileView({ link, matchScore, environmentId, onClose, onNavigate, onMoveStage, steps }) {
  const [profileData, setProfileData] = useState(null);
  const [config, setConfig]           = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!link?.person_record_id) return;
    setLoading(true);
    Promise.all([
      apiClient.get(`/talent-profile/person?person_record_id=${link.person_record_id}&link_id=${link.id||''}&environment_id=${environmentId||''}`),
      apiClient.get(`/talent-profile/config?environment_id=${environmentId||''}`),
    ]).then(([profile, cfg]) => {
      setProfileData(profile);
      setConfig(cfg);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [link?.person_record_id]);

  // Keyboard close
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const d    = profileData?.record?.data || {};
  const name = [d.first_name, d.last_name].filter(Boolean).join(' ') || d.email || 'Unknown';
  const initials = name.split(' ').map(w=>w[0]||'').slice(0,2).join('').toUpperCase() || '?';
  const score = matchScore?.score ?? null;
  const scoreColor = score===null?'#9ca3af':score>=75?'#059669':score>=50?'#d97706':'#dc2626';

  const sections = (config?.sections || [])
    .filter(s => s.enabled)
    .sort((a,b) => a.order - b.order);

  const renderSection = (s) => {
    if (!profileData) return null;
    const { record, fields, attachments, notes, activity, formResponses, link: linkData, stageHistory } = profileData;
    switch(s.id) {
      case 'application':   return <ApplicationSection key={s.id} link={{...link, stage_name: steps?.find(st=>st.id===link.stage_id)?.name}} stageHistory={stageHistory}/>;
      case 'summary':       return <SummarySection     key={s.id} data={d}/>;
      case 'experience':    return <ExperienceSection  key={s.id} data={d}/>;
      case 'education':     return <EducationSection   key={s.id} data={d}/>;
      case 'skills':        return <SkillsSection      key={s.id} data={d}/>;
      case 'documents':     return <DocumentsSection   key={s.id} attachments={attachments}/>;
      case 'notes':         return <NotesSection       key={s.id} notes={notes}/>;
      case 'activity':      return <ActivitySection    key={s.id} activity={activity} stageHistory={stageHistory}/>;
      case 'forms':         return <FormsSection       key={s.id} formResponses={formResponses}/>;
      case 'custom_fields': return <CustomFieldsSection key={s.id} fields={fields||[]} data={d} fieldIds={config?.custom_field_ids}/>;
      default: return null;
    }
  };

  const curIdx   = steps?.findIndex(s => s.id === link.stage_id) ?? -1;
  const prevStep = curIdx > 0 ? steps[curIdx-1] : null;
  const nextStep = curIdx < (steps?.length||0)-1 ? steps[curIdx+1] : null;

  const headerFields = config?.header_fields || ['email','phone','location'];

  return ReactDOM.createPortal(
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{ position:'fixed', inset:0, zIndex:9998, background:'rgba(15,23,41,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:F }}>
      <div style={{ width:'100%', maxWidth:1100, height:'90vh', background:'#f8f5ff', borderRadius:20, display:'flex', overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.35)' }}>

        {/* ── Left identity panel ───────────────────────── */}
        <div style={{ width:280, flexShrink:0, background:`linear-gradient(160deg, #4c1d95, #7c3aed)`, display:'flex', flexDirection:'column', padding:24, color:'white', overflowY:'auto' }}>
          {/* Close */}
          <button onClick={onClose} style={{ alignSelf:'flex-end', background:'rgba(255,255,255,.15)', border:'none', borderRadius:8, padding:'5px 8px', cursor:'pointer', color:'white', display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, fontFamily:F, marginBottom:16 }}>
            <Ic n="x" s={13} c="white"/> Close
          </button>
          {/* Avatar */}
          <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(255,255,255,.2)', border:'3px solid rgba(255,255,255,.5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:800, marginBottom:12, letterSpacing:1 }}>
            {initials}
          </div>
          {/* Name + title */}
          <div style={{ fontSize:18, fontWeight:800, lineHeight:1.2, marginBottom:4 }}>{name}</div>
          {d.current_title && <div style={{ fontSize:13, opacity:.85, marginBottom:8 }}>{d.current_title}</div>}
          {/* Match score */}
          {score !== null && (
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.12)', borderRadius:10, padding:'8px 12px', marginBottom:16 }}>
              <ScoreRing score={score}/>
              <div>
                <div style={{ fontSize:12, fontWeight:800 }}>{score}% match</div>
                <div style={{ fontSize:10, opacity:.7 }}>{matchScore?.reasons?.[0]||'AI score'}</div>
              </div>
            </div>
          )}
          {/* Stage */}
          {steps?.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, opacity:.6, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>Current Stage</div>
              <select value={link.stage_id||''} onChange={e=>{const s=steps.find(st=>st.id===e.target.value);if(s&&onMoveStage)onMoveStage(link.id,s);}}
                style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1.5px solid rgba(255,255,255,.3)', background:'rgba(255,255,255,.15)', color:'white', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:F, outline:'none' }}>
                {steps.map(s=><option key={s.id} value={s.id} style={{ color:'#111', background:'white' }}>{s.name}</option>)}
              </select>
              <div style={{ display:'flex', gap:6, marginTop:8 }}>
                <button onClick={()=>prevStep&&onMoveStage&&onMoveStage(link.id,prevStep)} disabled={!prevStep}
                  style={{ flex:1, padding:'5px 0', borderRadius:7, border:'1.5px solid rgba(255,255,255,.25)', background:prevStep?'rgba(255,255,255,.15)':'rgba(255,255,255,.05)', color:prevStep?'white':'rgba(255,255,255,.3)', fontSize:11, fontWeight:600, cursor:prevStep?'pointer':'default', fontFamily:F }}>
                  ‹ Prev
                </button>
                <button onClick={()=>nextStep&&onMoveStage&&onMoveStage(link.id,nextStep)} disabled={!nextStep}
                  style={{ flex:1, padding:'5px 0', borderRadius:7, border:'1.5px solid rgba(255,255,255,.25)', background:nextStep?'rgba(255,255,255,.15)':'rgba(255,255,255,.05)', color:nextStep?'white':'rgba(255,255,255,.3)', fontSize:11, fontWeight:600, cursor:nextStep?'pointer':'default', fontFamily:F }}>
                  Next ›
                </button>
              </div>
            </div>
          )}
          {/* Contact fields */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
            {headerFields.includes('email') && d.email && (
              <a href={`mailto:${d.email}`} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'rgba(255,255,255,.85)', textDecoration:'none' }}>
                <Ic n="mail" s={13} c="rgba(255,255,255,.7)"/>{d.email}
              </a>
            )}
            {headerFields.includes('phone') && (d.phone||d.mobile) && (
              <a href={`tel:${d.phone||d.mobile}`} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'rgba(255,255,255,.85)', textDecoration:'none' }}>
                <Ic n="phone" s={13} c="rgba(255,255,255,.7)"/>{d.phone||d.mobile}
              </a>
            )}
            {headerFields.includes('location') && (d.location||d.city) && (
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'rgba(255,255,255,.85)' }}>
                <Ic n="pin" s={13} c="rgba(255,255,255,.7)"/>{d.location||d.city}
              </div>
            )}
            {headerFields.includes('linkedin') && d.linkedin && (
              <a href={d.linkedin} target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'rgba(255,255,255,.85)', textDecoration:'none' }}>
                <Ic n="linkedin" s={13} c="rgba(255,255,255,.7)"/>LinkedIn Profile
              </a>
            )}
          </div>
          {/* Open full record */}
          {onNavigate && (
            <button onClick={()=>{onNavigate(link.person_record_id);}} style={{ marginTop:'auto', padding:'8px 12px', borderRadius:9, border:'1.5px solid rgba(255,255,255,.3)', background:'rgba(255,255,255,.12)', color:'white', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:F, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Ic n="externalLink" s={13} c="white"/> Open full record
            </button>
          )}
        </div>

        {/* ── Right content panel ───────────────────────── */}
        <div style={{ flex:1, overflowY:'auto', padding:24, display:'flex', flexDirection:'column', gap:0 }}>
          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#7c3aed', fontSize:13 }}>
              Loading profile…
            </div>
          ) : (
            sections.map(s => renderSection(s))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Settings builder (exported for Settings.jsx) ──────────────────────────────
export function TalentProfileBuilder({ environmentId }) {
  const [config, setConfig]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [saved,  setSaved]      = useState(false);
  const [fields, setFields]     = useState([]);
  const dragIdx = useRef(null);

  const SECTION_ICONS = { application:'briefcase', summary:'align', experience:'award', education:'book', skills:'zap', documents:'paperclip', forms:'form', notes:'edit', activity:'activity', custom_fields:'list' };

  useEffect(() => {
    if (!environmentId) return;
    apiClient.get(`/talent-profile/config?environment_id=${environmentId}`).then(setConfig);
    apiClient.get(`/objects?environment_id=${environmentId}`).then(objs => {
      const people = (Array.isArray(objs)?objs:[]).find(o=>o.slug==='people'||o.name?.toLowerCase()==='person');
      if (people) apiClient.get(`/fields?object_id=${people.id}`).then(setFields);
    });
  }, [environmentId]);

  const save = async () => {
    setSaving(true);
    await apiClient.put('/talent-profile/config', { ...config, environment_id: environmentId });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const toggleSection = id => setConfig(c => ({ ...c, sections: c.sections.map(s => s.id===id ? {...s, enabled:!s.enabled} : s) }));
  const toggleField   = id => setConfig(c => { const cur = c.custom_field_ids||[]; return { ...c, custom_field_ids: cur.includes(id) ? cur.filter(x=>x!==id) : [...cur,id] }; });
  const toggleHF      = key => setConfig(c => { const cur = c.header_fields||[]; return { ...c, header_fields: cur.includes(key) ? cur.filter(x=>x!==key) : [...cur,key] }; });

  const onDragStart = i => { dragIdx.current = i; };
  const onDrop      = i => {
    if (dragIdx.current === null || dragIdx.current === i) return;
    setConfig(c => {
      const secs = [...c.sections].sort((a,b)=>a.order-b.order);
      const [moved] = secs.splice(dragIdx.current, 1);
      secs.splice(i, 0, moved);
      return { ...c, sections: secs.map((s,idx) => ({...s, order:idx})) };
    });
    dragIdx.current = null;
  };

  if (!config) return <div style={{ padding:32, color:'#9ca3af', fontSize:13 }}>Loading…</div>;

  const sortedSections = [...config.sections].sort((a,b) => a.order-b.order);
  const hfOpts = ['email','phone','location','linkedin','source'];

  return (
    <div style={{ maxWidth:640, display:'flex', flexDirection:'column', gap:20 }}>
      {/* Sections */}
      <div>
        <div style={{ fontSize:13, fontWeight:800, color:'#374151', marginBottom:8 }}>Profile Sections</div>
        <div style={{ fontSize:12, color:'#9ca3af', marginBottom:12 }}>Drag to reorder · Toggle to show/hide</div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {sortedSections.map((s,i) => (
            <div key={s.id} draggable onDragStart={()=>onDragStart(i)} onDragOver={e=>e.preventDefault()} onDrop={()=>onDrop(i)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, border:`1.5px solid ${s.enabled?'#e9d5ff':'#f3f4f6'}`, background:s.enabled?'white':'#f9fafb', cursor:'grab' }}>
              <span style={{ color:'#d1d5db', fontSize:14, cursor:'grab' }}>⠿</span>
              <Ic n={SECTION_ICONS[s.id]||'list'} s={14} c={s.enabled?PURPLE:'#d1d5db'}/>
              <span style={{ flex:1, fontSize:13, fontWeight:600, color:s.enabled?'#374151':'#9ca3af' }}>{s.label}</span>
              <button onClick={()=>toggleSection(s.id)}
                style={{ width:36, height:20, borderRadius:99, border:'none', cursor:'pointer', background:s.enabled?PURPLE:'#e5e7eb', position:'relative', transition:'background .2s' }}>
                <span style={{ position:'absolute', top:2, left:s.enabled?18:2, width:16, height:16, borderRadius:'50%', background:'white', transition:'left .2s' }}/>
              </button>
            </div>
          ))}
        </div>
      </div>
      {/* Header fields */}
      <div>
        <div style={{ fontSize:13, fontWeight:800, color:'#374151', marginBottom:8 }}>Header Contact Fields</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {hfOpts.map(k => (
            <button key={k} onClick={()=>toggleHF(k)} style={{ padding:'4px 12px', borderRadius:99, border:`1.5px solid ${(config.header_fields||[]).includes(k)?PURPLE:'#e5e7eb'}`, background:(config.header_fields||[]).includes(k)?`${PURPLE}10`:'white', color:(config.header_fields||[]).includes(k)?PURPLE:'#6b7280', fontSize:12, fontWeight:600, cursor:'pointer', textTransform:'capitalize' }}>
              {k.replace('_',' ')}
            </button>
          ))}
        </div>
      </div>
      {/* Custom fields */}
      {fields.length > 0 && (
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:'#374151', marginBottom:4 }}>Profile Fields to show</div>
          <div style={{ fontSize:12, color:'#9ca3af', marginBottom:10 }}>Shown in the "Profile Fields" section</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
            {fields.map(f => {
              const on = (config.custom_field_ids||[]).includes(f.id);
              return (
                <label key={f.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:8, border:`1px solid ${on?'#e9d5ff':'#f3f4f6'}`, background:on?`${PURPLE}06`:'white', cursor:'pointer' }}>
                  <input type="checkbox" checked={on} onChange={()=>toggleField(f.id)} style={{ accentColor:PURPLE, cursor:'pointer' }}/>
                  <span style={{ fontSize:12, color:on?PURPLE:'#6b7280', fontWeight:on?600:400 }}>{f.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
      {/* Save */}
      <button onClick={save} disabled={saving}
        style={{ alignSelf:'flex-start', padding:'9px 22px', borderRadius:9, border:'none', background:saved?'#059669':PURPLE, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
        {saving ? 'Saving…' : saved ? <><Ic n="check" s={13} c="white"/> Saved</> : 'Save configuration'}
      </button>
    </div>
  );
}
