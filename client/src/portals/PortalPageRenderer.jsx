import { useState, useEffect, useRef } from 'react'
import FeedbackWidget from './FeedbackWidget.jsx'
import WizardRenderer from './WizardRenderer.jsx'
import { sanitizeInline, sanitizeCopilot } from '../sanitize.js'
import { mergePortalBranding } from './portalBranding.js'
import { API_ORIGIN } from '../apiClient.js'
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
      minHeight: cfg.videoUrl ? 420 : (cfg.bgImage ? 440 : 'auto'),
      display: (cfg.videoUrl || cfg.bgImage) ? 'flex' : 'block',
      alignItems: (cfg.videoUrl || cfg.bgImage) ? 'center' : undefined,
      justifyContent: (cfg.videoUrl || cfg.bgImage) ? 'center' : undefined,
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
      <div style={{ position:'relative', zIndex:2, maxWidth: (cfg.videoUrl || cfg.bgImage) ? '760px' : '800px', margin:'0 auto' }}>
        {cfg.eyebrow && (
          <div style={{ fontSize:13, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color: (cfg.videoUrl || (cfg.bgImage && (cfg.overlayOpacity||0) > 20)) ? 'rgba(255,255,255,.85)' : pr, marginBottom:12, fontFamily:ff }}>
            {cfg.eyebrow}
          </div>
        )}
        <h2 style={{ fontSize: (cfg.videoUrl || cfg.bgImage) ? 48 : 36, fontWeight:hw, color:tc, fontFamily:hf, margin:'0 0 16px', lineHeight:1.15 }}>
          {cfg.headline || 'Your Compelling Headline'}
        </h2>
        {cfg.subheading && <p style={{ margin:'0 0 32px', fontSize: (cfg.videoUrl || cfg.bgImage) ? 20 : 18, color:tcSub, lineHeight:1.6, opacity:0.9 }}>{cfg.subheading}</p>}
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
  const [mediaAssets, setMediaAssets] = useState([]);
  // Pagination and extra-filter state — declared here (before any early returns) to satisfy rules-of-hooks
  const [page, setPage] = useState(1);
  const [extraVals, setExtraVals] = useState({});
  const extraFilters = cfg.extraFilters || [];
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

  // Master switch — falls back to the older auto_header_images flag for portals
  // saved before this on/off toggle existed, so nothing regresses silently.
  const showHeaderImages = theme.show_header_images === undefined ? !!theme.auto_header_images : !!theme.show_header_images;
  const showOnList   = showHeaderImages && theme.header_images_on_list   !== false;
  const showOnDetail = showHeaderImages && theme.header_images_on_detail !== false;

  // Media library — only fetched when this portal has header images enabled at all.
  useEffect(() => {
    if (!isJobs || !showHeaderImages || !portal?.environment_id) return;
    api.get(`/media-library?environment_id=${portal.environment_id}`)
      .then(d => setMediaAssets(Array.isArray(d?.assets) ? d.assets : []))
      .catch(() => {});
  }, [isJobs, showHeaderImages, portal?.environment_id]);

  // Resolves the best header image for a job: manual field value first,
  // otherwise a fast client-side keyword match against the media library.
  // Returns null entirely when the master switch is off, regardless of
  // whether the job has a manually-set image — full kill switch for the feature.
  const resolveHeaderImage = (record) => {
    if (!showHeaderImages) return null;
    const d = record?.data || {};
    if (d.header_image) return typeof d.header_image === 'object' ? d.header_image.url : d.header_image;
    if (!theme.auto_header_images || !mediaAssets.length) return null;
    const qText = [d.job_title, d.department, d.description || d.job_description].filter(Boolean).join(' ').toLowerCase();
    const words = qText.split(/[^a-z0-9]+/).filter(w => w.length > 2);
    let best = null, bestScore = -1;
    for (const a of mediaAssets) {
      const hay = [a.name, a.category, ...(a.tags || [])].join(' ').toLowerCase();
      let score = 0;
      for (const w of words) if (hay.includes(w)) score++;
      if (score > bestScore) { bestScore = score; best = a; }
    }
    if (!best || bestScore <= 0) best = mediaAssets.find(a => a.category === 'Team & Culture') || mediaAssets[0];
    return best?.url || null;
  };

  // Listen for vrc:openJob events fired by FeaturedJobsWidget / other widgets
  useEffect(() => {
    if (!isJobs) return;
    const handler = (e) => {
      const job = e.detail;
      if (!job) return;
      setSelected(job);
    };
    window.addEventListener('vrc:openJob', handler);
    return () => window.removeEventListener('vrc:openJob', handler);
  }, [isJobs]);

  // Deep-link: ?job=<record_id> — auto-open a specific job when records have loaded
  useEffect(() => {
    if (!isJobs || !records.length) return;
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('job');
    if (!jobId) return;
    const match = records.find(r => r.id === jobId);
    if (match) setSelected(match);
  }, [isJobs, records]);
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

    // Skill pill renderer
    const renderSkillPills = (val, color, border) => {
      const skills = (Array.isArray(val) ? val : String(val).split(',')).map(s => s.trim()).filter(Boolean);
      return (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
          {skills.map((s,i) => (
            <span key={i} style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:99,
              fontSize:12, fontWeight:600, background:color, color:border, border:`1.5px solid ${border}30` }}>
              {s}
            </span>
          ))}
        </div>
      );
    };

    return (
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12 }}>
        {/* Required skills — full width, accent coloured pills */}
        {d.required_skills && (
          <div style={{ gridColumn:'1 / -1', padding:'10px 0', borderBottom:'1px solid #F1F5F9' }}>
            <div style={{ fontSize:11, fontWeight:700, color:pr, opacity:0.8, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>Required Skills</div>
            {renderSkillPills(d.required_skills, pr+'18', pr)}
          </div>
        )}
        {/* Nice-to-have skills — full width, grey pills */}
        {d.nice_to_have_skills && (
          <div style={{ gridColumn:'1 / -1', padding:'10px 0', borderBottom:'1px solid #F1F5F9' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>Nice-to-have Skills</div>
            {renderSkillPills(d.nice_to_have_skills, '#F3F4F6', '#6B7280')}
          </div>
        )}
        {fieldList.map(f => {
          const v = d[f.key];
          if (v === undefined || v === null || v === '') return null;
          // Skip skills — already rendered above
          if (f.key === 'required_skills' || f.key === 'nice_to_have_skills') return null;
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

  const [heroFailed, setHeroFailed] = useState(false);
  useEffect(() => { setHeroFailed(false); }, [selected?.id]);

  if (selected && isJobs) {
    const d = selected.data || {};
    const heroImg = (heroFailed || !showOnDetail) ? null : resolveHeaderImage(selected);
    return (
      <div style={{ fontFamily:ff }}>
        <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:pr, fontSize:13, fontWeight:600, fontFamily:ff, padding:0, marginBottom:12 }}>← Back</button>
        {heroImg ? (
          <div style={{ position:'relative', width:'100%', height:260, overflow:'hidden', borderRadius:br, marginBottom:20, background:'#0F1729' }}>
            <img src={heroImg} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
              onError={() => setHeroFailed(true)}/>
            {/* Dark gradient scrim — guarantees text contrast regardless of what's in the photo */}
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.8) 100%)' }}/>
            <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'20px 24px' }}>
              <h2 style={{ margin:'0 0 4px', fontSize:30, fontWeight:800, color:'#fff', textShadow:'0 1px 8px rgba(0,0,0,0.4)', lineHeight:1.15 }}>{d.job_title || d.name || 'Untitled'}</h2>
              <div style={{ fontSize:14, color:'rgba(255,255,255,0.92)', textShadow:'0 1px 6px rgba(0,0,0,0.4)' }}>{[d.department, d.location, d.work_type].filter(Boolean).join(' · ')}</div>
            </div>
          </div>
        ) : (
          <>
            <h2 style={{ margin:'0 0 6px', fontSize:22, fontWeight:700, color:tc }}>{d.job_title || d.name || 'Untitled'}</h2>
            <div style={{ fontSize:13, color:tc+'99', marginBottom:16 }}>{[d.department, d.location, d.work_type].filter(Boolean).join(' · ')}</div>
          </>
        )}
        {renderDetailFields(d)}
        <div style={{ marginTop:20 }} id="vrc-apply-section">
          {wizardOpen ? (
            portal.wizard?.enabled && portal.wizard?.pages?.length ? (
              <WizardRenderer
                wizard={portal.wizard}
                portal={portal}
                job={selected}
                api={api}
                onBack={() => setWizardOpen(false)}
                onSuccess={() => { setWizardOpen(false); setSelected(null); setApplying(true); }}
              />
            ) : (
              <div style={{ padding:16, background:pr+'08', borderRadius:br, border:'1px solid '+pr+'20' }}>
                <p style={{ margin:'0 0 8px', fontSize:14, fontWeight:600, color:tc }}>✓ Application submitted!</p>
                <p style={{ margin:0, fontSize:13, color:tc+'80' }}>Thank you. We'll be in touch.</p>
              </div>
            )
          ) : applying ? (
            <div style={{ padding:16, background:pr+'08', borderRadius:br, border:'1px solid '+pr+'20' }}>
              <p style={{ margin:'0 0 8px', fontSize:14, fontWeight:600, color:tc }}>✓ Application submitted!</p>
              <p style={{ margin:0, fontSize:13, color:tc+'80' }}>Thank you. We'll be in touch.</p>
            </div>
          ) : (
            <button onClick={() => {
                if(track) track('job_click', { job_id: selected.id, title: d.job_title });
                setWizardOpen(true);
                setTimeout(() => {
                  document.getElementById('vrc-apply-section')?.scrollIntoView({ behavior:'smooth', block:'start' });
                }, 50);
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

  const PAGE_SIZE = cfg.pageSize || 25;
  // page, extraVals, extraFilters are declared at the top of the component (before early returns)

  const fullyFiltered = filtered.filter(r => {
    const d = r.data || {};
    return extraFilters.every(ef => {
      const val = extraVals[ef.field];
      if (!val || val === 'all') return true;
      return String(d[ef.field]||'').toLowerCase() === val.toLowerCase();
    });
  });

  const totalPages = Math.ceil(fullyFiltered.length / PAGE_SIZE);
  const pageRecords = fullyFiltered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  // Reset page when filters change
  const resetPage = () => setPage(1);

  const placeholder = isPeople ? 'Search people...' : 'Search roles...';
  const countLabel = isJobs
    ? fullyFiltered.length+' open position'+(fullyFiltered.length!==1?'s':'')
    : fullyFiltered.length+' '+(objMeta?.plural_name||'records').toLowerCase();

  const selStyle = { padding:'8px 12px', borderRadius:br, border:'1px solid '+pr+'30', fontSize:13, fontFamily:ff, background:'white', outline:'none' };

  return (
    <div style={{ fontFamily:ff }}>
      <h2 style={{ fontSize:clamp(cfg.headingSize||22), fontWeight:700, color:tc, margin:'0 0 16px', fontFamily:theme.headingFont||ff }}>{cfg.heading || (isPeople ? 'Our Team' : 'Open Positions')}</h2>
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <input value={search} onChange={e=>{setSearch(e.target.value);resetPage();}} placeholder={placeholder}
          style={{ flex:'1 1 200px', padding:'8px 12px', borderRadius:br, border:'1px solid '+pr+'30', fontSize:13, fontFamily:ff, outline:'none' }}/>
        {depts.length > 1 && (
          <select value={dept} onChange={e=>{setDept(e.target.value);resetPage();}} style={selStyle}>
            <option value="all">All departments</option>{depts.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {locs.length > 1 && cfg.showLocationFilter && (
          <select value={location} onChange={e=>{setLocation(e.target.value);resetPage();}} style={selStyle}>
            <option value="all">All locations</option>{locs.map(l=><option key={l} value={l}>{l}</option>)}
          </select>
        )}
        {extraFilters.map(ef => {
          const vals = ['all', ...new Set(records.map(r => r.data?.[ef.field]).filter(Boolean))];
          if (vals.length <= 2) return null;
          return (
            <select key={ef.field} value={extraVals[ef.field]||'all'} onChange={e=>{setExtraVals(v=>({...v,[ef.field]:e.target.value}));resetPage();}} style={selStyle}>
              <option value="all">{ef.label || ef.field}</option>
              {vals.slice(1).map(v=><option key={v} value={v}>{v}</option>)}
            </select>
          );
        })}
      </div>
      <div style={{ fontSize:12, color:tc+'80', marginBottom:12 }}>{countLabel}</div>
      {pageRecords.map(r => {
        const d = r.data || {};
        return (
          <button key={r.id} onClick={()=>setSelected(r)}
            aria-label={`View ${isJobs ? 'job' : 'record'}: ${getName(r)}`}
            style={{ padding:'12px 16px', borderBottom:'1px solid #f0f0f0', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', transition:'background .1s', width:'100%', textAlign:'left', background:'transparent', border:'none', fontFamily:'inherit' }}
            onMouseEnter={e=>e.currentTarget.style.background=pr+'08'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
              {isPeople && <div style={{ width:36, height:36, borderRadius:'50%', background:pr+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:pr, flexShrink:0 }}>{getName(r).split(' ').map(w=>w[0]).join('').slice(0,2)}</div>}
              {isJobs && showOnList && resolveHeaderImage(r) && <img src={resolveHeaderImage(r)} alt="" style={{ width:52, height:40, objectFit:'cover', borderRadius:6, flexShrink:0 }} onError={e=>{e.currentTarget.style.display='none'}}/>}
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
            <span aria-hidden="true" style={{ fontSize:12, color:pr, fontWeight:600, flexShrink:0 }}>View →</span>
          </button>
        );
      })}
      {fullyFiltered.length === 0 && <div style={{ textAlign:'center', padding:'40px 20px', color:tc+'60', fontSize:14 }}>{cfg.emptyText || 'No records found.'}</div>}
      {totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:20, paddingTop:16, borderTop:'1px solid #f0f0f0' }}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
            style={{ padding:'6px 14px', borderRadius:br, border:'1px solid '+pr+'30', background:'white', color:page===1?tc+'40':pr, fontSize:13, fontWeight:600, cursor:page===1?'not-allowed':'pointer', fontFamily:ff }}>← Prev</button>
          <span style={{ fontSize:13, color:tc+'80' }}>Page {page} of {totalPages}</span>
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
            style={{ padding:'6px 14px', borderRadius:br, border:'1px solid '+pr+'30', background:'white', color:page===totalPages?tc+'40':pr, fontSize:13, fontWeight:600, cursor:page===totalPages?'not-allowed':'pointer', fontFamily:ff }}>Next →</button>
        </div>
      )}
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
            <label htmlFor={`fw-${i}`} style={{ display:'block', fontSize:12, fontWeight:600, color:tc+'90', marginBottom:4 }}>{label}</label>
            {type === 'textarea'
              ? <textarea id={`fw-${i}`} rows={3} style={{ width:'100%', padding:'8px 12px', borderRadius:br, border:'1px solid '+pr+'25', fontSize:13, fontFamily:ff, resize:'vertical', boxSizing:'border-box' }}/>
              : <input id={`fw-${i}`} type={type||'text'} autoComplete={type==='email'?'email':'off'} style={{ width:'100%', padding:'8px 12px', borderRadius:br, border:'1px solid '+pr+'25', fontSize:13, fontFamily:ff, boxSizing:'border-box' }}/>
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
          <label htmlFor={`msf-${f.id}`} style={{ display:'block', fontSize:12, fontWeight:600, color:tc+'90', marginBottom:4 }}>{f.label}{f.required && <span aria-hidden="true" style={{ color:'#ef4444' }}> *</span>}{f.required && <span style={{position:'absolute',width:1,height:1,overflow:'hidden',clip:'rect(0,0,0,0)'}}> (required)</span>}</label>
          {f.type === 'textarea'
            ? <textarea id={`msf-${f.id}`} value={values[f.id]||''} onChange={e => setValue(f.id, e.target.value)} placeholder={f.placeholder} rows={3} required={!!f.required} aria-required={f.required?'true':'false'} style={{ width:'100%', padding:'8px 12px', borderRadius:br, border:'1px solid '+pr+'25', fontSize:13, fontFamily:ff, resize:'vertical', boxSizing:'border-box' }}/>
            : f.type === 'select' || f.type === 'radio'
              ? <select id={`msf-${f.id}`} value={values[f.id]||''} onChange={e => setValue(f.id, e.target.value)} required={!!f.required} aria-required={f.required?'true':'false'} style={{ width:'100%', padding:'8px 12px', borderRadius:br, border:'1px solid '+pr+'25', fontSize:13, fontFamily:ff, background:'white', boxSizing:'border-box' }}>
                  <option value="">Select...</option>
                  {(f.options||'').split(',').map(o => o.trim()).filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              : <input id={`msf-${f.id}`} type={f.type||'text'} value={values[f.id]||''} onChange={e => setValue(f.id, e.target.value)} placeholder={f.placeholder} required={!!f.required} aria-required={f.required?'true':'false'} autoComplete={f.type==='email'?'email':f.label?.toLowerCase().includes('first')?'given-name':f.label?.toLowerCase().includes('last')?'family-name':(f.label?.toLowerCase().includes('phone')||f.type==='tel')?'tel':'off'} style={{ width:'100%', padding:'8px 12px', borderRadius:br, border:'1px solid '+pr+'25', fontSize:13, fontFamily:ff, boxSizing:'border-box' }}/>
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
        <div style={{ marginTop:8 }} ref={el => { if (el) el.__applySection = true; }} id="vrc-apply-section">
          {wizardOpen ? (
            portal.wizard?.enabled && portal.wizard?.pages?.length ? (
              <WizardRenderer wizard={portal.wizard} portal={portal} job={selectedJob} api={api}
                onBack={() => setWizardOpen(false)}
                onSuccess={() => { setWizardOpen(false); setSelectedJob(null); setApplied(true); }}/>
            ) : (
              <div style={{ padding:16, background:pr+'10', borderRadius:br, border:`1px solid ${pr}30` }}>
                <p style={{ margin:'0 0 4px', fontSize:14, fontWeight:600, color:tc }}>✓ Application submitted!</p>
                <p style={{ margin:0, fontSize:13, color:tc+'80' }}>Thank you — we'll be in touch.</p>
              </div>
            )
          ) : applied ? (
            <div style={{ padding:16, background:pr+'10', borderRadius:br, border:`1px solid ${pr}30` }}>
              <p style={{ margin:'0 0 4px', fontSize:14, fontWeight:600, color:tc }}>✓ Application submitted!</p>
              <p style={{ margin:0, fontSize:13, color:tc+'80' }}>Thank you — we'll be in touch.</p>
            </div>
          ) : (
            <button onClick={() => {
                setWizardOpen(true);
                setTimeout(() => {
                  document.getElementById('vrc-apply-section')?.scrollIntoView({ behavior:'smooth', block:'start' });
                }, 50);
              }}
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
            // NOTE: intentionally a <div role="button">, not a real <button> — this
            // card contains a nested bookmark <button>, and a <button> can never
            // contain another <button> (invalid HTML). Browsers silently "repair"
            // that nesting in inconsistent ways, which is what broke click-to-open
            // on these cards. Keyboard operability is preserved via tabIndex+onKeyDown.
            <div key={job.id||i}
              role="button"
              tabIndex={0}
              aria-label={`View job: ${job.data?.job_title||'Untitled role'}${job.data?.department ? ', '+job.data.department : ''}`}
              style={{ background:'white', borderRadius:br, border:'1.5px solid #F3F4F6', padding:'20px', cursor:'pointer', transition:'all .15s', boxShadow:'0 1px 4px rgba(0,0,0,.04)', display:'flex', flexDirection:'column', gap:12, textAlign:'left', fontFamily:'inherit', width:'100%', boxSizing:'border-box' }}
              onClick={() => setSelectedJob(job)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedJob(job); } }}
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

// ── HTML Embed Widget ──────────────────────────────────────────────────────────
const HtmlEmbedWidget = ({ cfg, theme }) => {
  const t = theme || {};
  if (!cfg.html) return null;
  const vars = [
    `--primary:${t.primaryColor||'#4361EE'}`,
    `--text:${t.textColor||'#0F1729'}`,
    `--bg:${t.bgColor||'#FFFFFF'}`,
    `--font:${t.fontFamily||'sans-serif'}`,
    `--radius:${t.borderRadius?t.borderRadius+'px':'8px'}`,
  ].join(';');
  const doc = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>:root{${vars}}*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:var(--font,sans-serif);color:var(--text,#0F1729);background:transparent;}
${cfg.css||''}</style></head><body>${cfg.html}</body></html>`;
  return (
    <iframe srcDoc={doc} sandbox="allow-scripts allow-same-origin" title="html-widget"
      style={{width:'100%',border:'none',display:'block',minHeight:40}}
      onLoad={e=>{try{const b=e.target.contentDocument?.body;if(b)e.target.style.height=b.scrollHeight+'px';}catch(_){}}}/>
  );
};

const FindYourFitWidget = ({ cfg, theme, portal, api, track }) => {
  const T = theme || {};
  const primary     = T.primaryColor  || '#4361EE';
  const textColor   = T.textColor     || '#0F1729';
  const fontFamily  = T.fontFamily    || "'DM Sans', sans-serif";
  const headingFont = T.headingFont   || fontFamily;
  const radius      = parseInt(T.borderRadius) || 12;

  const headline     = cfg.headline     || 'Find Your Perfect Role';
  const subheading   = cfg.subheading   || "Tell us about yourself and we'll match you with the best opportunities.";
  const enableCv     = cfg.enableCv     !== false;
  const enableGuided = cfg.enableGuided !== false;
  const enableAlerts = cfg.enableAlerts !== false;
  const cvLabel      = cfg.cvLabel      || 'Analyse my CV or profile';
  const guidedLabel  = cfg.guidedLabel  || 'Guide me to the right role';
  const bgStyle      = cfg.bgStyle      || 'light';

  const [phase,        setPhase]        = useState('chooser');
  const [file,         setFile]         = useState(null);
  const [dragOver,     setDragOver]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [results,      setResults]      = useState([]);
  const [profile,      setProfile]      = useState(null);
  const [qStep,        setQStep]        = useState(0);
  const [answers,      setAnswers]      = useState({});
  const [depts,        setDepts]        = useState([]);
  const [tagInput,     setTagInput]     = useState('');
  const [alertEmail,   setAlertEmail]   = useState('');
  const [alertSaved,   setAlertSaved]   = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!portal?.environment_id) return;
    api.get(`/objects?environment_id=${portal.environment_id}`)
      .then(objs => {
        const jobObj = (Array.isArray(objs)?objs:[]).find(o=>o.slug==='jobs');
        if (!jobObj) return null;
        return api.get(`/records?object_id=${jobObj.id}&environment_id=${portal.environment_id}&limit=200`);
      })
      .then(data => {
        if (!data) return;
        const recs = data.records||data||[];
        setDepts([...new Set(recs.map(r=>r.data?.department).filter(Boolean))]);
      }).catch(()=>{});
  }, [portal?.environment_id]);

  const bg       = bgStyle==='dark'?'#0F1729':bgStyle==='accent'?primary+'10':'#F8F9FC';
  const cardBg   = bgStyle==='dark'?'rgba(255,255,255,0.07)':'#FFFFFF';
  const cardBdr  = bgStyle==='dark'?'rgba(255,255,255,0.12)':'#E8ECF8';
  const fg       = bgStyle==='dark'?'#F1F5F9':textColor;
  const fgMuted  = bgStyle==='dark'?'rgba(255,255,255,0.5)':'#64748B';
  const btnF = { background:primary,color:'#fff',border:'none',padding:'11px 24px',borderRadius:radius,fontSize:14,fontWeight:700,fontFamily,cursor:'pointer' };
  const btnO = { background:'transparent',color:primary,border:`2px solid ${primary}`,padding:'9px 20px',borderRadius:radius,fontSize:14,fontWeight:600,fontFamily,cursor:'pointer' };

  const ScoreRing = ({ score }) => {
    const r=24,circ=2*Math.PI*r,fill=(score/100)*circ;
    const col=score>=70?'#10B981':score>=45?'#F59E0B':'#EF4444';
    return (<div style={{position:'relative',width:64,height:64,flexShrink:0}}>
      <svg width={64} height={64} style={{transform:'rotate(-90deg)'}}>
        <circle cx={32} cy={32} r={r} fill="none" stroke={col+'22'} strokeWidth={5}/>
        <circle cx={32} cy={32} r={r} fill="none" stroke={col} strokeWidth={5} strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <span style={{fontSize:15,fontWeight:800,color:col,lineHeight:1}}>{score}</span>
        <span style={{fontSize:8,color:fgMuted,lineHeight:1,marginTop:1}}>match</span>
      </div>
    </div>);
  };

  const runFitCheck = async (profileData, filePayload) => {
    setLoading(true); setError('');
    if(track) track('fit_check_start',{method:filePayload?'cv':'questions'});
    try {
      const payload = filePayload||{profile:profileData};
      const data = await api.post(`/portals/${portal.id}/fit-check`, payload);
      if(data.error) throw new Error(data.error);
      setResults(data.matches||[]);
      setProfile(data.profile||profileData||{});
      setPhase('results');
      if(track) track('fit_check_complete',{results:data.matches?.length||0});
    } catch(e) {
      setError(e.message||'Something went wrong. Please try again.');
      setPhase(filePayload?'cv_upload':'questions');
    } finally { setLoading(false); }
  };

  const handleFileUpload = (f) => {
    if(!f) return; setFile(f); setPhase('processing');
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1];
      runFitCheck(null, {file:base64, filename:f.name});
    };
    reader.readAsDataURL(f);
  };

  const QUESTIONS = [
    {id:'department',question:'What type of role are you looking for?',hint:'Pick the area that best matches your expertise.',type:'chips',
      options:depts.length>0?depts:['Engineering','Product','Design','Sales','Marketing','Finance','HR','Operations','Other']},
    {id:'location',question:'Where are you based?',hint:'Helps us find local and remote options.',type:'text',placeholder:'e.g. Dubai, UAE'},
    {id:'years_experience',question:'How much experience do you have?',hint:'In the type of role you selected.',type:'options',
      options:[{label:'Just starting out',value:0},{label:'1–2 years',value:1},{label:'3–5 years',value:4},{label:'6–10 years',value:7},{label:'10+ years',value:12}]},
    {id:'skills',question:'What are your key skills?',hint:'Press Enter or comma to add each one.',type:'tags',placeholder:'e.g. React, SQL, project management…'},
    {id:'work_type',question:'Work location preference?',hint:'',type:'options',
      options:[{label:'Remote',value:'Remote'},{label:'Hybrid',value:'Hybrid'},{label:'On-site',value:'On-site'},{label:'No preference',value:'Any'}]},
  ];

  const currentQ = QUESTIONS[qStep];
  const answerQuestion = (val) => {
    const updated={...answers,[currentQ.id]:val};
    setAnswers(updated);
    if(qStep<QUESTIONS.length-1){ setQStep(s=>s+1); }
    else {
      setPhase('processing');
      runFitCheck({department:updated.department||'',location:updated.location||'',years_experience:updated.years_experience||0,skills:Array.isArray(updated.skills)?updated.skills:[],work_type:updated.work_type||'Any'});
    }
  };
  const addTag=(v)=>{const c=v.trim();if(!c)return;const cur=answers.skills||[];if(!cur.includes(c))setAnswers(a=>({...a,skills:[...cur,c]}));setTagInput('');};
  const removeTag=(t)=>setAnswers(a=>({...a,skills:(a.skills||[]).filter(x=>x!==t)}));

  const saveAlert=async()=>{
    if(!alertEmail.includes('@')) return;
    setAlertLoading(true);
    try{ await api.post(`/portals/${portal.id}/talent-alert`,{email:alertEmail,skills:profile?.skills||[],department:profile?.department||'',location:profile?.location||''});setAlertSaved(true);if(track)track('talent_alert_signup');}catch{}finally{setAlertLoading(false);}
  };

  const W=({children,mw=640})=>(<div style={{background:bg,padding:'48px 24px',fontFamily}}><div style={{maxWidth:mw,margin:'0 auto'}}>{children}</div></div>);
  const BackBtn=({to})=>(<button onClick={()=>setPhase(to)} style={{background:'none',border:'none',color:fgMuted,fontSize:13,cursor:'pointer',fontFamily,marginBottom:24,padding:0,display:'flex',alignItems:'center',gap:6}}>← Back</button>);

  if(phase==='chooser') return (<W mw={760}>
    <div style={{textAlign:'center',marginBottom:40}}>
      <h2 style={{margin:'0 0 10px',fontSize:'clamp(22px,4vw,32px)',fontWeight:800,color:fg,fontFamily:headingFont,letterSpacing:'-0.5px',lineHeight:1.2}}>{headline}</h2>
      <p style={{margin:0,fontSize:16,color:fgMuted,maxWidth:480,marginInline:'auto',lineHeight:1.6}}>{subheading}</p>
    </div>
    <div style={{display:'flex',gap:16,flexWrap:'wrap',justifyContent:'center'}}>
      {enableCv&&(<div onClick={()=>setPhase('cv_upload')} style={{flex:'1 1 280px',maxWidth:320,padding:'32px 24px',background:cardBg,border:`2px solid ${cardBdr}`,borderRadius:radius+4,cursor:'pointer',transition:'all .18s',textAlign:'center'}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=primary;e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 28px ${primary}22`;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=cardBdr;e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}>
        <div style={{width:52,height:52,borderRadius:14,background:primary+'18',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <h3 style={{margin:'0 0 8px',fontSize:17,fontWeight:700,color:fg,fontFamily:headingFont}}>{cvLabel}</h3>
        <p style={{margin:0,fontSize:13,color:fgMuted,lineHeight:1.5}}>Upload your CV. Our AI reads your skills and experience and matches you to the best-fit roles instantly.</p>
        <div style={{marginTop:20,color:primary,fontSize:13,fontWeight:600}}>Get started →</div>
      </div>)}
      {enableGuided&&(<div onClick={()=>{setQStep(0);setAnswers({});setPhase('questions');}} style={{flex:'1 1 280px',maxWidth:320,padding:'32px 24px',background:cardBg,border:`2px solid ${cardBdr}`,borderRadius:radius+4,cursor:'pointer',transition:'all .18s',textAlign:'center'}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=primary;e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 28px ${primary}22`;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=cardBdr;e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}>
        <div style={{width:52,height:52,borderRadius:14,background:primary+'18',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx={12} cy={12} r={10}/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <h3 style={{margin:'0 0 8px',fontSize:17,fontWeight:700,color:fg,fontFamily:headingFont}}>{guidedLabel}</h3>
        <p style={{margin:0,fontSize:13,color:fgMuted,lineHeight:1.5}}>Answer 5 quick questions. Takes under 2 minutes — no account, no CV needed.</p>
        <div style={{marginTop:20,color:primary,fontSize:13,fontWeight:600}}>Get started →</div>
      </div>)}
    </div>
  </W>);

  if(phase==='cv_upload') return (<W>
    <BackBtn to="chooser"/>
    <h2 style={{margin:'0 0 8px',fontSize:24,fontWeight:800,color:fg,fontFamily:headingFont}}>Upload your CV</h2>
    <p style={{margin:'0 0 28px',fontSize:14,color:fgMuted}}>We'll analyse it and match you with the most relevant open roles.</p>
    <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
      onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)handleFileUpload(f);}}
      onClick={()=>fileInputRef.current?.click()}
      style={{border:`2px dashed ${dragOver?primary:cardBdr}`,borderRadius:radius,padding:'44px 24px',textAlign:'center',cursor:'pointer',transition:'all .15s',background:dragOver?primary+'08':cardBg}}>
      <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={dragOver?primary:fgMuted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{margin:'0 auto 12px',display:'block'}}>
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <p style={{margin:'0 0 4px',fontSize:15,fontWeight:600,color:fg}}>{dragOver?'Drop your file here':'Drag & drop or click to upload'}</p>
      <p style={{margin:0,fontSize:12,color:fgMuted}}>PDF or DOCX · up to 10MB</p>
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={e=>{const f=e.target.files?.[0];if(f)handleFileUpload(f);}} style={{display:'none'}}/>
    </div>
    {error&&<div style={{marginTop:16,padding:'12px 16px',borderRadius:radius,background:'#FEF2F2',border:'1px solid #FCA5A5',color:'#B91C1C',fontSize:13}}>{error}</div>}
  </W>);

  if(phase==='processing'||loading) return (<W>
    <div style={{textAlign:'center',padding:'20px 0'}}>
      <style>{`@keyframes fyf-spin{to{transform:rotate(360deg);}}`}</style>
      <div style={{width:60,height:60,borderRadius:'50%',border:`4px solid ${primary}22`,borderTopColor:primary,margin:'0 auto 24px',animation:'fyf-spin 0.85s linear infinite'}}/>
      <h3 style={{margin:'0 0 8px',fontSize:20,fontWeight:700,color:fg,fontFamily:headingFont}}>{file?'Reading your profile…':'Finding your matches…'}</h3>
      <p style={{margin:0,fontSize:14,color:fgMuted}}>{file?'Extracting your skills and experience.':'Scoring you against all open roles.'}</p>
    </div>
  </W>);

  if(phase==='questions') { const q=currentQ; return (<W>
    <div style={{marginBottom:32}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <button onClick={()=>qStep>0?setQStep(s=>s-1):setPhase('chooser')} style={{background:'none',border:'none',color:fgMuted,fontSize:13,cursor:'pointer',fontFamily,padding:0,display:'flex',alignItems:'center',gap:6}}>← {qStep>0?'Back':'Start over'}</button>
        <span style={{fontSize:12,color:fgMuted}}>{qStep+1} of {QUESTIONS.length}</span>
      </div>
      <div style={{height:3,background:cardBdr,borderRadius:99}}>
        <div style={{height:'100%',width:`${(qStep/QUESTIONS.length)*100}%`,background:primary,borderRadius:99,transition:'width .3s'}}/>
      </div>
    </div>
    <h2 style={{margin:'0 0 8px',fontSize:'clamp(18px,3.5vw,26px)',fontWeight:800,color:fg,fontFamily:headingFont,lineHeight:1.25}}>{q.question}</h2>
    {q.hint&&<p style={{margin:'0 0 28px',fontSize:14,color:fgMuted}}>{q.hint}</p>}
    {q.type==='chips'&&(<div style={{display:'flex',flexWrap:'wrap',gap:8}}>
      {q.options.map(opt=>(<button key={opt} onClick={()=>answerQuestion(opt)} style={{padding:'10px 18px',borderRadius:99,border:`2px solid ${answers[q.id]===opt?primary:cardBdr}`,background:answers[q.id]===opt?primary:cardBg,color:answers[q.id]===opt?'#fff':fg,fontSize:14,fontWeight:600,fontFamily,cursor:'pointer',transition:'all .12s'}}>{opt}</button>))}
    </div>)}
    {q.type==='text'&&(<div>
      <input value={answers[q.id]||''} onChange={e=>setAnswers(a=>({...a,[q.id]:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&answers[q.id]&&answerQuestion(answers[q.id])} placeholder={q.placeholder} autoFocus
        style={{width:'100%',padding:'14px 16px',borderRadius:radius,border:`2px solid ${cardBdr}`,fontSize:15,fontFamily,color:fg,background:cardBg,outline:'none',boxSizing:'border-box'}}
        onFocus={e=>e.target.style.borderColor=primary} onBlur={e=>e.target.style.borderColor=cardBdr}/>
      <button onClick={()=>answers[q.id]&&answerQuestion(answers[q.id])} disabled={!answers[q.id]} style={{...btnF,marginTop:16,opacity:answers[q.id]?1:0.4}}>Continue →</button>
    </div>)}
    {q.type==='options'&&(<div style={{display:'flex',flexDirection:'column',gap:8}}>
      {q.options.map(opt=>(<button key={opt.value} onClick={()=>answerQuestion(opt.value)} style={{padding:'14px 18px',borderRadius:radius,border:`2px solid ${answers[q.id]===opt.value?primary:cardBdr}`,background:answers[q.id]===opt.value?primary+'12':cardBg,color:answers[q.id]===opt.value?primary:fg,fontSize:14,fontWeight:600,fontFamily,cursor:'pointer',textAlign:'left',transition:'all .12s',display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:16,height:16,borderRadius:'50%',border:`2px solid ${answers[q.id]===opt.value?primary:cardBdr}`,background:answers[q.id]===opt.value?primary:'transparent',flexShrink:0}}/>{opt.label}
      </button>))}
    </div>)}
    {q.type==='tags'&&(<div>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:12,minHeight:38}}>
        {(answers.skills||[]).map(tag=>(<span key={tag} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:99,background:primary+'18',color:primary,fontSize:13,fontWeight:600}}>
          {tag}<button onClick={()=>removeTag(tag)} style={{background:'none',border:'none',cursor:'pointer',color:primary,padding:0}}>×</button>
        </span>))}
      </div>
      <div style={{display:'flex',gap:8}}>
        <input value={tagInput} onChange={e=>setTagInput(e.target.value)} autoFocus onKeyDown={e=>{if((e.key==='Enter'||e.key===',')&&tagInput.trim()){e.preventDefault();addTag(tagInput);}}} placeholder={q.placeholder}
          style={{flex:1,padding:'12px 14px',borderRadius:radius,border:`2px solid ${cardBdr}`,fontSize:14,fontFamily,color:fg,background:cardBg,outline:'none'}}
          onFocus={e=>e.target.style.borderColor=primary} onBlur={e=>e.target.style.borderColor=cardBdr}/>
        <button onClick={()=>tagInput.trim()&&addTag(tagInput)} style={{...btnO,padding:'12px 16px'}}>Add</button>
      </div>
      <button onClick={()=>answerQuestion(answers.skills||[])} style={{...btnF,marginTop:16}}>{(answers.skills||[]).length>0?'Find my matches →':'Skip →'}</button>
    </div>)}
  </W>);}

  if(phase==='results') return (<W mw={720}>
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:28,flexWrap:'wrap',gap:12}}>
      <div>
        <h2 style={{margin:'0 0 6px',fontSize:24,fontWeight:800,color:fg,fontFamily:headingFont}}>{results.length>0?`Your top ${results.length} match${results.length>1?'es':''}`:'No matches found'}</h2>
        <p style={{margin:0,fontSize:14,color:fgMuted}}>{results.length>0?'Based on your skills, experience, and preferences.':'Try broadening your criteria to see more roles.'}</p>
      </div>
      <button onClick={()=>setPhase('chooser')} style={{...btnO,fontSize:13,padding:'8px 16px'}}>Start over</button>
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {results.map((m,i)=>(<div key={m.job.id||i} style={{background:cardBg,border:`1.5px solid ${cardBdr}`,borderRadius:radius,padding:'20px',display:'flex',gap:16,transition:'box-shadow .15s,border-color .15s'}}
        onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 4px 20px ${primary}18`;e.currentTarget.style.borderColor=primary+'44';}}
        onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor=cardBdr;}}>
        <ScoreRing score={m.score}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{marginBottom:6}}>
            <h3 style={{margin:'0 0 4px',fontSize:16,fontWeight:700,color:fg,fontFamily:headingFont}}>{m.job.title}</h3>
            <div style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center'}}>
              {m.job.department&&<span style={{fontSize:11,color:fgMuted}}>📁 {m.job.department}</span>}
              {m.job.location&&<span style={{fontSize:11,color:fgMuted}}>📍 {m.job.location}</span>}
              {m.job.work_type&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:99,background:primary+'15',color:primary,fontWeight:600}}>{m.job.work_type}</span>}
              {(m.job.salary_min||m.job.salary_max)&&<span style={{fontSize:11,color:fgMuted}}>💰 {m.job.currency||'USD'} {m.job.salary_min?m.job.salary_min.toLocaleString():''}{m.job.salary_min&&m.job.salary_max?'–':''}{m.job.salary_max?m.job.salary_max.toLocaleString():''}</span>}
            </div>
          </div>
          {(m.reasons.length>0||m.gaps.length>0)&&(<div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
            {m.reasons.map((r,ri)=>(<span key={ri} style={{fontSize:11,padding:'3px 9px',borderRadius:99,background:'#ECFDF5',color:'#065F46',fontWeight:500}}>✓ {r}</span>))}
            {m.gaps.map((g,gi)=>(<span key={'g'+gi} style={{fontSize:11,padding:'3px 9px',borderRadius:99,background:'#FFFBEB',color:'#92400E',fontWeight:500}}>△ {g}</span>))}
          </div>)}
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>{if(track)track('fit_apply',{job_id:m.job.id});window.dispatchEvent(new CustomEvent('vercentic:viewJob',{detail:{jobId:m.job.id,apply:true}}));}} style={{...btnF,fontSize:13,padding:'9px 18px'}}>Apply now</button>
            <button onClick={()=>{if(track)track('fit_view',{job_id:m.job.id});window.dispatchEvent(new CustomEvent('vercentic:viewJob',{detail:{jobId:m.job.id}}));}} style={{...btnO,fontSize:13,padding:'7px 16px'}}>See full role</button>
          </div>
        </div>
      </div>))}
    </div>
    {enableAlerts&&results.length>0&&(<div style={{marginTop:28,padding:24,borderRadius:radius,background:primary+'0E',border:`1.5px solid ${primary}30`}}>
      {alertSaved?(<div style={{textAlign:'center',color:primary}}><div style={{fontSize:28,marginBottom:8}}>✓</div><p style={{margin:0,fontSize:14,fontWeight:600}}>You're on the list!</p><p style={{margin:'4px 0 0',fontSize:13,color:fgMuted}}>We'll notify you when new matching roles open.</p></div>):(<div>
        <p style={{margin:'0 0 14px',fontSize:14,fontWeight:600,color:fg}}>Want to know when new matching roles open?</p>
        <div style={{display:'flex',gap:8}}>
          <input type="email" value={alertEmail} onChange={e=>setAlertEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveAlert()} placeholder="your@email.com"
            style={{flex:1,padding:'10px 14px',borderRadius:radius,border:`1.5px solid ${primary}40`,fontSize:14,fontFamily,color:fg,background:cardBg,outline:'none'}}/>
          <button onClick={saveAlert} disabled={alertLoading||!alertEmail.includes('@')} style={{...btnF,padding:'10px 18px',fontSize:13,opacity:alertEmail.includes('@')?1:0.4}}>{alertLoading?'…':'Notify me'}</button>
        </div>
        <p style={{margin:'8px 0 0',fontSize:11,color:fgMuted}}>No account needed. Unsubscribe any time.</p>
      </div>)}
    </div>)}
  </W>);

  return null;
};

// ── Magic link request form — shown when candidate has no token ───────────────
const HubMagicLinkForm = ({ pr, ff, br, portal, prefillError }) => {
  const [email,   setEmail]   = useState('');
  const [status,  setStatus]  = useState('idle'); // idle | sending | sent | error
  const [devLink, setDevLink] = useState(null);
  const [msg,     setMsg]     = useState('');

  const submit = async (e) => {
    e?.preventDefault();
    if (!email.includes('@')) return;
    setStatus('sending');
    try {
      const url = '/api/candidate-hub/request-link';
      console.log('[hub] POSTing to:', url, 'portal.id:', portal.id);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), portal_id: portal.id }),
      });
      console.log('[hub] response status:', res.status);
      const d = await res.json();
      console.log('[hub] request-link response:', d);
      if (d.dev_link) setDevLink(d.dev_link);  // server now sends correct origin via X-App-Origin
      if (!res.ok || d.error) {
        setStatus('error');
        setMsg(d.error || 'Something went wrong. Please try again.');
        return;
      }
      setMsg(d.message || 'Check your email for your access link.');
      setStatus('sent');
    } catch {
      setStatus('error');
      setMsg('Something went wrong. Please try again.');
    }
  };

  return (
    <div style={{ maxWidth:460, margin:'40px auto', fontFamily:ff }}>
      <div style={{ background:'white', borderRadius:br, border:'1px solid #E5E7EB', boxShadow:'0 4px 24px rgba(0,0,0,.06)', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ background:`linear-gradient(135deg, ${pr} 0%, ${pr}CC 100%)`, padding:'28px 32px 24px' }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
            </svg>
          </div>
          <div style={{ fontSize:20, fontWeight:800, color:'white' }}>Track your application</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.8)', marginTop:4 }}>
            {portal.hub?.tagline || 'Enter your email and we\'ll send you a secure link to view your application status.'}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'28px 32px' }}>
          {prefillError && (
            <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8, background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', fontSize:13 }}>
              {prefillError}
            </div>
          )}

          {status === 'sent' ? (
            <div style={{ textAlign:'center', padding:'8px 0' }}>
              <div style={{ width:52, height:52, borderRadius:'50%', background:'#ECFDF5', border:'2px solid #86EFAC', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div style={{ fontSize:16, fontWeight:700, color:'#111827', marginBottom:6 }}>Check your email</div>
              <div style={{ fontSize:13, color:'#6B7280', lineHeight:1.6 }}>{msg}</div>
              {devLink && (
                <div style={{ marginTop:20, padding:'14px 16px', background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:8, textAlign:'left' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#C2410C', marginBottom:8 }}>⚡ Dev mode — click to open your hub:</div>
                  <a href={devLink}
                    style={{ display:'inline-block', padding:'9px 18px', borderRadius:8, background:pr, color:'white', fontSize:13, fontWeight:700, textDecoration:'none' }}>
                    Open My Applications →
                  </a>
                  <div style={{ fontSize:10, color:'#C2410C', marginTop:8, wordBreak:'break-all', opacity:0.7 }}>{devLink}</div>
                </div>
              )}
              <button onClick={() => { setStatus('idle'); setEmail(''); setDevLink(null); }}
                style={{ marginTop:20, fontSize:13, color:pr, background:'none', border:'none', cursor:'pointer', fontFamily:ff, textDecoration:'underline' }}>
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                style={{ width:'100%', padding:'11px 14px', borderRadius:8, border:`1.5px solid ${email.includes('@') ? pr : '#E5E7EB'}`, fontSize:14, fontFamily:ff, outline:'none', boxSizing:'border-box', marginBottom:14, transition:'border-color .15s' }}
              />
              <button type="submit" disabled={status==='sending' || !email.includes('@')}
                style={{ width:'100%', padding:'12px', borderRadius:br, border:'none', background: email.includes('@') ? pr : '#E5E7EB', color: email.includes('@') ? 'white' : '#9CA3AF', fontSize:14, fontWeight:700, cursor: email.includes('@') ? 'pointer' : 'default', fontFamily:ff, transition:'all .15s' }}>
                {status === 'sending' ? 'Sending…' : 'Send me a link →'}
              </button>
              {status === 'error' && <div style={{ marginTop:10, fontSize:13, color:'#DC2626', textAlign:'center' }}>{msg}</div>}
              <div style={{ marginTop:14, fontSize:12, color:'#9CA3AF', textAlign:'center', lineHeight:1.5 }}>
                We'll send a secure link to your email. The link expires in 24 hours.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Candidate Hub Widget — self-service hub embedded inside a portal page ─────
const CandidateHubWidget = ({ cfg, theme, portal }) => {
  const pr = theme?.primaryColor || portal?.branding?.primary_color || '#4361EE';
  const ff = theme?.fontFamily   || portal?.branding?.font || 'inherit';
  const br = theme?.borderRadius || portal?.branding?.border_radius || '10px';

  // Token comes from ?token= query param
  const token = new URLSearchParams(window.location.search).get('token');

  const [state,   setState]   = useState(null);
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('applications');
  // Hoisted out of the Messages tab's render branch below — hooks can't be
  // called conditionally, and this helper only renders the currently active
  // tab's content, so a hook declared inside one tab's `if` block would be
  // skipped whenever a different tab is active.
  const [reply,   setReply]   = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!token) { setError('No access token in URL. Use the link sent by your recruiter.'); setLoading(false); return; }
    fetch(`/api/candidate-hub/verify/${token}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setState(d); setLoading(false); })
      .catch(() => { setError('Unable to load your hub. Please check your link and try again.'); setLoading(false); });
  }, [token]);

  // ── shared sub-components using portal theme ──
  const HubCard = ({ children }) => (
    <div style={{ background:'white', borderRadius:br, border:'1px solid #E5E7EB', boxShadow:'0 2px 8px rgba(0,0,0,.05)', overflow:'hidden', marginBottom:16 }}>
      {children}
    </div>
  );
  const HubHeader = ({ icon, title, count }) => (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 20px', borderBottom:'1px solid #E5E7EB', background:'#FAFAFA' }}>
      <div style={{ width:30, height:30, borderRadius:8, background:`${pr}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={pr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {HUB_ICONS[icon]?.split('M').filter(Boolean).map((seg,i)=><path key={i} d={`M${seg}`}/>)}
        </svg>
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#111827' }}>{title}</div>
        {count !== undefined && <div style={{ fontSize:11, color:'#9CA3AF', marginTop:1 }}>{count} {count===1?'item':'items'}</div>}
      </div>
    </div>
  );
  const HubEmpty = ({ text }) => (
    <div style={{ padding:'32px 20px', textAlign:'center', fontSize:13, color:'#9CA3AF' }}>{text}</div>
  );
  const HubSpinner = () => (
    <div style={{ padding:32, display:'flex', justifyContent:'center' }}>
      <div style={{ width:28, height:28, borderRadius:'50%', border:`3px solid ${pr}30`, borderTopColor:pr, animation:'hub-spin .8s linear infinite' }}/>
      <style>{`@keyframes hub-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  const HubBadge = ({ label, color }) => (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 9px', borderRadius:99, fontSize:11, fontWeight:700, background:`${color||pr}18`, color:color||pr, border:`1px solid ${color||pr}28`, whiteSpace:'nowrap' }}>{label}</span>
  );
  const statusCol = (s) => ({ 'Under Review':'#6B7280', 'Screening':'#D97706', 'Interview':'#7C3AED', 'Shortlisted':pr, 'Offer':'#0CA678', 'Hired':'#0CA678', 'Declined':'#DC2626', sent:pr, accepted:'#0CA678', declined:'#DC2626', completed:'#0CA678', cancelled:'#DC2626' }[s] || pr);

  const HubTabContent = ({ tabId }) => {
    const [items, setItems] = useState([]); const [load2, setLoad2] = useState(true);
    const url = `/api/candidate-hub/${token}/${tabId}`;
    useEffect(() => { fetch(url).then(r=>r.json()).then(d=>{setItems(Array.isArray(d)?d:[]);setLoad2(false);}).catch(()=>setLoad2(false)); }, [url]);
    if (load2) return <HubSpinner/>;

    if (tabId === 'applications') {
      if (!items.length) return <HubEmpty text="No applications on record yet."/>;
      return items.map(app => (
        <div key={app.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', borderBottom:'1px solid #E5E7EB' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#111827' }}>{app.job_title}</div>
            <div style={{ fontSize:12, color:'#9CA3AF', marginTop:2 }}>{[app.department,app.location].filter(Boolean).join(' · ')}</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
            <HubBadge label={app.status} color={statusCol(app.status)}/>
            <div style={{ fontSize:11, color:'#9CA3AF' }}>Applied {app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—'}</div>
          </div>
        </div>
      ));
    }

    if (tabId === 'interviews') {
      if (!items.length) return <HubEmpty text="No interviews scheduled yet."/>;
      return items.map(iv => (
        <div key={iv.id} style={{ padding:'16px 20px', borderBottom:'1px solid #E5E7EB', display:'flex', gap:14 }}>
          <div style={{ minWidth:48, textAlign:'center', background:`${pr}12`, borderRadius:10, padding:'8px 4px' }}>
            <div style={{ fontSize:20, fontWeight:800, color:pr, lineHeight:1 }}>{new Date(iv.date).getDate()}</div>
            <div style={{ fontSize:10, color:pr, fontWeight:600, marginTop:2 }}>{new Date(iv.date).toLocaleDateString('en-GB',{month:'short'}).toUpperCase()}</div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ fontSize:14, fontWeight:700, color:'#111827' }}>{iv.type_name}</span>
              <HubBadge label={iv.status} color={statusCol(iv.status)}/>
            </div>
            {iv.job_name && <div style={{ fontSize:12, color:'#6B7280' }}>{iv.job_name}</div>}
            <div style={{ fontSize:12, color:'#9CA3AF', marginTop:4 }}>{iv.time} · {iv.duration} min · {iv.format}</div>
            {iv.video_link && new Date(`${iv.date}T${iv.time||'00:00'}`) >= new Date() && (
              <a href={iv.video_link} target="_blank" rel="noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:8, padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600, background:pr, color:'white', textDecoration:'none' }}>Join Meeting</a>
            )}
          </div>
        </div>
      ));
    }

    if (tabId === 'offers') {
      if (!items.length) return <HubEmpty text="No offers yet."/>;
      return items.map(offer => (
        <div key={offer.id} style={{ padding:'20px', borderBottom:'1px solid #E5E7EB' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontSize:15, fontWeight:800, color:'#111827' }}>{offer.job_name||'Offer Letter'}</div>
            <HubBadge label={offer.status.replace(/_/g,' ')} color={statusCol(offer.status)}/>
          </div>
          {offer.base_salary && <div style={{ padding:'10px 14px', background:'#F9FAFB', borderRadius:8, border:'1px solid #E5E7EB', fontSize:14, fontWeight:700, color:'#111827', marginBottom:12 }}>
            Base: {new Intl.NumberFormat('en-US',{style:'currency',currency:offer.currency||'USD',maximumFractionDigits:0}).format(offer.base_salary)}
          </div>}
          {offer.start_date && <div style={{ fontSize:12, color:'#6B7280', marginBottom:12 }}>Start date: {new Date(offer.start_date).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</div>}
          {offer.status==='sent' && (
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={async()=>{await fetch(`/api/candidate-hub/${token}/offers/${offer.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'accept'})});setItems(prev=>prev.map(o=>o.id===offer.id?{...o,status:'accepted'}:o));}}
                style={{ flex:1, padding:'10px', borderRadius:br, border:'none', background:pr, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:ff }}>Accept Offer</button>
              <button onClick={async()=>{await fetch(`/api/candidate-hub/${token}/offers/${offer.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'decline'})});setItems(prev=>prev.map(o=>o.id===offer.id?{...o,status:'declined'}:o));}}
                style={{ flex:1, padding:'10px', borderRadius:br, border:'1.5px solid #DC2626', background:'transparent', color:'#DC2626', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:ff }}>Decline</button>
            </div>
          )}
          {offer.status==='accepted' && <div style={{ padding:'10px', background:'#ECFDF5', borderRadius:8, textAlign:'center', fontSize:13, fontWeight:700, color:'#0CA678' }}>✓ Offer Accepted — congratulations!</div>}
        </div>
      ));
    }

    if (tabId === 'messages') {
      return (
        <>
          {!items.length ? <HubEmpty text="No messages yet."/> : items.map(m => (
            <div key={m.id} style={{ padding:'14px 20px', borderBottom:'1px solid #E5E7EB', borderLeft:`3px solid ${m.direction==='inbound'?'#0CA678':pr}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <HubBadge label={m.type} color={m.direction==='inbound'?'#0CA678':pr}/>
                <span style={{ fontSize:11, color:'#9CA3AF' }}>{m.created_at ? new Date(m.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : ''}</span>
              </div>
              {m.subject && <div style={{ fontSize:13, fontWeight:700, color:'#111827', marginBottom:4 }}>{m.subject}</div>}
              <div style={{ fontSize:13, color:'#4B5563', lineHeight:1.6 }}>{m.body}</div>
            </div>
          ))}
          <div style={{ padding:'16px 20px' }}>
            <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={3} placeholder="Reply to your recruiter…" style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1.5px solid #E5E7EB', fontSize:13, fontFamily:ff, outline:'none', resize:'vertical', boxSizing:'border-box', marginBottom:10 }}/>
            <button onClick={async()=>{if(!reply.trim())return;setSending(true);await fetch(`/api/candidate-hub/${token}/messages`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:reply})});setReply('');setSending(false);}} disabled={sending||!reply.trim()}
              style={{ padding:'9px 18px', borderRadius:8, border:'none', background:reply.trim()?pr:'#E5E7EB', color:reply.trim()?'white':'#9CA3AF', fontSize:13, fontWeight:700, cursor:reply.trim()?'pointer':'default', fontFamily:ff }}>
              {sending?'Sending…':'Send'}
            </button>
          </div>
        </>
      );
    }

    if (tabId === 'documents') {
      if (!items.length) return <HubEmpty text="No documents uploaded yet."/>;
      return items.map(doc => (
        <div key={doc.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 20px', borderBottom:'1px solid #E5E7EB' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#111827' }}>{doc.name}</div>
            <div style={{ fontSize:11, color:'#9CA3AF' }}>{doc.file_type}</div>
          </div>
        </div>
      ));
    }
    return null;
  };

  const HUB_TABS = [
    { id:'applications', label:'Applications' },
    { id:'interviews',   label:'Interviews'   },
    { id:'offers',       label:'Offers'       },
    { id:'messages',     label:'Messages'     },
    { id:'documents',    label:'Documents'    },
  ].filter(t => !cfg?.hideTabs?.includes(t.id));

  if (loading) return <div style={{ padding:48, textAlign:'center' }}><div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid ${pr}30`, borderTopColor:pr, animation:'hub-spin .8s linear infinite', margin:'0 auto' }}/><style>{`@keyframes hub-spin{to{transform:rotate(360deg)}}`}</style></div>;

  // No token — show magic link request form
  if (!token || error) return (
    <HubMagicLinkForm pr={pr} ff={ff} br={br} portal={portal}
      prefillError={token ? error : null}/>
  );

  if (!state) return null;

  const { candidate } = state;
  const d = candidate?.data || {};

  return (
    <div style={{ maxWidth:760, margin:'0 auto', fontFamily:ff }}>
      {/* Candidate greeting */}
      <div style={{ marginBottom:24, padding:'20px 24px', borderRadius:br, background:`${pr}08`, border:`1px solid ${pr}20` }}>
        <div style={{ fontSize:20, fontWeight:800, color:'#111827' }}>Welcome back{d.first_name ? `, ${d.first_name}` : ''}! 👋</div>
        <div style={{ fontSize:13, color:'#6B7280', marginTop:4 }}>Here's everything about your application journey.</div>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:4, marginBottom:20, overflowX:'auto', paddingBottom:2 }}>
        {HUB_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'8px 16px', borderRadius:99, fontSize:13, fontWeight:tab===t.id?700:500, border:`1.5px solid ${tab===t.id?pr:'#E5E7EB'}`, background:tab===t.id?pr:'white', color:tab===t.id?'white':'#6B7280', cursor:'pointer', fontFamily:ff, whiteSpace:'nowrap', flexShrink:0, transition:'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content card */}
      <HubCard>
        <HubHeader icon="briefcase" title={HUB_TABS.find(t=>t.id===tab)?.label||tab} />
        <HubTabContent tabId={tab}/>
      </HubCard>
    </div>
  );
};

const HUB_ICONS = {
  briefcase: "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zm-8-4a2 2 0 012 2H10a2 2 0 012-2z",
  calendar:  "M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
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
    case 'people':  return <JobsWidget    cfg={cfg} theme={theme} portal={portal} api={api} track={track} defaultSlug="people"/>
    case 'list':    return <JobsWidget    cfg={cfg} theme={theme} portal={portal} api={api} track={track} defaultSlug={cfg.defaultSlug||'jobs'}/>
    case 'team':    return <TeamWidget    cfg={cfg} theme={theme} portal={portal} api={api}/>
    case 'form':    return <FormWidget    cfg={cfg} theme={theme}/>
    case 'job_list':       return <JobsWidget    cfg={{...cfg, compact:true}} theme={theme} portal={portal} api={api} track={track}/>
    case 'hm_profile':     return <TeamWidget    cfg={cfg} theme={theme} portal={portal} api={api}/>
    case 'multistep_form': return <MultistepFormWidget cfg={cfg} theme={theme} portal={portal} api={api} track={track}/>
    case 'find_your_fit':  return <FindYourFitWidget cfg={cfg} theme={theme} portal={portal} api={api} track={track}/>
    case 'html_embed':     return <HtmlEmbedWidget     cfg={cfg} theme={theme}/>
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
    case 'candidate_hub': return <CandidateHubWidget cfg={cfg} theme={theme} portal={portal} api={api}/>
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
    <nav aria-label="Main navigation" style={{ position: nav.overlay ? 'absolute' : nav.sticky !== false ? 'sticky' : 'relative', top:0, left:0, right:0, zIndex:100,
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
          {[
            /* Nav links or page tabs — pages already includes the hub page when enabled */
            ...(navLinks.length > 0
              ? navLinks.map((lnk, i) => (
                  <a key={lnk.id || `nav-${i}`} href={lnk.href||'#'}
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
              : pages.filter(pg => !pg._isHub).length > 1
                ? pages.filter(pg => !pg._isHub).map(pg => (
                    <button key={pg.id} onClick={()=>onNav(pg)}
                      style={{ background:'none', border:'none', cursor:'pointer', padding:'6px 14px', borderRadius:8,
                        fontSize:14, fontWeight:currentPage?.id===pg.id?700:500,
                        color:currentPage?.id===pg.id?activeCol:fg,
                        fontFamily:theme.fontFamily }}>
                      {pg.name}
                    </button>
                  ))
                : []
            ),
            /* Hub page button — always shown when enabled, regardless of nav link mode */
            portal.hub?.enabled && (
              <button key="__hub__" onClick={() => onNav(pages.find(pg => pg._isHub))}
                style={{ background: currentPage?._isHub ? activeCol : 'none',
                  border: currentPage?._isHub ? 'none' : `1.5px solid ${activeCol}40`,
                  cursor:'pointer', padding:'6px 16px', borderRadius:8,
                  fontSize:14, fontWeight:600,
                  color: currentPage?._isHub ? 'white' : activeCol,
                  fontFamily:theme.fontFamily, transition:'all .15s' }}>
                {portal.hub?.nav_label || 'My Applications'}
              </button>
            ),
          ].filter(Boolean)}
        </div>
      </div>
    </nav>
  )
}

// ── Portal Copilot (inline, reads portal.copilot config) ─────────────────────
// ─── Editable, prefillable application-confirmation card ──────────────────────
// Rendered inline in the copilot transcript whenever we have a candidate's
// details to confirm — either parsed from an uploaded CV or collected by the
// AI conversationally via an <APPLICATION> tag. Owns its own local field
// state (initialised once from `data`) so edits don't need to be lifted into
// the parent message list.
const ApplicationConfirmCard = ({ data, cvFileName, pr, ff, onSubmit }) => {
  const [fields, setFields] = useState({
    first_name: data.first_name || '',
    last_name:  data.last_name  || '',
    email:      data.email      || '',
    phone:      data.phone      || '',
    cover_note: data.cover_note || '',
  });
  const [status, setStatus] = useState('idle'); // idle | submitting | done | error
  const [errMsg, setErrMsg] = useState('');

  const set = (k, v) => setFields(f => ({ ...f, [k]: v }));
  const canSubmit = fields.first_name.trim() && fields.last_name.trim() && /\S+@\S+\.\S+/.test(fields.email);

  const inputStyle = { width:'100%', padding:'7px 10px', borderRadius:8, border:'1.5px solid #E5E7EB',
    fontSize:12, fontFamily:ff, outline:'none', boxSizing:'border-box' };
  const labelStyle = { fontSize:10, fontWeight:700, color:'#6B7280', marginBottom:3, textTransform:'uppercase', letterSpacing:.3 };

  if (status === 'done') {
    return (
      <div style={{ width:'100%', padding:'14px', borderRadius:12, background:'#F0FDF4', border:'1.5px solid #86EFAC', display:'flex', alignItems:'center', gap:10, boxSizing:'border-box' }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
        <div style={{ fontSize:12.5, color:'#166534', fontWeight:600 }}>Application submitted — we'll be in touch soon!</div>
      </div>
    );
  }

  return (
    <div style={{ width:'100%', padding:'14px', borderRadius:12, background:'#F9FAFB', border:`1.5px solid ${pr}30`, boxSizing:'border-box' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
        <div>
          <div style={labelStyle}>First Name</div>
          <input style={inputStyle} value={fields.first_name} onChange={e=>set('first_name', e.target.value)} placeholder="First name"/>
        </div>
        <div>
          <div style={labelStyle}>Last Name</div>
          <input style={inputStyle} value={fields.last_name} onChange={e=>set('last_name', e.target.value)} placeholder="Last name"/>
        </div>
      </div>
      <div style={{ marginBottom:8 }}>
        <div style={labelStyle}>Email</div>
        <input style={inputStyle} type="email" value={fields.email} onChange={e=>set('email', e.target.value)} placeholder="you@example.com"/>
      </div>
      <div style={{ marginBottom:8 }}>
        <div style={labelStyle}>Phone</div>
        <input style={inputStyle} type="tel" value={fields.phone} onChange={e=>set('phone', e.target.value)} placeholder="+971…"/>
      </div>
      <div style={{ marginBottom:10 }}>
        <div style={labelStyle}>Message (optional)</div>
        <textarea style={{ ...inputStyle, resize:'vertical', minHeight:50, fontFamily:ff }} value={fields.cover_note} onChange={e=>set('cover_note', e.target.value)} placeholder="A short note about your interest…"/>
      </div>
      {cvFileName && (
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, padding:'6px 10px', borderRadius:8, background:'white', border:'1px solid #E5E7EB' }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
          <span style={{ fontSize:11.5, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cvFileName}</span>
        </div>
      )}
      {status === 'error' && (
        <div style={{ fontSize:11.5, color:'#DC2626', marginBottom:8 }}>{errMsg || 'Something went wrong — please try again.'}</div>
      )}
      <button
        disabled={!canSubmit || status === 'submitting'}
        onClick={async () => {
          setStatus('submitting'); setErrMsg('');
          try {
            const res = await onSubmit(fields);
            if (res?.error) { setStatus('error'); setErrMsg(res.error); return; }
            setStatus('done');
          } catch {
            setStatus('error'); setErrMsg('Something went wrong — please try again.');
          }
        }}
        style={{ width:'100%', padding:'9px', borderRadius:8, border:'none', background: canSubmit ? pr : '#D1D5DB',
          color:'white', fontSize:12.5, fontWeight:700, cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily:ff }}>
        {status === 'submitting' ? 'Submitting…' : 'Submit Application'}
      </button>
    </div>
  );
};

// ─── Talent Community sign-up card ─────────────────────────────────────────
// Rendered whenever the assistant decides there's no strong-fit open role
// for the candidate (flagged via <TALENT_CTA>true</TALENT_CTA>) — offers a
// low-friction way to stay on file for future openings instead of a dead end.
// Prefilled from `prefill` (the CV parsed earlier this session, if any).
const TalentCommunityCard = ({ prefill, pr, ff, onSubmit, portalId }) => {
  // Sensible shape to render with immediately, before the admin-configured
  // field list (and which Talent Pool this connects to) has loaded from
  // /talent-community-fields — avoids a flash of an empty form.
  const DEFAULT_TC_FIELDS = [
    { api_key:'first_name', name:'First Name', field_type:'text',  required:true  },
    { api_key:'last_name',  name:'Last Name',  field_type:'text',  required:false },
    { api_key:'email',      name:'Email',      field_type:'email', required:true  },
    { api_key:'phone',      name:'Phone',      field_type:'phone', required:false },
  ];
  const [fieldsConfig, setFieldsConfig] = useState(DEFAULT_TC_FIELDS);
  const [poolName, setPoolName] = useState(null);
  const [fields, setFields] = useState({
    first_name: prefill?.first_name || '',
    last_name:  prefill?.last_name  || '',
    email:      prefill?.email      || '',
    phone:      prefill?.phone      || '',
  });
  const [status, setStatus] = useState('idle'); // idle | submitting | done | error
  const [errMsg, setErrMsg] = useState('');

  // Pull the admin-configured "fields to collect" + connected Talent Pool
  // for this portal (Settings → Copilot → Talent Community). Falls back to
  // the default 4 fields above on any error, so the form still works.
  useEffect(() => {
    if (!portalId) return;
    let cancelled = false;
    fetch(`${API_ORIGIN}/api/portal-copilot/talent-community-fields?portal_id=${portalId}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled || !Array.isArray(d.fields) || !d.fields.length) return;
        setFieldsConfig(d.fields);
        setPoolName(d.talent_pool_name || null);
        setFields(f => {
          const next = { ...f };
          d.fields.forEach(fc => {
            if (!(fc.api_key in next)) next[fc.api_key] = prefill?.[fc.api_key] || (fc.field_type === 'multi_select' ? [] : '');
          });
          return next;
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [portalId]);

  const set = (k, v) => setFields(f => ({ ...f, [k]: v }));
  const canSubmit = (fields.first_name || '').trim() && /\S+@\S+\.\S+/.test(fields.email || '');

  const inputStyle = { width:'100%', padding:'7px 10px', borderRadius:8, border:'1.5px solid #E5E7EB',
    fontSize:12, fontFamily:ff, outline:'none', boxSizing:'border-box' };
  const labelStyle = { fontSize:10, fontWeight:700, color:'#6B7280', marginBottom:3, textTransform:'uppercase', letterSpacing:.3 };

  if (status === 'done') {
    return (
      <div style={{ width:'100%', padding:'14px', borderRadius:12, background:'#F0FDF4', border:'1.5px solid #86EFAC', display:'flex', alignItems:'center', gap:10, boxSizing:'border-box' }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
        <div style={{ fontSize:12.5, color:'#166534', fontWeight:600 }}>
          {poolName ? `You've joined ${poolName} — we'll reach out when a great-fit role opens up!` : `You're on the list — we'll reach out when a great-fit role opens up!`}
        </div>
      </div>
    );
  }

  // Renders one input for a field, matched to its configured type.
  const renderField = (fc) => {
    const val = fields[fc.api_key] ?? (fc.field_type === 'multi_select' ? [] : '');
    if (fc.field_type === 'select' && Array.isArray(fc.options)) {
      return (
        <select style={inputStyle} value={val} onChange={e => set(fc.api_key, e.target.value)}>
          <option value="">Select…</option>
          {fc.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (fc.field_type === 'multi_select' && Array.isArray(fc.options)) {
      const arr = Array.isArray(val) ? val : [];
      return (
        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
          {fc.options.map(o => {
            const active = arr.includes(o);
            return (
              <button key={o} type="button" onClick={() => set(fc.api_key, active ? arr.filter(x => x !== o) : [...arr, o])}
                style={{ padding:'4px 9px', borderRadius:99, fontSize:10.5, fontWeight:600, cursor:'pointer', fontFamily:ff,
                  border:`1.5px solid ${active ? pr : '#E5E7EB'}`, background: active ? `${pr}15` : 'white', color: active ? pr : '#6B7280' }}>
                {o}
              </button>
            );
          })}
        </div>
      );
    }
    if (fc.field_type === 'textarea' || fc.field_type === 'long_text') {
      return <textarea style={{ ...inputStyle, minHeight:56, resize:'vertical' }} value={val} onChange={e => set(fc.api_key, e.target.value)} placeholder={fc.name}/>;
    }
    if (fc.field_type === 'boolean') {
      return (
        <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#374151', cursor:'pointer' }}>
          <input type="checkbox" checked={!!val} onChange={e => set(fc.api_key, e.target.checked)}/>
          {fc.name}
        </label>
      );
    }
    if (fc.field_type === 'date') {
      return <input style={inputStyle} type="date" value={val} onChange={e => set(fc.api_key, e.target.value)}/>;
    }
    const type = fc.field_type === 'email' ? 'email' : fc.field_type === 'phone' ? 'tel' : fc.field_type === 'number' ? 'number' : 'text';
    return <input style={inputStyle} type={type} value={val} onChange={e => set(fc.api_key, e.target.value)} placeholder={fc.name}/>;
  };

  // Keep the familiar compact 2-column first/last name row when both are
  // configured; everything else (including a solo first or last name)
  // stacks full-width in the admin-configured order.
  const firstIdx = fieldsConfig.findIndex(f => f.api_key === 'first_name');
  const lastIdx  = fieldsConfig.findIndex(f => f.api_key === 'last_name');
  const pairedNames = firstIdx !== -1 && lastIdx !== -1;
  const rest = fieldsConfig.filter(f => !(pairedNames && (f.api_key === 'first_name' || f.api_key === 'last_name')));

  return (
    <div style={{ width:'100%', padding:'14px', borderRadius:12, background:'#F9FAFB', border:`1.5px solid ${pr}30`, boxSizing:'border-box' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <div style={{ width:26, height:26, borderRadius:8, background:`${pr}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={pr} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </div>
        <div>
          <div style={{ fontSize:12.5, fontWeight:700, color:'#111827' }}>Join our Talent Community</div>
          {poolName && <div style={{ fontSize:10.5, color:'#6B7280', marginTop:1 }}>{poolName}</div>}
        </div>
      </div>

      {pairedNames && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
          <div><div style={labelStyle}>First Name</div>{renderField(fieldsConfig[firstIdx])}</div>
          <div><div style={labelStyle}>Last Name</div>{renderField(fieldsConfig[lastIdx])}</div>
        </div>
      )}

      {rest.map(fc => (
        <div key={fc.api_key} style={{ marginBottom:8 }}>
          {fc.field_type !== 'boolean' && (
            <div style={labelStyle}>{fc.name}{!fc.required && ' (optional)'}</div>
          )}
          {renderField(fc)}
        </div>
      ))}

      {status === 'error' && (
        <div style={{ fontSize:11.5, color:'#DC2626', marginBottom:8 }}>{errMsg || 'Something went wrong — please try again.'}</div>
      )}
      <button
        disabled={!canSubmit || status === 'submitting'}
        onClick={async () => {
          setStatus('submitting'); setErrMsg('');
          try {
            const res = await onSubmit(fields);
            if (res?.error) { setStatus('error'); setErrMsg(res.error); return; }
            setStatus('done');
          } catch {
            setStatus('error'); setErrMsg('Something went wrong — please try again.');
          }
        }}
        style={{ width:'100%', padding:'9px', borderRadius:8, border:'none', background: canSubmit ? pr : '#D1D5DB',
          color:'white', fontSize:12.5, fontWeight:700, cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily:ff }}>
        {status === 'submitting' ? 'Joining…' : 'Join Talent Community'}
      </button>
    </div>
  );
};

// Converts the copilot's markdown-ish reply text (and the candidate's own
// typed messages) into safe HTML: **bold** becomes <strong>, "- "/"* " lines
// become bullets, "1. " lines become a numbered list, and blank lines
// collapse into a single small paragraph gap. Previously this content was
// shown as raw text with whiteSpace:'pre-wrap', which left literal "**"
// markers visible and preserved every blank line from the AI's output
// verbatim (producing the oversized gaps between paragraphs). Mirrors the
// renderMessage()+sanitizeCopilot() pattern already used by the internal
// recruiter copilot in AI.jsx.
const renderCopilotMessage = (content) => {
  if (!content) return '';
  let html = content;
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/^(\d+)\. (.+)$/gm,
    `<div style="display:flex;gap:6px;padding:1px 0;"><span style="flex-shrink:0;font-weight:700;">$1.</span><span>$2</span></div>`);
  html = html.replace(/^[•\-*] (.+)$/gm,
    `<div style="display:flex;gap:6px;padding:1px 0;"><span style="flex-shrink:0;">•</span><span>$1</span></div>`);
  html = html.replace(/\n\n+/g, '</p><p style="margin:6px 0 0;">');
  html = html.replace(/\n/g, '<br/>');
  // Don't double-space consecutive bullet/numbered rows
  html = html.replace(/<br\/?>\s*(<div)/g, '$1');
  html = html.replace(/(<\/div>)\s*<br\/?>/g, '$1');
  html = `<p style="margin:0;">${html}</p>`;
  return html;
};

const PortalCopilot = ({ portal, api, onOpenChange }) => {
  const cop = portal.copilot || {};

  const pr  = portal.theme?.primaryColor || portal.branding?.primary_color || '#4361EE';
  const ff  = portal.theme?.fontFamily   || 'sans-serif';
  const br  = portal.theme?.buttonRadius || '12px';
  const name = cop.name || (portal.branding?.company_name ? `${portal.branding.company_name} Assistant` : 'Career Assistant');
  const subtitle = cop.subtitle || 'Explore roles & apply';
  const welcome = cop.welcome_message || `Hi! I'm ${name}. I can help you find the right role, answer questions about the company, and guide you through applying.`;
  const placeholder = cop.input_placeholder || 'Ask about roles…';
  const quickActions = cop.quick_actions?.length ? cop.quick_actions : [
    { label: 'Show open roles', prompt: 'What roles are currently open?' },
    { label: 'How to apply', prompt: 'How does the application process work?' },
  ];
  const [open, setOpen] = useState(false);
  const setOpenAndNotify = (v) => { setOpen(v); onOpenChange?.(v); };
  const [msgs, setMsgs] = useState([{ role:'assistant', content: welcome }]);
  // Keep a ref mirroring `msgs` so a follow-up send() fired right after a
  // setMsgs() call (e.g. auto-requesting recommendations after a CV parse)
  // always reads the latest history instead of a stale closure value.
  const msgsRef = useRef(msgs);
  const updateMsgs = (updater) => {
    setMsgs(m => {
      const next = typeof updater === 'function' ? updater(m) : updater;
      msgsRef.current = next;
      return next;
    });
  };
  const [input, setInput] = useState('');
  const [busy, setBusy]   = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  // CV attach/drag-drop state
  const fileRef = useRef(null);
  const ctaFileRef = useRef(null); // dedicated input for the welcome-screen "get recommendations" CTA
  const dragCounter = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [parsingCv, setParsingCv]   = useState(false);
  const [selectedJob, setSelectedJob] = useState(null); // last role discussed — used as apply context
  // Last CV parsed this session (details + the raw File) — kept in a ref so
  // clicking "Apply now" on a job card later can prefill an application
  // instantly, and so a "join talent community" card can reuse it too.
  const parsedCvRef = useRef(null);
  // Index (in `msgs`) of the message whose TalentCommunityCard the candidate
  // successfully submitted, or null if they haven't joined yet this session.
  // Without this, every assistant reply carrying <TALENT_CTA>true</TALENT_CTA>
  // spawns its own fresh (idle) join card — so if the assistant emits the tag
  // again later (e.g. in a closing/farewell message), a second empty form
  // appears underneath the first one's already-shown success confirmation.
  const [tcJoinedAt, setTcJoinedAt] = useState(null);

  // Hooks must run on every render regardless of config — the enabled check
  // happens here, after all hooks, not before them (was previously an early
  // return above the hook calls, which breaks if `cop.enabled` ever changes
  // for an already-mounted instance).
  if (!cop.enabled) return null;

  // Parse <JOB_CARDS>[...]</JOB_CARDS>, <APPLICATION>{...}</APPLICATION> and
  // <TALENT_CTA>true</TALENT_CTA> out of assistant replies.
  const parseReply = (raw) => {
    const tagRe = /<JOB_CARDS>([\s\S]*?)<\/JOB_CARDS>/gi;
    const appRe = /<APPLICATION>([\s\S]*?)<\/APPLICATION>/gi;
    const ctaRe = /<TALENT_CTA>([\s\S]*?)<\/TALENT_CTA>/gi;
    const cards = [];
    let application = null;
    let talentCta = false;
    let clean = raw;
    let m;
    while ((m = tagRe.exec(raw)) !== null) {
      try { const parsed = JSON.parse(m[1]); if (Array.isArray(parsed)) cards.push(...parsed); } catch {}
      clean = clean.replace(m[0], '').trim();
    }
    while ((m = appRe.exec(raw)) !== null) {
      try { application = JSON.parse(m[1]); } catch {}
      clean = clean.replace(m[0], '').trim();
    }
    while ((m = ctaRe.exec(raw)) !== null) {
      talentCta = /true/i.test(m[1].trim());
      clean = clean.replace(m[0], '').trim();
    }
    return { text: clean, cards, application, talentCta };
  };

  const send = async (text) => {
    const q = text || input.trim();
    if (!q) return;
    setInput(''); setBusy(true);
    // Read from the ref (not the `msgs` state closure) so a follow-up call
    // fired right after another setMsgs/updateMsgs (e.g. post-CV-parse
    // recommendations) always includes the very latest history.
    const newMsgs = [...msgsRef.current, { role:'user', content: q }];
    updateMsgs(newMsgs);
    try {
      // Strip any extra UI fields (e.g. `cards`) before sending — the
      // Anthropic API rejects message objects with fields beyond role/content.
      const res = await api.post('/portal-copilot/chat', {
        portal_id: portal.id,
        messages: newMsgs.map(m => ({ role: m.role, content: m.content })),
        context: cop.welcome_context || '',
      });
      const raw = res.reply || res.content || 'Sorry, I had trouble with that.';
      const { text, cards, application, talentCta } = parseReply(raw);
      updateMsgs(m => [...m, { role:'assistant', content: text || raw, cards: cards.length ? cards : undefined, application: application || undefined, talentCta: talentCta || undefined }]);
      // Remember the role being discussed so a later CV drop / apply has job context
      if (cards.length === 1) setSelectedJob(j => j || cards[0]);
    } catch {
      updateMsgs(m => [...m, { role:'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    }
    setBusy(false);
  };

  // ── CV attach / drag-drop / parse-and-prefill ─────────────────────────────
  const ACCEPTED_CV_RE = /\.(pdf|docx?|jpe?g|png)$/i;

  const processCvFile = async (file, { forRecommendations } = {}) => {
    if (!file) return;
    if (!ACCEPTED_CV_RE.test(file.name)) {
      updateMsgs(m => [...m, { role:'assistant', content: "I can only read PDF, Word (.doc/.docx) or image files for CVs — could you try again with one of those formats?" }]);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      updateMsgs(m => [...m, { role:'assistant', content: "That file's a bit large — please upload a CV under 10MB." }]);
      return;
    }
    updateMsgs(m => [...m, { role:'user', content: `📎 Uploaded: ${file.name}` }]);
    setParsingCv(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_ORIGIN}/api/cv-parse`, { method:'POST', body: fd });
      const data = await res.json();
      const p = data?.parsed;
      if (!p) throw new Error('parse failed');

      // Remember the parsed details + the raw file for the rest of this
      // session — an "Apply now" click on any job card, or a "join talent
      // community" prompt, can then prefill instantly with no retyping.
      parsedCvRef.current = {
        first_name: p.first_name || '',
        last_name:  p.last_name  || '',
        email:      p.email      || '',
        phone:      p.phone      || '',
        cover_note: p.summary    || '',
        cvFile: file,
      };

      if (forRecommendations) {
        // Recommendations-first entry point: the candidate hasn't chosen a
        // role yet, so don't jump straight to an application form — just
        // acknowledge the CV. The follow-up send() below surfaces matching
        // roles as job cards; "Apply now" on any of them uses parsedCvRef.
        updateMsgs(m => [...m, { role:'assistant', content: "Thanks! I've reviewed your CV — let me find the roles that best match your background…" }]);
      } else {
        // General attach/drop — the candidate's intent here is clearly "I
        // want to apply", so go straight to a prefilled application card.
        updateMsgs(m => [...m, {
          role:'assistant',
          content: "I've read your CV and pulled out your details below — please check everything's correct, fill in anything missing, then submit your application:",
          application: {
            ...parsedCvRef.current,
            job_id:    selectedJob?.id    || '',
            job_title: selectedJob?.title || '',
          },
          cvFile: file,
        }]);
      }
      setParsingCv(false);
      // If the CV was dropped via the "get recommendations" entry point,
      // follow up by asking the assistant to suggest matching open roles
      // from what it just learned about the candidate — this reuses the
      // existing <JOB_CARDS> pipeline in send()/parseReply(), so results
      // render with the same job-card UI as any other recommendation.
      // updateMsgs() keeps msgsRef in sync as each message lands, so by the
      // time this fires, send() reads the up-to-date history including the
      // acknowledgement message just pushed above — no stale-closure risk.
      if (forRecommendations) {
        const skills = Array.isArray(p.skills) ? p.skills.filter(Boolean).slice(0, 8).join(', ') : '';
        const bits = [
          p.current_title && `currently working as a ${p.current_title}`,
          skills && `with skills in ${skills}`,
          p.years_experience && `and about ${p.years_experience} years of experience`,
        ].filter(Boolean).join(' ');
        setTimeout(() => {
          send(`Based on my CV${bits ? ` — I'm ${bits}` : ''}, which of your open roles would be the best fit for me? Please recommend the best matches.`);
        }, 400);
      }
    } catch {
      updateMsgs(m => [...m, { role:'assistant', content: "Sorry, I couldn't read that file. You can still tell me your name and email and I'll help you apply." }]);
      setParsingCv(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) processCvFile(file);
  };

  // Dedicated handlers for the welcome-screen "drag or upload cv to get
  // recommendations" CTA — same parse pipeline, but flagged so processCvFile
  // fires the auto follow-up asking the assistant for matching roles.
  const handleCtaFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) processCvFile(file, { forRecommendations: true });
  };
  const handleCtaDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current = 0; setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processCvFile(file, { forRecommendations: true });
  };

  const onDragEnter = e => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; if (e.dataTransfer.types?.includes('Files')) setIsDragging(true); };
  const onDragOver  = e => { e.preventDefault(); e.stopPropagation(); };
  const onDragLeave = e => { e.preventDefault(); e.stopPropagation(); dragCounter.current = Math.max(0, dragCounter.current - 1); if (dragCounter.current === 0) setIsDragging(false); };
  const onDrop = e => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current = 0; setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processCvFile(file);
  };

  const submitApplication = async (fields, cvFile) => {
    const fd = new FormData();
    fd.append('portal_id', portal.id);
    if (fields.job_id)    fd.append('job_id', fields.job_id);
    if (fields.job_title) fd.append('job_title', fields.job_title);
    fd.append('first_name', fields.first_name || '');
    fd.append('last_name',  fields.last_name  || '');
    fd.append('email',      fields.email      || '');
    if (fields.phone)      fd.append('phone', fields.phone);
    if (fields.cover_note) fd.append('cover_note', fields.cover_note);
    if (cvFile) fd.append('cv', cvFile);
    const res = await fetch(`${API_ORIGIN}/api/portal-copilot/apply`, { method:'POST', body: fd });
    return res.json();
  };

  // Forwards whatever fields the admin configured for this portal's Talent
  // Community form (see TalentCommunityConfig in Portals.jsx) — not just the
  // old hardcoded first/last/email/phone set. Array values (multi_select)
  // are JSON-stringified so the backend can parse them back out.
  const submitTalentCommunity = async (fields) => {
    const fd = new FormData();
    fd.append('portal_id', portal.id);
    Object.entries(fields || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      fd.append(k, Array.isArray(v) ? JSON.stringify(v) : v);
    });
    if (parsedCvRef.current?.cvFile) fd.append('cv', parsedCvRef.current.cvFile);
    const res = await fetch(`${API_ORIGIN}/api/portal-copilot/join-community`, { method:'POST', body: fd });
    return res.json();
  };

  // "Apply now" on a job card — if we already have a CV parsed this session,
  // skip straight to a prefilled application card instead of making the
  // candidate re-type everything through the chat.
  const handleApplyClick = (job) => {
    setSelectedJob(job);
    if (parsedCvRef.current) {
      updateMsgs(m => [...m, {
        role:'assistant',
        content: `Great choice! I've prefilled your application for the ${job.title} role from your CV — please review and submit:`,
        application: {
          first_name: parsedCvRef.current.first_name,
          last_name:  parsedCvRef.current.last_name,
          email:      parsedCvRef.current.email,
          phone:      parsedCvRef.current.phone,
          cover_note: parsedCvRef.current.cover_note,
          job_id:    job.id,
          job_title: job.title,
        },
        cvFile: parsedCvRef.current.cvFile,
      }]);
    } else {
      send(`I'd like to apply for the ${job.title} role.`);
    }
  };

  const btnStyle = { padding:'10px 20px', borderRadius:br, background:pr, color:'white', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:ff };

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button onClick={() => setOpenAndNotify(true)}
          style={{ position:'fixed', bottom:24, right:24, zIndex:9000, width:56, height:56, borderRadius:'50%',
            background:pr, color:'white', border:'none', cursor:'pointer', boxShadow:`0 4px 20px ${pr}60`,
            display:'flex', alignItems:'center', justifyContent:'center', transition:'transform .2s' }}
          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
          onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
          {cop.avatar_url
            ? <img src={cop.avatar_url} alt="" style={{ width:56, height:56, borderRadius:'50%', objectFit:'cover' }}/>
            : <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          }
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          style={{ position:'fixed', bottom:16, right:16, zIndex:9000, width: Math.min(380, window.innerWidth - 32),
          boxShadow:'0 8px 40px rgba(0,0,0,.2)', borderRadius:16, overflow:'hidden',
          display:'flex', flexDirection:'column', background:'white', fontFamily:ff,
          height: Math.min(cop.widget_height || 580, window.innerHeight - 40) }}>
          {/* Drag-and-drop overlay — dashed drop-zone box rather than a full
              solid-color wash, so the panel's content stays legible behind it */}
          {isDragging && (
            <div style={{ position:'absolute', inset:0, zIndex:20, background:'rgba(255,255,255,.94)', display:'flex',
              alignItems:'center', justifyContent:'center', pointerEvents:'none', padding:18 }}>
              <div style={{ width:'100%', height:'100%', border:`2px dashed ${pr}`, borderRadius:14, background:`${pr}0d`,
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:pr, gap:8 }}>
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={pr} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                <div style={{ fontSize:14, fontWeight:700 }}>Drop your CV here</div>
              </div>
            </div>
          )}
          {/* Header */}
          <div style={{ padding:'12px 16px', background:pr, display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,.18)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {cop.avatar_url
                ? <img src={cop.avatar_url} alt="" style={{ width:36, height:36, objectFit:'cover' }}/>
                : <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              }
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:800, color:'white' }}>{name}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.7)' }}>{subtitle}</div>
            </div>
            <button onClick={() => setOpenAndNotify(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.7)', padding:4, display:'flex' }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display:'flex', justifyContent: m.role==='user' ? 'flex-end' : 'flex-start', flexDirection:'column', alignItems: m.role==='user' ? 'flex-end' : 'flex-start', gap:8 }}>
                {/* Text bubble — only if there's text */}
                {m.content && (
                  // The very first message is the assistant's welcome/intro
                  // line — render it full width rather than as a constrained
                  // chat bubble, since it's introductory copy, not a reply.
                  <div style={{ ...(i===0 ? { width:'100%' } : { maxWidth:'82%' }), padding:'9px 13px', borderRadius: m.role==='user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                    background: m.role==='user' ? pr : '#F3F4F6', color: m.role==='user' ? 'white' : '#111827', fontSize:13, lineHeight:1.6,
                    wordBreak:'break-word' }}
                    dangerouslySetInnerHTML={{ __html: sanitizeCopilot(renderCopilotMessage(m.content)) }}/>
                )}
                {/* Job cards */}
                {m.cards?.length > 0 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:8, width:'100%' }}>
                    {m.cards.map((job, ji) => (
                      // Two explicit actions per card — "View details" asks the
                      // assistant to expand on the role in chat; "Apply now"
                      // jumps straight to (a prefilled, if we have a parsed CV)
                      // application card. Matches what the system prompt already
                      // tells the AI the candidate sees.
                      <div key={ji}
                        style={{ background:'white', border:`1.5px solid ${pr}22`, borderRadius:12, padding:'12px 14px',
                        boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#111827', marginBottom:2 }}>{job.title}</div>
                        {(job.department || job.location) && (
                          <div style={{ fontSize:11, color:'#6B7280', marginBottom:6 }}>
                            {[job.department, job.location].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        {(job.work_type || job.employment_type) && (
                          <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
                            {[job.work_type, job.employment_type].filter(Boolean).map((tag,ti) => (
                              <span key={ti} style={{ fontSize:10, padding:'2px 7px', borderRadius:99, background:`${pr}15`, color:pr, fontWeight:600 }}>{tag}</span>
                            ))}
                          </div>
                        )}
                        <div style={{ display:'flex', gap:6, marginTop: (job.work_type || job.employment_type) ? 0 : 6 }}>
                          <button
                            onClick={() => { setSelectedJob(job); send(`Tell me more about the ${job.title}${job.department ? ` role in ${job.department}` : ' role'}.`); }}
                            style={{ flex:1, padding:'7px 10px', borderRadius:8, border:`1.5px solid ${pr}40`, background:'transparent', color:pr, fontSize:11.5, fontWeight:700, cursor:'pointer', fontFamily:ff }}>
                            View details
                          </button>
                          <button
                            onClick={() => handleApplyClick(job)}
                            style={{ flex:1, padding:'7px 10px', borderRadius:8, border:'none', background:pr, color:'white', fontSize:11.5, fontWeight:700, cursor:'pointer', fontFamily:ff }}>
                            Apply now
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* No strong-fit role — offer to join the talent community instead.
                    Gated on tcJoinedAt so that once the candidate has successfully
                    joined via one of these cards, any later <TALENT_CTA>true</TALENT_CTA>
                    the assistant emits (e.g. in a closing/farewell reply) doesn't spawn
                    a second, fresh "idle" join form under the existing success message. */}
                {m.talentCta && (tcJoinedAt === null || tcJoinedAt === i) && (
                  <TalentCommunityCard
                    prefill={parsedCvRef.current}
                    pr={pr}
                    ff={ff}
                    onSubmit={async (fields) => {
                      const res = await submitTalentCommunity(fields);
                      if (!res?.error) setTcJoinedAt(i);
                      return res;
                    }}
                    portalId={portal.id}
                  />
                )}
                {/* Application confirmation — from a parsed CV or an AI-collected <APPLICATION> tag */}
                {m.application && (
                  <ApplicationConfirmCard
                    data={m.application}
                    cvFileName={m.cvFile?.name}
                    pr={pr}
                    ff={ff}
                    onSubmit={(fields) => submitApplication(fields, m.cvFile)}
                  />
                )}
              </div>
            ))}
            {parsingCv && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 14px', fontSize:12, color:'#6B7280' }}>
                <div style={{ width:14, height:14, border:`2px solid ${pr}30`, borderTop:`2px solid ${pr}`, borderRadius:'50%', animation:'spin .8s linear infinite', flexShrink:0 }}/>
                Reading your CV…
              </div>
            )}
            {busy && (
              <div style={{ display:'flex', gap:4, padding:'10px 14px' }}>
                {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:pr+'80', animation:`pulse 1.2s ${i*0.2}s infinite` }}/>)}
              </div>
            )}
            {/* Quick actions + CV recommendations CTA (shown only on first message) */}
            {msgs.length === 1 && (
              <>
                <input ref={ctaFileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleCtaFileSelect} style={{ display:'none' }}/>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => ctaFileRef.current?.click()}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctaFileRef.current?.click(); } }}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={handleCtaDrop}
                  style={{ border:`1.5px dashed ${pr}55`, borderRadius:12, padding:'11px 13px', display:'flex', alignItems:'center', gap:10,
                    cursor:'pointer', background:`${pr}08`, transition:'background .15s, border-color .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${pr}14`; e.currentTarget.style.borderColor = pr; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${pr}08`; e.currentTarget.style.borderColor = `${pr}55`; }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:`${pr}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={pr} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:700, color:'#111827' }}>Drag or upload your CV</div>
                    <div style={{ fontSize:11, color:'#6B7280' }}>Get personalised role recommendations</div>
                  </div>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
                  {quickActions.map((qa, i) => (
                    <button key={i} onClick={() => send(qa.prompt)}
                      style={{ padding:'6px 12px', borderRadius:99, border:`1.5px solid ${pr}`, background:'transparent', color:pr, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:ff }}>
                      {qa.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{ padding:'10px 12px', borderTop:'1px solid #E5E7EB', display:'flex', gap:6, flexShrink:0, alignItems:'center' }}>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileSelect} style={{ display:'none' }}/>
            <button onClick={() => fileRef.current?.click()} title="Attach CV / Resume" disabled={parsingCv}
              style={{ width:34, height:34, borderRadius:10, border:'1.5px solid #E5E7EB', background:'transparent', color:'#6B7280',
                cursor: parsingCv ? 'default' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } }}
              placeholder={placeholder}
              style={{ flex:1, padding:'9px 12px', borderRadius:10, border:'1.5px solid #E5E7EB', fontSize:13, fontFamily:ff, outline:'none' }}/>
            <button onClick={() => send()}
              style={{ padding:'9px 14px', borderRadius:10, background:pr, color:'white', border:'none', cursor:'pointer', flexShrink:0 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z"/></svg>
            </button>
          </div>
          <style>{`@keyframes pulse{0%,80%,100%{opacity:.3}40%{opacity:1}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </>
  );
};

export default function PortalPageRenderer({ portal, api }) {
  // Merge rather than pick one wholesale — see portalBranding.js for why.
  const theme = mergePortalBranding(portal)
  const rawPages = portal.pages || []

  // ── Inject the hub as a virtual page when enabled ───────────────────────
  const HUB_PAGE = { id:'__hub__', name: portal.hub?.nav_label || 'My Applications', slug:'/hub', _isHub:true, rows:[] }
  const pages = portal.hub?.enabled ? [...rawPages, HUB_PAGE] : rawPages

  // ── Determine initial page — check ?page= or ?token= in URL ─────────────
  const _initPage = (() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('token') || params.get('page') === 'hub') return HUB_PAGE
    return pages[0] || null
  })()

  const [currentPage,   setCurrentPage]   = useState(_initPage)
  const [consentGiven,  setConsentGiven]  = useState(()=>!!localStorage.getItem('vc_consent_'+portal.id))
  const [showConsent,   setShowConsent]   = useState(false)
  const [appStatus,     setAppStatus]     = useState(null)  // application status page state
  const [appLoading,    setAppLoading]    = useState(false)
  const [copilotOpen,   setCopilotOpen]   = useState(false)

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
      <FeedbackWidget portal={portal} currentPageSlug={currentPage?.slug || "/"} api={api} rightOffset={20}/>
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
      {/* WCAG P1-5: Skip navigation link */}
      <a href="#vc-main" style={{ position:'absolute', top:'-100vh', left:16, zIndex:10000, padding:'8px 16px', background:pr, color:'#fff', fontWeight:700, fontSize:14, borderRadius:'0 0 8px 8px', textDecoration:'none', fontFamily:ff }}
        onFocus={e=>e.currentTarget.style.top='0'} onBlur={e=>e.currentTarget.style.top='-100vh'}>Skip to main content</a>
      <PortalNav portal={portal} theme={theme} currentPage={currentPage} onNav={setCurrentPage} pages={pages}/>

      {/* Hub page — renders CandidateHubWidget inside the portal layout */}
      <main id="vc-main" tabIndex={-1} style={{outline:'none'}}>
      {currentPage?._isHub ? (
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'48px 24px' }}>
          <CandidateHubWidget cfg={portal.hub||{}} theme={theme} portal={portal} api={api}/>
        </div>
      ) : (
        (currentPage?.rows||[]).map(row => <PortalRow key={row.id} row={row} theme={theme} portal={portal} api={api} track={track}/>)
      )}
      </main>

      <PortalFooter portal={portal} theme={theme}/>
      <FeedbackWidget portal={portal} currentPageSlug={currentPage?.slug || "/"} api={api} forcePosition={portal.copilot?.enabled ? 'bottom-left' : undefined}/>
      <PortalCopilot portal={portal} api={api} onOpenChange={setCopilotOpen}/>

      {/* GDPR Consent Banner */}
      {showConsent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="vc-gdpr-title"
          style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:9999, background:gdpr.bannerBg||'#0F1729', color:gdpr.bannerText||'#F9FAFB', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, boxShadow:'0 -4px 20px rgba(0,0,0,.2)', fontFamily:ff }}>
          <span id="vc-gdpr-title" style={{position:'absolute',width:1,height:1,overflow:'hidden',clip:'rect(0,0,0,0)',whiteSpace:'nowrap'}}>Cookie consent</span>
          <p style={{ margin:0, flex:1, minWidth:200, fontSize:14, lineHeight:1.5, opacity:0.9 }}>
            {gdpr.message || 'We use cookies to improve your experience on this career site. By continuing, you agree to our use of analytics cookies.'}
            {gdpr.privacyUrl && <> <a href={gdpr.privacyUrl} target="_blank" rel="noreferrer" style={{ color:pr, marginLeft:4 }}>Privacy policy</a></>}
          </p>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <button onClick={declineConsent} autoFocus style={{ padding:'8px 16px', borderRadius:br, border:'1px solid rgba(255,255,255,.3)', background:'transparent', color:'inherit', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:ff }}>
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

