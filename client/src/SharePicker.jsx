// client/src/SharePicker.jsx
// Reusable sharing control — drop into any save/edit modal
// Props:
//   value: { visibility: 'private'|'everyone'|'specific', user_ids: [], group_ids: [] }
//   onChange: (newValue) => void
//   environmentId: string  (for loading users + groups)
//   compact: bool          (show as a single button instead of full panel)

import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";

const F = "'Geist', -apple-system, sans-serif";
const C = { accent:"#4361EE", text1:"#111827", text2:"#374151", text3:"#9ca3af", border:"#e5e7eb", bg:"#f9fafb" };

function Ic({ n, s=14, c="currentColor" }) {
  const P = {
    lock:    "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
    globe:   "M12 2a10 10 0 100 20A10 10 0 0012 2zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
    users:   "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
    user:    "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z",
    check:   "M20 6L9 17l-5-5",
    x:       "M18 6L6 18M6 6l12 12",
    chevD:   "M6 9l6 6 6-6",
    search:  "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",
    plus:    "M12 5v14M5 12h14",
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={P[n]||P.globe}/></svg>;
}

const VISIBILITY_OPTIONS = [
  { value:'private',  icon:'lock',  label:'Private',  desc:'Only you can see this' },
  { value:'specific', icon:'users', label:'Specific people or groups', desc:'Choose who can access' },
  { value:'everyone', icon:'globe', label:'Everyone',  desc:'All users in this environment' },
];

function Avatar({ name, color, size=24 }) {
  const initials = (name||'?').split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase();
  const bg = color || '#6366f1';
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg,
      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <span style={{ fontSize:size*0.4, fontWeight:700, color:'white', fontFamily:F }}>{initials}</span>
    </div>
  );
}

// Dropdown portal for user/group search
function SearchDropdown({ anchor, items, selected, onToggle, onClose, label, type }) {
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const rect = anchor?.getBoundingClientRect?.() || { left:0, top:0, width:300 };

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filtered = items.filter(i => !q || (i.name||i.email||'').toLowerCase().includes(q.toLowerCase()));

  return ReactDOM.createPortal(
    <div ref={ref} style={{ position:'fixed', left:rect.left, top:rect.bottom+4,
      width:Math.max(rect.width, 280), maxHeight:280, overflowY:'auto',
      background:'white', borderRadius:12, boxShadow:'0 8px 30px rgba(0,0,0,.15)',
      border:`1px solid ${C.border}`, zIndex:9999, fontFamily:F }}>
      <div style={{ padding:'8px 10px', borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, background:'white' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 10px',
          borderRadius:8, background:C.bg, border:`1px solid ${C.border}` }}>
          <Ic n="search" s={13} c={C.text3}/>
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)}
            placeholder={`Search ${label}…`}
            style={{ border:'none', background:'transparent', outline:'none',
              fontSize:12, fontFamily:F, flex:1, color:C.text1 }}/>
        </div>
      </div>
      {filtered.length === 0 && (
        <div style={{ padding:'16px', textAlign:'center', color:C.text3, fontSize:12 }}>
          No {label} found
        </div>
      )}
      {filtered.map(item => {
        const sel = selected.includes(item.id);
        const displayName = type === 'user'
          ? `${item.first_name||''} ${item.last_name||''}`.trim() || item.email
          : item.name;
        return (
          <div key={item.id} onClick={() => onToggle(item.id)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
              cursor:'pointer', background: sel ? `${C.accent}08` : 'transparent',
              transition:'background .1s' }}
            onMouseEnter={e=>{ if(!sel) e.currentTarget.style.background=C.bg; }}
            onMouseLeave={e=>{ if(!sel) e.currentTarget.style.background='transparent'; }}>
            <Avatar name={displayName} color={item.color || (type==='user' ? '#6366f1' : '#0891b2')} size={28}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:C.text1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</div>
              {type === 'user' && item.email && <div style={{ fontSize:11, color:C.text3 }}>{item.email}</div>}
              {type === 'group' && <div style={{ fontSize:11, color:C.text3 }}>{(item.member_ids||[]).length} members</div>}
            </div>
            {sel && <Ic n="check" s={14} c={C.accent}/>}
          </div>
        );
      })}
    </div>,
    document.body
  );
}

// ── Main SharePicker component ────────────────────────────────────────────────
export default function SharePicker({ value, onChange, environmentId, compact = false }) {
  const [users,  setUsers]  = useState([]);
  const [groups, setGroups] = useState([]);
  const [open,   setOpen]   = useState(false);
  const [tab,    setTab]    = useState('users'); // 'users' | 'groups'
  const userBtnRef  = useRef(null);
  const groupBtnRef = useRef(null);

  const sharing = value || { visibility: 'private', user_ids: [], group_ids: [] };

  useEffect(() => {
    if (!environmentId) return;
    fetch(`/api/users`).then(r=>r.json()).then(d=>setUsers(Array.isArray(d)?d:[])).catch(()=>{});
    fetch(`/api/groups?environment_id=${environmentId}`).then(r=>r.json()).then(d=>setGroups(Array.isArray(d)?d:[])).catch(()=>{});
  }, [environmentId]);

  const setVisibility = (v) => onChange({ ...sharing, visibility: v });

  const toggleUser = (id) => {
    const ids = sharing.user_ids || [];
    onChange({ ...sharing, visibility: 'specific', user_ids: ids.includes(id) ? ids.filter(x=>x!==id) : [...ids, id] });
  };

  const toggleGroup = (id) => {
    const ids = sharing.group_ids || [];
    onChange({ ...sharing, visibility: 'specific', group_ids: ids.includes(id) ? ids.filter(x=>x!==id) : [...ids, id] });
  };

  // Summary label for compact mode
  const summaryLabel = () => {
    switch (sharing.visibility) {
      case 'everyone': return 'Shared with everyone';
      case 'specific': {
        const u = (sharing.user_ids||[]).length, g = (sharing.group_ids||[]).length;
        if (!u && !g) return 'Specific (none selected)';
        const p = [];
        if (u) p.push(`${u} user${u>1?'s':''}`);
        if (g) p.push(`${g} group${g>1?'s':''}`);
        return p.join(', ');
      }
      default: return 'Private';
    }
  };

  const visIcon = sharing.visibility === 'everyone' ? 'globe' : sharing.visibility === 'specific' ? 'users' : 'lock';
  const visColor = sharing.visibility === 'everyone' ? '#0ca678' : sharing.visibility === 'specific' ? C.accent : C.text3;

  if (compact) {
    return (
      <div style={{ position:'relative', display:'inline-flex' }}>
        <button onClick={()=>setOpen(o=>!o)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px',
            borderRadius:8, border:`1.5px solid ${C.border}`, background:'white',
            cursor:'pointer', fontFamily:F, fontSize:12, fontWeight:600, color:C.text2 }}>
          <Ic n={visIcon} s={13} c={visColor}/>
          {summaryLabel()}
          <Ic n="chevD" s={12} c={C.text3}/>
        </button>
        {open && (
          <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:1000,
            background:'white', borderRadius:14, boxShadow:'0 8px 30px rgba(0,0,0,.15)',
            border:`1px solid ${C.border}`, width:320, padding:16 }}>
            <SharePanelInner sharing={sharing} users={users} groups={groups}
              onVisibility={setVisibility} onToggleUser={toggleUser}
              onToggleGroup={toggleGroup} tab={tab} setTab={setTab}
              userBtnRef={userBtnRef} groupBtnRef={groupBtnRef}/>
          </div>
        )}
      </div>
    );
  }

  return (
    <SharePanelInner sharing={sharing} users={users} groups={groups}
      onVisibility={setVisibility} onToggleUser={toggleUser}
      onToggleGroup={toggleGroup} tab={tab} setTab={setTab}
      userBtnRef={userBtnRef} groupBtnRef={groupBtnRef}/>
  );
}

function SharePanelInner({ sharing, users, groups, onVisibility, onToggleUser, onToggleGroup, tab, setTab, userBtnRef, groupBtnRef }) {
  const [showUserDrop,  setShowUserDrop]  = useState(false);
  const [showGroupDrop, setShowGroupDrop] = useState(false);

  const selectedUsers  = users.filter(u  => (sharing.user_ids||[]).includes(u.id));
  const selectedGroups = groups.filter(g => (sharing.group_ids||[]).includes(g.id));

  return (
    <div style={{ fontFamily:F }}>
      {/* Visibility selector */}
      <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase',
        letterSpacing:'.06em', marginBottom:8 }}>Who can see this?</div>
      <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
        {VISIBILITY_OPTIONS.map(opt => {
          const active = sharing.visibility === opt.value;
          const color  = opt.value==='everyone'?'#0ca678': opt.value==='specific'?C.accent:C.text3;
          return (
            <div key={opt.value} onClick={()=>onVisibility(opt.value)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                borderRadius:10, border:`1.5px solid ${active?color:C.border}`,
                background: active?`${color}08`:'white', cursor:'pointer', transition:'all .12s' }}>
              <div style={{ width:32, height:32, borderRadius:9,
                background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Ic n={opt.icon} s={16} c={color}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color: active?color:C.text1 }}>{opt.label}</div>
                <div style={{ fontSize:11, color:C.text3 }}>{opt.desc}</div>
              </div>
              {active && (
                <div style={{ width:18, height:18, borderRadius:'50%', background:color,
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Ic n="check" s={10} c="white"/>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Specific people / groups */}
      {sharing.visibility === 'specific' && (
        <div>
          <div style={{ display:'flex', gap:6, marginBottom:10 }}>
            <button ref={userBtnRef} onClick={()=>{setShowUserDrop(true);setShowGroupDrop(false);}}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                padding:'8px 12px', borderRadius:8, border:`1.5px solid ${C.border}`,
                background:'white', cursor:'pointer', fontFamily:F, fontSize:12, fontWeight:600, color:C.text2 }}>
              <Ic n="user" s={13} c={C.text3}/> Add people
            </button>
            <button ref={groupBtnRef} onClick={()=>{setShowGroupDrop(true);setShowUserDrop(false);}}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                padding:'8px 12px', borderRadius:8, border:`1.5px solid ${C.border}`,
                background:'white', cursor:'pointer', fontFamily:F, fontSize:12, fontWeight:600, color:C.text2 }}>
              <Ic n="users" s={13} c={C.text3}/> Add groups
            </button>
          </div>

          {/* Selected users */}
          {selectedUsers.length > 0 && (
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:600, color:C.text3, marginBottom:4 }}>
                Users ({selectedUsers.length})
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {selectedUsers.map(u => {
                  const name = `${u.first_name||''} ${u.last_name||''}`.trim() || u.email;
                  return (
                    <div key={u.id} style={{ display:'flex', alignItems:'center', gap:5,
                      padding:'3px 8px 3px 5px', borderRadius:99,
                      background:`${C.accent}10`, border:`1px solid ${C.accent}25` }}>
                      <Avatar name={name} size={18}/>
                      <span style={{ fontSize:11, fontWeight:600, color:C.accent }}>{name}</span>
                      <button onClick={()=>onToggleUser(u.id)}
                        style={{ background:'none', border:'none', cursor:'pointer',
                          display:'flex', padding:0, color:C.accent, marginLeft:1 }}>
                        <Ic n="x" s={10} c={C.accent}/>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected groups */}
          {selectedGroups.length > 0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:C.text3, marginBottom:4 }}>
                Groups ({selectedGroups.length})
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {selectedGroups.map(g => (
                  <div key={g.id} style={{ display:'flex', alignItems:'center', gap:5,
                    padding:'3px 8px 3px 5px', borderRadius:99,
                    background:`${g.color||'#0891b2'}10`, border:`1px solid ${g.color||'#0891b2'}25` }}>
                    <Avatar name={g.name} color={g.color||'#0891b2'} size={18}/>
                    <span style={{ fontSize:11, fontWeight:600, color:g.color||'#0891b2' }}>{g.name}</span>
                    <button onClick={()=>onToggleGroup(g.id)}
                      style={{ background:'none', border:'none', cursor:'pointer',
                        display:'flex', padding:0 }}>
                      <Ic n="x" s={10} c={g.color||'#0891b2'}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedUsers.length === 0 && selectedGroups.length === 0 && (
            <div style={{ textAlign:'center', padding:'12px 0', color:C.text3, fontSize:12 }}>
              No one selected yet — add people or groups above
            </div>
          )}
        </div>
      )}

      {/* Dropdowns */}
      {showUserDrop && (
        <SearchDropdown anchor={userBtnRef.current} items={users}
          selected={sharing.user_ids||[]} type="user" label="users"
          onToggle={onToggleUser} onClose={()=>setShowUserDrop(false)}/>
      )}
      {showGroupDrop && (
        <SearchDropdown anchor={groupBtnRef.current} items={groups}
          selected={sharing.group_ids||[]} type="group" label="groups"
          onToggle={onToggleGroup} onClose={()=>setShowGroupDrop(false)}/>
      )}
    </div>
  );
}
