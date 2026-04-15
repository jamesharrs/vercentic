import { useState, useEffect, useCallback } from 'react';
import api from './apiClient.js';

const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  accent: '#4361EE', accentLight: '#EEF2FF',
  text1: '#1a1a2e', text2: '#4a5568', text3: '#9ca3af',
  border: '#e5e7eb', surface: '#ffffff', bg: '#f8f9fc',
  green: '#0CA678', purple: '#7C3AED', amber: '#F59F00', red: '#E03131', blue: '#3B5BDB',
};

const ICON_PATHS = {
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  zap: "M13 2L3 14h9l-1 10 10-12h-9l1-10z",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6z",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  clock: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
  moon: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  check: "M20 6L9 17l-5-5",
  sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
};
const Ic = ({ n, s = 16, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={ICON_PATHS[n] || ICON_PATHS.bell} /></svg>
);

const Toggle = ({ checked, onChange, size = 'md', disabled = false }) => {
  const w = size === 'sm' ? 34 : 42, h = size === 'sm' ? 18 : 22, dot = size === 'sm' ? 12 : 16;
  return (
    <button onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      style={{ width: w, height: h, borderRadius: h, border: 'none', padding: 0,
        background: checked ? C.accent : '#d1d5db', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background .2s', opacity: disabled ? 0.5 : 1, flexShrink: 0 }}>
      <div style={{ width: dot, height: dot, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: (h - dot) / 2, left: checked ? w - dot - 3 : 3,
        transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
    </button>
  );
};

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const TIMEZONES = ['Asia/Dubai','Asia/Riyadh','Asia/Qatar','Asia/Singapore','Europe/London','Europe/Berlin','Europe/Paris','America/New_York','America/Chicago','America/Los_Angeles','Australia/Sydney','Pacific/Auckland'];

export default function NotificationsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [digestConfig, setDigestConfig] = useState({ daily_time: '08:00', weekly_day: 'friday', timezone: 'Asia/Dubai', frequency: 'weekdays' });
  const [matchThreshold, setMatchThreshold] = useState(75);
  const [quietHours, setQuietHours] = useState({ enabled: false, start: '22:00', end: '07:00' });
  const [expandedCat, setExpandedCat] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get('/notification-preferences');
      setCategories(data.categories || []);
      setTypes(data.types || []);
      setDigestConfig(data.digest_config || { daily_time: '08:00', weekly_day: 'friday', timezone: 'Asia/Dubai', frequency: 'weekdays' });
      setMatchThreshold(data.match_threshold || 75);
      setQuietHours(data.quiet_hours || { enabled: false, start: '22:00', end: '07:00' });
      if (data.categories?.length) setExpandedCat(data.categories[0].key);
    } catch (e) { console.error('Failed to load notification preferences:', e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const togglePref = (key, channel) => {
    setTypes(prev => prev.map(t => t.key === key ? { ...t, [channel]: !t[channel] } : t));
  };
  const toggleAllInCategory = (catKey, channel, value) => {
    setTypes(prev => prev.map(t => t.category === catKey ? { ...t, [channel]: value } : t));
  };

  const save = async () => {
    setSaving(true);
    const preferences = {};
    types.forEach(t => { preferences[t.key] = { in_app: t.in_app, email: t.email }; });
    try {
      await api.put('/notification-preferences', { preferences, digest_config: digestConfig, match_threshold: matchThreshold, quiet_hours: quietHours });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error('Failed to save:', e); }
    setSaving(false);
  };

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, color:C.text3, fontFamily:F }}>Loading notification preferences...</div>;
  const catColor = (key) => categories.find(c => c.key === key)?.color || C.accent;

  return (
    <div style={{ fontFamily: F, color: C.text1, maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg, ${C.accent}, ${C.purple})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Ic n="bell" s={18} c="white" />
            </div>
            <h2 style={{ margin:0, fontSize:20, fontWeight:800, letterSpacing:'-0.4px' }}>Notifications</h2>
          </div>
          <p style={{ margin:0, fontSize:13, color:C.text3, lineHeight:1.5 }}>Choose which notifications you receive, how they're delivered, and when.</p>
        </div>
        <button onClick={save} disabled={saving}
          style={{ padding:'8px 20px', borderRadius:8, border:'none', background: saved ? C.green : C.accent, color:'#fff',
            fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F, display:'flex', alignItems:'center', gap:6, transition:'background .2s', flexShrink:0 }}>
          {saved ? <><Ic n="check" s={13} c="white" /> Saved</> : saving ? 'Saving...' : 'Save preferences'}
        </button>
      </div>

      {/* Quiet Hours */}
      <div style={{ padding:'16px 20px', borderRadius:14, marginBottom:20,
        background: quietHours.enabled ? '#1a1a2e' : C.surface,
        border: `1.5px solid ${quietHours.enabled ? '#334155' : C.border}`, transition:'all .2s' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: quietHours.enabled ? 14 : 0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Ic n="moon" s={16} c={quietHours.enabled ? '#a5b4fc' : C.text3} />
            <div>
              <div style={{ fontSize:14, fontWeight:700, color: quietHours.enabled ? '#f1f5f9' : C.text1 }}>Quiet hours</div>
              <div style={{ fontSize:12, color: quietHours.enabled ? '#94a3b8' : C.text3 }}>Pause non-urgent notifications during off hours</div>
            </div>
          </div>
          <Toggle checked={quietHours.enabled} onChange={v => setQuietHours(q => ({ ...q, enabled: v }))} />
        </div>
        {quietHours.enabled && (
          <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:4 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:12, color:'#94a3b8' }}>From</span>
              <input type="time" value={quietHours.start} onChange={e => setQuietHours(q => ({ ...q, start: e.target.value }))}
                style={{ padding:'5px 8px', borderRadius:6, border:'1px solid #475569', background:'#0f172a', color:'#f1f5f9', fontSize:12, fontFamily:F }} />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:12, color:'#94a3b8' }}>To</span>
              <input type="time" value={quietHours.end} onChange={e => setQuietHours(q => ({ ...q, end: e.target.value }))}
                style={{ padding:'5px 8px', borderRadius:6, border:'1px solid #475569', background:'#0f172a', color:'#f1f5f9', fontSize:12, fontFamily:F }} />
            </div>
            <span style={{ fontSize:11, color:'#64748b', marginLeft:'auto' }}>Urgent alerts still come through</span>
          </div>
        )}
      </div>

      {/* Category sections */}
      {categories.map(cat => {
        const catTypes = types.filter(t => t.category === cat.key);
        const isExpanded = expandedCat === cat.key;
        const enabledCount = catTypes.filter(t => t.in_app || t.email).length;
        const allInApp = catTypes.every(t => t.in_app);
        const allEmail = catTypes.every(t => t.email);
        const isDigests = cat.key === 'digests';
        return (
          <div key={cat.key} style={{ marginBottom:12, borderRadius:14,
            border: `1.5px solid ${isExpanded ? `${cat.color}30` : C.border}`,
            background: C.surface, overflow:'hidden', transition:'border-color .2s' }}>
            {/* Category header */}
            <button onClick={() => setExpandedCat(isExpanded ? null : cat.key)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12,
                padding:'14px 18px', border:'none', cursor:'pointer',
                background: isExpanded ? `${cat.color}08` : 'transparent',
                fontFamily:F, textAlign:'left', transition:'background .15s' }}>
              <div style={{ width:32, height:32, borderRadius:9, background:`${cat.color}15`,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Ic n={cat.icon} s={15} c={cat.color} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.text1, marginBottom:1 }}>{cat.label}</div>
                <div style={{ fontSize:11, color:C.text3 }}>{cat.description}</div>
              </div>
              <span style={{ fontSize:11, fontWeight:600, color: enabledCount > 0 ? cat.color : C.text3,
                padding:'2px 8px', borderRadius:99, background: enabledCount > 0 ? `${cat.color}12` : 'transparent' }}>
                {enabledCount}/{catTypes.length} active
              </span>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform .2s', flexShrink:0 }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div style={{ padding:'0 18px 16px' }}>
                {/* Column headers */}
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0 10px', borderBottom:`1px solid ${C.border}`, marginBottom:6 }}>
                  <span style={{ flex:1 }} />
                  {!isDigests && (
                    <div style={{ display:'flex', alignItems:'center', gap:4, width:80, justifyContent:'center' }} title="Toggle all in-app">
                      <span style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'.06em' }}>In-app</span>
                      <button onClick={() => toggleAllInCategory(cat.key, 'in_app', !allInApp)}
                        style={{ width:14, height:14, borderRadius:3, border:`1.5px solid ${allInApp ? C.accent : C.border}`,
                          background: allInApp ? C.accent : 'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
                        {allInApp && <Ic n="check" s={9} c="white" />}
                      </button>
                    </div>
                  )}
                  <div style={{ display:'flex', alignItems:'center', gap:4, width:80, justifyContent:'center' }} title="Toggle all email">
                    <span style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'.06em' }}>Email</span>
                    <button onClick={() => toggleAllInCategory(cat.key, 'email', !allEmail)}
                      style={{ width:14, height:14, borderRadius:3, border:`1.5px solid ${allEmail ? C.accent : C.border}`,
                        background: allEmail ? C.accent : 'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
                      {allEmail && <Ic n="check" s={9} c="white" />}
                    </button>
                  </div>
                </div>

                {/* Individual types */}
                {catTypes.map(nt => (
                  <div key={nt.key} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 0', borderBottom:`1px solid ${C.border}08` }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.text1, marginBottom:2 }}>{nt.label}</div>
                      <div style={{ fontSize:11, color:C.text3, lineHeight:1.4 }}>{nt.description}</div>
                    </div>
                    {!isDigests && (
                      <div style={{ width:80, display:'flex', justifyContent:'center' }}>
                        <Toggle size="sm" checked={nt.in_app} onChange={() => togglePref(nt.key, 'in_app')} />
                      </div>
                    )}
                    <div style={{ width:80, display:'flex', justifyContent:'center' }}>
                      <Toggle size="sm" checked={nt.email} onChange={() => togglePref(nt.key, 'email')} />
                    </div>
                  </div>
                ))}

                {/* AI Match threshold */}
                {cat.key === 'ai' && (
                  <div style={{ marginTop:14, padding:'12px 14px', borderRadius:10, background:`${C.purple}08`, border:`1px solid ${C.purple}20` }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:C.text1 }}>AI match threshold</div>
                        <div style={{ fontSize:11, color:C.text3 }}>Only notify when match score exceeds this %</div>
                      </div>
                      <span style={{ fontSize:16, fontWeight:800, color:C.purple, background:`${C.purple}12`, padding:'3px 10px', borderRadius:8 }}>{matchThreshold}%</span>
                    </div>
                    <input type="range" min={30} max={95} step={5} value={matchThreshold}
                      onChange={e => setMatchThreshold(parseInt(e.target.value))}
                      style={{ width:'100%', accentColor:C.purple }} />
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:C.text3, marginTop:2 }}>
                      <span>30% (more alerts)</span><span>95% (only top matches)</span>
                    </div>
                  </div>
                )}

                {/* Digest scheduling */}
                {isDigests && (
                  <div style={{ marginTop:14, padding:'14px 16px', borderRadius:10, background:`${C.red}06`, border:`1px solid ${C.red}18` }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.text1, marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                      <Ic n="clock" s={13} c={C.red} /> Delivery schedule
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12 }}>
                      <div>
                        <label style={{ fontSize:11, fontWeight:600, color:C.text3, display:'block', marginBottom:4 }}>Frequency</label>
                        <select value={digestConfig.frequency||'weekdays'} onChange={e => setDigestConfig(d => ({ ...d, frequency: e.target.value }))}
                          style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F, color:C.text1, background:'white' }}>
                          <option value="daily">Every day</option>
                          <option value="weekdays">Weekdays only</option>
                          <option value="weekly">Weekly</option>
                          <option value="off">Off</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize:11, fontWeight:600, color:C.text3, display:'block', marginBottom:4 }}>Time</label>
                        <input type="time" value={digestConfig.daily_time}
                          onChange={e => setDigestConfig(d => ({ ...d, daily_time: e.target.value }))}
                          style={{ width:'100%', boxSizing:'border-box', padding:'7px 10px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F, color:C.text1 }} />
                      </div>
                      <div>
                        <label style={{ fontSize:11, fontWeight:600, color:C.text3, display:'block', marginBottom:4 }}>Weekly summary day</label>
                        <select value={digestConfig.weekly_day} onChange={e => setDigestConfig(d => ({ ...d, weekly_day: e.target.value }))}
                          style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F, color:C.text1, background:'white' }}>
                          {DAYS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize:11, fontWeight:600, color:C.text3, display:'block', marginBottom:4 }}>Timezone</label>
                        <select value={digestConfig.timezone} onChange={e => setDigestConfig(d => ({ ...d, timezone: e.target.value }))}
                          style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F, color:C.text1, background:'white' }}>
                          {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop:10, fontSize:11, color:C.text3, lineHeight:1.5 }}>
                      Daily digest sends at {digestConfig.daily_time} ({digestConfig.timezone.replace('_',' ')}) — {
                        {'daily':'every day','weekdays':'weekdays only','weekly':`every ${digestConfig.weekly_day}`, 'off':'currently off'}[digestConfig.frequency||'weekdays']
                      }. Weekly summary every {digestConfig.weekly_day.charAt(0).toUpperCase()+digestConfig.weekly_day.slice(1)} afternoon. Monthly report on the 1st.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Footer help */}
      <div style={{ marginTop:20, padding:'12px 16px', borderRadius:10, background:C.bg, fontSize:12, color:C.text3, lineHeight:1.6,
        display:'flex', alignItems:'flex-start', gap:8 }}>
        <Ic n="sliders" s={14} c={C.text3} />
        <div>
          <strong>In-app</strong> notifications appear in the bell icon dropdown.{' '}
          <strong>Email</strong> notifications are sent to your account email.
          Digest emails bundle multiple updates into a single message at your scheduled time.
          Quiet hours pause non-urgent alerts but still deliver agent reviews and workflow blocks.
        </div>
      </div>
    </div>
  );
}
