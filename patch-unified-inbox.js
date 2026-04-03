/**
 * patch-unified-inbox.js
 * Run from project root: node patch-unified-inbox.js
 */
const fs = require('fs');
const path = require('path');

// ── 1. Server: replace inbox GET / handler ───────────────────────────────────
const inboxRoutePath = path.join(__dirname, 'server/routes/inbox.js');
let route = fs.readFileSync(inboxRoutePath, 'utf8');

const OLD_ROUTE = `// GET /api/inbox — list messages
router.get('/', (req, res) => {
  const { environment_id, filter = 'all', page = 1, limit = 50, search } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();
  let messages = (store.inbound_messages || []).filter(m => m.environment_id === environment_id);
  if (filter === 'unread') messages = messages.filter(m => !m.read);
  if (filter === 'unmatched') messages = messages.filter(m => !m.matched_record_id);
  if (filter === 'mine') messages = messages.filter(m => m.assigned_to === req.query.user_id);
  if (search) {
    const q = search.toLowerCase();
    messages = messages.filter(m =>
      (m.from_name || '').toLowerCase().includes(q) ||
      (m.from_email || '').toLowerCase().includes(q) ||
      (m.subject || '').toLowerCase().includes(q) ||
      (m.body_text || '').toLowerCase().includes(q)
    );
  }
  messages.sort((a, b) => new Date(b.received_at) - new Date(a.received_at));
  const total = messages.length;
  const start = (parseInt(page) - 1) * parseInt(limit);
  const paginated = messages.slice(start, start + parseInt(limit));
  const records = store.records || [];
  const enriched = paginated.map(m => {
    let matched_record = null;
    if (m.matched_record_id) {
      const rec = records.find(r => r.id === m.matched_record_id);
      if (rec) {
        const d = rec.data || {};
        matched_record = {
          id: rec.id,
          name: [d.first_name, d.last_name].filter(Boolean).join(' ') || d.email || 'Unknown',
          object_id: rec.object_id
        };
      }
    }
    return { ...m, matched_record };
  });
  const unread_count = (store.inbound_messages || [])
    .filter(m => m.environment_id === environment_id && !m.read).length;
  res.json({ messages: enriched, total, unread_count });
});`;

const NEW_ROUTE = `// GET /api/inbox — unified multi-channel inbox
router.get('/', (req, res) => {
  const { environment_id, filter = 'mine', channel = 'all', page = 1, limit = 50, search, user_id } = req.query;
  if (!environment_id) return res.status(400).json({ error: 'environment_id required' });
  const store = getStore();

  // 1. Inbound emails
  const inboundEmails = (store.inbound_messages || [])
    .filter(m => m.environment_id === environment_id)
    .map(m => ({
      _source: 'inbound_message', channel: 'email', id: m.id,
      thread_id: m.thread_id, from_name: m.from_name, from_contact: m.from_email,
      subject: m.subject, preview: (m.body_text || '').slice(0, 120),
      matched_record_id: m.matched_record_id, related_record_id: m.related_record_id,
      read: !!m.read, assigned_to: m.assigned_to,
      received_at: m.received_at, created_at: m.created_at, context: m.context || 'general',
    }));

  // 2. Inbound SMS / WhatsApp / web from communications
  const inboundComms = (store.communications || [])
    .filter(c => c.environment_id === environment_id && c.direction === 'inbound'
              && ['sms', 'whatsapp', 'web'].includes(c.type))
    .map(c => ({
      _source: 'communication', channel: c.type, id: c.id,
      thread_id: c.thread_id || c.id,
      from_name: c.from_name || c.from_number || 'Unknown',
      from_contact: c.from_number || c.from_email || '',
      subject: c.subject || (c.type === 'sms' ? 'SMS' : c.type === 'whatsapp' ? 'WhatsApp' : 'Web message'),
      preview: (c.body || '').slice(0, 120),
      matched_record_id: c.record_id, related_record_id: c.related_record_id,
      read: !!c.read, assigned_to: c.assigned_to || null,
      received_at: c.sent_at || c.created_at, created_at: c.created_at, context: c.context || 'general',
    }));

  // 3. Merge — keep latest per thread
  const threadMap = new Map();
  [...inboundEmails, ...inboundComms].forEach(m => {
    const key = m.thread_id || m.id;
    const ex  = threadMap.get(key);
    if (!ex || new Date(m.received_at) > new Date(ex.received_at)) threadMap.set(key, m);
  });
  let messages = Array.from(threadMap.values());

  // 4. "Mine" — threads I replied to OR persons linked to my jobs
  if (filter === 'mine' && user_id) {
    const myThreads = new Set(
      (store.communications || [])
        .filter(c => c.direction === 'outbound' && c.created_by === user_id)
        .map(c => c.thread_id).filter(Boolean)
    );
    const myJobIds = new Set(
      (store.records || [])
        .filter(r => r.data?.owner_id === user_id || r.data?.recruiter_id === user_id || r.data?.hiring_manager_id === user_id)
        .map(r => r.id)
    );
    const myPersonIds = new Set(
      (store.people_links || []).filter(l => myJobIds.has(l.record_id)).map(l => l.person_id)
    );
    messages = messages.filter(m => myThreads.has(m.thread_id) || myPersonIds.has(m.matched_record_id));
  }
  if (filter === 'unread')    messages = messages.filter(m => !m.read);
  if (filter === 'unmatched') messages = messages.filter(m => !m.matched_record_id);
  if (channel !== 'all')      messages = messages.filter(m => m.channel === channel);

  if (search) {
    const q = search.toLowerCase();
    messages = messages.filter(m =>
      (m.from_name || '').toLowerCase().includes(q) ||
      (m.from_contact || '').toLowerCase().includes(q) ||
      (m.subject || '').toLowerCase().includes(q) ||
      (m.preview || '').toLowerCase().includes(q)
    );
  }
  messages.sort((a, b) => new Date(b.received_at) - new Date(a.received_at));

  const allUnified = Array.from(threadMap.values());
  const total = messages.length;
  const start = (parseInt(page) - 1) * parseInt(limit);
  const enriched = messages.slice(start, start + parseInt(limit)).map(m => {
    let matched_record = null;
    if (m.matched_record_id) {
      const rec = (store.records || []).find(r => r.id === m.matched_record_id);
      if (rec) {
        const d = rec.data || {};
        matched_record = { id: rec.id, object_id: rec.object_id,
          name: [d.first_name, d.last_name].filter(Boolean).join(' ') || d.email || 'Unknown' };
      }
    }
    return { ...m, matched_record };
  });

  res.json({
    messages: enriched, total,
    unread_count: allUnified.filter(m => !m.read).length,
    channel_counts: {
      email:    allUnified.filter(m => m.channel === 'email').length,
      sms:      allUnified.filter(m => m.channel === 'sms').length,
      whatsapp: allUnified.filter(m => m.channel === 'whatsapp').length,
      web:      allUnified.filter(m => m.channel === 'web').length,
    },
  });
});`;

if (!route.includes('unified multi-channel inbox')) {
  if (!route.includes(OLD_ROUTE.substring(0, 50))) {
    console.error('❌ Could not find the exact old route text. Check inbox.js manually.');
    process.exit(1);
  }
  route = route.replace(OLD_ROUTE, NEW_ROUTE);
  fs.writeFileSync(inboxRoutePath, route);
  console.log('✅ server/routes/inbox.js — unified GET / handler applied');
} else {
  console.log('ℹ️  server/routes/inbox.js — already patched, skipping');
}

// ── 2. Frontend: replace InboxModule with enhanced version ──────────────────
const inboxUiPath = path.join(__dirname, 'client/src/Inbox.jsx');
let ui = fs.readFileSync(inboxUiPath, 'utf8');

// Find and replace the InboxModule state/load section
const OLD_STATE = `export default function InboxModule({ environment, onNavigate }) {
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
      const data = await api.get(\`/inbox?environment_id=\${environment.id}&filter=\${filter}&search=\${encodeURIComponent(searchRef.current)}\`);
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
  const FILTERS = [{ id: 'all', label: 'All' }, { id: 'unread', label: \`Unread\${unreadCount ?`;

const NEW_STATE = `export default function InboxModule({ environment, session, onNavigate }) {
  const [messages,  setMessages]  = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('mine');
  const [channel,   setChannel]   = useState('all');
  const [channelCounts, setChannelCounts] = useState({});
  const [search,    setSearch]    = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [seeding,   setSeeding]   = useState(false);
  const [showSeed,  setShowSeed]  = useState(false);
  const [seedForm,  setSeedForm]  = useState({ from_name: '', from_email: '', subject: '', body: '' });
  const searchRef = useRef('');
  const userId = session?.user?.id || '';

  const load = useCallback(async () => {
    if (!environment?.id) return;
    try {
      const params = new URLSearchParams({
        environment_id: environment.id,
        filter,
        channel,
        search: searchRef.current,
        ...(userId ? { user_id: userId } : {}),
      });
      const data = await api.get(\`/inbox?\${params}\`);
      setMessages(data.messages || []);
      setTotal(data.total || 0);
      setChannelCounts(data.channel_counts || {});
    } catch { setMessages([]); }
    setLoading(false);
  }, [environment?.id, filter, channel, userId]);

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

  // Channel pills
  const CHANNELS = [
    { id: 'all',       label: 'All',       icon: 'inbox' },
    { id: 'email',     label: 'Email',     icon: 'mail' },
    { id: 'sms',       label: 'SMS',       icon: 'phone' },
    { id: 'whatsapp',  label: 'WhatsApp',  icon: 'messageSquare' },
  ];
  const FILTERS = [{ id: 'mine', label: 'Mine' }, { id: 'all', label: 'All' }, { id: 'unread', label: \`Unread\${unreadCount ?`;

if (!ui.includes("unified multi-channel") && ui.includes(OLD_STATE.substring(0, 60))) {
  ui = ui.replace(OLD_STATE, NEW_STATE);
  console.log('✅ InboxModule state — patched');
} else {
  console.log('ℹ️  InboxModule state — already patched or anchor not found');
}

// Replace the filter tab strip to add channel pills above it
const OLD_FILTERS = `          <div style={{ display: 'flex' }}>
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                flex: 1, padding: '7px 4px', fontSize: 11, fontWeight: filter === f.id ? 700 : 500,
                color: filter === f.id ? C.accent : C.text3, background: 'transparent', border: 'none',
                borderBottom: filter === f.id ? \`2px solid \${C.accent}\` : '2px solid transparent',
                cursor: 'pointer', fontFamily: F, transition: 'all .12s'
              }}>{f.label}</button>
            ))}
          </div>`;

const NEW_FILTERS = `          {/* Channel pills */}
          <div style={{ display:'flex', gap:5, marginBottom:8, flexWrap:'wrap' }}>
            {CHANNELS.map(ch => {
              const cnt = ch.id === 'all' ? undefined : channelCounts[ch.id];
              return (
                <button key={ch.id} onClick={() => setChannel(ch.id)} style={{
                  display:'flex', alignItems:'center', gap:4,
                  padding:'4px 10px', borderRadius:99, border:'1.5px solid',
                  borderColor: channel === ch.id ? C.accent : C.border,
                  background: channel === ch.id ? C.accentLight : 'transparent',
                  color: channel === ch.id ? C.accent : C.text3,
                  fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:F, transition:'all .12s',
                }}>
                  <Ic n={ch.icon} s={10}/>
                  {ch.label}
                  {cnt > 0 && <span style={{ fontSize:10, background:channel===ch.id?C.accent:C.border, color:channel===ch.id?'white':C.text3, borderRadius:99, padding:'0 4px', lineHeight:'14px' }}>{cnt}</span>}
                </button>
              );
            })}
          </div>
          {/* Status filter tabs */}
          <div style={{ display: 'flex' }}>
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                flex: 1, padding: '7px 4px', fontSize: 11, fontWeight: filter === f.id ? 700 : 500,
                color: filter === f.id ? C.accent : C.text3, background: 'transparent', border: 'none',
                borderBottom: filter === f.id ? \`2px solid \${C.accent}\` : '2px solid transparent',
                cursor: 'pointer', fontFamily: F, transition: 'all .12s'
              }}>{f.label}</button>
            ))}
          </div>`;

if (ui.includes(OLD_FILTERS.substring(0, 50))) {
  ui = ui.replace(OLD_FILTERS, NEW_FILTERS);
  console.log('✅ Channel pills + filter tabs — patched');
} else {
  console.log('ℹ️  Filter strip — anchor not found, may need manual check');
}

// Add channel badge to MessageRow — replace from_email with from_contact
// The unified messages use from_contact instead of from_email
const OLD_MSG_ROW = `m.from_email || ''`;
if (ui.includes(OLD_MSG_ROW)) {
  ui = ui.replace(new RegExp('m\\.from_email', 'g'), 'm.from_contact || m.from_email');
  console.log('✅ MessageRow from_contact fallback — patched');
}

// Update empty state message
ui = ui.replace(
  `filter === 'all' ? 'Click + to simulate an inbound message' : 'Try changing the filter'`,
  `filter === 'mine' ? 'No messages yet — try switching to All' : filter === 'all' ? 'Click + to simulate an inbound message' : 'Try changing the filter'`
);

fs.writeFileSync(inboxUiPath, ui);
console.log('✅ client/src/Inbox.jsx — written');

// ── 3. Pass session to InboxModule from App.jsx ──────────────────────────────
const appPath = path.join(__dirname, 'client/src/App.jsx');
let app = fs.readFileSync(appPath, 'utf8');

// Find the InboxModule render and add session prop
if (app.includes('<InboxModule') && !app.includes('session={session}')) {
  app = app.replace(
    /<InboxModule\s+environment={([^}]+)}([^/]*)\//,
    `<InboxModule environment={$1} session={session}$2/`
  );
  fs.writeFileSync(appPath, app);
  console.log('✅ App.jsx — session prop added to InboxModule');
} else {
  console.log('ℹ️  App.jsx — session already passed or InboxModule not found');
}

console.log('\n✅ All patches applied. Now run:');
console.log('  cd client && npx vite build');
console.log('  git add -A && git commit -m "feat: unified inbox — email+SMS+WhatsApp, channel filters, mine filter" && git push origin main');
