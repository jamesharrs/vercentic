import { useState, useEffect } from 'react'
import FeedbackWidget from './FeedbackWidget.jsx'
import WizardRenderer from './WizardRenderer.jsx'
import { sanitizeInline } from '../sanitize.js'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
         XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const PADDING_MAP = { none:'0px', sm:'24px', md:'56px', lg:'96px', xl:'140px' }

// ─── Lucide SVG icon helper ───────────────────────────────────────────────────
const Icon = ({ path, size=20, color="currentColor", style={} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {path.split('M').filter(Boolean).map((d,i) => <path key={i} d={'M'+d}/>)}
  </svg>
)

const ICONS = {
  briefcase: "20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  lock: "19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  check: "22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3",
  building: "2 20h20M6 20V10l6-6 6 6v10M10 20v-5h4v5",
  arrowLeft: "19 12H5M12 19l-7-7 7-7",
  search: "21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  user: "20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 110 8 4 4 0 010-8z",
  database: "21 5c0 1.1-4 2-9 2s-9-.9-9-2M21 5v14c0 1.1-4 2-9 2s-9-.9-9-2V5",
}

const Tag = ({ children, color }) => (
  <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:99,
    background:`${color}15`, color, border:`1px solid ${color}30` }}>{children}</span>
)

function getButtonStyle(theme) {
  const base = {
    padding: theme.buttonRadius==='999px' ? '10px 28px' : '9px 22px',
    borderRadius: theme.buttonRadius || theme.borderRadius || '8px',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: theme.fontFamily, display: 'inline-block', transition: 'opacity .15s',
  }
  switch (theme.buttonStyle) {
    case 'outline':   return { ...base, background:'transparent', color:theme.primaryColor, border:`2px solid ${theme.primaryColor}` }
    case 'ghost':     return { ...base, background:'transparent', color:theme.primaryColor, border:'none', padding:'9px 4px' }
    case 'underline': return { ...base, background:'transparent', color:theme.primaryColor, border:'none', borderBottom:`2px solid ${theme.primaryColor}`, borderRadius:0, padding:'9px 4px' }
    default:          return { ...base, background:theme.primaryColor, color:'#fff', border:'none' }
  }
}

const ErrorScreen = ({ message }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#FEF2F2', fontFamily:"'Geist', sans-serif" }}>
    <div style={{ textAlign:'center', maxWidth:400, padding:40 }}>
      <Icon path={ICONS.lock} size={56} color="#EF4444" style={{ marginBottom:16 }}/>
      <h2 style={{ margin:'0 0 8px', fontSize:20, fontWeight:800, color:'#0F1729' }}>Portal Unavailable</h2>
      <p style={{ color:'#6B7280', fontSize:14 }}>{message}</p>
    </div>
  </div>
)

const HeroWidget = ({ cfg, theme }) => {
  const t = theme
  const pr = t.primaryColor || '#4361EE'
  const bg = t.bgColor || '#fff'
  const tc = cfg.headingColor || (cfg.videoUrl || (cfg.bgImage && (cfg.overlayOpacity||0) > 20) ? '#FFFFFF' : (t.textColor || '#0F1729'))
  const tcSub = cfg.bodyColor || (cfg.videoUrl || (cfg.bgImage && (cfg.overlayOpacity||0) > 20) ? 'rgba(255,255,255,.8)' : (t.textColor || '#0F1729'))
  const ff = t.fontFamily || "'Inter', sans-serif"
  const hf = t.headingFont || ff
  const br = t.buttonRadius || '8px'
  const hw = parseInt(t.headingWeight) || 700
  const align = cfg.align || 'center'
  const padding = cfg.videoUrl ? '100px 24px' : (cfg.bgImage ? '80px 24px' : '64px 24px')

  return (
    <div style={{
      padding, textAlign: align, position: 'relative', overflow: 'hidden',
      minHeight: cfg.videoUrl ? 420 : 'auto',
      display: cfg.videoUrl ? 'flex' : 'block',
      alignItems: cfg.videoUrl ? 'center' : undefined,
      justifyContent: cfg.videoUrl ? 'center' : undefined,
      background: cfg.videoUrl ? '#0F1729'
        : cfg.bgImage ? `url(${cfg.bgImage}) center/cover no-repeat`
        : `linear-gradient(135deg, ${pr}12, ${t.secondaryColor || pr}08)`,
    }}>
      {cfg.videoUrl && (
        <video autoPlay loop muted playsInline
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit: cfg.videoFit || 'cover', zIndex:0 }}
          src={cfg.videoUrl}/>
      )}
      {cfg.videoUrl && cfg.videoOverlayDarken && (
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1 }}/>
      )}
      {!cfg.videoUrl && cfg.bgImage && (cfg.overlayOpacity||0) > 0 && (
        <div style={{ position:'absolute', inset:0, background:`rgba(0,0,0,${(cfg.overlayOpacity||0)/100})` }}/>
      )}
      <div style={{ position:'relative', zIndex:2, maxWidth: cfg.videoUrl ? '720px' : '800px', margin:'0 auto' }}>
        {cfg.eyebrow && (
          <div style={{ fontSize:13, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color: cfg.videoUrl ? 'rgba(255,255,255,.7)' : pr, marginBottom:12, fontFamily:ff }}>
            {cfg.eyebrow}
          </div>
        )}
        <h2 style={{ fontSize: cfg.videoUrl ? 48 : 36, fontWeight:hw, color:tc, fontFamily:hf, margin:'0 0 16px', lineHeight:1.15 }}>
          {cfg.headline || 'Your Compelling Headline'}
        </h2>
        {cfg.subheading && <p style={{ margin:'0 0 32px', fontSize: cfg.videoUrl ? 20 : 18, color:tcSub, lineHeight:1.6, opacity:0.9 }}>{cfg.subheading}</p>}
        <div style={{ display:'flex', gap:12, justifyContent: align === 'center' ? 'center' : 'flex-start', flexWrap:'wrap' }}>
          {cfg.primaryCta && (
            <a href={cfg.primaryCtaLink||'#'} style={{ display:'inline-block', padding: cfg.videoUrl ? '16px 36px' : '14px 32px', borderRadius:br, background:'#FFFFFF', color:pr, fontWeight:700, fontSize: cfg.videoUrl ? 17 : 16, textDecoration:'none', fontFamily:ff }}>
              {cfg.primaryCta}
            </a>
          )}
          {cfg.secondaryCta && (
            <a href={cfg.secondaryCtaLink||'#'} style={{ display:'inline-block', padding: cfg.videoUrl ? '16px 36px' : '14px 32px', borderRadius:br, background:'transparent', color:tc, fontWeight:700, fontSize: cfg.videoUrl ? 17 : 16, textDecoration:'none', border:`2px solid ${tc}`, fontFamily:ff }}>
              {cfg.secondaryCta}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
// ── Testimonials Widget ──────────────────────────────────────────────────────
const TestimonialsWidget = ({ cfg, theme }) => {
  const [active, setActive] = useState(0);
  const items = cfg.items || [
    { name:'Sarah Chen', role:'Engineering Lead', quote:'The best place I have ever worked. Genuinely supportive culture and amazing growth opportunities.', avatar:'' },
    { name:'Marcus Reed', role:'Product Manager', quote:'I joined as a grad and grew into a leadership role within three years. This company invests in people.', avatar:'' },
    { name:'Priya Nair', role:'Data Scientist', quote:'Flexible working, brilliant colleagues, and meaningful work. I could not ask for more.', avatar:'' },
  ];
  const current = items[active] || {};
  const heading = cfg.heading || 'What our team says';
  const pr = theme.primaryColor || '#3B5BDB';
  const ff = theme.fontFamily || 'inherit';

  return (
    <div style={{ padding:'48px 24px', textAlign:'center', fontFamily:ff }}>
      {heading && <h2 style={{ margin:'0 0 40px', fontSize:28, fontWeight:800, color:theme.textColor||'#0F1729' }}>{heading}</h2>}
      <div style={{ maxWidth:640, margin:'0 auto', position:'relative' }}>
        {/* Quote */}
        <div style={{ fontSize:48, color:pr, lineHeight:1, marginBottom:8, opacity:0.3 }}>"</div>
        <p style={{ fontSize:18, lineHeight:1.7, color:theme.textColor||'#374151', margin:'0 0 28px', minHeight:80 }}>
          {current.quote}
        </p>
        {/* Avatar + name */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
          {current.avatar
            ? <img src={current.avatar} alt={current.name} style={{ width:48, height:48, borderRadius:'50%', objectFit:'cover' }}/>
            : <div style={{ width:48, height:48, borderRadius:'50%', background:pr, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'white' }}>
                {(current.name||'?')[0]}
              </div>
          }
          <div style={{ textAlign:'left' }}>
            <div style={{ fontWeight:700, color:theme.textColor||'#0F1729' }}>{current.name}</div>
            <div style={{ fontSize:13, color:'#6B7280' }}>{current.role}</div>
          </div>
        </div>
        {/* Dots */}
        {items.length > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:28 }}>
            {items.map((_,i) => (
              <button key={i} onClick={()=>setActive(i)} style={{ width:i===active?24:8, height:8, borderRadius:4, border:'none', cursor:'pointer', background:i===active?pr:'#D1D5DB', transition:'all .2s', padding:0 }}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Rich Text Widget ─────────────────────────────────────────────────────────
const RichTextWidget = ({ cfg, theme }) => {
  const ff = theme.fontFamily || 'inherit';
  const tc = theme.textColor  || '#374151';
  const pr = theme.primaryColor || '#3B5BDB';
  // Simple markdown-lite renderer (bold, italic, headings, lists, links)
  const renderMd = (md = '') => {
    if (!md) return null;
    const lines = md.split('\n');
    const elements = [];
    let listItems = [];
    const flushList = () => {
      if (listItems.length) {
        elements.push(<ul key={elements.length} style={{ margin:'0 0 16px', paddingLeft:20 }}>
          {listItems.map((li,i)=><li key={i} style={{ marginBottom:6, lineHeight:1.7 }} dangerouslySetInnerHTML={{ __html:sanitizeInline(li) }}/>)}
        </ul>);
        listItems = [];
      }
    };
    lines.forEach((line, i) => {
      const inline = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[(.+?)\]\((.+?)\)/g, `<a href="$2" style="color:${pr}"  target="_blank" rel="noreferrer">$1</a>`);
      if (/^### (.+)/.test(line)) { flushList(); elements.push(<h3 key={i} style={{ margin:'24px 0 8px', fontSize:18, fontWeight:700, color:tc }}>{line.slice(4)}</h3>); }
      else if (/^## (.+)/.test(line)) { flushList(); elements.push(<h2 key={i} style={{ margin:'32px 0 12px', fontSize:22, fontWeight:800, color:tc }}>{line.slice(3)}</h2>); }
      else if (/^# (.+)/.test(line))  { flushList(); elements.push(<h1 key={i} style={{ margin:'0 0 16px', fontSize:28, fontWeight:800, color:tc }}>{line.slice(2)}</h1>); }
      else if (/^[-*] (.+)/.test(line)) { listItems.push(inline.slice(2)); }
      else if (line.trim()==='') { flushList(); }
      else { flushList(); elements.push(<p key={i} style={{ margin:'0 0 16px', lineHeight:1.75 }} dangerouslySetInnerHTML={{ __html:sanitizeInline(inline) }}/>); }
    });
    flushList();
    return elements;
  };

  const align = cfg.align || 'left';
  return (
    <div style={{ maxWidth: cfg.maxWidth||'800px', margin:'0 auto', padding:'40px 24px', fontFamily:ff, color:tc, textAlign:align }}>
      {cfg.label && <div style={{ fontSize:12, fontWeight:700, color:pr, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>{cfg.label}</div>}
      {renderMd(cfg.content || '## Welcome to our team\n\nWe are a group of passionate people building something meaningful together. **Our culture** is built on trust, growth, and collaboration.\n\nLearn more about what makes us tick below.')}
    </div>
  );
};

// ── Map Embed Widget ─────────────────────────────────────────────────────────
const MapEmbedWidget = ({ cfg }) => {
  if (!cfg.embedUrl && !cfg.address) return (
    <div style={{ height:300, background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8, color:'#6B7280' }}>
      <div style={{ fontSize:32 }}>📍</div>
      <div style={{ fontSize:14 }}>Add an address or Google Maps embed URL in widget settings</div>
    </div>
  );
  const src = cfg.embedUrl ||
    `https://maps.google.com/maps?q=${encodeURIComponent(cfg.address)}&output=embed&z=15`;
  return (
    <div style={{ height: cfg.height || 400, position:'relative' }}>
      <iframe src={src} width="100%" height="100%" style={{ border:'none', display:'block' }}
        loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Office location"/>
    </div>
  );
};

// ── CTA Banner Widget ────────────────────────────────────────────────────────
const CtaBannerWidget = ({ cfg, theme }) => {
  const pr  = theme.primaryColor  || '#3B5BDB';
  const bg  = cfg.bgColor || pr;
  const tc  = cfg.textColor || '#FFFFFF';
  const br  = theme.buttonRadius   || '8px';
  const ff  = theme.fontFamily     || 'inherit';
  return (
    <div style={{ background:bg, padding:'48px 32px', textAlign:'center', fontFamily:ff }}>
      <div style={{ maxWidth:720, margin:'0 auto' }}>
        {cfg.eyebrow && <div style={{ fontSize:12, fontWeight:700, color:`${tc}99`, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>{cfg.eyebrow}</div>}
        <h2 style={{ margin:'0 0 16px', fontSize:clamp(cfg.fontSize||32), fontWeight:800, color:tc, lineHeight:1.2 }}>
          {cfg.heading || "Ready to join our team?"}
        </h2>
        {cfg.subheading && <p style={{ margin:'0 0 32px', fontSize:18, color:`${tc}cc`, lineHeight:1.6 }}>{cfg.subheading}</p>}
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          {cfg.primaryCta && (
            <a href={cfg.primaryCtaLink||'#'} style={{ display:'inline-block', padding:'14px 32px', borderRadius:br, background:'#FFFFFF', color:pr, fontWeight:700, fontSize:16, textDecoration:'none', fontFamily:ff }}>
              {cfg.primaryCta}
            </a>
          )}
          {cfg.secondaryCta && (
            <a href={cfg.secondaryCtaLink||'#'} style={{ display:'inline-block', padding:'14px 32px', borderRadius:br, background:'transparent', color:tc, fontWeight:700, fontSize:16, textDecoration:'none', border:`2px solid ${tc}`, fontFamily:ff }}>
              {cfg.secondaryCta}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
function clamp(n) { return Math.min(Math.max(Number(n)||32, 16), 64); }

const TextWidget = ({ cfg, theme }) => {
  const ff = theme.fontFamily || "'DM Sans', sans-serif";
  const hf = theme.headingFont || ff;
  const hw = parseInt(theme.headingWeight) || 700;
  const tc = theme.textColor || '#1a1a2e';
  return (
    <div style={{ fontFamily:ff, lineHeight:1.7 }}>
      {cfg.heading && <h2 style={{ fontSize:clamp(cfg.headingSize||28), fontWeight:hw, color:tc, fontFamily:hf, margin:'0 0 12px' }}>{cfg.heading}</h2>}
      {cfg.content && <p style={{ fontSize:clamp(cfg.bodySize||16), color:tc, opacity:0.75, margin:0, whiteSpace:'pre-wrap' }}>{cfg.content}</p>}
    </div>
  );
};

const ImageWidget = ({ cfg }) => {
  if (!cfg.url) return <div style={{ background:'#f0f0f5', minHeight:120, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8 }}><span style={{ color:'#9ca3af', fontSize:13 }}>No image</span></div>;
  return (
    <div style={{ borderRadius: cfg.rounded ? 12 : 0, overflow:'hidden' }}>
      <img src={cfg.url} alt={cfg.alt||''} style={{ width:'100%', display:'block', maxHeight: cfg.maxHeight || 'none', objectFit: cfg.fit || 'cover' }}/>
      {cfg.caption && <p style={{ fontSize:13, color:'#6b7280', margin:'8px 0 0', textAlign:'center' }}>{cfg.caption}</p>}
    </div>
  );
};

const StatsWidget = ({ cfg, theme }) => {
  const pr = theme.primaryColor || '#4361EE';
  const ff = theme.fontFamily || "'DM Sans', sans-serif";
  const hf = theme.headingFont || ff;
  const stats = cfg.stats || [{value:'—',label:'Stat'}];
  return (
    <div style={{ display:'flex', gap:32, justifyContent:'center', flexWrap:'wrap', fontFamily:ff, padding:'8px 0' }}>
      {stats.map((s,i) => (
        <div key={i} style={{ textAlign:'center', minWidth:80 }}>
          <div style={{ fontSize:clamp(cfg.valueSize||36), fontWeight:800, color:pr, fontFamily:hf, lineHeight:1.2 }}>{s.value}</div>
          <div style={{ fontSize:clamp(cfg.labelSize||14), color: theme.textColor||'#1a1a2e', opacity:0.6, marginTop:4 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
};

const VideoWidget = ({ cfg }) => {
  if (!cfg.url) return <div style={{ background:'#000', minHeight:200, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8 }}><span style={{ color:'rgba(255,255,255,.5)', fontSize:13 }}>No video URL</span></div>;
  const isYT = /youtu/.test(cfg.url); const isV = /vimeo/.test(cfg.url);
  if (isYT || isV) {
    let eu = cfg.url;
    if (isYT) { const id = cfg.url.match(/(?:v=|\/)([\w-]{11})/)?.[1]; if (id) eu = 'https://www.youtube.com/embed/'+id; }
    if (isV) { const id = cfg.url.match(/vimeo\.com\/(\d+)/)?.[1]; if (id) eu = 'https://player.vimeo.com/video/'+id; }
    return <div style={{ position:'relative', paddingBottom:'56.25%', borderRadius:8, overflow:'hidden' }}><iframe src={eu} style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:'none' }} allow="autoplay; fullscreen" allowFullScreen/></div>;
  }
  return <video src={cfg.url} controls={!cfg.autoplay} autoPlay={!!cfg.autoplay} loop={!!cfg.loop} muted={!!cfg.autoplay} playsInline style={{ width:'100%', borderRadius:8, display:'block' }}/>;
};

const DividerWidget = ({ cfg, theme }) => (
  <div style={{ display:'flex', justifyContent:'center', padding:'4px 0' }}>
    <div style={{ flex:1, maxWidth: cfg.maxWidth || '100%', borderTop: (cfg.thickness||1)+'px '+(cfg.dividerStyle||'solid')+' '+(cfg.color || (theme.primaryColor||'#4361EE')+'30') }}/>
  </div>
);

const SpacerWidget = ({ cfg }) => {
  const MAP = { xs:16, sm:32, md:64, lg:96, xl:128 };
  const px = cfg.height === 'custom' ? (cfg.customHeight || 64) : MAP[cfg.height] ?? (parseInt(cfg.height) || 64);
  return <div style={{ height:px }}/>;
};


const JobsWidget = ({ cfg, theme, portal, api, track, defaultSlug }) => {
  const [records, setRecords] = useState([]);
  const [objMeta, setObjMeta] = useState(null);
  const [objFields, setObjFields] = useState([]);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('all');
  const [location, setLocation] = useState('all');
  const [selected, setSelected] = useState(null);
  const [applying, setApplying] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const ff = theme.fontFamily || "'DM Sans', sans-serif";
  const pr = theme.primaryColor || '#4361EE';
  const tc = theme.textColor || '#1a1a2e';
  const br = theme.borderRadius || '8px';

  useEffect(() => {
    if (!portal?.environment_id) return;
    const load = async () => {
      try {
        const objs = await api.get('/objects?environment_id='+portal.environment_id);
        const obj = cfg.objectId
          ? (Array.isArray(objs)?objs:[]).find(o => o.id === cfg.objectId)
          : (Array.isArray(objs)?objs:[]).find(o => o.slug===(cfg._objectSlug||defaultSlug||'jobs'));
        if (!obj) return;
        setObjMeta({ slug: obj.slug, name: obj.name, plural_name: obj.plural_name });
        try { const flds = await api.get('/fields?object_id='+obj.id); setObjFields(Array.isArray(flds)?flds:[]); } catch(e) {}
        const data = await api.get('/records?object_id='+obj.id+'&environment_id='+portal.environment_id+'&limit='+(cfg.limit||200));
        let all = (data?.records||data||[]);
        if (obj.slug === 'jobs') all = all.filter(r => r.data?.status !== 'Closed' && r.data?.status !== 'Filled');
        if (cfg.savedListId) {
          try {
            const views = await api.get('/saved-views?object_id='+obj.id+'&environment_id='+portal.environment_id);
            const sv = (Array.isArray(views)?views:[]).find(v => v.id === cfg.savedListId);
            if (sv) {
              if (sv.filter_chip) {
                const fc = sv.filter_chip;
                all = all.filter(r => { const v=r.data?.[fc.fieldKey]; if(Array.isArray(v)) return v.some(i=>String(i).toLowerCase()===fc.fieldValue.toLowerCase()); return String(v||'').toLowerCase()===fc.fieldValue.toLowerCase(); });
              }
              if (sv.filters?.length) {
                const fields = await api.get('/fields?object_id='+obj.id);
                const fm = {}; if(Array.isArray(fields)) fields.forEach(f => fm[f.id]=f.api_key);
                all = all.filter(r => sv.filters.every(filt => { const ak=fm[filt.fieldId]||''; const rv=r.data?.[ak]; const op=filt.op,fv=filt.value; if(op==='is empty')return !rv; if(op==='is not empty')return !!rv; const s=String(rv??'').toLowerCase(),sf=String(fv??'').toLowerCase(); if(op==='contains')return s.includes(sf); if(op==='is')return s===sf; if(op==='is not')return s!==sf; return true; }));
              }
            }
          } catch(e) { console.warn('Saved list error:', e); }
        }
        setRecords(all);
      } catch(e) { console.error('Load error:', e); }
    };
    load();
  }, [portal?.environment_id, cfg.objectId, cfg.savedListId, cfg.limit]);

  const isJobs = objMeta?.slug === 'jobs';
  const isPeople = objMeta?.slug === 'people';

  // Listen for vrc:openJob events fired by FeaturedJobsWidget / other widgets
  useEffect(() => {
    if (!isJobs) return;
    const handler = (e) => {
      const job = e.detail;
      if (!job) return;
      // Use the job directly from the event (may not be in filtered view)
      setSelected(job);
    };
    window.addEventListener('vrc:openJob', handler);
    return () => window.removeEventListener('vrc:openJob', handler);
  }, [isJobs]);
  const depts = [...new Set(records.map(r => r.data?.department).filter(Boolean))];
  const locs = [...new Set(records.map(r => r.data?.location).filter(Boolean))];
  const filtered = records.filter(r => {
    const d = r.data || {};
    if (search && !JSON.stringify(d).toLowerCase().includes(search.toLowerCase())) return false;
    if (dept !== 'all' && d.department !== dept) return false;
    if (location !== 'all' && d.location !== location) return false;
    return true;
  });

  const getName = (r) => { const d=r.data||{}; if(isPeople) return [d.first_name,d.last_name].filter(Boolean).join(' ')||d.email||'Unnamed'; return d.job_title||d.name||d.title||d.pool_name||'Record'; };
  const getSub = (r) => { const d=r.data||{}; if(isPeople) return d.current_title||d.department||''; return d.department||d.category||''; };

  // Configurable detail view — uses cfg.detailFields if set
  const renderDetailFields = (d) => {
    const configured = cfg.detailFields?.length > 0;
    const fieldList = configured
      ? cfg.detailFields.map(f => {
          const key = typeof f === 'string' ? f : f.key;
          const label = typeof f === 'string' ? f.replace(/_/g,' ') : f.label;
          const fieldDef = objFields.find(fd => fd.api_key === key);
          return { key, label: label || fieldDef?.name || key, type: fieldDef?.field_type || 'text' };
        })
      : Object.keys(d).filter(k => !['id','created_at','updated_at','deleted_at','object_id','environment_id'].includes(k)).slice(0,12).map(k => {
          const fieldDef = objFields.find(fd => fd.api_key === k);
          return { key: k, label: fieldDef?.name || k.replace(/_/g,' '), type: fieldDef?.field_type || 'text' };
        });
    return (
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12 }}>
        {fieldList.map(f => {
          const v = d[f.key];
          if (v === undefined || v === null || v === '') return null;
          const isLong = f.type === 'textarea' || f.type === 'rich_text' || (typeof v === 'string' && v.length > 120);
          return (
            <div key={f.key} style={{ padding:'10px 0', borderBottom:'1px solid #F1F5F9', ...(isLong ? { gridColumn:'1 / -1' } : {}) }}>
              <div style={{ fontSize:11, fontWeight:600, color:tc, opacity:0.5, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>{f.label}</div>
              <div style={{ fontSize:14, color:tc, lineHeight:1.6, ...(isLong ? { whiteSpace:'pre-wrap' } : {}) }}>
                {Array.isArray(v) ? v.join(', ') : f.type === 'rating' ? '★'.repeat(Number(v)) : String(v)}
              </div>
            </div>
          );
        }).filter(Boolean)}
      </div>
    );
  };

  if (selected && isJobs) {
    const d = selected.data || {};
    return (
      <div style={{ fontFamily:ff }}>
        <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:pr, fontSize:13, fontWeight:600, fontFamily:ff, padding:0, marginBottom:12 }}>← Back</button>
        <h2 style={{ margin:'0 0 6px', fontSize:22, fontWeight:700, color:tc }}>{d.job_title || d.name || 'Untitled'}</h2>
        <div style={{ fontSize:13, color:tc+'99', marginBottom:16 }}>{[d.department, d.location, d.work_type].filter(Boolean).join(' · ')}</div>
        {renderDetailFields(d)}
        <div style={{ marginTop:20 }}>
          {wizardOpen && portal.wizard?.enabled && portal.wizard?.pages?.length ? (
            <WizardRenderer
              wizard={portal.wizard}
              portal={portal}
              job={selected}
              api={api}
              onBack={() => setWizardOpen(false)}
              onSuccess={() => { setWizardOpen(false); setSelected(null); setApplying(true); }}
            />
          ) : applying ? (
            <div style={{ padding:16, background:pr+'08', borderRadius:br, border:'1px solid '+pr+'20' }}>
              <p style={{ margin:'0 0 8px', fontSize:14, fontWeight:600, color:tc }}>Application submitted!</p>
              <p style={{ margin:0, fontSize:13, color:tc+'80' }}>Thank you. We'll be in touch.</p>
            </div>
          ) : (
            <button onClick={() => {
                if(track) track('job_click', { job_id: selected.id, title: d.job_title });
                if (portal.wizard?.enabled && portal.wizard?.pages?.length) {
                  setWizardOpen(true);
                } else {
                  setApplying(true);
                }
              }}
              style={{ padding:'12px 28px', borderRadius:br, background:pr, color:'white', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:ff }}>
              {portal.wizard?.trigger?.apply_label || 'Apply Now'}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (selected && isPeople) {
    const d = selected.data || {};
    return (
      <div style={{ fontFamily:ff }}>
        <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:pr, fontSize:13, fontWeight:600, fontFamily:ff, padding:0, marginBottom:12 }}>← Back</button>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:pr+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, color:pr }}>{getName(selected).split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
          <div>
            <h2 style={{ margin:0, fontSize:22, fontWeight:700, color:tc }}>{getName(selected)}</h2>
            {getSub(selected) && <div style={{ fontSize:14, color:tc+'80', marginTop:4 }}>{getSub(selected)}</div>}
          </div>
        </div>
        {renderDetailFields(d)}
      </div>
    );
  }

  const placeholder = isPeople ? 'Search people...' : 'Search roles...';
  const countLabel = isJobs ? filtered.length+' open position'+(filtered.length!==1?'s':'') : filtered.length+' '+(objMeta?.plural_name||'records').toLowerCase();

  return (
    <div style={{ fontFamily:ff }}>
      <h2 style={{ fontSize:clamp(cfg.headingSize||22), fontWeight:700, color:tc, margin:'0 0 16px', fontFamily:theme.headingFont||ff }}>{cfg.heading || (isPeople ? 'Our Team' : 'Open Positions')}</h2>
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={placeholder} style={{ flex:'1 1 200px', padding:'8px 12px', borderRadius:br, border:'1px solid '+pr+'30', fontSize:13, fontFamily:ff, outline:'none' }}/>
        {depts.length > 1 && <select value={dept} onChange={e=>setDept(e.target.value)} style={{ padding:'8px 12px', borderRadius:br, border:'1px solid '+pr+'30', fontSize:13, fontFamily:ff, background:'white' }}><option value="all">All departments</option>{depts.map(d=><option key={d} value={d}>{d}</option>)}</select>}
        {locs.length > 1 && cfg.showLocationFilter && <select value={location} onChange={e=>setLocation(e.target.value)} style={{ padding:'8px 12px', borderRadius:br, border:'1px solid '+pr+'30', fontSize:13, fontFamily:ff, background:'white' }}><option value="all">All locations</option>{locs.map(l=><option key={l} value={l}>{l}</option>)}</select>}
      </div>
      <div style={{ fontSize:12, color:tc+'80', marginBottom:12 }}>{countLabel}</div>
      {filtered.map(r => {
        const d = r.data || {};
        return (
          <div key={r.id} onClick={()=>setSelected(r)}
            style={{ padding:'12px 16px', borderBottom:'1px solid #f0f0f0', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', transition:'background .1s' }}
            onMouseEnter={e=>e.currentTarget.style.background=pr+'08'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
              {isPeople && <div style={{ width:36, height:36, borderRadius:'50%', background:pr+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:pr, flexShrink:0 }}>{getName(r).split(' ').map(w=>w[0]).join('').slice(0,2)}</div>}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600, color:tc }}>{getName(r)}</div>
                {cfg.listFields?.length > 0 ? (
                  <div style={{ fontSize:12, color:tc+'80', display:'flex', gap:8, flexWrap:'wrap', marginTop:2 }}>
                    {cfg.listFields.slice(0,4).map(f => {
                      const key = typeof f === 'string' ? f : f.key;
                      const v = d[key];
                      if (!v) return null;
                      return <span key={key}>{Array.isArray(v)?v.join(', '):String(v)}</span>;
                    }).filter(Boolean)}
                  </div>
                ) : (
                  <div style={{ fontSize:12, color:tc+'80' }}>{[getSub(r), d.location].filter(Boolean).join(' · ')}</div>
                )}
              </div>
            </div>
            <span style={{ fontSize:12, color:pr, fontWeight:600, flexShrink:0 }}>View →</span>
          </div>
        );
      })}
      {filtered.length === 0 && <div style={{ textAlign:'center', padding:'40px 20px', color:tc+'60', fontSize:14 }}>{cfg.emptyText || 'No records found.'}</div>}
    </div>
  );
};

const TeamWidget = ({ cfg, theme, portal, api }) => {
  const [members, setMembers] = useState([]);
  const ff = theme.fontFamily || "'DM Sans', sans-serif";
  const tc = theme.textColor || '#1a1a2e';
  const pr = theme.primaryColor || '#4361EE';
  useEffect(() => {
    if (!portal?.environment_id) return;
    api.get('/objects?environment_id='+portal.environment_id)
      .then(objs => { const obj = (Array.isArray(objs)?objs:[]).find(o => o.slug==='people'); return obj ? api.get('/records?object_id='+obj.id+'&environment_id='+portal.environment_id+'&limit=50') : null; })
      .then(data => { if (!data) return; setMembers((data?.records||data||[]).filter(r => r.data?.person_type === 'Employee').slice(0, cfg.limit || 12)); })
      .catch(() => {});
  }, [portal?.environment_id]);
  return (
    <div style={{ fontFamily:ff }}>
      <h3 style={{ fontSize:18, fontWeight:700, color:tc, margin:'0 0 16px', fontFamily:theme.headingFont||ff }}>{cfg.heading || 'Meet the Team'}</h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:16 }}>
        {members.map(m => {
          const d = m.data || {};
          const name = [d.first_name, d.last_name].filter(Boolean).join(' ') || 'Team Member';
          const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
          return (
            <div key={m.id} style={{ textAlign:'center' }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:pr+'15', border:'2px solid '+pr+'30', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px', fontSize:18, fontWeight:700, color:pr }}>{initials}</div>
              <div style={{ fontSize:13, fontWeight:600, color:tc }}>{name}</div>
              {d.job_title && <div style={{ fontSize:11, color:tc+'70' }}>{d.job_title}</div>}
            </div>
          );
        })}
        {members.length === 0 && <p style={{ color:tc+'60', fontSize:13, gridColumn:'1 / -1' }}>No team members to display.</p>}
      </div>
    </div>
  );
};

const FormWidget = ({ cfg, theme }) => {
  const [submitted, setSubmitted] = useState(false);
  const ff = theme.fontFamily || "'DM Sans', sans-serif";
  const pr = theme.primaryColor || '#4361EE';
  const tc = theme.textColor || '#1a1a2e';
  const br = theme.borderRadius || '8px';
  if (submitted) return (
    <div style={{ textAlign:'center', padding:'32px 16px', fontFamily:ff }}>
      <div style={{ fontSize:32, marginBottom:8 }}>✓</div>
      <h3 style={{ margin:'0 0 8px', color:tc, fontWeight:700 }}>{cfg.successTitle || 'Thank you!'}</h3>
      <p style={{ margin:0, color:tc+'80', fontSize:14 }}>{cfg.successMessage || "We've received your submission."}</p>
    </div>
  );
  return (
    <div style={{ fontFamily:ff }}>
      <h3 style={{ fontSize:18, fontWeight:700, color:tc, margin:'0 0 16px', fontFamily:theme.headingFont||ff }}>{cfg.title || 'Get in Touch'}</h3>
      {(cfg.fields || ['Name','Email','Message']).map((f, i) => {
        const label = typeof f === 'string' ? f : f.label;
        const type = typeof f === 'string' ? (f.toLowerCase() === 'email' ? 'email' : f.toLowerCase() === 'message' ? 'textarea' : 'text') : f.type;
        return (
          <div key={i} style={{ marginBottom:12 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:tc+'90', marginBottom:4 }}>{label}</label>
            {type === 'textarea'
              ? <textarea rows={3} style={{ width:'100%', padding:'8px 12px', borderRadius:br, border:'1px solid '+pr+'25', fontSize:13, fontFamily:ff, resize:'vertical', boxSizing:'border-box' }}/>
              : <input type={type||'text'} style={{ width:'100%', padding:'8px 12px', borderRadius:br, border:'1px solid '+pr+'25', fontSize:13, fontFamily:ff, boxSizing:'border-box' }}/>
            }
          </div>
        );
      })}
      <button onClick={() => setSubmitted(true)} style={{ padding:'10px 24px', borderRadius:br, background:pr, color:'white', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:ff, marginTop:4 }}>
        {cfg.submitText || 'Submit'}
      </button>
    </div>
  );
};

const MultistepFormWidget = ({ cfg, theme, portal, api, track }) => {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const ff = theme.fontFamily || "'DM Sans', sans-serif";
  const pr = theme.primaryColor || '#4361EE';
  const tc = theme.textColor || '#1a1a2e';
  const br = theme.borderRadius || '8px';
  const steps = cfg.steps || [{ title:'Step 1', fields:[{ id:'name', type:'text', label:'Name', required:true }] }];
  const current = steps[step] || steps[0];
  if (submitted) return (
    <div style={{ textAlign:'center', padding:'32px 16px', fontFamily:ff }}>
      <div style={{ width:48, height:48, borderRadius:'50%', background:pr+'15', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}><span style={{ fontSize:24, color:pr }}>✓</span></div>
      <h3 style={{ margin:'0 0 8px', color:tc, fontWeight:700 }}>{cfg.successTitle || 'Application Submitted!'}</h3>
      <p style={{ margin:0, color:tc+'80', fontSize:14 }}>{cfg.successMessage || "Thank you! We'll be in touch."}</p>
    </div>
  );
  const setValue = (id, v) => setValues(prev => ({ ...prev, [id]: v }));
  return (
    <div style={{ fontFamily:ff }}>
      {cfg.formTitle && <h3 style={{ fontSize:18, fontWeight:700, color:tc, margin:'0 0 16px' }}>{cfg.formTitle}</h3>}
      <div style={{ display:'flex', gap:4, marginBottom:20 }}>
        {steps.map((s, i) => (<div key={i} style={{ flex:1, height:4, borderRadius:2, background: i <= step ? pr : pr+'20', transition:'background .2s' }}/>))}
      </div>
      <div style={{ fontSize:11, color:tc+'60', marginBottom:6 }}>Step {step+1} of {steps.length}</div>
      <h4 style={{ fontSize:15, fontWeight:600, color:tc, margin:'0 0 14px' }}>{current.title}</h4>
      {(current.fields || []).map(f => (
        <div key={f.id} style={{ marginBottom:12 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:tc+'90', marginBottom:4 }}>{f.label}{f.required && <span style={{ color:'#ef4444' }}> *</span>}</label>
          {f.type === 'textarea'
            ? <textarea value={values[f.id]||''} onChange={e => setValue(f.id, e.target.value)} placeholder={f.placeholder} rows={3} style={{ width:'100%', padding:'8px 12px', borderRadius:br, border:'1px solid '+pr+'25', fontSize:13, fontFamily:ff, resize:'vertical', boxSizing:'border-box' }}/>
            : f.type === 'select' || f.type === 'radio'
              ? <select value={values[f.id]||''} onChange={e => setValue(f.id, e.target.value)} style={{ width:'100%', padding:'8px 12px', borderRadius:br, border:'1px solid '+pr+'25', fontSize:13, fontFamily:ff, background:'white', boxSizing:'border-box' }}>
                  <option value="">Select...</option>
                  {(f.options||'').split(',').map(o => o.trim()).filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              : <input type={f.type||'text'} value={values[f.id]||''} onChange={e => setValue(f.id, e.target.value)} placeholder={f.placeholder} style={{ width:'100%', padding:'8px 12px', borderRadius:br, border:'1px solid '+pr+'25', fontSize:13, fontFamily:ff, boxSizing:'border-box' }}/>
          }
        </div>
      ))}
      <div style={{ display:'flex', gap:8, marginTop:16 }}>
        {step > 0 && <button onClick={() => setStep(s => s-1)} style={{ padding:'10px 20px', borderRadius:br, border:'1px solid '+pr+'30', background:'white', color:tc, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:ff }}>← Back</button>}
        <button onClick={() => { if (step < steps.length-1) { setStep(s => s+1); } else { setSubmitted(true); if (track) track('form_complete', { form: cfg.formTitle }); } }}
          style={{ flex:1, padding:'10px 20px', borderRadius:br, border:'none', background:pr, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:ff }}>
          {step < steps.length-1 ? 'Next →' : (cfg.submitText || 'Submit')}
        </button>
      </div>
    </div>
  );
};


// ── Saved Jobs helpers (localStorage) ────────────────────────────────────────
const useSavedJobs = () => {
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vrc_saved_jobs') || '[]') } catch { return [] }
  })
  const toggle = (id) => setSaved(prev => {
    const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    localStorage.setItem('vrc_saved_jobs', JSON.stringify(next))
    return next
  })
  return { saved, toggle, isSaved: id => saved.includes(id) }
}

// ── Department Grid Widget ────────────────────────────────────────────────────
const DeptGridWidget = ({ cfg, theme, portal, api }) => {
  const [depts,    setDepts]    = useState([])
  const [counts,   setCounts]   = useState({})
  const [loading,  setLoading]  = useState(true)
  const pr  = theme.primaryColor || '#3B5BDB'
  const ff  = theme.fontFamily   || 'inherit'
  const br  = theme.buttonRadius || '12px'
  const tc  = theme.textColor    || '#0F1729'

  useEffect(() => {
    if (!portal?.environment_id) { setLoading(false); return }
    api.get(`/objects?environment_id=${portal.environment_id}`)
      .then(objs => {
        const obj = (Array.isArray(objs) ? objs : []).find(o => o.slug === 'jobs')
        if (!obj) { setLoading(false); return null }
        return api.get(`/records?object_id=${obj.id}&environment_id=${portal.environment_id}&limit=500`)
      })
      .then(data => {
        if (!data) return
        const jobs = (data?.records || data || []).filter(r =>
          r.data?.status !== 'Closed' && r.data?.status !== 'Filled'
        )
        if (cfg.categories?.length) {
          setDepts(cfg.categories)
          const cnt = {}
          cfg.categories.forEach(cat => { cnt[cat.label] = jobs.filter(j => (j.data?.department||'')=== cat.label).length })
          setCounts(cnt)
        } else {
          const deptMap = {}
          jobs.forEach(j => { const d = j.data?.department||'Other'; deptMap[d]=(deptMap[d]||0)+1 })
          setDepts(Object.keys(deptMap).sort().map(d => ({ label:d, color:pr })))
          setCounts(deptMap)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [portal?.environment_id])

  const DEPT_ICONS = {
    Technology:  'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    Engineering: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    Sales:       'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
    Marketing:   'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
    Finance:     'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    HR:          'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    Product:     'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    Operations:  'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  }
  const getIcon = label => DEPT_ICONS[label] || 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
  const cols = cfg.columns || 4
  const heading = cfg.heading || 'Explore by department'

  if (loading) return <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
    <div style={{ width:32, height:32, border:`3px solid ${pr}30`, borderTop:`3px solid ${pr}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
  </div>

  return (
    <div style={{ fontFamily:ff }}>
      {heading && <h2 style={{ margin:'0 0 28px', fontSize:28, fontWeight:800, color:tc, textAlign:cfg.align||'center', letterSpacing:'-0.5px' }}>{heading}</h2>}
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(cols, depts.length||1)}, 1fr)`, gap:12 }}>
        {depts.map((dept, i) => {
          const label = dept.label || dept
          const count = counts[label] || 0
          const color = dept.color || pr
          return (
            <a key={i}
              href={`?dept=${encodeURIComponent(label)}`}
              onClick={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('vrc:filterJobs', { detail: { dept: label } })); const el=document.getElementById('vrc-jobs-section'); if(el) el.scrollIntoView({ behavior:'smooth' }) }}
              style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:10, padding:'20px', borderRadius:br, background:'white', border:`1.5px solid ${color}22`, textDecoration:'none', cursor:'pointer', transition:'all .18s', boxShadow:'0 1px 4px rgba(0,0,0,.05)' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 8px 24px ${color}20`; e.currentTarget.style.borderColor=color }}
              onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.05)'; e.currentTarget.style.borderColor=`${color}22` }}
            >
              <div style={{ width:44, height:44, borderRadius:10, background:`${color}12`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={getIcon(label)}/></svg>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:tc, marginBottom:4 }}>{label}</div>
                {count > 0 ? <div style={{ fontSize:12, color, fontWeight:600 }}>{count} open role{count!==1?'s':''}</div>
                  : <div style={{ fontSize:12, color:'#9CA3AF' }}>No open roles</div>}
              </div>
              <div style={{ marginTop:'auto', display:'flex', alignItems:'center', gap:4, fontSize:12, color, fontWeight:600 }}>
                View roles <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}

// ── Benefits Grid Widget ──────────────────────────────────────────────────────
const BenefitsGridWidget = ({ cfg, theme }) => {
  const pr = theme.primaryColor || '#3B5BDB'
  const tc = theme.textColor    || '#0F1729'
  const ff = theme.fontFamily   || 'inherit'
  const br = theme.buttonRadius || '12px'
  const DEFAULTS = [
    { icon:'💰', title:'Competitive salary', body:'Market-leading pay with performance bonus and annual review.' },
    { icon:'🏥', title:'Private medical', body:'Full family cover with dental and optical add-on options.' },
    { icon:'📆', title:'33 days holiday', body:'25 days plus bank holidays, with the option to buy or sell 5 more.' },
    { icon:'🏠', title:'Hybrid working', body:'Flexible home/office split designed around you and your team.' },
    { icon:'📈', title:'Pension scheme', body:'We match your contribution up to 8.5% and add an extra 2.5%.' },
    { icon:'🎓', title:'Learning & development', body:'Dedicated budget for courses, conferences and certifications.' },
  ]
  const items  = cfg.items?.length ? cfg.items : DEFAULTS
  const cols   = cfg.columns || 3
  const layout = cfg.layout  || 'card'
  const heading = cfg.heading || 'Why join us?'
  const sub    = cfg.subheading || ''
  return (
    <div style={{ fontFamily:ff }}>
      {heading && <h2 style={{ margin:'0 0 8px', fontSize:32, fontWeight:800, color:tc, textAlign:'center', letterSpacing:'-0.5px' }}>{heading}</h2>}
      {sub && <p style={{ margin:'0 0 40px', fontSize:17, color:'#6B7280', textAlign:'center', maxWidth:600, marginLeft:'auto', marginRight:'auto' }}>{sub}</p>}
      {!sub && heading && <div style={{ marginBottom:40 }}/>}
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:20 }}>
        {items.map((item, i) => layout === 'icon-left' ? (
          <div key={i} style={{ display:'flex', gap:16, padding:'20px', borderRadius:br, background:'#FAFAFA', border:'1px solid #F3F4F6' }}>
            <div style={{ fontSize:28, flexShrink:0 }}>{item.icon}</div>
            <div><div style={{ fontSize:14, fontWeight:700, color:tc, marginBottom:6 }}>{item.title}</div><div style={{ fontSize:13, color:'#6B7280', lineHeight:1.6 }}>{item.body}</div></div>
          </div>
        ) : layout === 'minimal' ? (
          <div key={i} style={{ padding:'24px 0', borderTop:`2px solid ${pr}20` }}>
            <div style={{ fontSize:24, marginBottom:10 }}>{item.icon}</div>
            <div style={{ fontSize:15, fontWeight:700, color:tc, marginBottom:6 }}>{item.title}</div>
            <div style={{ fontSize:13, color:'#6B7280', lineHeight:1.6 }}>{item.body}</div>
          </div>
        ) : (
          <div key={i} style={{ padding:'28px 24px', borderRadius:br, background:'white', border:'1.5px solid #F3F4F6', boxShadow:'0 2px 8px rgba(0,0,0,.04)', display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:`${pr}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>{item.icon}</div>
            <div style={{ fontSize:15, fontWeight:700, color:tc }}>{item.title}</div>
            <div style={{ fontSize:13, color:'#6B7280', lineHeight:1.65, flex:1 }}>{item.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── FAQ Accordion Widget ──────────────────────────────────────────────────────
const FaqWidget = ({ cfg, theme }) => {
  const [open, setOpen] = useState(null)
  const pr = theme.primaryColor || '#3B5BDB'
  const tc = theme.textColor    || '#0F1729'
  const ff = theme.fontFamily   || 'inherit'
  const DEFAULTS = [
    { q:'How long does the recruitment process take?', a:'Typically 2–4 weeks from application to offer, depending on the role. We aim to keep you informed at every stage.' },
    { q:'Can I apply for more than one role at a time?', a:'Yes — you can apply for multiple roles simultaneously. Each application is reviewed independently.' },
    { q:'Do you offer visa sponsorship?', a:'We assess sponsorship on a role-by-role basis. Check the job description or reach out to our recruitment team for specific roles.' },
    { q:'Is there a chance to work remotely?', a:'Many of our roles offer hybrid or fully remote working. The working arrangement is specified in each job posting.' },
    { q:'I was unsuccessful — can I apply again?', a:'Absolutely. We encourage candidates to reapply after six months if they have the experience for a new opening.' },
  ]
  const items   = cfg.items?.length ? cfg.items : DEFAULTS
  const heading = cfg.heading || 'Frequently asked questions'
  return (
    <div style={{ fontFamily:ff, maxWidth:760, margin:'0 auto' }}>
      {heading && <h2 style={{ margin:'0 0 32px', fontSize:28, fontWeight:800, color:tc, textAlign:cfg.align||'left', letterSpacing:'-0.3px' }}>{heading}</h2>}
      <div style={{ display:'flex', flexDirection:'column' }}>
        {items.map((item, i) => {
          const isOpen = open === i
          return (
            <div key={i} style={{ borderBottom:'1px solid #F3F4F6' }}>
              <button onClick={() => setOpen(isOpen ? null : i)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, padding:'20px 0', background:'none', border:'none', cursor:'pointer', textAlign:'left', fontFamily:ff }}>
                <span style={{ fontSize:15, fontWeight:600, color:tc, lineHeight:1.4 }}>{item.q}</span>
                <div style={{ width:24, height:24, borderRadius:'50%', background:isOpen ? pr : '#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .2s' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isOpen ? 'white' : '#6B7280'} strokeWidth="2.5" style={{ transform:isOpen ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </button>
              {isOpen && <div style={{ padding:'0 40px 20px 0', fontSize:14, color:'#6B7280', lineHeight:1.7 }}>{item.a}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Featured / Latest Jobs Strip ──────────────────────────────────────────────
const FeaturedJobsWidget = ({ cfg, theme, portal, api }) => {
  const [jobs,        setJobs]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [selectedJob, setSelectedJob] = useState(null)
  const [wizardOpen,  setWizardOpen]  = useState(false)
  const [applied,     setApplied]     = useState(false)
  const { saved, toggle, isSaved } = useSavedJobs()
  const pr = theme.primaryColor || '#3B5BDB'
  const tc = theme.textColor    || '#0F1729'
  const ff = theme.fontFamily   || 'inherit'
  const br = theme.buttonRadius || '12px'

  useEffect(() => {
    if (!portal?.environment_id) { setLoading(false); return }
    api.get(`/objects?environment_id=${portal.environment_id}`)
      .then(objs => {
        const obj = (Array.isArray(objs)?objs:[]).find(o => o.slug==='jobs')
        if (!obj) { setLoading(false); return null }
        return api.get(`/records?object_id=${obj.id}&environment_id=${portal.environment_id}&limit=100`)
      })
      .then(data => {
        if (!data) return
        let all = (data?.records||data||[]).filter(r => r.data?.status!=='Closed' && r.data?.status!=='Filled')

        // Manual selection mode — show only pinned job IDs in the configured order
        if (cfg.selectionMode === 'manual' && cfg.pinnedJobIds?.length) {
          const pinned = cfg.pinnedJobIds
          all = pinned.map(id => all.find(j => j.id === id)).filter(Boolean)
        } else {
          // Auto mode — filter by dept, sort by newest, slice
          if (cfg.department) all = all.filter(j => j.data?.department === cfg.department)
          all.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
          all = all.slice(0, cfg.limit || 5)
        }

        setJobs(all)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [portal?.environment_id, cfg.selectionMode, cfg.pinnedJobIds?.join(','), cfg.department, cfg.limit])

  const fmtDate = d => {
    if (!d) return ''
    const diff = Math.floor((Date.now() - new Date(d)) / 86400000)
    if (diff < 1) return 'Today'
    if (diff === 1) return '1 day ago'
    if (diff < 7) return `${diff} days ago`
    if (diff < 30) return `${Math.floor(diff/7)} wk${Math.floor(diff/7)>1?'s':''} ago`
    return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short' })
  }

  const heading = cfg.heading || 'Latest opportunities'
  const layout  = cfg.layout  || 'cards'

  if (loading) return <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:28, height:28, border:`3px solid ${pr}30`, borderTop:`3px solid ${pr}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/></div>

  // Job detail view
  if (selectedJob) {
    const d = selectedJob.data || {}
    return (
      <div style={{ fontFamily:ff }}>
        <button onClick={() => { setSelectedJob(null); setWizardOpen(false); setApplied(false); }}
          style={{ background:'none', border:'none', cursor:'pointer', color:pr, fontSize:13, fontWeight:600, fontFamily:ff, padding:0, marginBottom:16 }}>
          ← {heading || 'Back'}
        </button>
        <h2 style={{ margin:'0 0 6px', fontSize:22, fontWeight:700, color:tc }}>{d.job_title || 'Untitled role'}</h2>
        <div style={{ fontSize:13, color:tc+'99', marginBottom:20 }}>{[d.department, d.location, d.work_type].filter(Boolean).join(' · ')}</div>
        {d.description && <p style={{ fontSize:14, color:tc, lineHeight:1.7, marginBottom:20 }}>{d.description}</p>}
        {d.salary_range && <div style={{ fontSize:13, fontWeight:600, color:pr, marginBottom:16 }}>{d.salary_range}</div>}
        <div style={{ marginTop:8 }}>
          {wizardOpen && portal.wizard?.enabled && portal.wizard?.pages?.length ? (
            <WizardRenderer wizard={portal.wizard} portal={portal} job={selectedJob} api={api}
              onBack={() => setWizardOpen(false)}
              onSuccess={() => { setWizardOpen(false); setSelectedJob(null); setApplied(true); }}/>
          ) : applied ? (
            <div style={{ padding:16, background:pr+'10', borderRadius:br, border:`1px solid ${pr}30` }}>
              <p style={{ margin:'0 0 4px', fontSize:14, fontWeight:600, color:tc }}>Application submitted!</p>
              <p style={{ margin:0, fontSize:13, color:tc+'80' }}>Thank you — we'll be in touch.</p>
            </div>
          ) : (
            <button onClick={() => portal.wizard?.enabled && portal.wizard?.pages?.length ? setWizardOpen(true) : setApplied(true)}
              style={{ padding:'12px 28px', borderRadius:br, background:pr, color:'white', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:ff }}>
              {portal.wizard?.trigger?.apply_label || 'Apply Now'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily:ff }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        {heading && <h2 style={{ margin:0, fontSize:26, fontWeight:800, color:tc, letterSpacing:'-0.3px' }}>{heading}</h2>}
        <a href={cfg.viewAllHref||'#'} style={{ fontSize:14, fontWeight:600, color:pr, textDecoration:'none', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          {cfg.viewAllText||'View all jobs'} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={pr} strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>
      {layout === 'list' ? (
        <div style={{ display:'flex', flexDirection:'column' }}>
          {jobs.map((job, i) => (
            <a key={job.id||i} onClick={e => { e.preventDefault(); setSelectedJob(job); }} href="#"
              style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 0', borderBottom:'1px solid #F3F4F6', textDecoration:'none', cursor:'pointer' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:tc, marginBottom:4 }}>{job.data?.job_title||'Untitled role'}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {[job.data?.department, job.data?.location, job.data?.work_type].filter(Boolean).map((t,ti)=><span key={ti} style={{ fontSize:12, color:'#6B7280' }}>{ti>0?'· ':''}{t}</span>)}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                <span style={{ fontSize:11, color:'#9CA3AF' }}>{fmtDate(job.created_at)}</span>
                <span style={{ fontSize:11, fontWeight:600, color:'white', background:pr, padding:'3px 10px', borderRadius:20 }}>{job.data?.employment_type||'Permanent'}</span>
                <button onClick={e=>{ e.preventDefault(); e.stopPropagation(); toggle(job.id) }} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved(job.id)?pr:'none'} stroke={isSaved(job.id)?pr:'#9CA3AF'} strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                </button>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
          {jobs.map((job, i) => (
            <div key={job.id||i} style={{ background:'white', borderRadius:br, border:'1.5px solid #F3F4F6', padding:'20px', cursor:'pointer', transition:'all .15s', boxShadow:'0 1px 4px rgba(0,0,0,.04)', display:'flex', flexDirection:'column', gap:12 }}
              onClick={() => setSelectedJob(job)}
              onMouseEnter={e=>{ e.currentTarget.style.boxShadow=`0 8px 24px ${pr}16`; e.currentTarget.style.borderColor=`${pr}40`; e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e=>{ e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.04)'; e.currentTarget.style.borderColor='#F3F4F6'; e.currentTarget.style.transform='none' }}
            >
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                <div style={{ fontSize:15, fontWeight:700, color:tc, lineHeight:1.4 }}>{job.data?.job_title||'Untitled role'}</div>
                <button onClick={e=>{ e.stopPropagation(); toggle(job.id) }} style={{ background:'none', border:'none', cursor:'pointer', padding:2, flexShrink:0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved(job.id)?pr:'none'} stroke={isSaved(job.id)?pr:'#9CA3AF'} strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                </button>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {[job.data?.department, job.data?.location, job.data?.work_type].filter(Boolean).map((tag,ti)=><span key={ti} style={{ fontSize:11, fontWeight:600, color:'#6B7280', background:'#F3F4F6', padding:'3px 8px', borderRadius:20 }}>{tag}</span>)}
              </div>
              {job.data?.advertising_salary && <div style={{ fontSize:13, fontWeight:600, color:pr }}>{job.data.advertising_salary}</div>}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto', paddingTop:8, borderTop:'1px solid #F9FAFB' }}>
                <span style={{ fontSize:11, color:'#9CA3AF' }}>{fmtDate(job.created_at)}</span>
                <span style={{ fontSize:11, fontWeight:700, color:pr }}>Apply →</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {jobs.length===0 && !loading && <div style={{ textAlign:'center', padding:'48px 24px', color:'#9CA3AF' }}><div style={{ fontSize:40, marginBottom:12 }}>🔍</div><div style={{ fontWeight:600 }}>No open roles right now</div><div style={{ fontSize:13, marginTop:6 }}>Check back soon or sign up for job alerts</div></div>}
    </div>
  )
}

// ── Trust Bar / Stats Strip ───────────────────────────────────────────────────
const TrustBarWidget = ({ cfg, theme }) => {
  const pr = theme.primaryColor || '#3B5BDB'
  const tc = theme.textColor    || '#0F1729'
  const ff = theme.fontFamily   || 'inherit'
  const bg = cfg.bgColor || '#FAFAFA'
  const DEFAULTS = [
    { value:'500+', label:'Employees' }, { value:'15', label:'Office locations' },
    { value:'8', label:'Countries' }, { value:'20+', label:'Years in business' }, { value:'4.3★', label:'Glassdoor rating' },
  ]
  const items  = cfg.items?.length ? cfg.items : DEFAULTS
  const layout = cfg.layout || 'centered'
  return (
    <div style={{ background:bg, padding:'32px 24px', fontFamily:ff, borderTop:'1px solid #F3F4F6', borderBottom:'1px solid #F3F4F6' }}>
      <div style={{ maxWidth:960, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:layout==='spread'?'space-between':'center', flexWrap:'wrap', gap:layout==='cards'?16:40 }}>
        {layout === 'cards' ? (
          items.map((item, i) => (
            <div key={i} style={{ flex:'1 1 120px', textAlign:'center', background:'white', borderRadius:12, padding:'20px 16px', border:'1px solid #F3F4F6', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
              <div style={{ fontSize:28, fontWeight:900, color:pr, letterSpacing:'-1px' }}>{item.value}</div>
              <div style={{ fontSize:12, color:'#6B7280', marginTop:4 }}>{item.label}</div>
            </div>
          ))
        ) : items.map((item, i) => (
          <div key={i} style={{ textAlign:'center' }}>
            <div style={{ fontSize:28, fontWeight:900, color:pr, letterSpacing:'-1px' }}>{item.value}</div>
            <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Job Alerts Widget ────────────────────────────────────────────────────────
const JobAlertsWidget = ({ cfg, theme, portal, api, track }) => {
  const [email, setEmail] = useState('')
  const [keywords, setKeywords] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pr = theme.primaryColor || '#3B5BDB'
  const tc = theme.textColor    || '#0F1729'
  const ff = theme.fontFamily   || 'inherit'
  const br = theme.buttonRadius || '8px'
  const heading = cfg.heading || 'Never miss an opportunity'
  const sub     = cfg.subheading || 'Get notified when new roles matching your interests are posted.'
  const layout  = cfg.layout || 'inline'

  const handleSubmit = async e => {
    e.preventDefault()
    if (!email) { setError('Please enter your email address'); return }
    setLoading(true)
    try {
      await api.post('/portals/job-alerts', { portal_id: portal?.id, environment_id: portal?.environment_id, email, keywords })
      setSubmitted(true)
      if (track) track('job_alert_signup', { email })
    } catch { setError('Something went wrong. Please try again.') }
    setLoading(false)
  }

  if (submitted) return (
    <div style={{ textAlign:'center', padding:'48px 24px', fontFamily:ff }}>
      <div style={{ width:56, height:56, borderRadius:'50%', background:`${pr}12`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={pr} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
      <h3 style={{ margin:'0 0 8px', fontSize:20, fontWeight:800, color:tc }}>{cfg.successTitle||"You're on the list!"}</h3>
      <p style={{ margin:0, color:'#6B7280', fontSize:14 }}>{cfg.successBody||"We'll email you when new matching roles are posted."}</p>
    </div>
  )

  const inp = { padding:'11px 14px', borderRadius:br, border:'1.5px solid #E5E7EB', fontSize:14, fontFamily:ff, outline:'none', background:'white', width:'100%', boxSizing:'border-box' }
  return (
    <div style={{ fontFamily:ff, textAlign:layout==='card'?'center':'left' }}>
      {heading && <h2 style={{ margin:'0 0 8px', fontSize:26, fontWeight:800, color:tc, letterSpacing:'-0.3px' }}>{heading}</h2>}
      {sub && <p style={{ margin:'0 0 24px', fontSize:15, color:'#6B7280', lineHeight:1.6 }}>{sub}</p>}
      <form onSubmit={handleSubmit}>
        {layout==='inline' ? (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="your@email.com" required style={{ ...inp, flex:'1 1 200px' }}/>
            {cfg.showKeywords && <input value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="Keywords (optional)" style={{ ...inp, flex:'1 1 160px' }}/>}
            <button type="submit" disabled={loading} style={{ padding:'11px 24px', borderRadius:br, background:pr, color:'white', border:'none', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:ff, flexShrink:0, opacity:loading?0.7:1 }}>{loading?'Setting up…':(cfg.buttonText||'Get alerts')}</button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12, maxWidth:400, margin:layout==='card'?'0 auto':'0' }}>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="your@email.com" required style={inp}/>
            {cfg.showKeywords && <input value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="Job title or keywords" style={inp}/>}
            <button type="submit" disabled={loading} style={{ padding:'12px', borderRadius:br, background:pr, color:'white', border:'none', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:ff, opacity:loading?0.7:1 }}>{loading?'Setting up…':(cfg.buttonText||'Set up job alert')}</button>
          </div>
        )}
        {error && <p style={{ margin:'8px 0 0', fontSize:12, color:'#EF4444' }}>{error}</p>}
      </form>
      {cfg.gdprNote && <p style={{ margin:'12px 0 0', fontSize:11, color:'#9CA3AF', lineHeight:1.5 }}>{cfg.gdprNote}</p>}
    </div>
  )
}

// ── Image Gallery Widget ──────────────────────────────────────────────────────
const ImageGalleryWidget = ({ cfg, theme }) => {
  const [lightbox, setLightbox] = useState(null)
  const pr = theme.primaryColor || '#3B5BDB'
  const ff = theme.fontFamily   || 'inherit'
  const br = theme.buttonRadius || '12px'
  const DEFAULTS = [
    { src:'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80', caption:'Our open plan workspace' },
    { src:'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80', caption:'Weekly team catch-up' },
    { src:'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&q=80', caption:'Friday team lunches' },
    { src:'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=600&q=80', caption:'Bright collaborative spaces' },
    { src:'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&q=80', caption:'Design and strategy sessions' },
    { src:'https://images.unsplash.com/photo-1576267423048-15c0040fec78?w=600&q=80', caption:'Annual company day' },
  ]
  const items   = cfg.items?.length ? cfg.items : DEFAULTS
  const cols    = cfg.columns || 3
  const heading = cfg.heading || ''

  return (
    <div style={{ fontFamily:ff }}>
      {heading && <h2 style={{ margin:'0 0 24px', fontSize:26, fontWeight:800, color:theme.textColor||'#0F1729', textAlign:cfg.align||'left' }}>{heading}</h2>}
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:12 }}>
        {items.map((img, i) => (
          <div key={i} style={{ position:'relative', overflow:'hidden', borderRadius:br, cursor:'pointer', aspectRatio:'4/3' }}
            onClick={() => setLightbox(i)}>
            <img src={img.src} alt={img.alt||''} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transition:'transform .3s' }}
              onMouseEnter={e=>e.target.style.transform='scale(1.05)'} onMouseLeave={e=>e.target.style.transform='scale(1)'}/>
            {img.caption && <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'20px 12px 10px', background:'linear-gradient(0deg, rgba(0,0,0,.5) 0%, transparent 100%)', opacity:0, transition:'opacity .2s' }}
              onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0'}>
              <span style={{ fontSize:12, color:'white', fontWeight:500 }}>{img.caption}</span>
            </div>}
          </div>
        ))}
      </div>
      {lightbox !== null && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,.92)', display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setLightbox(null)}>
          <button onClick={e=>{ e.stopPropagation(); setLightbox(l => Math.max(0,l-1)) }} style={{ position:'absolute', left:20, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,.15)', border:'none', borderRadius:'50%', width:44, height:44, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div style={{ maxWidth:'85vw', maxHeight:'85vh' }} onClick={e=>e.stopPropagation()}>
            <img src={items[lightbox]?.src} alt="" style={{ maxWidth:'100%', maxHeight:'80vh', objectFit:'contain', borderRadius:8 }}/>
            {items[lightbox]?.caption && <div style={{ color:'rgba(255,255,255,.7)', textAlign:'center', marginTop:12, fontSize:13 }}>{items[lightbox].caption}</div>}
          </div>
          <button onClick={e=>{ e.stopPropagation(); setLightbox(l => Math.min(items.length-1,l+1)) }} style={{ position:'absolute', right:20, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,.15)', border:'none', borderRadius:'50%', width:44, height:44, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg>
          </button>
          <button onClick={() => setLightbox(null)} style={{ position:'absolute', right:16, top:16, background:'rgba(255,255,255,.15)', border:'none', borderRadius:'50%', width:36, height:36, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Application Status Tracker ────────────────────────────────────────────────
const AppStatusWidget = ({ cfg, theme, portal, api }) => {
  const [email, setEmail]     = useState('')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [searched, setSearched] = useState(false)
  const pr = theme.primaryColor || '#3B5BDB'
  const tc = theme.textColor    || '#0F1729'
  const ff = theme.fontFamily   || 'inherit'
  const br = theme.buttonRadius || '8px'
  const STATUS_COLORS = { Submitted:'#3B5BDB', 'Under review':'#F59F00', Shortlisted:'#1098AD', Interview:'#7048E8', Offered:'#2F9E44', Declined:'#E03131' }

  const handleSearch = async e => {
    e.preventDefault()
    if (!email) { setError('Please enter your email address'); return }
    setLoading(true); setError('')
    try {
      const data = await api.get(`/portals/application-status?portal_id=${portal?.id}&email=${encodeURIComponent(email)}`)
      setResult(data); setSearched(true)
    } catch { setError('No applications found for this email address.'); setResult(null); setSearched(true) }
    setLoading(false)
  }

  const inp = { padding:'11px 14px', borderRadius:br, border:'1.5px solid #E5E7EB', fontSize:14, fontFamily:ff, outline:'none', background:'white', width:'100%', boxSizing:'border-box' }
  return (
    <div style={{ fontFamily:ff, maxWidth:560 }}>
      <h2 style={{ margin:'0 0 8px', fontSize:24, fontWeight:800, color:tc }}>{cfg.heading||'Track your application'}</h2>
      <p style={{ margin:'0 0 24px', fontSize:14, color:'#6B7280', lineHeight:1.6 }}>{cfg.subheading||'Enter your email address to check the status of your application.'}</p>
      <form onSubmit={handleSearch} style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="your@email.com" required style={inp}/>
        <button type="submit" disabled={loading} style={{ padding:'12px', borderRadius:br, background:pr, color:'white', border:'none', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:ff, opacity:loading?0.7:1 }}>{loading?'Searching…':'Check status'}</button>
      </form>
      {error && <p style={{ margin:'12px 0 0', fontSize:13, color:'#EF4444' }}>{error}</p>}
      {searched && result?.applications?.length > 0 && (
        <div style={{ marginTop:24, display:'flex', flexDirection:'column', gap:12 }}>
          {result.applications.map((app, i) => {
            const status = app.status || 'Submitted'
            const color  = STATUS_COLORS[status] || pr
            return (
              <div key={i} style={{ background:'white', borderRadius:12, border:`1.5px solid ${color}22`, padding:'16px 20px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:tc, marginBottom:4 }}>{app.job_title||'Application'}</div>
                    {app.applied_at && <div style={{ fontSize:12, color:'#9CA3AF' }}>Applied {new Date(app.applied_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</div>}
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:'white', background:color, padding:'4px 10px', borderRadius:20, flexShrink:0 }}>{status}</span>
                </div>
                {app.message && <p style={{ margin:'12px 0 0', fontSize:13, color:'#374151', lineHeight:1.6, background:'#F9FAFB', borderRadius:8, padding:'10px 12px' }}>{app.message}</p>}
              </div>
            )
          })}
        </div>
      )}
      {searched && !result?.applications?.length && <div style={{ marginTop:16, fontSize:13, color:'#6B7280', padding:'16px', background:'#F9FAFB', borderRadius:8 }}>No applications found. Please check your email and try again.</div>}
    </div>
  )
}

// ── Saved Jobs Widget ────────────────────────────────────────────────────────
const SavedJobsWidget = ({ cfg, theme, portal, api }) => {
  const { saved, toggle } = useSavedJobs()
  const [jobs,    setJobs]    = useState([])
  const [loading, setLoading] = useState(true)
  const pr = theme.primaryColor || '#3B5BDB'
  const tc = theme.textColor    || '#0F1729'
  const ff = theme.fontFamily   || 'inherit'
  const br = theme.buttonRadius || '12px'

  useEffect(() => {
    if (!saved.length || !portal?.environment_id) { setLoading(false); return }
    api.get(`/objects?environment_id=${portal.environment_id}`)
      .then(objs => {
        const obj = (Array.isArray(objs)?objs:[]).find(o => o.slug==='jobs')
        if (!obj) { setLoading(false); return null }
        return api.get(`/records?object_id=${obj.id}&environment_id=${portal.environment_id}&limit=500`)
      })
      .then(data => {
        if (!data) { setLoading(false); return }
        setJobs((data?.records||data||[]).filter(j => saved.includes(j.id)))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [JSON.stringify(saved)])

  if (!saved.length) return (
    <div style={{ textAlign:'center', padding:'48px 24px', fontFamily:ff }}>
      <div style={{ width:56, height:56, borderRadius:'50%', background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
      </div>
      <h3 style={{ margin:'0 0 8px', fontSize:18, fontWeight:700, color:tc }}>No saved jobs yet</h3>
      <p style={{ margin:0, fontSize:13, color:'#6B7280' }}>Click the bookmark icon on any job to save it here.</p>
    </div>
  )

  return (
    <div style={{ fontFamily:ff }}>
      <h2 style={{ margin:'0 0 20px', fontSize:24, fontWeight:800, color:tc }}>{cfg.heading||'Your saved jobs'} <span style={{ fontSize:16, fontWeight:600, color:pr }}>({saved.length})</span></h2>
      {loading ? <div style={{ height:100, display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:24, height:24, border:`3px solid ${pr}30`, borderTop:`3px solid ${pr}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/></div>
        : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {jobs.map((job, i) => (
              <div key={job.id||i} style={{ background:'white', borderRadius:br, border:'1.5px solid #F3F4F6', padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:tc, marginBottom:4 }}>{job.data?.job_title||'Untitled role'}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>{[job.data?.department, job.data?.location].filter(Boolean).map((t,ti)=><span key={ti} style={{ fontSize:12, color:'#6B7280' }}>{t}</span>)}</div>
                </div>
                <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                  <button onClick={() => window.dispatchEvent(new CustomEvent('vrc:openJob', { detail: job }))} style={{ padding:'8px 16px', borderRadius:br, background:pr, color:'white', border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:ff }}>View</button>
                  <button onClick={() => toggle(job.id)} style={{ padding:'8px', borderRadius:br, background:'#FEF2F2', border:'1px solid #FECACA', cursor:'pointer', display:'flex', alignItems:'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>}
    </div>
  )
}

// ── Tabs Widget ───────────────────────────────────────────────────────────────
const TabsWidget = ({ cfg, theme }) => {
  const [active, setActive] = useState(0)
  const pr = theme.primaryColor || '#3B5BDB'
  const tc = theme.textColor    || '#0F1729'
  const ff = theme.fontFamily   || 'inherit'
  const DEFAULTS = [
    { label:'Our culture', content:'We believe in trust, flexibility, and genuine teamwork. Our culture has been built around enabling people to do the best work of their careers.' },
    { label:'Growth & learning', content:'Every employee receives a dedicated learning budget and access to our internal learning platform. We support certifications, conferences, and online courses.' },
    { label:'Diversity & inclusion', content:'We are committed to building a team that reflects the world around us. Our colleague networks champion representation and create spaces for everyone.' },
  ]
  const tabs  = cfg.tabs?.length ? cfg.tabs : DEFAULTS
  const style = cfg.tabStyle || 'underline'
  return (
    <div style={{ fontFamily:ff }}>
      <div style={{ display:'flex', gap:style==='pill'?8:0, borderBottom:style!=='pill'?'2px solid #F3F4F6':'none', background:style==='boxed'?'#F9FAFB':'transparent', borderRadius:style==='pill'?12:0, padding:style==='pill'?4:0 }}>
        {tabs.map((tab, i) => {
          const isActive = active === i
          const label = tab.title || tab.label || `Tab ${i+1}`
          return (
            <button key={i} onClick={() => setActive(i)} style={{ padding:'12px 20px', border:'none', cursor:'pointer', fontFamily:ff, fontSize:14, fontWeight:isActive?700:500, background:((style==='pill'||style==='boxed')&&isActive)?'white':'transparent', color:isActive?pr:'#6B7280', borderBottom:style==='underline'?`2px solid ${isActive?pr:'transparent'}`:'none', borderRadius:(style==='pill'||style==='boxed')?8:0, marginBottom:style==='underline'?-2:0, boxShadow:((style==='pill'||style==='boxed')&&isActive)?'0 1px 4px rgba(0,0,0,.08)':'none', transition:'all .15s' }}>{label}</button>
          )
        })}
      </div>
      <div style={{ padding:'24px 0', fontSize:15, color:'#374151', lineHeight:1.75 }}>{tabs[active]?.content}</div>
    </div>
  )
}


// ── Files / Docs Widget ───────────────────────────────────────────────────────
// Displays attachments for a record identified via URL params or explicit config.
// Supports inline PDF preview + image lightbox. No admin auth required —
// the /api/attachments endpoint is public (files are served by filename hash).
const FilesWidget = ({ cfg, theme, portal, api }) => {
  const [files, setFiles]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [preview, setPreview]   = useState(null)  // { url, name, ext }
  const c = { primary: theme?.primaryColor||'#4361EE', text:'#0F1729', muted:'#6B7280', border:'#E8ECF8', bg:'#F8F9FF' }

  // Resolve the record ID from URL params
  const getRecordId = () => {
    const params = new URLSearchParams(window.location.search)
    const paramName = cfg.record_id_param || 'person_id'
    return params.get(paramName) || params.get('rid') || params.get('record_id') || params.get('candidate_id') || null
  }

  useEffect(() => {
    const rid = getRecordId()
    if (!rid) { setLoading(false); return }
    api.get(`/attachments?record_id=${rid}`)
      .then(data => {
        let items = Array.isArray(data) ? data : []
        // Filter by configured file types if specified
        const types = (cfg.file_types || []).map(t => t.toLowerCase())
        if (types.length > 0) {
          items = items.filter(f => types.some(t => (f.file_type_name||'').toLowerCase().includes(t)))
        }
        // Only show files with actual URLs (real uploads)
        items = items.filter(f => f.url && f.url !== '#')
        setFiles(items)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const extOf = (att) => (att.ext || att.name?.split('.').pop() || '').toLowerCase()
  const isImage = (att) => ['jpg','jpeg','png','gif','webp','bmp','svg'].includes(extOf(att))
  const isPdf   = (att) => extOf(att) === 'pdf'
  const iconFor = (att) => {
    if (isImage(att)) return '🖼️'
    if (isPdf(att))   return '📄'
    const e = extOf(att)
    if (['doc','docx'].includes(e)) return '📝'
    if (['xls','xlsx'].includes(e)) return '📊'
    if (['zip','rar'].includes(e))  return '🗜️'
    return '📁'
  }
  const fmtSize = (b) => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : b > 1024 ? `${Math.round(b/1024)} KB` : b ? `${b} B` : ''

  if (loading) return null

  if (!getRecordId()) return (
    <div style={{ padding:'32px 20px', textAlign:'center', color:c.muted, fontSize:14 }}>
      {cfg.hide_when_empty ? null : (cfg.empty_text || 'No documents available.')}
    </div>
  )

  if (files.length === 0 && cfg.hide_when_empty) return null

  return (
    <div style={{ fontFamily: theme?.fontFamily || "'DM Sans', sans-serif" }}>
      {cfg.heading && (
        <h3 style={{ margin:'0 0 20px', fontSize:20, fontWeight:700, color:c.text }}>{cfg.heading}</h3>
      )}

      {files.length === 0 ? (
        <div style={{ padding:'32px 20px', textAlign:'center', color:c.muted, fontSize:14,
          background:c.bg, borderRadius:12, border:`1px dashed ${c.border}` }}>
          {cfg.empty_text || 'No documents available.'}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {files.map(att => (
            <div key={att.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
              background:'#fff', borderRadius:12, border:`1.5px solid ${c.border}`,
              boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
              {/* Icon */}
              <div style={{ width:40, height:40, borderRadius:10, background:`${c.primary}12`,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                fontSize:20, cursor: cfg.allow_preview!==false ? 'pointer' : 'default' }}
                onClick={() => cfg.allow_preview!==false && setPreview(att)}
                title={cfg.allow_preview!==false ? 'Click to preview' : undefined}>
                {iconFor(att)}
              </div>

              {/* Name + meta */}
              <div style={{ flex:1, minWidth:0 }}>
                <div onClick={() => cfg.allow_preview!==false && setPreview(att)}
                  style={{ fontSize:14, fontWeight:600, color: cfg.allow_preview!==false ? c.primary : c.text,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                    cursor: cfg.allow_preview!==false ? 'pointer' : 'default',
                    textDecoration: cfg.allow_preview!==false ? 'underline' : 'none',
                    textDecorationColor:`${c.primary}40` }}>
                  {att.name}
                </div>
                <div style={{ fontSize:11, color:c.muted, marginTop:2, display:'flex', gap:8, alignItems:'center' }}>
                  {att.file_type_name && (
                    <span style={{ padding:'1px 6px', borderRadius:4, background:`${c.primary}14`,
                      color:c.primary, fontWeight:600, fontSize:10 }}>{att.file_type_name}</span>
                  )}
                  {fmtSize(att.size) && <span>{fmtSize(att.size)}</span>}
                  <span>{new Date(att.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                {cfg.allow_preview!==false && (
                  <button onClick={() => setPreview(att)}
                    title="Preview"
                    style={{ background:'none', border:`1px solid ${c.border}`, borderRadius:8,
                      cursor:'pointer', padding:'6px 10px', color:c.primary, fontSize:12, fontWeight:600,
                      fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Preview
                  </button>
                )}
                {cfg.allow_download!==false && (
                  <a href={att.url} download={att.name} target="_blank" rel="noreferrer"
                    style={{ background:c.primary, border:'none', borderRadius:8,
                      cursor:'pointer', padding:'6px 10px', color:'#fff', fontSize:12, fontWeight:600,
                      fontFamily:'inherit', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline Preview Modal */}
      {preview && (
        <div onClick={()=>setPreview(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:9999,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <div onClick={e=>e.stopPropagation()}
            style={{ background:'#fff', borderRadius:16, overflow:'hidden',
              display:'flex', flexDirection:'column',
              width: isImage(preview) ? 'auto' : '92vw',
              maxWidth: isImage(preview) ? '92vw' : 860,
              maxHeight:'90vh', boxShadow:'0 32px 80px rgba(0,0,0,0.4)' }}>
            {/* Preview header */}
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
              borderBottom:'1px solid #E8ECF8', flexShrink:0 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#0F1729',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{preview.name}</div>
                <div style={{ fontSize:11, color:'#9CA3AF', marginTop:1 }}>
                  {[preview.file_type_name, fmtSize(preview.size)].filter(Boolean).join(' · ')}
                </div>
              </div>
              {cfg.allow_download!==false && (
                <a href={preview.url} download={preview.name}
                  style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #E8ECF8',
                    color:'#374151', fontSize:12, fontWeight:600, textDecoration:'none',
                    display:'flex', alignItems:'center', gap:4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download
                </a>
              )}
              <button onClick={()=>setPreview(null)}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:20,
                  color:'#9CA3AF', padding:'4px 8px', lineHeight:1 }}>✕</button>
            </div>
            {/* Preview body */}
            <div style={{ flex:1, overflow:'auto', minHeight:0,
              background: isImage(preview) ? '#1a1a2e' : '#F8F9FF',
              display:'flex', alignItems: isImage(preview) ? 'center' : 'stretch',
              justifyContent: isImage(preview) ? 'center' : 'stretch' }}>
              {isImage(preview) ? (
                <img src={preview.url} alt={preview.name}
                  style={{ maxWidth:'100%', maxHeight:'80vh', objectFit:'contain', display:'block' }}/>
              ) : isPdf(preview) ? (
                <iframe src={preview.url} title={preview.name}
                  style={{ width:'100%', height:'75vh', border:'none', display:'block' }}/>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
                  justifyContent:'center', padding:48, gap:16, textAlign:'center' }}>
                  <div style={{ fontSize:48 }}>{iconFor(preview)}</div>
                  <div style={{ fontSize:14, color:'#4B5675' }}>
                    {extOf(preview).toUpperCase()} files cannot be previewed in the browser.
                  </div>
                  {cfg.allow_download!==false && (
                    <a href={preview.url} download={preview.name}
                      style={{ padding:'10px 20px', borderRadius:10, background:c.primary, color:'#fff',
                        fontSize:13, fontWeight:700, textDecoration:'none' }}>
                      Download file
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const ContentWidget = ({ cfg, theme }) => {
  const F = theme.fontFamily||"'DM Sans',sans-serif"
  const accent = theme.primaryColor||'#4361EE'
  const cards = cfg.cards||[]
  return (
    <div style={{ fontFamily:F }}>
      {cfg.heading && <h2 style={{ margin:'0 0 12px', fontSize:'1.5rem', fontWeight:800, color:'inherit', lineHeight:1.25 }}>{cfg.heading}</h2>}
      {cfg.body && <div style={{ margin:'0 0 16px', fontSize:'0.95rem', lineHeight:1.7, opacity:0.85, whiteSpace:'pre-wrap' }}>{cfg.body}</div>}
      {cards.length>0 && (
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(cards.length,3)},1fr)`, gap:12, margin:'16px 0' }}>
          {cards.map((card,i)=>(
            <div key={i} style={{ padding:'14px 16px', background:'rgba(255,255,255,0.08)', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)' }}>
              {card.icon && <div style={{ fontSize:'1.25rem', marginBottom:6 }}>{card.icon==='check'?'✓':card.icon==='user'?'👤':card.icon==='star'?'★':card.icon==='plus'?'+':'•'}</div>}
              {card.title && <div style={{ fontWeight:700, fontSize:'0.9rem', marginBottom:4 }}>{card.title}</div>}
              {card.desc && <div style={{ fontSize:'0.82rem', opacity:0.75, lineHeight:1.5 }}>{card.desc}</div>}
            </div>
          ))}
        </div>
      )}
      {cfg.buttonText && (
        <a href={cfg.buttonLink||'#'} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'10px 20px', borderRadius:8, background:accent, color:'#fff', textDecoration:'none', fontSize:'0.9rem', fontWeight:700, marginTop:8 }}>
          {cfg.buttonText} →
        </a>
      )}
    </div>
  )
}

const AccordionWidget = ({ cfg, theme }) => {
  const [open, setOpen] = React.useState(null)
  const F = theme.fontFamily||"'DM Sans',sans-serif"
  const items = cfg.items||[]
  return (
    <div style={{ fontFamily:F }}>
      {cfg.heading && <h2 style={{ margin:'0 0 20px', fontSize:'1.4rem', fontWeight:800, color:'inherit' }}>{cfg.heading}</h2>}
      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        {items.map((item,i)=>(
          <div key={i} style={{ borderRadius:8, overflow:'hidden', border:'1px solid rgba(0,0,0,0.08)' }}>
            <button onClick={()=>setOpen(open===i?null:i)} style={{ width:'100%', textAlign:'left', padding:'13px 16px', background:open===i?theme.primaryColor||'#4361EE':'rgba(255,255,255,0.6)', color:open===i?'#fff':'inherit', border:'none', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:F, fontSize:'0.9rem', fontWeight:600 }}>
              {item.title}
              <span style={{ transform:open===i?'rotate(180deg)':'none', transition:'transform .2s', fontSize:'0.75rem' }}>▼</span>
            </button>
            {open===i && <div style={{ padding:'12px 16px', background:'rgba(255,255,255,0.95)', fontSize:'0.875rem', lineHeight:1.65, color:'#374151', borderTop:'1px solid rgba(0,0,0,0.06)', whiteSpace:'pre-wrap' }}>{item.content}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

const CtaWidget = ({ cfg, theme }) => {
  const F = theme.fontFamily||"'DM Sans',sans-serif"
  const accent = theme.primaryColor||'#4361EE'
  const isDark = cfg.style==='dark'
  const isAccent = cfg.style==='accent'
  const bg = isDark?'#0F1729':isAccent?accent:'transparent'
  const textCol = (isDark||isAccent)?'#fff':'inherit'
  const btnBg = isDark?accent:isAccent?'#fff':accent
  const btnTxt = isDark?'#fff':isAccent?accent:'#fff'
  return (
    <div style={{ textAlign:'center', padding:'24px 16px', background:bg, borderRadius:10, fontFamily:F }}>
      {cfg.heading && <h2 style={{ margin:'0 0 10px', fontSize:'1.75rem', fontWeight:800, color:textCol, lineHeight:1.2 }}>{cfg.heading}</h2>}
      {cfg.subheading && <p style={{ margin:'0 0 20px', fontSize:'1rem', opacity:0.8, color:textCol, lineHeight:1.55 }}>{cfg.subheading}</p>}
      {cfg.buttonText && (
        <a href={cfg.buttonLink||'#'} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'12px 28px', borderRadius:9, background:btnBg, color:btnTxt, textDecoration:'none', fontSize:'0.95rem', fontWeight:700 }}>
          {cfg.buttonText} →
        </a>
      )}
    </div>
  )
}

const CHART_COLORS = ['#4361EE','#7C3AED','#0891B2','#059669','#D97706','#DC2626','#EC4899','#64748B']

const HMPortalWidget = ({ cfg, theme, portal, api }) => {
  const [records,    setRecords]    = useState([]);
  const [fields,     setFields]     = useState([]);   // all object fields
  const [listCols,   setListCols]   = useState([]);   // ordered visible fields from saved list
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);
  const [search,     setSearch]     = useState('');
  const ff = theme.fontFamily || "'DM Sans', sans-serif";
  const pr = cfg.accent_color || theme.primaryColor || '#4361EE';
  const tc = theme.textColor || '#1a1a2e';

  const recordTitle = (r) => {
    const d = r.data || {};
    return [d.first_name, d.last_name].filter(Boolean).join(' ') || d.job_title || d.name || d.title || d.pool_name || 'Record';
  };

  useEffect(() => {
    if (!portal?.environment_id || !cfg.object_id) { setLoading(false); return; }
    const load = async () => {
      try {
        // 1. Load fields (best-effort — don't fail if unavailable)
        let allFields = [];
        try {
          const flds = await api.get(`/fields?object_id=${cfg.object_id}`);
          allFields = Array.isArray(flds) ? flds : [];
        } catch(e) {}
        setFields(allFields);

        // 2. Load saved list config (best-effort)
        let savedList = null;
        if (cfg.list_id) {
          try { savedList = await api.get(`/saved-views/${cfg.list_id}`); } catch(e) {}
        }

        // 3. Resolve visible columns
        if (savedList?.visible_field_ids?.length && allFields.length) {
          const ordered = savedList.visible_field_ids
            .map(id => allFields.find(f => f.id === id || f.api_key === id))
            .filter(Boolean);
          setListCols(ordered.length ? ordered : allFields.filter(f => f.show_in_list).slice(0, 5));
        } else if (allFields.length) {
          setListCols(allFields.filter(f => f.show_in_list).slice(0, 5));
        }

        // 4. Fetch records
        let url = `/records?object_id=${cfg.object_id}&environment_id=${portal.environment_id}&limit=200`;
        if (savedList?.sort_by) url += `&sort_by=${encodeURIComponent(savedList.sort_by)}&sort_dir=${savedList.sort_dir||'asc'}`;
        // Apply filter_chip — skip $me tokens (no user session in portal context)
        if (savedList?.filter_chip) {
          const fv = savedList.filter_chip.fieldValue;
          if (fv && fv !== '$me') {
            url += `&filter_key=${encodeURIComponent(savedList.filter_chip.fieldKey)}&filter_value=${encodeURIComponent(fv)}`;
          }
        }

        const data = await api.get(url);
        let all = Array.isArray(data) ? data : (data?.records || []);

        // 5. Apply advanced filters (best-effort)
        if (savedList?.filters?.length && allFields.length) {
          try {
            const fm = {};
            allFields.forEach(f => { fm[f.id] = f.api_key; fm[f.api_key] = f.api_key; });
            all = all.filter(r => savedList.filters.every(filt => {
              // Skip $me filters — can't resolve without a user session in portal context
              if (String(filt.value ?? '') === '$me') return true;
              // Support both filt.field and filt.fieldId (different saved list formats)
              const ak = fm[filt.fieldId] || fm[filt.field] || filt.fieldId || filt.field || '';
              const rv = r.data?.[ak];
              const op = filt.op || filt.operator || 'contains';
              const fv = String(filt.value ?? '').toLowerCase();
              const sv = String(rv ?? '').toLowerCase();
              if (op === 'is empty')     return !rv;
              if (op === 'is not empty') return !!rv;
              if (op === 'contains')     return sv.includes(fv);
              if (op === 'is')           return sv === fv;
              if (op === 'is not')       return sv !== fv;
              if (op === '>') return parseFloat(rv) > parseFloat(filt.value);
              if (op === '<') return parseFloat(rv) < parseFloat(filt.value);
              if (op === 'includes') { const arr=Array.isArray(rv)?rv:[rv].filter(Boolean).map(String); return arr.some(v=>v.toLowerCase()===fv); }
              return true;
            }));
          } catch(e) {}
        }

        setRecords(all);
      } catch(e) {
        console.error('HMPortalWidget load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [portal?.environment_id, cfg.object_id, cfg.list_id]);

  const ctaButtons = cfg.cta_buttons || [];
  const displayMode = cfg.display_mode || 'card';
  const [sortCol, setSortCol] = useState(null);  // api_key
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (apiKey) => {
    if (sortCol === apiKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(apiKey); setSortDir('asc'); }
  };

  const sorted = [...records].sort((a, b) => {
    if (!sortCol) return 0;
    const av = String(a.data?.[sortCol] ?? '').toLowerCase();
    const bv = String(b.data?.[sortCol] ?? '').toLowerCase();
    const n = !isNaN(av) && !isNaN(bv);
    const cmp = n ? Number(av) - Number(bv) : av.localeCompare(bv);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const filtered = search ? sorted.filter(r => JSON.stringify(r.data||{}).toLowerCase().includes(search.toLowerCase())) : sorted;

  const handleAction = async (action, record) => {
    if (action === 'submit_feedback') { setModal({ type:'feedback', record }); return; }
    if (action === 'move_stage')      { setModal({ type:'move_stage', record }); return; }
    if (action === 'view_profile')    { window.open(`/people/${record.id}`, '_blank'); return; }
    const patchFn = api.patch || ((p, b) => api.post ? api.post(p, { ...b, _method:'PATCH' }) : Promise.resolve());
    if (action === 'approve_offer') {
      await patchFn(`/records/${record.id}`, { data:{ status:'Approved' } }).catch(()=>{});
      setRecords(rs => rs.map(r => r.id===record.id ? {...r, data:{...r.data, status:'Approved'}} : r));
    }
    if (action === 'reject') {
      await patchFn(`/records/${record.id}`, { data:{ status:'Rejected' } }).catch(()=>{});
      setRecords(rs => rs.map(r => r.id===record.id ? {...r, data:{...r.data, status:'Rejected'}} : r));
    }
  };

  const RecordCard = ({ record }) => {
    const d = record.data || {};
    const name = recordTitle(record);
    const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    // Use listCols for extra fields, excluding the title field to avoid duplication
    const extraCols = listCols.filter(f => !['first_name','last_name','job_title','name','title','pool_name'].includes(f.api_key));
    return (
      <div style={{ background:'#fff', borderRadius:14, border:'1.5px solid #E8ECF8', padding:'16px 18px', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: (ctaButtons.length || extraCols.length) ? 12 : 0 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:`${pr}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:14, fontWeight:700, color:pr, fontFamily:ff }}>{initials}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:700, color:tc, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:ff }}>{name}</div>
            {extraCols.slice(0,2).map(f => {
              const val = d[f.api_key];
              if (!val && val !== 0) return null;
              return <div key={f.id} style={{ fontSize:12, color:'#9DA8C7', marginTop:2, fontFamily:ff }}>{Array.isArray(val) ? val.join(', ') : String(val)}</div>;
            })}
          </div>
          {d.status && <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:99, background:`${pr}14`, color:pr }}>{d.status}</span>}
        </div>
        {/* Additional columns as chips */}
        {extraCols.slice(2).some(f => d[f.api_key]) && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:ctaButtons.length?10:0 }}>
            {extraCols.slice(2).map(f => {
              const val = d[f.api_key];
              if (!val && val !== 0) return null;
              return <span key={f.id} style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'#F3F4F6', color:'#374151', fontFamily:ff }}>{f.name}: {Array.isArray(val)?val.join(', '):String(val)}</span>;
            })}
          </div>
        )}
        {ctaButtons.length > 0 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {ctaButtons.map((btn,i) => (
              <button key={i} onClick={() => handleAction(btn.action, record)} style={{
                padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer',
                background: pr, color:'white', fontSize:11, fontWeight:700, fontFamily:ff
              }}>{btn.label || btn.action}</button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!cfg.object_id) return (
    <div style={{ padding:32, textAlign:'center', color:'#9DA8C7', fontFamily:ff }}>
      No data source configured for this widget.
    </div>
  );

  return (
    <div style={{ padding:'16px 0' }}>
      {/* Header */}
      {(cfg.widget_title || filtered.length > 0) && (
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          {cfg.widget_title && <div style={{ fontSize:18, fontWeight:800, color:tc, flex:1, fontFamily:ff }}>{cfg.widget_title}</div>}
          {!loading && <span style={{ fontSize:12, color:'#9DA8C7', fontFamily:ff }}>{filtered.length} record{filtered.length!==1?'s':''}</span>}
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
            style={{ padding:'6px 12px', borderRadius:8, border:'1.5px solid #E8ECF8', fontSize:12, fontFamily:ff, outline:'none', width:140 }}/>
        </div>
      )}

      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:'#9DA8C7', fontFamily:ff }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding:40, textAlign:'center', color:'#9DA8C7', fontFamily:ff }}>{cfg.empty_message || 'No records to show'}</div>
      ) : displayMode === 'table' ? (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:ff }}>
            <thead>
              <tr style={{ background:'#F8F9FF', borderBottom:'1.5px solid #E8ECF8' }}>
                {listCols.map(f => {
                  const active = sortCol === f.api_key;
                  return (
                    <th key={f.id} onClick={() => handleSort(f.api_key)}
                      style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700,
                        color: active ? pr : '#9DA8C7', whiteSpace:'nowrap', cursor:'pointer',
                        userSelect:'none', transition:'color .1s' }}>
                      {f.name.toUpperCase()}{' '}{active ? (sortDir === 'asc' ? '↑' : '↓') : <span style={{opacity:.35}}>↕</span>}
                    </th>
                  );
                })}
                {ctaButtons.length > 0 && <th style={{ padding:'10px 16px' }}/>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const d = r.data || {};
                return (
                  <tr key={r.id} style={{ borderBottom:'1px solid #F3F4F6' }}>
                    {listCols.map(f => {
                      const val = d[f.api_key];
                      const display = !val && val !== 0
                        ? <span style={{ color:'#D1D5DB' }}>—</span>
                        : f.api_key === 'status'
                          ? <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:99, background:`${pr}14`, color:pr }}>{val}</span>
                          : Array.isArray(val) ? val.join(', ') : String(val);
                      return (
                        <td key={f.id} style={{ padding:'12px 16px', fontSize:13, color:tc, verticalAlign:'middle' }}>
                          {display}
                        </td>
                      );
                    })}
                    {ctaButtons.length > 0 && (
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ display:'flex', gap:6 }}>
                          {ctaButtons.map((btn,i) => (
                            <button key={i} onClick={() => handleAction(btn.action, r)} style={{
                              padding:'5px 10px', borderRadius:7, border:'none', cursor:'pointer',
                              background:pr, color:'white', fontSize:11, fontWeight:700, fontFamily:ff
                            }}>{btn.label||btn.action}</button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        filtered.map(r => <RecordCard key={r.id} record={r}/>)
      )}

      {/* Feedback modal */}
      {modal?.type === 'feedback' && (
        <div onClick={()=>setModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:18, padding:28, width:360, boxShadow:'0 32px 80px rgba(0,0,0,0.2)', fontFamily:ff }}>
            <div style={{ fontSize:16, fontWeight:800, color:tc, marginBottom:4 }}>Submit Feedback</div>
            <div style={{ fontSize:12, color:'#9DA8C7', marginBottom:20 }}>{recordTitle(modal.record)}</div>
            <textarea rows={4} placeholder="Your feedback…" id="hm-feedback-note"
              style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #E8ECF8', fontSize:13, fontFamily:ff, resize:'vertical', outline:'none', boxSizing:'border-box' }}/>
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button onClick={()=>setModal(null)} style={{ flex:1, padding:'10px', borderRadius:10, border:'1.5px solid #E8ECF8', background:'transparent', color:'#6B7280', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:ff }}>Cancel</button>
              <button onClick={async()=>{ const note=document.getElementById('hm-feedback-note').value; await api.patch(`/records/${modal.record.id}`, { data:{ feedback_note:note } }); setModal(null); }} style={{ flex:2, padding:'10px', borderRadius:10, border:'none', background:pr, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:ff }}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── ReportWidget ──────────────────────────────────────────────────────────────
const ReportWidget = ({ cfg, theme, portal, api }) => {
  const [rows,    setRows]    = useState([])
  const [report,  setReport]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const ff = theme.fontFamily || "'DM Sans', sans-serif"
  const pr = cfg.accent_color || theme.primaryColor || '#4361EE'
  const tc = theme.textColor  || '#1a1a2e'

  useEffect(() => {
    if (!portal?.environment_id || !cfg.report_id) { setLoading(false); return }
    const load = async () => {
      try {
        const rpt = await api.get(`/saved-views/${cfg.report_id}`)
        if (!rpt || !rpt.object_id) throw new Error('Report not found')
        setReport(rpt)
        let url = `/records?object_id=${rpt.object_id}&environment_id=${portal.environment_id}&limit=500`
        if (rpt.filter_chip?.fieldValue && rpt.filter_chip.fieldValue !== '$me') {
          url += `&filter_key=${encodeURIComponent(rpt.filter_chip.fieldKey)}&filter_value=${encodeURIComponent(rpt.filter_chip.fieldValue)}`
        }
        const data  = await api.get(url)
        const all   = Array.isArray(data) ? data : (data?.records || [])
        let fields  = []
        try { const f = await api.get(`/fields?object_id=${rpt.object_id}`); fields = Array.isArray(f) ? f : [] } catch {}
        let result = []
        if (rpt.group_by) {
          const field = fields.find(f => f.api_key === rpt.group_by || f.id === rpt.group_by)
          const gKey  = field?.api_key || rpt.group_by
          const groups = {}
          all.forEach(r => {
            const gVal = String(r.data?.[gKey] ?? '(empty)')
            if (!groups[gVal]) groups[gVal] = { [gKey]: gVal, count: 0 }
            groups[gVal].count++
          })
          result = Object.values(groups).sort((a, b) => b.count - a.count)
        } else {
          result = all.slice(0, 100).map(r => ({ ...r.data }))
        }
        setRows(result)
      } catch(e) { setError(e.message) }
      finally    { setLoading(false) }
    }
    load()
  }, [portal?.environment_id, cfg.report_id])

  const chartType = cfg.chart_type || report?.chart_type || 'bar'
  const xKey      = report?.group_by || (rows[0] ? Object.keys(rows[0])[0] : 'label')
  const yKey      = 'count'
  const showChart = cfg.show_chart !== false && rows.length > 0
  const showTable = cfg.show_table !== false
  const tableRows = rows.slice(0, cfg.max_rows || 10)

  const renderChart = () => {
    if (!showChart || rows.length === 0) return null
    const data = rows.slice(0, 20)
    if (chartType === 'pie') return (
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={90}
            label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]}/>)}
          </Pie>
          <Tooltip/>
        </PieChart>
      </ResponsiveContainer>
    )
    if (chartType === 'line') return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top:8, right:16, left:0, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
          <XAxis dataKey={xKey} tick={{ fontSize:11, fontFamily:ff }} tickLine={false}/>
          <YAxis tick={{ fontSize:11, fontFamily:ff }} tickLine={false} axisLine={false}/>
          <Tooltip contentStyle={{ fontFamily:ff, fontSize:12, borderRadius:8 }}/>
          <Line type="monotone" dataKey={yKey} stroke={pr} strokeWidth={2.5} dot={{ fill:pr, r:3 }}/>
        </LineChart>
      </ResponsiveContainer>
    )
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top:8, right:16, left:0, bottom: data.length > 8 ? 40 : 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
          <XAxis dataKey={xKey} tick={{ fontSize:11, fontFamily:ff }} tickLine={false}
            interval={0} angle={data.length > 8 ? -35 : 0} textAnchor={data.length > 8 ? 'end' : 'middle'}
            height={data.length > 8 ? 52 : 24}/>
          <YAxis tick={{ fontSize:11, fontFamily:ff }} tickLine={false} axisLine={false}/>
          <Tooltip contentStyle={{ fontFamily:ff, fontSize:12, borderRadius:8 }}/>
          <Bar dataKey={yKey} radius={[4,4,0,0]}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (!cfg.report_id) return (
    <div style={{ padding:32, textAlign:'center', color:'#9DA8C7', fontFamily:ff }}>No report selected for this widget.</div>
  )
  return (
    <div style={{ fontFamily:ff }}>
      {cfg.widget_title && <div style={{ fontSize:17, fontWeight:800, color:tc, marginBottom:16 }}>{cfg.widget_title}</div>}
      {loading ? <div style={{ padding:40, textAlign:'center', color:'#9DA8C7' }}>Loading report…</div>
       : error   ? <div style={{ padding:24, textAlign:'center', color:'#DC2626', fontSize:13 }}>{error}</div>
       : rows.length === 0 ? <div style={{ padding:40, textAlign:'center', color:'#9DA8C7' }}>No data to display.</div>
       : <>
          {report?.group_by && (
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
              {[{label:'Groups',value:rows.length},{label:'Total records',value:rows.reduce((s,r)=>s+(r.count||0),0)},{label:'Top',value:rows[0]?.[xKey]||'—'}].map((s,i)=>(
                <div key={i} style={{ padding:'10px 16px', borderRadius:12, background:`${pr}0d`, border:`1.5px solid ${pr}22`, flex:'1 1 90px', minWidth:80 }}>
                  <div style={{ fontSize:20, fontWeight:800, color:pr }}>{s.value}</div>
                  <div style={{ fontSize:11, color:'#9DA8C7', marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
          {showChart && <div style={{ marginBottom: showTable ? 20 : 0 }}>{renderChart()}</div>}
          {showTable && tableRows.length > 0 && (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#F8F9FF', borderBottom:'1.5px solid #E8ECF8' }}>
                    {Object.keys(tableRows[0]).map(k=>(
                      <th key={k} style={{ padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#9DA8C7', whiteSpace:'nowrap' }}>
                        {k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row,i)=>(
                    <tr key={i} style={{ borderBottom:'1px solid #F3F4F6' }}>
                      {Object.entries(row).map(([k,v])=>(
                        <td key={k} style={{ padding:'10px 14px', fontFamily:ff, color:k==='count'?pr:tc, fontWeight:k==='count'?700:400 }}>
                          {typeof v==='number'?v.toLocaleString():String(v??'—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length>(cfg.max_rows||10) && <div style={{ padding:'8px 14px', fontSize:11, color:'#9DA8C7', textAlign:'right' }}>Showing {cfg.max_rows||10} of {rows.length}</div>}
            </div>
          )}
        </>
      }
    </div>
  )
}

// ── AISummaryWidget ───────────────────────────────────────────────────────────
const URGENCY_DOT = { high:'#DC2626', medium:'#D97706', low:'#059669' }
const ACTION_ICON = { review:'👤', feedback:'💬', interview:'📅', decision:'✅' }

const AISummaryWidget = ({ cfg, theme, portal, api }) => {
  const [brief,     setBrief]     = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [lastFetch, setLastFetch] = useState(null)
  const ff = theme.fontFamily || "'DM Sans', sans-serif"
  const pr = cfg.accent_color  || theme.primaryColor || '#4361EE'
  const tc = theme.textColor   || '#1a1a2e'

  const fetchBriefing = async () => {
    if (!portal?.environment_id) return
    setLoading(true); setError(null)
    try {
      const dataSources = []
      for (const src of (cfg.data_sources || [])) {
        if (!src.object_id) continue
        let url = `/records?object_id=${src.object_id}&environment_id=${portal.environment_id}&limit=50`
        if (src.list_id) {
          try {
            const list = await api.get(`/saved-views/${src.list_id}`)
            if (list?.filter_chip?.fieldValue && list.filter_chip.fieldValue !== '$me') {
              url += `&filter_key=${encodeURIComponent(list.filter_chip.fieldKey)}&filter_value=${encodeURIComponent(list.filter_chip.fieldValue)}`
            }
          } catch {}
        }
        try {
          const data    = await api.get(url)
          const records = Array.isArray(data) ? data : (data?.records || [])
          dataSources.push({ label: src.label || src.object_name || 'Data', records })
        } catch {}
      }
      if (dataSources.length === 0) {
        setBrief({ greeting:'Nothing to show yet.', summary:'No data sources are configured. Add some in the widget settings.', priority_items:[], action_items:[] })
        setLoading(false); return
      }
      const userName = portal?.portalUser?.name || portal?.portalUser?.email || cfg.role || 'there'
      const result = await api.post('/portal-ai/summary', {
        context: { role: cfg.role || 'Hiring Manager', userName, dataSources }
      })
      setBrief(result)
      setLastFetch(new Date())
    } catch(e) {
      setError(e.message || 'Failed to generate briefing')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBriefing() }, [portal?.environment_id, JSON.stringify(cfg.data_sources)])

  if (loading) return (
    <div style={{ fontFamily:ff }}>
      {[80,60,90,50].map((w,i)=>(
        <div key={i} style={{ height:14, width:`${w}%`, borderRadius:7, background:'#E8ECF8',
          marginBottom:10, opacity: 0.6 + (i * 0.1) }}/>
      ))}
      <div style={{ fontSize:13, color:'#9DA8C7', marginTop:8 }}>Generating your briefing…</div>
    </div>
  )

  if (error) return (
    <div style={{ padding:16, borderRadius:12, background:'#FEF2F2', border:'1px solid #FCA5A5',
      color:'#DC2626', fontSize:13, fontFamily:ff, display:'flex', alignItems:'center', gap:10 }}>
      <span>Couldn't generate briefing: {error}</span>
      <button onClick={fetchBriefing} style={{ padding:'4px 12px', borderRadius:6,
        border:'1px solid #DC2626', background:'transparent', color:'#DC2626', cursor:'pointer',
        fontSize:12, fontFamily:ff, flexShrink:0 }}>Retry</button>
    </div>
  )

  if (!brief) return null

  return (
    <div style={{ fontFamily:ff }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14, gap:12 }}>
        <div>
          {cfg.widget_title && (
            <div style={{ fontSize:11, fontWeight:700, color:pr, textTransform:'uppercase',
              letterSpacing:'0.06em', marginBottom:4 }}>{cfg.widget_title}</div>
          )}
          <div style={{ fontSize:17, fontWeight:800, color:tc, lineHeight:1.3 }}>
            {brief.greeting || 'Your daily briefing'}
          </div>
        </div>
        <button onClick={fetchBriefing}
          style={{ flexShrink:0, padding:'6px 12px', borderRadius:8, border:`1.5px solid ${pr}30`,
            background:`${pr}08`, color:pr, cursor:'pointer', fontSize:11, fontWeight:700,
            fontFamily:ff, display:'flex', alignItems:'center', gap:5 }}>
          ↻ Refresh
        </button>
      </div>

      <p style={{ margin:'0 0 20px', fontSize:14, color:'#4B5563', lineHeight:1.65 }}>
        {brief.summary}
      </p>

      {(brief.priority_items || []).length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#9DA8C7', textTransform:'uppercase',
            letterSpacing:'0.06em', marginBottom:10 }}>Priority Items</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {brief.priority_items.map((item, i) => {
              const dot = URGENCY_DOT[item.urgency || 'medium'] || '#6B7280'
              return (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12,
                  padding:'11px 14px', borderRadius:10, background:'white',
                  border:`1.5px solid ${dot}30`, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:dot,
                    flexShrink:0, marginTop:4 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:tc }}>{item.label}</div>
                    {item.detail && <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>{item.detail}</div>}
                  </div>
                  {item.days != null && (
                    <div style={{ flexShrink:0, padding:'2px 8px', borderRadius:20,
                      background:`${dot}15`, color:dot, fontSize:11, fontWeight:700 }}>
                      {item.days}d
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {(brief.action_items || []).length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'#9DA8C7', textTransform:'uppercase',
            letterSpacing:'0.06em', marginBottom:10 }}>Suggested Actions</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {brief.action_items.map((a, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
                borderRadius:20, background:`${pr}0d`, border:`1.5px solid ${pr}22`,
                fontSize:12, color:pr, fontWeight:600 }}>
                <span>{ACTION_ICON[a.category] || '→'}</span> {a.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {lastFetch && (
        <div style={{ marginTop:16, fontSize:11, color:'#9DA8C7', textAlign:'right' }}>
          Updated {lastFetch.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
        </div>
      )}
    </div>
  )
}

const Widget = ({ cell, theme, portal, api, track }) => {
  const cfg = cell.widgetConfig||{}
  switch (cell.widgetType) {
    case 'hero':    return <HeroWidget    cfg={cfg} theme={theme}/>
    case 'text':    return <TextWidget    cfg={cfg} theme={theme}/>
    case 'image':   return <ImageWidget   cfg={cfg}/>
    case 'stats':   return <StatsWidget   cfg={cfg} theme={theme}/>
    case 'video':   return <VideoWidget   cfg={cfg}/>
    case 'divider': return <DividerWidget cfg={cfg} theme={theme}/>
    case 'spacer':  return <SpacerWidget  cfg={cfg}/>
    case 'jobs':    return <JobsWidget    cfg={cfg} theme={theme} portal={portal} api={api} track={track}/>
    case 'people':  return <JobsWidget    cfg={cfg} theme={theme} portal={portal} api={api} track={track} defaultSlug="people"/>
    case 'list':    return <JobsWidget    cfg={cfg} theme={theme} portal={portal} api={api} track={track} defaultSlug={cfg.defaultSlug||'jobs'}/>
    case 'team':    return <TeamWidget    cfg={cfg} theme={theme} portal={portal} api={api}/>
    case 'form':    return <FormWidget    cfg={cfg} theme={theme}/>
    case 'job_list':       return <JobsWidget    cfg={{...cfg, compact:true}} theme={theme} portal={portal} api={api} track={track}/>
    case 'hm_profile':     return <TeamWidget    cfg={cfg} theme={theme} portal={portal} api={api}/>
    case 'multistep_form': return <MultistepFormWidget cfg={cfg} theme={theme} portal={portal} api={api} track={track}/>
    case 'testimonials':   return <TestimonialsWidget cfg={cfg} theme={theme}/>
    case 'rich_text':      return <RichTextWidget     cfg={cfg} theme={theme}/>
    case 'map_embed':      return <MapEmbedWidget     cfg={cfg}/>
    case 'cta_banner':     return <CtaBannerWidget    cfg={cfg} theme={theme}/>
    case 'dept_grid':      return <DeptGridWidget      cfg={cfg} theme={theme} portal={portal} api={api}/>
    case 'benefits_grid':  return <BenefitsGridWidget  cfg={cfg} theme={theme}/>
    case 'faq':            return <FaqWidget           cfg={cfg} theme={theme}/>
    case 'featured_jobs':  return <FeaturedJobsWidget  cfg={cfg} theme={theme} portal={portal} api={api}/>
    case 'trust_bar':      return <TrustBarWidget      cfg={cfg} theme={theme}/>
    case 'job_alerts':     return <JobAlertsWidget     cfg={cfg} theme={theme} portal={portal} api={api} track={track}/>
    case 'image_gallery':  return <ImageGalleryWidget  cfg={cfg} theme={theme}/>
    case 'app_status':     return <AppStatusWidget     cfg={cfg} theme={theme} portal={portal} api={api}/>
    case 'saved_jobs':     return <SavedJobsWidget     cfg={cfg} theme={theme} portal={portal} api={api}/>
    case 'tabs':           return <TabsWidget          cfg={cfg} theme={theme}/>
    case 'files':         return <FilesWidget         cfg={cfg} theme={theme} portal={portal} api={api}/>
    case 'content':       return <ContentWidget       cfg={cfg} theme={theme}/>
    case 'accordion':     return <AccordionWidget     cfg={cfg} theme={theme}/>
    case 'cta':           return <CtaWidget           cfg={cfg} theme={theme}/>
    case 'hm_widget':     return <HMPortalWidget       cfg={cfg} theme={theme} portal={portal} api={api}/>
    case 'report_widget': return <ReportWidget          cfg={cfg} theme={theme} portal={portal} api={api}/>
    case 'ai_summary':    return <AISummaryWidget       cfg={cfg} theme={theme} portal={portal} api={api}/>
    default:        return null
  }
}


const PortalRow = ({ row, theme, portal, api, track }) => {
  if(row.condition?.param&&row.condition?.value){const p=new URLSearchParams(window.location.search);if((p.get(row.condition.param)||'').toLowerCase()!==row.condition.value.toLowerCase())return null;}
  const padding = PADDING_MAP[row.padding]||'56px'
  const cellFlex = (ci, total, preset) => {
    if (preset==='1') return '1 1 100%'
    if (preset==='1-2') return ci===0?'0 0 calc(33.33% - 16px)':'0 0 calc(66.66% - 16px)'
    if (preset==='2-1') return ci===0?'0 0 calc(66.66% - 16px)':'0 0 calc(33.33% - 16px)'
    if (total===2) return '0 0 calc(50% - 16px)'
    if (total===3) return '0 0 calc(33.33% - 22px)'
    return `1 1 calc(${Math.floor(100/total)}% - 16px)`
  }
  const bgStyle = {}
  if (row.bgColor) bgStyle.background = row.bgColor
  if (row.bgImage) { bgStyle.backgroundImage=`url(${row.bgImage})`; bgStyle.backgroundSize='cover'; bgStyle.backgroundPosition='center' }
  return (
    <div id={row.anchorId||undefined} style={{ position:'relative', ...bgStyle, ...(row.style?.maxHeight?{maxHeight:row.style.maxHeight,overflow:'hidden'}:{}) }}>
      {row.bgImage&&(row.overlayOpacity||0)>0&&<div style={{ position:'absolute', inset:0, background:`rgba(0,0,0,${(row.overlayOpacity||0)/100})`, pointerEvents:'none' }}/>}
      <div style={{ position:'relative', maxWidth:row.fullWidth===true?'none':(row.style?.maxWidth||theme.maxWidth||'1200px'), margin:row.fullWidth===true?'0':'0 auto', padding:`${padding} ${row.fullWidth===true?'0':'24px'}`, boxSizing:'border-box' }}>
        <div style={{ display:'flex', gap:32, flexWrap:'wrap', alignItems:'flex-start' }}>
          {(row.cells||[]).map((cell, ci) => (
            <div key={cell.id} style={{ flex:cellFlex(ci,(row.cells||[]).length,row.preset), minWidth:0 }}>
              {cell.widgetType&&<Widget cell={cell} theme={theme} portal={portal} api={api} track={track}/>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const PortalFooter = ({ portal, theme }) => {
  const f=portal.footer||{}; const bg=f.bgColor||'#0F1729'; const fg=f.textColor||'#F1F5F9';
  return(<footer style={{background:bg,padding:'48px 24px 24px',fontFamily:theme.fontFamily}}>
    <div style={{maxWidth:theme.maxWidth||'1200px',margin:'0 auto'}}>
      {(f.columns||[]).length>0&&(<div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min((f.columns||[]).length,4)},1fr)`,gap:32,marginBottom:40}}>
        {(f.columns||[]).map(col=>(<div key={col.id}>
          <div style={{fontSize:13,fontWeight:700,color:fg,marginBottom:12}}>{col.heading}</div>
          {(col.links||[]).map((lnk,i)=>(<a key={i} href={lnk.href||'#'} style={{display:'block',fontSize:13,color:fg,opacity:0.65,marginBottom:8,textDecoration:'none'}}>{lnk.label}</a>))}
        </div>))}
      </div>)}
      <div style={{borderTop:'1px solid rgba(255,255,255,.1)',paddingTop:20,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
        <span style={{fontSize:12,color:fg,opacity:0.5}}>{f.bottomText||'© 2026 Your Company. All rights reserved.'}</span>
        <span style={{fontSize:11,color:fg,opacity:0.3}}>Powered by Vercentic</span>
      </div>
    </div>
  </footer>);
};

const PortalNav = ({ portal, theme, currentPage, onNav, pages }) => {
  const nav = portal.nav || {}
  const bg  = nav.bgColor   || theme.bgColor   || '#fff'
  const fg  = nav.overlay ? (nav.textColor || '#FFFFFF') : (nav.textColor || theme.textColor || '#0F1729')
  const navLinks = nav.links || []

  // Read all editor-stored values with sensible defaults
  const logoH     = nav.logoHeight   || 36
  const logoMaxW  = nav.logoMaxWidth || 160
  const barH      = nav.headerHeight || 64
  const alignment = nav.alignment    || 'spread'   // spread | center | left
  const borderCol = nav.borderColor  || (theme.primaryColor + '18')
  const showBorder = nav.showBorder !== false && !nav.overlay
  const showShadow = nav.shadow      !== false && !nav.overlay
  const activeCol  = nav.activeColor || theme.primaryColor || '#4361EE'

  // Justify content based on alignment setting
  const justifyContent = alignment === 'left' ? 'flex-start' : 'space-between'
  const logoOrder = alignment === 'center' ? { position:'absolute', left:'50%', transform:'translateX(-50%)' } : {}

  return (
    <nav style={{ position: nav.overlay ? 'absolute' : nav.sticky !== false ? 'sticky' : 'relative', top:0, left:0, right:0, zIndex:100,
      background: nav.overlay ? 'transparent' : bg,
      borderBottom: showBorder ? `1px solid ${borderCol}` : 'none',
      boxShadow: showShadow ? '0 1px 8px rgba(0,0,0,.07)' : 'none' }}>
      <div style={{ maxWidth:theme.maxWidth||'1200px', margin:'0 auto', padding:`0 24px`,
        display:'flex', alignItems:'center', justifyContent, height: barH, position:'relative' }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', flexShrink:0, ...logoOrder }}>
          {nav.logoUrl
            ? <img src={nav.logoUrl} alt={nav.logoText||portal.name}
                style={{ height: logoH, maxWidth: logoMaxW, objectFit:'contain' }}
                onError={e => { e.target.style.display='none'; }}/>
            : <div style={{ fontSize:18, fontWeight:800, color:theme.primaryColor, fontFamily:theme.headingFont||theme.fontFamily, whiteSpace:'nowrap' }}>
                {nav.logoText || portal.branding?.company_name || portal.name}
              </div>
          }
        </div>

        {/* Links */}
        <div style={{ display:'flex', gap:4, alignItems:'center', marginLeft: alignment==='left' ? 24 : 0 }}>
          {navLinks.length > 0
            ? navLinks.map(lnk => (
                <a key={lnk.id} href={lnk.href||'#'}
                  style={ (lnk.isCta || lnk.isButton) ? {
                    padding:'7px 18px', borderRadius: theme.buttonRadius||'8px', fontSize:14, fontWeight:700,
                    color:'white', textDecoration:'none', fontFamily:theme.fontFamily,
                    background: activeCol, boxShadow:`0 2px 8px ${activeCol}40`
                  } : {
                    padding:'6px 12px', borderRadius:8, fontSize:14, fontWeight:500,
                    color:fg, textDecoration:'none', fontFamily:theme.fontFamily
                  }}>
                  {lnk.label}
                </a>
              ))
            : pages.length > 1 && pages.map(pg => (
                <button key={pg.id} onClick={()=>onNav(pg)}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:'6px 14px', borderRadius:8,
                    fontSize:14, fontWeight:currentPage?.id===pg.id?700:500,
                    color:currentPage?.id===pg.id?activeCol:fg,
                    fontFamily:theme.fontFamily }}>
                  {pg.name}
                </button>
              ))
          }
        </div>
      </div>
    </nav>
  )
}

export default function PortalPageRenderer({ portal, api }) {
  const theme = portal.theme || portal.branding || {}
  const pages = portal.pages || []
  const [currentPage,   setCurrentPage]   = useState(pages[0]||null)
  const [consentGiven,  setConsentGiven]  = useState(()=>!!localStorage.getItem('vc_consent_'+portal.id))
  const [showConsent,   setShowConsent]   = useState(false)
  const [appStatus,     setAppStatus]     = useState(null)  // application status page state
  const [appLoading,    setAppLoading]    = useState(false)

  // ── A/B variant: session-sticky assignment ──────────────────────────────
  const _activeVariant = (() => {
    try {
      const key = 'vc_variant_' + (portal?.id||'p');
      const url = new URLSearchParams(window.location.search);
      const forced = url.get('_variant') || url.get('variant');
      if (forced) sessionStorage.setItem(key, forced.toLowerCase().replace(/[^a-z0-9-]/g,''));
      return sessionStorage.getItem(key) || null;
    } catch { return null; }
  })();
  const [activeVariant] = useState(_activeVariant);
  // track — injects variant on every event automatically
  const track=(event,data={})=>{
    if(!portal?.id)return;
    const payload = activeVariant ? {...data, variant: activeVariant} : data;
    api.post(`/portal-analytics/${portal.id}/track`,{event,data:payload}).catch(()=>{});
  };
  useEffect(()=>{track('page_view',{page:currentPage?.slug||'/'});},[currentPage?.id]);

  // ── Check for application status route /portal/…/application/:id ─────────
  useEffect(() => {
    const m = window.location.pathname.match(/\/application\/([a-f0-9-]{36})$/i);
    // Also check localStorage for returning candidates
    const storedId = !m ? (() => { try { return localStorage.getItem(`vc_app_${portal.id}`); } catch { return null; } })() : null;
    const personId = m?.[1] || storedId;
    if (!personId) return;
    setAppLoading(true);
    api.get(`/portals/public/application/${personId}`).then(d => {
      setAppStatus(d);
      setAppLoading(false);
    }).catch(() => setAppLoading(false));
  }, []);

  // ── GDPR consent banner ────────────────────────────────────────────────────
  const gdpr = portal.gdpr || {};
  useEffect(() => {
    if (gdpr.enabled && !consentGiven) {
      const t = setTimeout(() => setShowConsent(true), 1200);
      return () => clearTimeout(t);
    }
  }, [gdpr.enabled, consentGiven]);

  const acceptConsent = () => {
    localStorage.setItem('vc_consent_'+portal.id, '1');
    setConsentGiven(true); setShowConsent(false);
  };
  const declineConsent = () => { setShowConsent(false); };

  // ── SEO meta injection ──────────────────────────────────────────────────────
  useEffect(() => {
    const seo = currentPage?.seo || {};
    const portalName = portal.branding?.company_name || portal.name || 'Careers';
    const title = seo.title || portalName;
    const desc  = seo.description || `Explore open opportunities at ${portalName}.`;
    const ogImg = seo.ogImage || '';
    document.title = title;
    const setMeta = (name, content, attr='name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', desc);
    setMeta('og:title',       title,   'property');
    setMeta('og:description', desc,    'property');
    setMeta('og:type',        'website','property');
    if (ogImg) setMeta('og:image', ogImg, 'property');
    setMeta('twitter:card',        'summary_large_image');
    setMeta('twitter:title',       title);
    setMeta('twitter:description', desc);
    if (ogImg) setMeta('twitter:image', ogImg);
  }, [currentPage?.id, portal.name]);

  useEffect(() => {
    const font = theme.fontFamily||theme.headingFont
    if (!font) return
    const name = font.replace(/['"]/g,'').split(',')[0].trim()
    const link = document.createElement('link')
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;500;600;700;800&display=swap`
    link.rel = 'stylesheet'; document.head.appendChild(link)
  }, [theme.fontFamily])

  const pr  = theme.primaryColor || '#3B5BDB';
  const bg  = theme.bgColor      || '#FFFFFF';
  const tc  = theme.textColor    || '#0F1729';
  const ff  = theme.fontFamily   || 'sans-serif';
  const br  = theme.buttonRadius || '8px';

  // Application status page
  if (appLoading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:bg, fontFamily:ff }}>
      <div style={{ width:36, height:36, borderRadius:'50%', border:`3px solid ${pr}40`, borderTopColor:pr, animation:'spin 1s linear infinite' }}/>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );

  if (appStatus) return (
    <div style={{ minHeight:'100vh', background:bg, fontFamily:ff, color:tc }}>
      <PortalNav portal={portal} theme={theme} currentPage={currentPage} onNav={setCurrentPage} pages={pages}/>
      <div style={{ maxWidth:640, margin:'0 auto', padding:'60px 24px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:`${pr}15`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={pr} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h1 style={{ margin:'0 0 8px', fontSize:26, fontWeight:800, color:tc }}>Hi {appStatus.person?.first_name} 👋</h1>
          <p style={{ margin:0, fontSize:16, color:'#6B7280' }}>Here's your application status</p>
        </div>

        {(appStatus.applications || []).length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'#9CA3AF' }}>No applications found.</div>
        ) : (appStatus.applications||[]).map((app, i) => (
          <div key={i} style={{ background:'#F9FAFB', borderRadius:16, padding:'24px', marginBottom:16, border:'1px solid #E5E7EB' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:17, color:tc }}>{app.job_title || 'Open application'}</div>
                <div style={{ fontSize:13, color:'#9CA3AF', marginTop:3 }}>Applied {new Date(app.applied_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</div>
              </div>
              <span style={{ padding:'4px 12px', borderRadius:99, background:`${pr}15`, color:pr, fontSize:12, fontWeight:700 }}>
                {app.status}
              </span>
            </div>
            {app.stage && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'white', borderRadius:10, border:'1px solid #E5E7EB' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:pr, flexShrink:0 }}/>
                <span style={{ fontSize:14, color:tc }}><strong>Current stage:</strong> {app.stage}</span>
              </div>
            )}
          </div>
        ))}

        <p style={{ textAlign:'center', fontSize:13, color:'#9CA3AF', marginTop:32 }}>
          Questions? Contact the recruitment team at <a href={`mailto:${portal.branding?.contact_email||'careers@company.com'}`} style={{ color:pr }}>{portal.branding?.contact_email||'careers@company.com'}</a>
        </p>
      </div>
      <PortalFooter portal={portal} theme={theme}/>
      <FeedbackWidget portal={portal} currentPageSlug={currentPage?.slug || "/"} api={api}/>
    </div>
  );

  if (!pages.length||!currentPage) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', fontFamily:'sans-serif', color:'#9CA3AF', flexDirection:'column', gap:8 }}>
      <Icon path={ICONS.building} size={40} color="#9CA3AF"/>
      <div style={{ fontWeight:600 }}>Portal content not configured yet.</div>
      <div style={{ fontSize:13 }}>Add widgets in the portal builder to get started.</div>
    </div>
  )

  return (
    <div style={{ background:bg, minHeight:'100vh', color:tc, fontFamily:ff }}>
      <PortalNav portal={portal} theme={theme} currentPage={currentPage} onNav={setCurrentPage} pages={pages}/>
      {(currentPage.rows||[]).map(row => <PortalRow key={row.id} row={row} theme={theme} portal={portal} api={api} track={track}/>)}
      <PortalFooter portal={portal} theme={theme}/>
      <FeedbackWidget portal={portal} currentPageSlug={currentPage?.slug || "/"} api={api}/>

      {/* GDPR Consent Banner */}
      {showConsent && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:9999, background:gdpr.bannerBg||'#0F1729', color:gdpr.bannerText||'#F9FAFB', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, boxShadow:'0 -4px 20px rgba(0,0,0,.2)', fontFamily:ff }}>
          <p style={{ margin:0, flex:1, minWidth:200, fontSize:14, lineHeight:1.5, opacity:0.9 }}>
            {gdpr.message || 'We use cookies to improve your experience on this career site. By continuing, you agree to our use of analytics cookies.'}
            {gdpr.privacyUrl && <> <a href={gdpr.privacyUrl} target="_blank" rel="noreferrer" style={{ color:pr, marginLeft:4 }}>Privacy policy</a></>}
          </p>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <button onClick={declineConsent} style={{ padding:'8px 16px', borderRadius:br, border:'1px solid rgba(255,255,255,.3)', background:'transparent', color:'inherit', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:ff }}>
              {gdpr.declineText || 'Decline'}
            </button>
            <button onClick={acceptConsent} style={{ padding:'8px 20px', borderRadius:br, border:'none', background:pr, color:'white', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:ff }}>
              {gdpr.acceptText || 'Accept cookies'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

