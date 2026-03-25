import { useState, useEffect } from 'react'
import FeedbackWidget from './FeedbackWidget.jsx'

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
  const tc = cfg.videoUrl || (cfg.bgImage && (cfg.overlayOpacity||0) > 20) ? '#FFFFFF' : (t.textColor || '#0F1729')
  const tcSub = cfg.videoUrl || (cfg.bgImage && (cfg.overlayOpacity||0) > 20) ? 'rgba(255,255,255,.8)' : (t.textColor || '#0F1729')
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
          {listItems.map((li,i)=><li key={i} style={{ marginBottom:6, lineHeight:1.7 }} dangerouslySetInnerHTML={{ __html:li }}/>)}
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
      else { flushList(); elements.push(<p key={i} style={{ margin:'0 0 16px', lineHeight:1.75 }} dangerouslySetInnerHTML={{ __html:inline }}/>); }
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


const JobsWidget = ({ cfg, theme, portal, api, track }) => {
  const [records, setRecords] = useState([]);
  const [objMeta, setObjMeta] = useState(null);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('all');
  const [location, setLocation] = useState('all');
  const [selected, setSelected] = useState(null);
  const [applying, setApplying] = useState(false);
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
          : (Array.isArray(objs)?objs:[]).find(o => o.slug==='jobs');
        if (!obj) return;
        setObjMeta({ slug: obj.slug, name: obj.name, plural_name: obj.plural_name });
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

  if (selected && isJobs) {
    const d = selected.data || {};
    return (
      <div style={{ fontFamily:ff }}>
        <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:pr, fontSize:13, fontWeight:600, fontFamily:ff, padding:0, marginBottom:12 }}>← Back</button>
        <h2 style={{ margin:'0 0 6px', fontSize:22, fontWeight:700, color:tc }}>{d.job_title || d.name || 'Untitled'}</h2>
        <div style={{ fontSize:13, color:tc+'99', marginBottom:16 }}>{[d.department, d.location, d.work_type].filter(Boolean).join(' · ')}</div>
        {d.description && <div style={{ fontSize:14, color:tc, lineHeight:1.7, whiteSpace:'pre-wrap', marginBottom:20 }}>{d.description}</div>}
        {!applying ? (
          <button onClick={() => { setApplying(true); if(track) track('job_click', { job_id: selected.id, title: d.job_title }); }}
            style={{ padding:'12px 28px', borderRadius:br, background:pr, color:'white', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:ff }}>Apply Now</button>
        ) : (
          <div style={{ padding:16, background:pr+'08', borderRadius:br, border:'1px solid '+pr+'20' }}>
            <p style={{ margin:'0 0 8px', fontSize:14, fontWeight:600, color:tc }}>Application submitted!</p>
            <p style={{ margin:0, fontSize:13, color:tc+'80' }}>Thank you. We'll be in touch.</p>
          </div>
        )}
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
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12 }}>
          {Object.entries(d).filter(([k])=>!['id','created_at','updated_at'].includes(k)).slice(0,12).map(([k,v])=>(
            <div key={k} style={{ padding:'10px 0', borderBottom:'1px solid #F1F5F9' }}>
              <div style={{ fontSize:11, fontWeight:600, color:tc, opacity:0.5, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>{k.replace(/_/g,' ')}</div>
              <div style={{ fontSize:14, color:tc }}>{Array.isArray(v)?v.join(', '):String(v||'—')}</div>
            </div>
          ))}
        </div>
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
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {isPeople && <div style={{ width:36, height:36, borderRadius:'50%', background:pr+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:pr, flexShrink:0 }}>{getName(r).split(' ').map(w=>w[0]).join('').slice(0,2)}</div>}
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:tc }}>{getName(r)}</div>
                <div style={{ fontSize:12, color:tc+'80' }}>{[getSub(r), d.location].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
            <span style={{ fontSize:12, color:pr, fontWeight:600, flexShrink:0 }}>{isJobs ? 'View →' : 'View →'}</span>
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
    case 'people':  return <JobsWidget    cfg={cfg} theme={theme} portal={portal} api={api} track={track}/>
    case 'list':    return <JobsWidget    cfg={cfg} theme={theme} portal={portal} api={api} track={track}/>
    case 'team':    return <TeamWidget    cfg={cfg} theme={theme} portal={portal} api={api}/>
    case 'form':    return <FormWidget    cfg={cfg} theme={theme}/>
    case 'job_list':       return <JobsWidget    cfg={{...cfg, compact:true}} theme={theme} portal={portal} api={api} track={track}/>
    case 'hm_profile':     return <TeamWidget    cfg={cfg} theme={theme} portal={portal} api={api}/>
    case 'multistep_form': return <MultistepFormWidget cfg={cfg} theme={theme} portal={portal} api={api} track={track}/>
    case 'testimonials':   return <TestimonialsWidget cfg={cfg} theme={theme}/>
    case 'rich_text':      return <RichTextWidget     cfg={cfg} theme={theme}/>
    case 'map_embed':      return <MapEmbedWidget     cfg={cfg}/>
    case 'cta_banner':     return <CtaBannerWidget    cfg={cfg} theme={theme}/>
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
      <div style={{ position:'relative', maxWidth:row.fullWidth?'none':(row.style?.maxWidth||theme.maxWidth||'1200px'), margin:row.fullWidth?'0':'0 auto', padding:`${padding} ${row.fullWidth?'0':'24px'}`, boxSizing:'border-box' }}>
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
  return (
    <nav style={{ position: nav.overlay ? 'absolute' : nav.sticky !== false ? 'sticky' : 'relative', top:0, left:0, right:0, zIndex:100,
      background: nav.overlay ? 'transparent' : bg,
      borderBottom: nav.overlay ? 'none' : `1px solid ${theme.primaryColor}18`,
      boxShadow: nav.overlay ? 'none' : '0 1px 8px rgba(0,0,0,.06)' }}>
      <div style={{ maxWidth:theme.maxWidth||'1200px', margin:'0 auto', padding:'0 24px',
        display:'flex', alignItems:'center', justifyContent:'space-between', height:64 }}>
        {nav.logoUrl
          ? <img src={nav.logoUrl} alt={nav.logoText||portal.name} style={{ height:36, objectFit:'contain' }}/>
          : <div style={{ fontSize:18, fontWeight:800, color:theme.primaryColor, fontFamily:theme.headingFont||theme.fontFamily }}>
              {nav.logoText || portal.branding?.company_name || portal.name}
            </div>
        }
        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
          {navLinks.length > 0
            ? navLinks.map(lnk => (
                <a key={lnk.id} href={lnk.href||'#'}
                  style={{ padding:'6px 12px', borderRadius:8, fontSize:14, fontWeight:500,
                    color:fg, textDecoration:'none', fontFamily:theme.fontFamily }}>
                  {lnk.label}
                </a>
              ))
            : pages.length > 1 && pages.map(pg => (
                <button key={pg.id} onClick={()=>onNav(pg)}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:'6px 14px', borderRadius:8,
                    fontSize:14, fontWeight:currentPage?.id===pg.id?700:500,
                    color:currentPage?.id===pg.id?theme.primaryColor:fg,
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

  const track=(event,data={})=>{if(!portal?.id)return;api.post(`/portal-analytics/${portal.id}/track`,{event,data}).catch(()=>{});};
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

