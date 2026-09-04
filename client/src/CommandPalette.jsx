// client/src/CommandPalette.jsx
// Cmd+K command palette — navigate anywhere, create records, search candidates/jobs.
import { useState, useEffect, useRef, useCallback } from 'react';
import api from './apiClient.js';

const C = {
  bg:'rgba(10,14,30,0.6)', card:'#ffffff', border:'#e5e7eb',
  text1:'#0D0D0F', text2:'#374151', text3:'#9ca3af',
  accent:'#4361EE', accentL:'#EEF2FF', hover:'#f9fafb',
  green:'#10b981', amber:'#f59e0b', red:'#ef4444',
};
const F = "'DM Sans', -apple-system, sans-serif";

const SVG = ({ d, s=16, c='currentColor' }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d)?d:[d]).map((p,i)=><path key={i} d={p}/>)}
  </svg>
);

const ICONS = {
  search:    'M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z',
  people:    ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2','M9 11a4 4 0 100-8 4 4 0 000 8','M23 21v-2a4 4 0 00-3-3.87','M16 3.13a4 4 0 010 7.75'],
  jobs:      ['M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2','M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2'],
  dashboard: ['M3 3h7v7H3z','M14 3h7v7h-7z','M3 14h7v7H3z','M14 14h7v7h-7z'],
  settings:  'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
  plus:      'M12 5v14M5 12h14',
  calendar:  ['M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2','M16 2v4M8 2v4M3 10h18'],
  reports:   ['M18 20V10','M12 20V4','M6 20v-6'],
  interviews:['M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2','M16 2v4M8 2v4','M3 10h18','M8 14h.01M12 14h.01M16 14h.01'],
  nav:       'M9 18l6-6-6-6',
  chat:      ['M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'],
  sourcing:  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  offers:    'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  record:    ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z','M14 2v6h6','M16 13H8M16 17H8M10 9H8'],
};

const STATIC_COMMANDS = (navObjects=[]) => {
  const pages = [
    { id:'nav_dashboard', label:'Go to Dashboard',   icon:'dashboard',  action:'navigate', nav:'dashboard',  group:'Navigation', keys:['D'] },
    { id:'nav_reports',   label:'Go to Reports',     icon:'reports',    action:'navigate', nav:'reports',    group:'Navigation', keys:['R'] },
    { id:'nav_calendar',  label:'Go to Calendar',    icon:'calendar',   action:'navigate', nav:'calendar',   group:'Navigation', keys:[] },
    { id:'nav_interviews',label:'Go to Interviews',  icon:'interviews', action:'navigate', nav:'interviews', group:'Navigation', keys:[] },
    { id:'nav_settings',  label:'Go to Settings',    icon:'settings',   action:'navigate', nav:'settings',   group:'Navigation', keys:['G','S'] },
    { id:'nav_chat',      label:'Go to Chat',        icon:'chat',       action:'navigate', nav:'chat',       group:'Navigation', keys:[] },
    { id:'nav_sourcing',  label:'Go to Sourcing',    icon:'sourcing',   action:'navigate', nav:'sourcing',   group:'Navigation', keys:[] },
    { id:'nav_offers',    label:'Go to Offers',      icon:'offers',     action:'navigate', nav:'offers',     group:'Navigation', keys:[] },
  ];
  const creates = navObjects.map(o => ({
    id:`create_${o.slug}`, label:`New ${o.name}`, icon:'plus',
    action:'create', objectId:o.id, objectSlug:o.slug, objectName:o.name, nav:`obj_${o.id}`,
    group:'Create', color: o.color,
  }));
  return [...pages, ...creates];
};

function highlight(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return <>
    {text.slice(0, idx)}
    <mark style={{ background:'#fef08a', borderRadius:3, padding:'0 1px' }}>{text.slice(idx, idx+query.length)}</mark>
    {text.slice(idx+query.length)}
  </>;
}

function CommandItem({ item, active, onSelect, query }) {
  const ref = useRef(null);
  useEffect(() => { if (active) ref.current?.scrollIntoView({ block:'nearest' }); }, [active]);
  return (
    <div ref={ref} onClick={onSelect}
      style={{
        display:'flex', alignItems:'center', gap:10, padding:'9px 14px', cursor:'pointer',
        background: active ? C.accentL : 'transparent', borderRadius:8, transition:'background .1s',
      }}
      onMouseEnter={e => { if(!active) e.currentTarget.style.background=C.hover; }}
      onMouseLeave={e => { if(!active) e.currentTarget.style.background='transparent'; }}>
      <div style={{
        width:30, height:30, borderRadius:8, flexShrink:0,
        background: item.color ? `${item.color}18` : C.accentL,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        {item.icon && <SVG d={ICONS[item.icon]||ICONS.record} s={14} c={item.color||C.accent}/>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{highlight(item.label, query)}</div>
        {item.subtitle && <div style={{ fontSize:11, color:C.text3, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{item.subtitle}</div>}
      </div>
      <div style={{ display:'flex', gap:4, flexShrink:0 }}>
        {item.group && <span style={{ fontSize:10, fontWeight:600, color:C.text3, background:C.hover, padding:'2px 6px', borderRadius:4 }}>{item.group}</span>}
        {item.keys?.length>0 && <span style={{ fontSize:10, fontWeight:700, color:C.accent, background:C.accentL, padding:'2px 6px', borderRadius:4 }}>{item.keys.join('+')}</span>}
      </div>
    </div>
  );
}

export default function CommandPalette({ open, onClose, navObjects=[], environment, onNavigate, onCreateRecord }) {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [active,    setActive]    = useState(0);
  const [searching, setSearching] = useState(false);
  const inputRef  = useRef(null);
  const searchRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (open) { setQuery(''); setActive(0); setTimeout(()=>inputRef.current?.focus(), 50); }
  }, [open]);

  // Static commands
  const statics = STATIC_COMMANDS(navObjects);

  // Debounced record search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      const filtered = statics.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));
      setResults(filtered.slice(0,12));
      return;
    }
    clearTimeout(searchRef.current);
    setSearching(true);
    searchRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/records/search?q=${encodeURIComponent(query)}&environment_id=${environment?.id}&limit=8`);
        const records = Array.isArray(res) ? res : (res.results||[]);
        const recordItems = records.map(r => ({
          id:`record_${r.id}`, label:r.display_name||r.data?.first_name||r.name||'Record',
          subtitle:`${r.object_name} · ${r.data?.status||''}`.replace(/ · $/,''),
          icon:'record', action:'open_record', recordId:r.id, objectId:r.object_id,
          group:'Records', color:r.object_color,
        }));
        const cmdFiltered = statics.filter(c=>c.label.toLowerCase().includes(query.toLowerCase())).slice(0,4);
        setResults([...cmdFiltered, ...recordItems].slice(0,14));
      } catch (_) {
        setResults(statics.filter(c=>c.label.toLowerCase().includes(query.toLowerCase())).slice(0,12));
      }
      setSearching(false);
      setActive(0);
    }, 180);
  }, [query, environment?.id]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (e.key === 'ArrowDown')  { e.preventDefault(); setActive(a => Math.min(a+1, results.length-1)); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setActive(a => Math.max(a-1, 0)); }
      if (e.key === 'Enter')      { e.preventDefault(); if (results[active]) execItem(results[active]); }
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, results, active]);

  const execItem = useCallback((item) => {
    onClose();
    if (item.action === 'navigate') { onNavigate?.(item.nav); }
    else if (item.action === 'create') {
      onNavigate?.(item.nav);
      setTimeout(() => window.dispatchEvent(new CustomEvent('vercentic:quick-create', { detail: item.objectSlug })), 200);
    } else if (item.action === 'open_record') {
      window.dispatchEvent(new CustomEvent('vercentic:openRecord', { detail: { recordId: item.recordId, objectId: item.objectId } }));
    }
  }, [onClose, onNavigate]);

  // Group results
  const grouped = results.reduce((acc, item) => {
    const g = item.group || 'Other';
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  if (!open) return null;

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:C.bg, zIndex:9900, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'80px 20px 20px', fontFamily:F }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ width:'100%', maxWidth:600, background:C.card, borderRadius:18, overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,.28)', border:`1px solid ${C.border}` }}>

        {/* Search bar */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', borderBottom:`1px solid ${C.border}` }}>
          <SVG d={ICONS.search} s={18} c={C.text3}/>
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
            placeholder="Search records, navigate, create…"
            style={{ flex:1, border:'none', outline:'none', fontSize:16, fontFamily:F, color:C.text1, background:'transparent' }}/>
          {searching && <div style={{ width:16, height:16, border:`2px solid ${C.accentL}`, borderTop:`2px solid ${C.accent}`, borderRadius:'50%', animation:'spin .7s linear infinite' }}/>}
          <kbd style={{ fontSize:11, padding:'2px 6px', borderRadius:5, border:`1px solid ${C.border}`, color:C.text3, background:C.hover, fontFamily:'monospace' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight:420, overflowY:'auto', padding:'6px 8px' }}>
          {results.length === 0 && query && !searching && (
            <div style={{ padding:'24px 0', textAlign:'center', color:C.text3, fontSize:13 }}>
              No results for "{query}"
            </div>
          )}
          {results.length === 0 && !query && (
            <div style={{ padding:'8px 6px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4, padding:'4px 8px' }}>Quick actions</div>
              {statics.slice(0,8).map((item,i) => (
                <CommandItem key={item.id} item={item} active={i===active} onSelect={()=>execItem(item)} query={query}/>
              ))}
            </div>
          )}
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'.06em', padding:'8px 14px 2px' }}>{group}</div>
              {items.map((item) => {
                const globalIdx = results.indexOf(item);
                return <CommandItem key={item.id} item={item} active={globalIdx===active} onSelect={()=>execItem(item)} query={query}/>;
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding:'8px 14px', borderTop:`1px solid ${C.border}`, display:'flex', gap:16, fontSize:11, color:C.text3 }}>
          {[['↑↓','Navigate'],['↵','Select'],['Esc','Close']].map(([k,l])=>(
            <div key={k} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <kbd style={{ padding:'1px 5px', borderRadius:4, border:`1px solid ${C.border}`, background:C.hover, fontFamily:'monospace', fontSize:10 }}>{k}</kbd>
              <span>{l}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
