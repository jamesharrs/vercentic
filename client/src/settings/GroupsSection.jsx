import { tFetch } from "../apiClient.js";
// client/src/settings/GroupsSection.jsx
// Settings panel for managing user groups — used in sharing
import { useState, useEffect } from "react";
import SharePicker from "../SharePicker.jsx";

const F = "'Geist', -apple-system, sans-serif";
const C = { accent:"#4361EE", accentLight:"#eef1ff", text1:"#111827", text2:"#374151",
  text3:"#9ca3af", border:"#e5e7eb", bg:"#f9fafb", green:"#0ca678", red:"#e03131" };

const GROUP_COLORS = ['#4361EE','#7c3aed','#0891b2','#0ca678','#e67700','#e03131','#db2777','#374151'];

function Ic({ n, s=14, c="currentColor" }) {
  const P = {
    plus:   "M12 5v14M5 12h14",
    x:      "M18 6L6 18M6 6l12 12",
    edit:   "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
    trash:  "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    users:  "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
    check:  "M20 6L9 17l-5-5",
    search: "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",
    chevR:  "M9 18l6-6-6-6",
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={P[n]||P.users}/></svg>;
}

function Avatar({ name, color, size=28 }) {
  const initials = (name||'?').split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase();
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:color||'#6366f1',
      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <span style={{ fontSize:size*0.38, fontWeight:700, color:'white', fontFamily:F }}>
        {initials}
      </span>
    </div>
  );
}

function GroupModal({ group, users, environmentId, onClose, onSave }) {
  const isEdit = !!group?.id;
  const [form, setForm] = useState({
    name: group?.name || '',
    description: group?.description || '',
    color: group?.color || GROUP_COLORS[0],
    member_ids: group?.member_ids || [],
  });
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const toggleMember = (id) => set('member_ids', form.member_ids.includes(id) ? form.member_ids.filter(x=>x!==id) : [...form.member_ids, id]);

  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const name = `${u.first_name||''} ${u.last_name||''} ${u.email||''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    const url = isEdit ? `/api/groups/${group.id}` : '/api/groups';
    const method = isEdit ? 'PATCH' : 'POST';
    await fetch(url, { method, headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, environment_id: environmentId }) });
    setSaving(false);
    onSave();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:2000,
      display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{ background:'white', borderRadius:16, width:520, maxHeight:'85vh',
        display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.18)',
        overflow:'hidden' }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:11, background:`${form.color}18`,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Ic n="users" s={20} c={form.color}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:800, color:C.text1 }}>
                {isEdit ? 'Edit Group' : 'New Group'}
              </div>
              <div style={{ fontSize:12, color:C.text3 }}>
                {isEdit ? 'Update group name, colour and members' : 'Create a group to use in sharing'}
              </div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', display:'flex' }}>
              <Ic n="x" s={18} c={C.text3}/>
            </button>
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          {/* Name */}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:700, color:C.text2, display:'block', marginBottom:5 }}>Group name</label>
            <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Leadership Team, EMEA Recruiters…"
              style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1.5px solid ${C.border}`,
                fontSize:13, fontFamily:F, outline:'none', boxSizing:'border-box' }}
              onFocus={e=>e.target.style.borderColor=C.accent}
              onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>

          {/* Description */}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:700, color:C.text2, display:'block', marginBottom:5 }}>Description (optional)</label>
            <input value={form.description} onChange={e=>set('description',e.target.value)} placeholder="What is this group for?"
              style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1.5px solid ${C.border}`,
                fontSize:13, fontFamily:F, outline:'none', boxSizing:'border-box' }}
              onFocus={e=>e.target.style.borderColor=C.accent}
              onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>

          {/* Color */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:700, color:C.text2, display:'block', marginBottom:7 }}>Colour</label>
            <div style={{ display:'flex', gap:8 }}>
              {GROUP_COLORS.map(col => (
                <div key={col} onClick={()=>set('color',col)}
                  style={{ width:26, height:26, borderRadius:'50%', background:col, cursor:'pointer',
                    border:`3px solid ${form.color===col?col:'transparent'}`,
                    boxShadow:form.color===col?`0 0 0 2px white, 0 0 0 4px ${col}`:'none',
                    transition:'all .12s' }}/>
              ))}
            </div>
          </div>

          {/* Members */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
              <label style={{ fontSize:12, fontWeight:700, color:C.text2 }}>
                Members ({form.member_ids.length})
              </label>
            </div>
            <div style={{ position:'relative', marginBottom:8 }}>
              <div style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', display:'flex' }}>
                <Ic n="search" s={13} c={C.text3}/>
              </div>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users…"
                style={{ width:'100%', padding:'8px 10px 8px 30px', borderRadius:8,
                  border:`1.5px solid ${C.border}`, fontSize:12, fontFamily:F,
                  outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div style={{ maxHeight:200, overflowY:'auto', border:`1px solid ${C.border}`,
              borderRadius:10, overflow:'hidden' }}>
              {filteredUsers.map((u,i) => {
                const name = `${u.first_name||''} ${u.last_name||''}`.trim() || u.email;
                const sel = form.member_ids.includes(u.id);
                return (
                  <div key={u.id} onClick={()=>toggleMember(u.id)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                      cursor:'pointer', background:sel?`${form.color}08`:'white',
                      borderTop:i>0?`1px solid ${C.border}`:'none', transition:'background .1s' }}>
                    <Avatar name={name} color={form.color} size={30}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{name}</div>
                      <div style={{ fontSize:11, color:C.text3 }}>{u.email}</div>
                    </div>
                    <div style={{ width:18, height:18, borderRadius:5,
                      border:`2px solid ${sel?form.color:C.border}`,
                      background:sel?form.color:'white',
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {sel && <Ic n="check" s={10} c="white"/>}
                    </div>
                  </div>
                );
              })}
              {filteredUsers.length === 0 && (
                <div style={{ padding:'20px', textAlign:'center', color:C.text3, fontSize:12 }}>
                  No users found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px', borderTop:`1px solid ${C.border}`, display:'flex', gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'10px', borderRadius:9, border:`1.5px solid ${C.border}`,
              background:'white', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F, color:C.text2 }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving||!form.name}
            style={{ flex:2, padding:'10px', borderRadius:9, border:'none',
              background: !form.name ? C.border : form.color,
              color:'white', fontSize:13, fontWeight:700, cursor: form.name?'pointer':'not-allowed',
              fontFamily:F, opacity: saving ? .7 : 1 }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GroupsSection({ environment }) {
  const [groups, setGroups] = useState([]);
  const [users,  setUsers]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,  setModal]  = useState(null); // null | {} | group object
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const [g, u] = await Promise.all([
      tFetch(`/api/groups?environment_id=${environment?.id}`).then(r=>r.json()).catch(()=>[]),
      tFetch('/api/users').then(r=>r.json()).catch(()=>[]),
    ]);
    setGroups(Array.isArray(g)?g:[]);
    setUsers(Array.isArray(u)?u:[]);
    setLoading(false);
  };

  useEffect(()=>{ if(environment?.id) load(); },[environment?.id]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this group? It will be removed from all sharing configurations.')) return;
    await tFetch(`/api/groups/${id}`, { method:'DELETE' });
    load();
  };

  const filtered = groups.filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ fontFamily:F }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h2 style={{ margin:'0 0 3px', fontSize:18, fontWeight:800, color:C.text1 }}>Groups</h2>
          <p style={{ margin:0, fontSize:13, color:C.text3 }}>
            Create groups to share agents, workflows and reports with teams.
          </p>
        </div>
        <button onClick={()=>setModal({})}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px',
            borderRadius:10, border:'none', background:C.accent, color:'white',
            fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:F }}>
          <Ic n="plus" s={14} c="white"/> New Group
        </button>
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:16 }}>
        <div style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', display:'flex' }}>
          <Ic n="search" s={14} c={C.text3}/>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search groups…"
          style={{ width:'100%', padding:'9px 12px 9px 34px', borderRadius:10,
            border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F,
            outline:'none', boxSizing:'border-box', background:'white' }}/>
      </div>

      {/* Groups list */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:C.text3, fontSize:13 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:`${C.accent}12`,
            display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
            <Ic n="users" s={24} c={C.accent}/>
          </div>
          <div style={{ fontSize:15, fontWeight:700, color:C.text1, marginBottom:4 }}>
            {search ? 'No groups found' : 'No groups yet'}
          </div>
          <div style={{ fontSize:13, color:C.text3, marginBottom:16 }}>
            {search ? 'Try a different search' : 'Create groups to make sharing easier.'}
          </div>
          {!search && (
            <button onClick={()=>setModal({})}
              style={{ padding:'9px 20px', borderRadius:10, border:'none',
                background:C.accent, color:'white', fontWeight:700, fontSize:13,
                cursor:'pointer', fontFamily:F }}>
              Create First Group
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(g => {
            const memberUsers = users.filter(u => (g.member_ids||[]).includes(u.id));
            return (
              <div key={g.id} style={{ background:'white', borderRadius:12,
                border:`1.5px solid ${C.border}`, padding:'14px 16px',
                display:'flex', alignItems:'center', gap:12, transition:'all .12s' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=g.color||C.accent}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>

                {/* Colour dot + name */}
                <div style={{ width:40, height:40, borderRadius:11,
                  background:`${g.color||C.accent}18`, display:'flex',
                  alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Ic n="users" s={20} c={g.color||C.accent}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text1 }}>{g.name}</div>
                  {g.description && <div style={{ fontSize:12, color:C.text3 }}>{g.description}</div>}
                </div>

                {/* Member avatars */}
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ display:'flex' }}>
                    {memberUsers.slice(0,4).map((u,i) => {
                      const name = `${u.first_name||''} ${u.last_name||''}`.trim() || u.email;
                      return (
                        <div key={u.id} style={{ marginLeft: i>0?-8:0, zIndex:4-i }}>
                          <Avatar name={name} color={g.color||C.accent} size={26}/>
                        </div>
                      );
                    })}
                  </div>
                  <span style={{ fontSize:12, color:C.text3, marginLeft:4 }}>
                    {g.member_count || 0} member{g.member_count!==1?'s':''}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={()=>setModal(g)}
                    style={{ padding:'6px 10px', borderRadius:7, border:`1px solid ${C.border}`,
                      background:'white', cursor:'pointer', display:'flex', gap:5,
                      alignItems:'center', fontSize:12, fontWeight:600, color:C.text2, fontFamily:F }}>
                    <Ic n="edit" s={13} c={C.text3}/> Edit
                  </button>
                  <button onClick={()=>handleDelete(g.id)}
                    style={{ padding:'6px', borderRadius:7, border:`1px solid ${C.border}`,
                      background:'white', cursor:'pointer', display:'flex' }}>
                    <Ic n="trash" s={14} c={C.red}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal !== null && (
        <GroupModal group={modal?.id ? modal : null}
          users={users} environmentId={environment?.id}
          onClose={()=>setModal(null)} onSave={()=>{ setModal(null); load(); }}/>
      )}
    </div>
  );
}
