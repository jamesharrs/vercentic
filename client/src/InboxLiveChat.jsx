// client/src/InboxLiveChat.jsx
import { useState, useEffect, useCallback, useRef } from 'react';

const C = { bg:'#F8FAFF', surface:'#FFFFFF', border:'#E8EDF5', accent:'#4361EE', accentLight:'#EEF1FF', text1:'#0D0D0F', text2:'#4B5563', text3:'#9CA3AF', green:'#0CA678', amber:'#F59F00', red:'#E03131' };
const F = "'DM Sans', -apple-system, sans-serif";

// Get auth headers from session — same pattern as apiClient.js
function authHeaders(userId) {
  try {
    const sess = JSON.parse(localStorage.getItem('talentos_session') || 'null');
    const uid = userId || sess?.user?.id || null;
    const h = { 'Content-Type': 'application/json' };
    if (uid) h['X-User-Id'] = uid;
    return h;
  } catch { return { 'Content-Type': 'application/json' }; }
}

async function apiFetch(path, options = {}, userId) {
  const res = await fetch(path, { ...options, headers: { ...authHeaders(userId), ...(options.headers || {}) } });
  return res.json();
}

const STATUS_META   = { bot:{ label:'Bot', color:'#6B7280', bg:'#F3F4F6' }, escalated:{ label:'Waiting', color:'#F59F00', bg:'#FFFBEB' }, claimed:{ label:'Live', color:'#0CA678', bg:'#ECFDF5' }, resolved:{ label:'Resolved', color:'#9CA3AF', bg:'#F9FAFB' } };
const IDENTITY_META = { anonymous:{ label:'Anonymous', color:'#9CA3AF' }, partial:{ label:'Partial', color:'#F59F00' }, linked:{ label:'Linked', color:'#0CA678' } };

const PATHS = { send:'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z', user:'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z', link:'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71', search:'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0', 'message-circle':'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z', plus:'M12 5v14M5 12h14', 'external-link':'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3' };

function Ic({ n, s=16, c='currentColor' }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={PATHS[n]||PATHS.user}/></svg>);
}
function relTime(iso) {
  if (!iso) return '';
  const diff = (Date.now()-new Date(iso))/1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function ConvRow({ conv, selected, onClick }) {
  const statusMeta = STATUS_META[conv.status] || STATUS_META.bot;
  const identMeta  = IDENTITY_META[conv.identity_status] || IDENTITY_META.anonymous;
  const name = conv.visitor_name || conv.visitor_email || 'Anonymous visitor';
  const hasUnread = conv.unread_agent > 0;
  return (
    <div onClick={onClick} style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, background:selected?C.accentLight:'white', cursor:'pointer', borderLeft:selected?`3px solid ${C.accent}`:'3px solid transparent', transition:'background 0.1s' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
        <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0, background:conv.identity_status==='linked'?C.accent:'#E5E7EB', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {conv.identity_status==='linked'
            ? <span style={{ color:'white', fontSize:13, fontWeight:700 }}>{name.slice(0,1).toUpperCase()}</span>
            : <Ic n="user" s={16} c="#9CA3AF"/>}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
            <span style={{ fontSize:13, fontWeight:hasUnread?700:600, color:C.text1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{name}</span>
            {hasUnread && <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:99, background:C.accent, color:'white', flexShrink:0 }}>{conv.unread_agent}</span>}
          </div>
          <div style={{ fontSize:12, color:C.text3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:5 }}>{conv.last_message_preview||'No messages yet'}</div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:99, background:statusMeta.bg, color:statusMeta.color }}>{statusMeta.label}</span>
            <span style={{ fontSize:10, fontWeight:600, color:identMeta.color }}>{identMeta.label}</span>
            <span style={{ fontSize:10, color:C.text3, marginLeft:'auto' }}>{relTime(conv.last_message_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isVisitor = msg.role === 'visitor';
  const isSystem  = msg.role === 'system';
  if (isSystem) return <div style={{ textAlign:'center', padding:'6px 0', fontSize:11, color:C.text3 }}>{msg.content}</div>;
  return (
    <div style={{ display:'flex', justifyContent:isVisitor?'flex-start':'flex-end', marginBottom:10 }}>
      {isVisitor && <div style={{ width:28, height:28, borderRadius:'50%', background:'#E5E7EB', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginRight:8 }}><Ic n="user" s={14} c="#9CA3AF"/></div>}
      <div style={{ maxWidth:'70%', padding:'9px 13px', borderRadius:isVisitor?'4px 14px 14px 14px':'14px 4px 14px 14px', background:isVisitor?'white':C.accent, color:isVisitor?C.text1:'white', fontSize:13, lineHeight:1.5, boxShadow:'0 1px 3px rgba(0,0,0,0.06)', border:isVisitor?`1px solid ${C.border}`:'none' }}>
        {msg.role==='bot' && <div style={{ fontSize:10, fontWeight:700, color:isVisitor?C.text3:'rgba(255,255,255,0.7)', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.05em' }}>Bot</div>}
        {msg.content}
        <div style={{ fontSize:10, color:isVisitor?C.text3:'rgba(255,255,255,0.6)', marginTop:4, textAlign:'right' }}>{relTime(msg.created_at)}</div>
      </div>
    </div>
  );
}

function IdentityPanel({ conv, onLink, onCreatePerson, onNavigateToPerson }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [mode, setMode] = useState(null);

  const handleSearch = async (q) => {
    setSearch(q);
    if (q.length < 2) { setResults([]); return; }
    try {
      const res = await fetch(`/api/records/search?q=${encodeURIComponent(q)}&object_slug=people&limit=5`);
      const data = await res.json();
      setResults(data.results || []);
    } catch { setResults([]); }
  };

  if (conv.identity_status === 'linked' && conv.person) {
    return (
      <div style={{ padding:'14px 16px', borderTop:`1px solid ${C.border}`, background:'#F0FDF4', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:'50%', background:C.accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ color:'white', fontSize:13, fontWeight:700 }}>{conv.person.name.slice(0,1)}</span>
        </div>
        <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:700, color:C.text1 }}>{conv.person.name}</div><div style={{ fontSize:11, color:C.text3 }}>{conv.person.email}</div></div>
        <button onClick={() => onNavigateToPerson?.(conv.person.id)} style={{ padding:'5px 10px', borderRadius:7, border:`1px solid ${C.accent}`, background:C.accentLight, color:C.accent, fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontFamily:F }}>
          <Ic n="external-link" s={11} c={C.accent}/> Open record
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding:'12px 16px', borderTop:`1px solid ${C.border}`, background:'#FFFBEB' }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#92400E', marginBottom:8 }}>
        ⚠ {conv.identity_status==='partial' ? `Partial identity — ${conv.visitor_email||conv.visitor_name}` : 'Anonymous visitor — no record linked'}
      </div>
      {!mode && (
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setMode('search')} style={{ flex:1, padding:'7px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:'white', color:C.text2, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <Ic n="link" s={12} c={C.text2}/> Link to existing
          </button>
          <button onClick={() => onCreatePerson(conv)} style={{ flex:1, padding:'7px 12px', borderRadius:8, border:'none', background:C.accent, color:'white', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <Ic n="plus" s={12} c="white"/> Create person
          </button>
        </div>
      )}
      {mode==='search' && (
        <div>
          <input autoFocus value={search} onChange={e=>handleSearch(e.target.value)} placeholder="Search by name or email…" style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:'none', boxSizing:'border-box', marginBottom:6 }}/>
          {results.map(r => (
            <div key={r.id} onClick={() => { onLink(conv.id, r.id); setMode(null); }} style={{ padding:'8px 10px', borderRadius:7, border:`1px solid ${C.border}`, marginBottom:4, cursor:'pointer', background:'white', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:26, height:26, borderRadius:'50%', background:C.accentLight, display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontSize:11, fontWeight:700, color:C.accent }}>{r.display_name?.slice(0,1)||'?'}</span></div>
              <div><div style={{ fontSize:12, fontWeight:600, color:C.text1 }}>{r.display_name}</div><div style={{ fontSize:11, color:C.text3 }}>{r.subtitle}</div></div>
            </div>
          ))}
          <button onClick={() => setMode(null)} style={{ fontSize:11, color:C.text3, background:'none', border:'none', cursor:'pointer', padding:0, marginTop:4 }}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function ChatPanel({ conv, currentUserId, onSendMessage, onClaim, onResolve, onLink, onCreatePerson, onNavigateToPerson }) {
  const [input,   setInput]   = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const isClaimed = conv.status === 'claimed';
  const isMyConv  = conv.claimed_by === currentUserId;
  const canType   = isClaimed && isMyConv;
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [conv.messages?.length]);
  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true); await onSendMessage(conv.id, input.trim()); setInput(''); setSending(false);
  };
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}`, background:'white', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.text1 }}>{conv.visitor_name||conv.visitor_email||'Anonymous visitor'}</div>
          <div style={{ fontSize:11, color:C.text3 }}>{conv.source_url||'Unknown source'} · {relTime(conv.created_at)}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {conv.status==='escalated' && <button onClick={()=>onClaim(conv.id)} style={{ padding:'7px 14px', borderRadius:8, border:'none', background:C.accent, color:'white', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:F }}>Claim conversation</button>}
          {isClaimed && isMyConv && <button onClick={()=>onResolve(conv.id)} style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:'white', color:C.text2, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F }}>Resolve</button>}
          {isClaimed && !isMyConv && conv.claimed_by_user && <span style={{ fontSize:12, color:C.text3 }}>Claimed by {conv.claimed_by_user.name}</span>}
        </div>
      </div>
      <IdentityPanel conv={conv} onLink={onLink} onCreatePerson={onCreatePerson} onNavigateToPerson={onNavigateToPerson}/>
      <div style={{ flex:1, overflowY:'auto', padding:'16px', background:C.bg }}>
        {(conv.messages||[]).map(m => <MessageBubble key={m.id} msg={m}/>)}
        <div ref={bottomRef}/>
      </div>
      <div style={{ padding:'12px 16px', borderTop:`1px solid ${C.border}`, background:'white' }}>
        {canType ? (
          <div style={{ display:'flex', gap:8 }}>
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();}}} placeholder="Type a message… (Enter to send)" rows={2} style={{ flex:1, padding:'9px 12px', borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F, resize:'none', outline:'none' }}/>
            <button onClick={handleSend} disabled={sending||!input.trim()} style={{ width:40, borderRadius:10, border:'none', background:input.trim()?C.accent:'#E5E7EB', cursor:input.trim()?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Ic n="send" s={16} c={input.trim()?'white':'#9CA3AF'}/>
            </button>
          </div>
        ) : (
          <div style={{ padding:'10px 14px', borderRadius:10, background:'#F3F4F6', fontSize:12, color:C.text3, textAlign:'center' }}>
            {conv.status==='escalated'?'← Claim this conversation to reply':conv.status==='resolved'?'This conversation is resolved':conv.status==='bot'?'Bot is handling this conversation':'Conversation is active with another agent'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InboxLiveChat({ environment, session, onNavigate, onBack }) {
  const [convs,    setConvs]    = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [search,   setSearch]   = useState('');
  const environmentId = environment?.id;
  const currentUserId = session?.user?.id;

  const loadList = useCallback(async () => {
    if (!environmentId) return;
    try {
      const params = new URLSearchParams({ environment_id:environmentId });
      if (filter==='mine') params.set('mine','true');
      if (filter==='escalated') params.set('status','escalated');
      if (filter==='resolved')  params.set('status','resolved');
      if (search) params.set('search',search);
      const data = await apiFetch(`/api/live-chat/conversations?${params}`, {}, currentUserId);
      setConvs(data.conversations||[]);
    } catch {}
    setLoading(false);
  }, [environmentId, filter, search, currentUserId]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { const iv = setInterval(loadList, 15_000); return () => clearInterval(iv); }, [loadList]);

  const loadConversation = async (id) => {
    try {
      const data = await apiFetch(`/api/live-chat/conversations/${id}`, {}, currentUserId);
      setSelected(data);
      apiFetch(`/api/live-chat/conversations/${id}/read`, { method:'PATCH' }, currentUserId);
      setConvs(c => c.map(cv => cv.id===id ? { ...cv, unread_agent:0 } : cv));
    } catch {}
  };

  // WebSocket for live updates
  useEffect(() => {
    const proto = window.location.protocol==='https:'?'wss:':'ws:';
    let ws;
    try {
      ws = new WebSocket(`${proto}//${window.location.hostname}:3001/ws`);
      ws.onopen = () => { ws.send(JSON.stringify({type:'subscribe',channel:'team_channel'})); };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type==='escalation'||msg.type==='new_message') loadList();
          if (msg.type==='message' && selected && msg.message?.conversation_id===selected.id) {
            setSelected(s => s ? { ...s, messages:[...(s.messages||[]),msg.message] } : s);
          }
        } catch {}
      };
    } catch {}
    return () => { try { ws?.close(); } catch {} };
  }, [selected?.id]);

  const handleSendMessage = async (convId, content) => {
    await apiFetch(`/api/live-chat/conversations/${convId}/messages`, { method:'POST', body:JSON.stringify({content,role:'agent'}) }, currentUserId);
    await loadConversation(convId); loadList();
  };
  const handleClaim = async (convId) => {
    await apiFetch(`/api/live-chat/conversations/${convId}/claim`, { method:'POST' }, currentUserId);
    await loadConversation(convId); loadList();
  };
  const handleResolve = async (convId) => {
    await apiFetch(`/api/live-chat/conversations/${convId}/resolve`, { method:'POST' }, currentUserId);
    setSelected(null); loadList();
  };
  const handleLink = async (convId, personId) => {
    await apiFetch(`/api/live-chat/conversations/${convId}/identity`, { method:'PATCH', body:JSON.stringify({person_id:personId}) }, currentUserId);
    await loadConversation(convId); loadList();
  };
  const handleCreatePerson = (conv) => {
    window.dispatchEvent(new CustomEvent('talentos:create-from-chat', { detail:{ email:conv.visitor_email, first_name:conv.visitor_name?.split(' ')[0]||'', last_name:conv.visitor_name?.split(' ').slice(1).join(' ')||'', conversation_id:conv.id } }));
  };

  const FILTERS = [ {id:'all',label:'All',count:convs.length}, {id:'escalated',label:'Waiting',count:convs.filter(c=>c.status==='escalated').length}, {id:'mine',label:'Mine',count:convs.filter(c=>c.claimed_by===currentUserId).length}, {id:'resolved',label:'Resolved',count:convs.filter(c=>c.status==='resolved').length} ];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:0 }}>
      {/* Header bar with back button */}
      <div style={{ padding:'10px 16px', borderBottom:`1px solid ${C.border}`, background:'white', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        {onBack && (
          <button onClick={onBack} style={{ padding:'5px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:'white', color:C.text2, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F, display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back to Inbox
          </button>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={PATHS['message-circle']}/></svg>
          <span style={{ fontSize:14, fontWeight:700, color:C.text1 }}>Live Chat</span>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:C.green }}/>
          <span style={{ fontSize:11, color:C.text3 }}>Online</span>
        </div>
      </div>
      {/* Main content */}
      <div style={{ display:'flex', flex:1, minHeight:0 }}>
      {/* Queue */}
      <div style={{ width:300, flexShrink:0, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', background:'white' }}>
        <div style={{ padding:'10px 12px 0', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', gap:2 }}>
            {FILTERS.map(f => (
              <button key={f.id} onClick={()=>setFilter(f.id)} style={{ flex:1, padding:'6px 4px', borderRadius:'8px 8px 0 0', border:'none', background:filter===f.id?C.accentLight:'transparent', color:filter===f.id?C.accent:C.text3, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:F, borderBottom:filter===f.id?`2px solid ${C.accent}`:'2px solid transparent' }}>
                {f.label}{f.count>0&&<span style={{ marginLeft:4, fontSize:10, color:f.id==='escalated'&&f.count>0?C.amber:'inherit' }}>{f.count}</span>}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding:'10px 12px', borderBottom:`1px solid ${C.border}` }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search conversations…" style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {loading ? <div style={{ padding:40, textAlign:'center', color:C.text3, fontSize:13 }}>Loading…</div>
           : convs.length===0 ? <div style={{ padding:40, textAlign:'center', color:C.text3 }}><Ic n="message-circle" s={32} c="#E5E7EB"/><p style={{ margin:'12px 0 0', fontSize:13 }}>No conversations yet</p></div>
           : convs.map(c => <ConvRow key={c.id} conv={c} selected={selected?.id===c.id} onClick={()=>loadConversation(c.id)}/>)}
        </div>
      </div>
      {/* Chat */}
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
        {selected
          ? <ChatPanel conv={selected} currentUserId={currentUserId} onSendMessage={handleSendMessage} onClaim={handleClaim} onResolve={handleResolve} onLink={handleLink} onCreatePerson={handleCreatePerson} onNavigateToPerson={id=>window.dispatchEvent(new CustomEvent('talentos:openRecord',{detail:{recordId:id}}))}/>
          : <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, color:C.text3 }}>
              <Ic n="message-circle" s={40} c="#E5E7EB"/>
              <p style={{ margin:0, fontSize:14, color:C.text3 }}>Select a conversation</p>
            </div>
        }
      </div>
      </div>
    </div>
  );
}
