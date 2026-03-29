// client/src/CandidateChat.jsx — Candidate Chat Inbox
import { useState, useEffect, useRef, useCallback } from "react";
import api from "./apiClient.js";

const F = "'DM Sans',-apple-system,sans-serif";
const C = {
  surface:"var(--t-card,#fff)", surface2:"var(--t-surface2,#f8fafc)",
  border:"var(--t-border,#E5E7EB)", text1:"var(--t-text1,#111827)",
  text2:"var(--t-text2,#374151)", text3:"var(--t-text3,#9CA3AF)",
  accent:"var(--t-accent,#4361EE)", accentLight:"var(--t-accent-light,#EEF2FF)",
  green:"#0CAF77", red:"#EF4444", amber:"#F59E0B", purple:"#7C3AED",
};

const Ic = ({n,s=16,c="currentColor"}) => {
  const P={
    send:"M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
    msg:"M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
    plus:"M12 5v14M5 12h14", x:"M18 6L6 18M6 6l12 12",
    check:"M20 6L9 17l-5-5",
    sparkle:"M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z",
    search:"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
    external:"M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
    mail:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
    "message-circle":"M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z",
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={P[n]||"M12 12h.01"}/></svg>;
};

const relTime = ts => {
  if (!ts) return "";
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return "now";
  if (d < 3600000) return `${Math.floor(d/60000)}m`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h`;
  return new Date(ts).toLocaleDateString();
};

const STATUS_COLOR = { open:C.green, pending:C.amber, resolved:C.text3, spam:C.red };

function Avatar({ name, size=34, color=C.accent }) {
  const initials = (name||"?").split(" ").slice(0,2).map(p=>p[0]).join("").toUpperCase();
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:`${color}20`,
      border:`2px solid ${color}40`, display:"flex", alignItems:"center",
      justifyContent:"center", fontSize:size/3, fontWeight:800, color, flexShrink:0 }}>
      {initials}
    </div>
  );
}

function MsgBubble({ msg }) {
  const isOut  = msg.direction === 'outbound';
  const isNote = msg.direction === 'note';
  if (msg.message_type === 'system') return (
    <div style={{ textAlign:"center", margin:"8px 0" }}>
      <span style={{ fontSize:10, color:C.text3, background:C.surface2, padding:"2px 10px",
        borderRadius:99, border:`1px solid ${C.border}` }}>{msg.body}</span>
    </div>
  );
  return (
    <div style={{ display:"flex", justifyContent:isOut||isNote?"flex-end":"flex-start",
      marginBottom:8, gap:8, alignItems:"flex-end" }}>
      {!isOut&&!isNote&&<Avatar name={msg.sender_name||"C"} size={26}/>}
      <div style={{ maxWidth:"68%" }}>
        {msg.sender_name&&!isOut&&(
          <div style={{ fontSize:10, color:C.text3, marginBottom:3, fontWeight:600 }}>{msg.sender_name}</div>
        )}
        <div style={{ padding:"10px 14px",
          borderRadius:isOut?"14px 14px 4px 14px":isNote?"14px 14px 14px 4px":"14px 14px 14px 4px",
          background:isNote?`${C.amber}15`:isOut?C.accent:C.surface,
          border:isNote?`1.5px solid ${C.amber}40`:isOut?"none":`1.5px solid ${C.border}`,
          color:isOut?"#fff":C.text1, fontSize:13, lineHeight:1.55 }}>
          {isNote&&<div style={{ fontSize:10, fontWeight:700, color:C.amber, marginBottom:4 }}>📎 NOTE</div>}
          <div style={{ whiteSpace:"pre-wrap" }}>{msg.body}</div>
        </div>
        <div style={{ fontSize:9, color:C.text3, marginTop:3,
          textAlign:isOut?"right":"left", display:"flex", alignItems:"center",
          gap:4, justifyContent:isOut?"flex-end":"flex-start" }}>
          {new Date(msg.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
          {isOut&&<Ic n="check" s={10} c={msg.read_at?C.accent:C.text3}/>}
        </div>
      </div>
      {(isOut||isNote)&&<Avatar name={msg.sender_name||"R"} size={26} color={C.purple}/>}
    </div>
  );
}

function ChatList({ chats, selectedId, onSelect, onNewChat, stats, search, onSearch }) {
  const [filter, setFilter] = useState("all");
  const filtered = chats
    .filter(c => filter==="all"||c.status===filter)
    .filter(c => !search||(c.subject||"").toLowerCase().includes(search.toLowerCase())||
      (c.participant_name||"").toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{ width:300, borderRight:`1px solid ${C.border}`, display:"flex",
      flexDirection:"column", background:C.surface, flexShrink:0, height:"100%" }}>
      <div style={{ padding:"16px 16px 8px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ fontSize:16, fontWeight:800, color:C.text1 }}>Inbox</div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {stats?.unread>0&&<span style={{ fontSize:10, fontWeight:800, padding:"2px 7px",
              borderRadius:99, background:C.red, color:"#fff" }}>{stats.unread}</span>}
            <button onClick={onNewChat} style={{ width:28, height:28, borderRadius:8,
              border:`1.5px solid ${C.border}`, background:"transparent", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Ic n="plus" s={14} c={C.text3}/>
            </button>
          </div>
        </div>
        <div style={{ position:"relative" }}>
          <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}>
            <Ic n="search" s={13} c={C.text3}/>
          </div>
          <input value={search} onChange={e=>onSearch(e.target.value)} placeholder="Search…"
            style={{ width:"100%", boxSizing:"border-box", padding:"7px 10px 7px 32px",
              borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:12, fontFamily:F,
              outline:"none", color:C.text1, background:C.surface2 }}/>
        </div>
      </div>
      <div style={{ display:"flex", padding:"6px 8px", borderBottom:`1px solid ${C.border}`, gap:2 }}>
        {[["all","All",stats?.total],["open","Open",stats?.open],
          ["pending","Pending",stats?.pending],["resolved","Done",stats?.resolved]].map(([id,label,count])=>(
          <button key={id} onClick={()=>setFilter(id)}
            style={{ flex:1, padding:"5px 4px", borderRadius:7, border:"none", cursor:"pointer",
              fontSize:11, fontWeight:600, fontFamily:F,
              background:filter===id?C.accentLight:"transparent",
              color:filter===id?C.accent:C.text3 }}>
            {label}{count!=null?` ${count}`:""}
          </button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:"auto" }}>
        {!filtered.length
          ? <div style={{ padding:24, textAlign:"center", color:C.text3, fontSize:12 }}>No conversations</div>
          : filtered.map(chat=>(
          <div key={chat.id} onClick={()=>onSelect(chat)}
            style={{ padding:"12px 14px", cursor:"pointer",
              borderBottom:`1px solid ${C.border}40`,
              background:selectedId===chat.id?C.accentLight:"transparent" }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
              <div style={{ position:"relative", flexShrink:0 }}>
                <Avatar name={chat.participant_name||chat.subject} size={36}/>
                {chat.unread_count>0&&(
                  <span style={{ position:"absolute", top:-3, right:-3, width:14, height:14,
                    borderRadius:"50%", background:C.red, border:"2px solid #fff",
                    fontSize:8, fontWeight:800, color:"#fff",
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {Math.min(chat.unread_count,9)}
                  </span>
                )}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
                  <div style={{ fontSize:13, fontWeight:chat.unread_count?700:600, color:C.text1,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:140 }}>
                    {chat.participant_name||chat.subject}
                  </div>
                  <div style={{ fontSize:10, color:C.text3, flexShrink:0 }}>{relTime(chat.last_message_at)}</div>
                </div>
                <div style={{ fontSize:11, color:C.text3, overflow:"hidden",
                  textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {chat.last_message?.body||chat.subject}
                </div>
                <span style={{ fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:99, marginTop:4, display:"inline-block",
                  background:`${STATUS_COLOR[chat.status]||C.text3}15`, color:STATUS_COLOR[chat.status]||C.text3 }}>
                  {chat.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatDetail({ chat, session, onUpdateChat, onOpenRecord }) {
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState("");
  const [noteMode,  setNoteMode]  = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [sending,   setSending]   = useState(false);
  const lastMsgAt = useRef(null);
  const bottomRef = useRef(null);
  const userId   = session?.id;
  const userName = session ? `${session.first_name||""} ${session.last_name||""}`.trim() : "Recruiter";

  const loadMessages = useCallback(async () => {
    const data = await api.get(`/chats/${chat.id}/messages`);
    if (Array.isArray(data)) { setMessages(data); lastMsgAt.current = data.at(-1)?.created_at||null; }
  }, [chat.id]);

  useEffect(() => {
    loadMessages();
    api.post(`/chats/${chat.id}/read-all`, {}).catch(()=>{});
  }, [chat.id, loadMessages]);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      if (cancelled) return;
      try {
        const since = lastMsgAt.current||new Date(0).toISOString();
        const newMsgs = await api.get(`/chats/${chat.id}/poll?since=${encodeURIComponent(since)}`);
        if (!cancelled && Array.isArray(newMsgs) && newMsgs.length) {
          setMessages(prev => {
            const ids = new Set(prev.map(m=>m.id));
            return [...prev, ...newMsgs.filter(m=>!ids.has(m.id))];
          });
          lastMsgAt.current = newMsgs.at(-1)?.created_at;
          api.post(`/chats/${chat.id}/read-all`, {}).catch(()=>{});
        }
      } catch {}
      if (!cancelled) poll();
    }
    poll();
    return () => { cancelled = true; };
  }, [chat.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim()||sending) return;
    setSending(true);
    try {
      const msg = await api.post(`/chats/${chat.id}/messages`, {
        body: input.trim(), direction: noteMode?"note":"outbound",
        message_type: noteMode?"note":"text",
        sender_id: userId, sender_name: userName,
      });
      if (msg?.id) { setMessages(prev=>[...prev,msg]); lastMsgAt.current=msg.created_at; }
      setInput("");
    } catch (e) { alert("Send failed: "+e.message); }
    setSending(false);
  };

  const getAiSuggestion = async (tone="professional") => {
    setAiLoading(true);
    try {
      const r = await api.post(`/chats/${chat.id}/ai-suggest`, { tone });
      if (r?.suggestion) setInput(r.suggestion);
    } catch {}
    setAiLoading(false);
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div style={{ padding:"12px 20px", borderBottom:`1px solid ${C.border}`, background:C.surface,
        display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
        <Avatar name={chat.participant_name||chat.subject} size={38}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:800, color:C.text1 }}>{chat.participant_name||chat.subject}</div>
          <div style={{ display:"flex", gap:6, alignItems:"center", marginTop:2 }}>
            {chat.participant_email&&<span style={{ fontSize:11, color:C.text3 }}>{chat.participant_email}</span>}
            <span style={{ fontSize:10, padding:"1px 7px", borderRadius:99, fontWeight:700,
              background:`${STATUS_COLOR[chat.status]||C.text3}15`, color:STATUS_COLOR[chat.status]||C.text3 }}>
              {chat.status}
            </span>
          </div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {chat.record_id&&(
            <button onClick={()=>onOpenRecord?.(chat.record_id)}
              style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${C.border}`,
                background:"transparent", cursor:"pointer", fontSize:11, fontWeight:600,
                color:C.text2, display:"flex", alignItems:"center", gap:5, fontFamily:F }}>
              <Ic n="external" s={12} c={C.text2}/> View Record
            </button>
          )}
          <select value={chat.status} onChange={e=>onUpdateChat(chat.id,{status:e.target.value})}
            style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${C.border}`,
              fontSize:11, fontFamily:F, background:C.surface, cursor:"pointer" }}>
            {["open","pending","resolved","spam"].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column" }}>
        {!messages.length&&(
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:C.text3 }}>
            <div style={{ textAlign:"center" }}>
              <Ic n="msg" s={40} c={C.text3}/>
              <div style={{ marginTop:12, fontSize:13 }}>No messages yet</div>
            </div>
          </div>
        )}
        {messages.map(m=><MsgBubble key={m.id} msg={m}/>)}
        <div ref={bottomRef}/>
      </div>
      <div style={{ padding:"12px 20px", borderTop:`1px solid ${C.border}`, background:C.surface, flexShrink:0 }}>
        <div style={{ display:"flex", gap:6, marginBottom:8, alignItems:"center" }}>
          <button onClick={()=>getAiSuggestion("professional")} disabled={aiLoading}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:99,
              border:`1px solid ${C.purple}40`, background:`${C.purple}10`,
              cursor:aiLoading?"wait":"pointer", fontSize:11, fontWeight:600, color:C.purple, fontFamily:F }}>
            <Ic n="sparkle" s={11} c={C.purple}/>{aiLoading?"Thinking…":"✦ Suggest reply"}
          </button>
          <button onClick={()=>getAiSuggestion("friendly")} disabled={aiLoading}
            style={{ padding:"4px 10px", borderRadius:99, border:`1px solid ${C.border}`,
              background:"transparent", cursor:"pointer", fontSize:11, color:C.text3, fontFamily:F }}>Friendly</button>
          <div style={{ flex:1 }}/>
          <button onClick={()=>setNoteMode(m=>!m)}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:99,
              border:`1px solid ${noteMode?C.amber+"40":C.border}`,
              background:noteMode?`${C.amber}10`:"transparent", cursor:"pointer",
              fontSize:11, fontWeight:600, color:noteMode?C.amber:C.text3, fontFamily:F }}>
            📎 {noteMode?"Note mode":"Add note"}
          </button>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
          <textarea value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder={noteMode?"Internal note…":"Type a message…"}
            rows={input.split("\n").length>3?4:2}
            style={{ flex:1, padding:"10px 14px", borderRadius:12,
              border:`1.5px solid ${noteMode?C.amber:C.border}`, fontSize:13, fontFamily:F,
              outline:"none", resize:"none", background:noteMode?`${C.amber}08`:C.surface2, color:C.text1 }}/>
          <button onClick={send} disabled={!input.trim()||sending}
            style={{ width:42, height:42, borderRadius:12, border:"none", background:C.accent,
              cursor:!input.trim()?"not-allowed":"pointer", display:"flex",
              alignItems:"center", justifyContent:"center", opacity:!input.trim()?.5:1, flexShrink:0 }}>
            <Ic n="send" s={18} c="#fff"/>
          </button>
        </div>
        <div style={{ fontSize:10, color:C.text3, marginTop:5 }}>Enter to send · Shift+Enter for new line</div>
      </div>
    </div>
  );
}

function NewChatModal({ environment, onClose, onCreate }) {
  const [form, setForm] = useState({ subject:"", participant_name:"", participant_email:"", channel:"internal" });
  const [saving, setSaving] = useState(false);
  const set = p => setForm(f=>({...f,...p}));
  const save = async () => {
    if (!form.subject.trim()) return;
    setSaving(true);
    try {
      const chat = await api.post(`/chats`, { ...form, environment_id: environment?.id });
      onCreate(chat); onClose();
    } catch (e) { alert(e.message); }
    setSaving(false);
  };
  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.4)",
      display:"flex",alignItems:"center",justifyContent:"center" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface,borderRadius:16,padding:28,width:420,
        boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ fontSize:16,fontWeight:800,color:C.text1,marginBottom:20 }}>New Conversation</div>
        {[["subject","Subject","e.g. Following up on your application"],
          ["participant_name","Name","Candidate name"],
          ["participant_email","Email","candidate@email.com"]].map(([k,l,ph])=>(
          <div key={k} style={{ marginBottom:12 }}>
            <label style={{ fontSize:11,fontWeight:700,color:C.text3,display:"block",marginBottom:4,
              textTransform:"uppercase",letterSpacing:"0.04em" }}>{l}</label>
            <input value={form[k]} onChange={e=>set({[k]:e.target.value})} placeholder={ph}
              style={{ width:"100%",boxSizing:"border-box",padding:"8px 12px",borderRadius:8,
                border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none" }}/>
          </div>
        ))}
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:11,fontWeight:700,color:C.text3,display:"block",marginBottom:4,
            textTransform:"uppercase",letterSpacing:"0.04em" }}>Channel</label>
          <select value={form.channel} onChange={e=>set({channel:e.target.value})}
            style={{ width:"100%",padding:"8px 12px",borderRadius:8,
              border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F }}>
            <option value="internal">Internal only</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onClose} style={{ flex:1,padding:"9px",borderRadius:9,
            border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",
            fontSize:13,fontWeight:600,fontFamily:F,color:C.text2 }}>Cancel</button>
          <button onClick={save} disabled={!form.subject.trim()||saving}
            style={{ flex:2,padding:"9px",borderRadius:9,border:"none",background:C.accent,
              cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:F,color:"#fff",
              opacity:!form.subject.trim()?.5:1 }}>
            {saving?"Creating…":"Create Conversation"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CandidateChat({ environment, session, onOpenRecord }) {
  const [chats,   setChats]   = useState([]);
  const [selChat, setSelChat] = useState(null);
  const [stats,   setStats]   = useState(null);
  const [search,  setSearch]  = useState("");
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const envId = environment?.id;

  const loadChats = useCallback(async () => {
    if (!envId) return;
    try {
      const [c, s] = await Promise.all([
        api.get(`/chats?environment_id=${envId}`),
        api.get(`/chats/stats/summary?environment_id=${envId}`),
      ]);
      setChats(Array.isArray(c)?c:[]);
      setStats(s);
    } catch {}
    setLoading(false);
  }, [envId]);

  useEffect(() => { loadChats(); }, [loadChats]);

  useEffect(() => {
    const t = setInterval(() => {
      if (envId) api.get(`/chats/stats/summary?environment_id=${envId}`)
        .then(s=>setStats(s)).catch(()=>{});
    }, 30000);
    return () => clearInterval(t);
  }, [envId]);

  const updateChat = async (id, patch) => {
    try {
      const updated = await api.patch(`/chats/${id}`, patch);
      setChats(cs=>cs.map(c=>c.id===id?{...c,...updated}:c));
      if (selChat?.id===id) setSelChat(c=>({...c,...updated}));
    } catch {}
  };

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",
    height:300,color:C.text3,fontFamily:F }}>Loading…</div>;

  return (
    <div style={{ display:"flex", height:"100%", fontFamily:F, overflow:"hidden" }}>
      <ChatList chats={chats} selectedId={selChat?.id} onSelect={c=>setSelChat(c)}
        onNewChat={()=>setShowNew(true)} stats={stats} search={search} onSearch={setSearch}/>
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {selChat
          ? <ChatDetail chat={selChat} session={session?.user||session}
              onUpdateChat={updateChat} onOpenRecord={onOpenRecord}/>
          : <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:C.text3 }}>
              <div style={{ textAlign:"center" }}>
                <Ic n="message-circle" s={48} c={C.text3}/>
                <div style={{ fontSize:16,fontWeight:700,color:C.text1,marginTop:16 }}>Select a conversation</div>
                <div style={{ fontSize:13,marginTop:6,color:C.text3 }}>Or start a new one</div>
                <button onClick={()=>setShowNew(true)} style={{ marginTop:16,padding:"9px 20px",
                  borderRadius:10,border:"none",background:C.accent,color:"#fff",
                  fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F }}>
                  New Conversation
                </button>
              </div>
            </div>
        }
      </div>
      {showNew&&<NewChatModal environment={environment} onClose={()=>setShowNew(false)}
        onCreate={c=>{setChats(cs=>[c,...cs]);setSelChat(c);}}/>}
    </div>
  );
}
