import { tFetch } from "./apiClient.js";
// client/src/Inbox.jsx
import { useState, useEffect, useCallback, useRef } from "react";

const C = {
  bg: "var(--t-bg, #EEF2FF)", card: "var(--t-card, #ffffff)",
  accent: "var(--t-accent, #4361EE)", accentLight: "var(--t-accent-light, #EEF2FF)",
  text1: "var(--t-text1, #111827)", text2: "var(--t-text2, #374151)",
  text3: "var(--t-text3, #6B7280)", border: "var(--t-border, #E5E7EB)",
  danger: "#EF4444", success: "#10B981",
};
const F = "'Geist', -apple-system, sans-serif";

const api = {
  get: (url) => fetch(`/api${url}`).then(r => r.json()),
  post: (url, body) => fetch(`/api${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  patch: (url, body) => fetch(`/api${url}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  delete: (url) => fetch(`/api${url}`, { method: 'DELETE' }).then(r => r.json()),
};

const PATHS = {
  inbox: "M22 12h-6l-2 3H10l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 0l8 8 8-8",
  reply: "M9 17H5a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3M13 21l-4-4 4-4M9 17h10a2 2 0 002-2V9",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  x: "M18 6L6 18M6 6l12 12",
  check: "M20 6L9 17l-5-5",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  plus: "M12 5v14M5 12h14",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  link: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  "external-link": "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
};
const Ic = ({ n, s = 16, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n] || ""} />
  </svg>
);

const relTime = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const Avatar = ({ name, size = 36, color = C.accent }) => {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color + '22', color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, fontFamily: F, flexShrink: 0
    }}>{initials}</div>
  );
};

const MessageRow = ({ msg, selected, onClick }) => {
  const isUnread = !msg.read;
  return (
    <div onClick={onClick} style={{
      padding: '12px 16px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`,
      background: selected ? C.accentLight : isUnread ? '#FAFBFF' : C.card,
      borderLeft: selected ? `3px solid ${C.accent}` : '3px solid transparent',
      transition: 'all .12s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Avatar name={msg.from_name} size={34} color={isUnread ? C.accent : C.text3} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: isUnread ? 700 : 500, color: C.text1, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {msg.from_name || msg.from_email}
            </span>
            <span style={{ fontSize: 11, color: C.text3, flexShrink: 0 }}>{relTime(msg.received_at)}</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: isUnread ? 600 : 400, color: C.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
            {msg.subject || '(no subject)'}
          </div>
          <div style={{ fontSize: 11, color: C.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {(msg.body_text || '').slice(0, 100)}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
            {isUnread && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99, background: C.accent, color: 'white' }}>NEW</span>}
            {msg.matched_record
              ? <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 99, background: '#D1FAE5', color: '#065F46' }}>✓ {msg.matched_record.name}</span>
              : <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 99, background: '#FEF3C7', color: '#92400E' }}>Unmatched</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
};

const ThreadBubble = ({ msg, isInbound }) => (
  <div style={{ display: 'flex', justifyContent: isInbound ? 'flex-start' : 'flex-end', marginBottom: 12 }}>
    {isInbound && <Avatar name={msg.from_name || msg.from_email} size={28} />}
    <div style={{ maxWidth: '70%', marginLeft: isInbound ? 8 : 0, marginRight: isInbound ? 0 : 8 }}>
      <div style={{
        padding: '10px 14px', borderRadius: isInbound ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
        background: isInbound ? C.card : C.accent, color: isInbound ? C.text1 : 'white',
        border: isInbound ? `1px solid ${C.border}` : 'none',
        fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word'
      }}>{msg.body || msg.body_text}</div>
      <div style={{ fontSize: 10, color: C.text3, marginTop: 3, textAlign: isInbound ? 'left' : 'right' }}>
        {isInbound ? (msg.from_name || msg.from_email) : 'You'} · {relTime(msg.sent_at || msg.received_at)}
      </div>
    </div>
    {!isInbound && <Avatar name="Me" size={28} color="#4361EE" />}
  </div>
);

const LinkPersonModal = ({ environmentId, onLink, onClose }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get(`/records/search?q=${encodeURIComponent(search)}&environment_id=${environmentId}&limit=10`);
        const recs = Array.isArray(data) ? data : (data.results || []);
        setResults(recs.filter(r => (r.object_slug || '').includes('people') || (r.object_name || '').toLowerCase().includes('person')));
      } catch { setResults([]); }
      setLoading(false);
    }, 220);
    return () => clearTimeout(t);
  }, [search, environmentId]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 440, background: C.card, borderRadius: 16, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text1, fontFamily: F }}>Link to Person Record</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Ic n="x" s={16} c={C.text3} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, marginBottom: 12 }}>
          <Ic n="search" s={14} c={C.text3} />
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
            style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, fontFamily: F, color: C.text1 }} />
        </div>
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {loading && <div style={{ textAlign: 'center', padding: 20, color: C.text3, fontSize: 13 }}>Searching…</div>}
          {!loading && results.length === 0 && search && <div style={{ textAlign: 'center', padding: 20, color: C.text3, fontSize: 13 }}>No results</div>}
          {results.map(r => (
            <div key={r.id} onClick={() => onLink(r.id)}
              style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${C.border}`, marginBottom: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = C.accentLight}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Avatar name={r.display_name} size={32} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{r.display_name || r.data?.email || 'Unnamed'}</div>
                <div style={{ fontSize: 11, color: C.text3 }}>{r.data?.email || ''}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MessageDetail = ({ msgId, environmentId, onUpdate, onNavigate }) => {
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [sent, setSent] = useState(false);
  const [users, setUsers] = useState([]);
  const threadEndRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/inbox/${msgId}`);
      setMsg(data);
      if (!data.read) {
        await api.patch(`/inbox/${msgId}/read`, { read: true });
        onUpdate?.();
      }
    } catch { setMsg(null); }
    setLoading(false);
  }, [msgId]);

  useEffect(() => { if (msgId) load(); }, [msgId, load]);
  useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msg?.thread]);
  useEffect(() => { api.get('/users').then(d => setUsers(Array.isArray(d) ? d : [])).catch(() => {}); }, []);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/inbox/${msgId}/reply`, { body: reply, subject: `Re: ${msg.subject}` });
      setReply(''); setSent(true); setTimeout(() => setSent(false), 2000); load();
    } catch {}
    setSending(false);
  };

  const handleLink = async (recordId) => {
    await api.patch(`/inbox/${msgId}/link`, { record_id: recordId });
    setShowLink(false); load(); onUpdate?.();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this message?')) return;
    await api.delete(`/inbox/${msgId}`);
    onUpdate?.({ deleted: true });
  };

  if (loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text3, fontSize: 13 }}>Loading…</div>;
  if (!msg) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text3, fontSize: 13 }}>Message not found</div>;

  const thread = msg.thread || [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: F }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Avatar name={msg.from_name} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: C.text1 }}>{msg.subject || '(no subject)'}</h2>
            <div style={{ fontSize: 12, color: C.text3 }}>
              <span style={{ fontWeight: 600, color: C.text2 }}>{msg.from_name}</span>
              {' '}<span>&lt;{msg.from_email}&gt;</span>
              <span style={{ marginLeft: 8 }}>{relTime(msg.received_at)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {msg.matched_record
              ? <button onClick={() => onNavigate?.(msg.matched_record.id, null)} style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${C.accent}`, background: C.accentLight, color: C.accent, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: F }}>
                  <Ic n="external-link" s={11} c={C.accent} />{msg.matched_record.name}
                </button>
              : <button onClick={() => setShowLink(true)} style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${C.border}`, background: 'white', color: C.text2, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: F }}>
                  <Ic n="link" s={11} c={C.text3} />Link to record
                </button>
            }
            <select value={msg.assigned_to || ''} onChange={e => api.patch(`/inbox/${msgId}/assign`, { user_id: e.target.value }).then(load)}
              style={{ padding: '5px 8px', borderRadius: 7, border: `1px solid ${C.border}`, background: 'white', color: C.text2, fontSize: 11, fontFamily: F, cursor: 'pointer' }}>
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
            <button onClick={handleDelete} style={{ padding: '5px 8px', borderRadius: 7, border: `1px solid ${C.border}`, background: 'white', cursor: 'pointer' }}><Ic n="trash" s={11} c={C.danger} /></button>
          </div>
        </div>
      </div>

      {/* Thread */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#F8FAFF' }}>
        {thread.length > 0
          ? thread.map((t, i) => <ThreadBubble key={i} msg={t} isInbound={t.direction === 'inbound' || (!!t.from_email && !t.to_email)} />)
          : <ThreadBubble msg={{ ...msg, body: msg.body_text }} isInbound={true} />
        }
        <div ref={threadEndRef} />
      </div>

      {/* Reply composer */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
        <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '4px 12px 2px', fontSize: 11, color: C.text3, borderBottom: `1px solid ${C.border}` }}>
            To: <span style={{ color: C.text2, fontWeight: 600 }}>{msg.from_email}</span>
          </div>
          <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply…" rows={3}
            style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', padding: '10px 12px', fontSize: 13, fontFamily: F, color: C.text1, background: 'transparent', boxSizing: 'border-box' }}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply(); }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 10px', borderTop: `1px solid ${C.border}`, gap: 8 }}>
            <span style={{ fontSize: 11, color: C.text3, alignSelf: 'center' }}>Ctrl+Enter to send</span>
            <button onClick={handleReply} disabled={sending || !reply.trim()} style={{
              padding: '7px 16px', borderRadius: 8, border: 'none',
              background: sent ? C.success : reply.trim() ? C.accent : C.border,
              color: reply.trim() ? 'white' : C.text3, fontSize: 12, fontWeight: 700,
              cursor: reply.trim() ? 'pointer' : 'default', fontFamily: F,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s'
            }}>
              {sent ? <><Ic n="check" s={12} c="white" /> Sent!</> : sending ? 'Sending…' : <><Ic n="send" s={12} c="white" /> Reply</>}
            </button>
          </div>
        </div>
      </div>

      {showLink && <LinkPersonModal environmentId={environmentId} onLink={handleLink} onClose={() => setShowLink(false)} />}
    </div>
  );
};

export default function InboxModule({ environment, onNavigate }) {
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [showSeed, setShowSeed] = useState(false);
  const [seedForm, setSeedForm] = useState({ from_name: '', from_email: '', subject: '', body: '' });
  const searchRef = useRef('');

  const load = useCallback(async () => {
    if (!environment?.id) return;
    try {
      const data = await api.get(`/inbox?environment_id=${environment.id}&filter=${filter}&search=${encodeURIComponent(searchRef.current)}`);
      setMessages(data.messages || []);
      setTotal(data.total || 0);
    } catch { setMessages([]); }
    setLoading(false);
  }, [environment?.id, filter]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useEffect(() => { searchRef.current = search; const t = setTimeout(() => load(), 280); return () => clearTimeout(t); }, [search, load]);
  useEffect(() => { const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  const handleSeedTest = async () => {
    setSeeding(true);
    try {
      await api.post('/inbox/seed-test', { environment_id: environment.id, ...seedForm });
      setShowSeed(false); setSeedForm({ from_name: '', from_email: '', subject: '', body: '' }); load();
    } catch {}
    setSeeding(false);
  };

  const unreadCount = messages.filter(m => !m.read).length;
  const FILTERS = [{ id: 'all', label: 'All' }, { id: 'unread', label: `Unread${unreadCount ? ` (${unreadCount})` : ''}` }, { id: 'unmatched', label: 'Unmatched' }];

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 57px)', overflow: 'hidden', fontFamily: F, background: C.bg }}>
      {/* Left pane */}
      <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', background: C.card, borderRight: `1px solid ${C.border}` }}>
        <div style={{ padding: '16px 16px 0', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ic n="inbox" s={18} c={C.accent} />
              Inbox
              {unreadCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: C.accent, color: 'white' }}>{unreadCount}</span>}
            </h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setShowSeed(true)} title="Simulate inbound" style={{ padding: '5px 8px', borderRadius: 7, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', display: 'flex' }}><Ic n="plus" s={13} c={C.text3} /></button>
              <button onClick={load} title="Refresh" style={{ padding: '5px 8px', borderRadius: 7, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', display: 'flex' }}><Ic n="refresh" s={13} c={C.text3} /></button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: '#F3F4F6', borderRadius: 8, marginBottom: 10 }}>
            <Ic n="search" s={13} c={C.text3} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search messages…"
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, flex: 1, fontFamily: F, color: C.text1 }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Ic n="x" s={11} c={C.text3} /></button>}
          </div>
          <div style={{ display: 'flex' }}>
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                flex: 1, padding: '7px 4px', fontSize: 11, fontWeight: filter === f.id ? 700 : 500,
                color: filter === f.id ? C.accent : C.text3, background: 'transparent', border: 'none',
                borderBottom: filter === f.id ? `2px solid ${C.accent}` : '2px solid transparent',
                cursor: 'pointer', fontFamily: F, transition: 'all .12s'
              }}>{f.label}</button>
            ))}
          </div>
        </div>

        {/* Message list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading
            ? <div style={{ padding: 24, textAlign: 'center', color: C.text3, fontSize: 13 }}>Loading…</div>
            : messages.length === 0
              ? <div style={{ padding: 32, textAlign: 'center' }}>
                  <div style={{ marginBottom: 8 }}><Ic n="inbox" s={32} c={C.border} /></div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text3, marginBottom: 4 }}>
                    {filter === 'unread' ? 'No unread messages' : filter === 'unmatched' ? 'No unmatched messages' : 'No messages yet'}
                  </div>
                  <div style={{ fontSize: 11, color: C.text3 }}>
                    {filter === 'all' ? 'Click + to simulate an inbound message' : 'Try changing the filter'}
                  </div>
                </div>
              : messages.map(m => <MessageRow key={m.id} msg={m} selected={m.id === selectedId} onClick={() => setSelectedId(m.id)} />)
          }
          {total > messages.length && <div style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, color: C.text3 }}>Showing {messages.length} of {total}</div>}
        </div>
      </div>

      {/* Right pane */}
      {selectedId
        ? <MessageDetail msgId={selectedId} environmentId={environment?.id}
            onUpdate={(e) => { if (e?.deleted) setSelectedId(null); load(); }}
            onNavigate={onNavigate}
          />
        : <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.text3 }}>
            <div style={{ marginBottom: 12 }}><Ic n="mail" s={40} c={C.border} /></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text3, marginBottom: 4 }}>Select a message</div>
            <div style={{ fontSize: 12, color: C.text3 }}>Choose a conversation from the list to read and reply</div>
          </div>
      }

      {/* Seed test modal */}
      {showSeed && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowSeed(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 440, background: C.card, borderRadius: 16, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: C.text1, fontFamily: F }}>Simulate Inbound Message</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: C.text3, lineHeight: 1.5 }}>
              Simulate a received email. If the sender email matches a Person record it will auto-link.
            </p>
            {[
              { key: 'from_name', label: 'Sender Name', placeholder: 'e.g. James Harrison' },
              { key: 'from_email', label: 'Sender Email', placeholder: 'e.g. james@example.com' },
              { key: 'subject', label: 'Subject', placeholder: 'e.g. Re: Senior Engineer role' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input value={seedForm[f.key]} onChange={e => setSeedForm(s => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: F, color: C.text1, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: 'block', marginBottom: 4 }}>Message</label>
              <textarea value={seedForm.body} onChange={e => setSeedForm(s => ({ ...s, body: e.target.value }))} placeholder="Hi, I wanted to follow up…" rows={3}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: F, color: C.text1, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSeed(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 13, fontFamily: F }}>Cancel</button>
              <button onClick={handleSeedTest} disabled={seeding || !seedForm.from_email}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: seedForm.from_email ? C.accent : C.border, color: seedForm.from_email ? 'white' : C.text3, cursor: seedForm.from_email ? 'pointer' : 'default', fontSize: 13, fontWeight: 700, fontFamily: F }}>
                {seeding ? 'Sending…' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function useInboxUnreadCount(environmentId) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!environmentId) return;
    const poll = async () => {
      try { const d = await tFetch(`/api/inbox/unread-count?environment_id=${environmentId}`).then(r => r.json()); setCount(d.count || 0); } catch {}
    };
    poll();
    const i = setInterval(poll, 30000);
    return () => clearInterval(i);
  }, [environmentId]);
  return count;
}
