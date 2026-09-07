// client/src/CandidateHub.jsx
// Candidate Hub — self-service portal accessed via /hub/:token
// Completely separate from the main app — no sidebar, no auth session needed.

import { useState, useEffect } from "react";

const C = {
  bg: "#F0F2FF", surface: "#FFFFFF", surface2: "#F8F9FE",
  border: "#E8EAF2", accent: "#5B5BD6", accentL: "#EEF0FF",
  text1: "#0D0D1A", text2: "#3D3D5C", text3: "#8B8BAD",
  green: "#0CA678", greenL: "#ECFDF5", amber: "#D97706", amberL: "#FFFBEB",
  red: "#DC2626", redL: "#FEF2F2", purple: "#7C3AED", purpleL: "#F5F3FF",
};
const F = "'DM Sans', -apple-system, sans-serif";

const ICONS = {
  briefcase: "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zm-8-4a2 2 0 012 2H10a2 2 0 012-2z",
  calendar:  "M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  gift:      "M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z",
  message:   "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  file:      "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6",
  check:     "M20 6L9 17l-5-5",
  x:         "M18 6L6 18M6 6l12 12",
  clock:     "M12 2a10 10 0 100 20A10 10 0 0012 2zM12 6v6l4 2",
  map:       "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 10a1 1 0 100-2 1 1 0 000 2z",
  send:      "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  video:     "M23 7l-7 5 7 5V7zM1 5h15a2 2 0 012 2v10a2 2 0 01-2 2H1V5z",
  phone:     "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.72a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72 12.05 12.05 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 8.19a16 16 0 006.88 6.88l1.21-1.21a2 2 0 012.11-.45 12.05 12.05 0 002.81.7A2 2 0 0122 16.92z",
  alert:     "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  inbox:     "M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z",
  user:      "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
};

function Ic({ n, s = 18, c = "currentColor" }) {
  const d = ICONS[n]; if (!d) return null;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d.split('M').filter(Boolean).map((seg, i) => <path key={i} d={`M${seg}`} />)}
    </svg>
  );
}

function formatDate(str) {
  if (!str) return '—';
  try { return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return str; }
}
function formatTime(t) {
  if (!t) return '';
  try { const [h, m] = t.split(':'); const hour = parseInt(h); return `${hour%12||12}:${m} ${hour>=12?'PM':'AM'}`; } catch { return t; }
}
function formatCurrency(amount, currency = 'USD') {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}
function relativeTime(str) {
  if (!str) return '';
  const d = Math.floor((Date.now() - new Date(str).getTime()) / 86400000);
  if (d === 0) return 'Today'; if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`; return formatDate(str);
}

function Badge({ label, color = C.text3 }) {
  return <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700, background:`${color}18`, color, border:`1px solid ${color}28`, whiteSpace:'nowrap' }}>{label}</span>;
}
const STATUS_COLORS = {
  'Under Review': C.text3, 'Screening': C.amber, 'Interview': C.purple,
  'Shortlisted': C.accent, 'Offer': C.green, 'Hired': C.green, 'Declined': C.red,
  sent: C.accent, accepted: C.green, declined: C.red,
  draft: C.text3, pending_approval: C.amber, scheduled: C.accent, completed: C.green, cancelled: C.red,
};
function statusColor(s) { return STATUS_COLORS[s] || C.accent; }

function Card({ children, style = {} }) {
  return <div style={{ background:C.surface, borderRadius:16, border:`1px solid ${C.border}`, boxShadow:'0 2px 8px rgba(0,0,0,0.04)', overflow:'hidden', ...style }}>{children}</div>;
}
function CardHeader({ icon, title, count }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'16px 20px', borderBottom:`1px solid ${C.border}`, background:C.surface2 }}>
      <div style={{ width:32, height:32, borderRadius:10, background:C.accentL, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Ic n={icon} s={16} c={C.accent} />
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.text1 }}>{title}</div>
        {count !== undefined && <div style={{ fontSize:11, color:C.text3, marginTop:1 }}>{count} {count===1?'item':'items'}</div>}
      </div>
    </div>
  );
}
function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48 }}>
      <div style={{ width:36, height:36, borderRadius:'50%', border:`3px solid ${C.border}`, borderTopColor:C.accent, animation:'hub-spin 0.8s linear infinite' }} />
      <style>{`@keyframes hub-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
function Empty({ icon, text }) {
  return (
    <div style={{ padding:'36px 24px', textAlign:'center' }}>
      <div style={{ width:44, height:44, borderRadius:12, background:C.surface2, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
        <Ic n={icon} s={20} c={C.text3} />
      </div>
      <div style={{ fontSize:13, color:C.text3 }}>{text}</div>
    </div>
  );
}

function ApplicationsSection({ token }) {
  const [apps, setApps] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`/api/candidate-hub/${token}/applications`)
      .then(r=>r.json()).then(d=>{setApps(Array.isArray(d)?d:[]);setLoading(false);}).catch(()=>setLoading(false));
  }, [token]);
  return (
    <Card>
      <CardHeader icon="briefcase" title="My Applications" count={apps.length} />
      {loading ? <Spinner /> : apps.length===0 ? <Empty icon="briefcase" text="No applications on record yet." /> :
        apps.map(app => (
          <div key={app.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', borderBottom:`1px solid ${C.border}` }}>
            <div style={{ width:42, height:42, borderRadius:12, background:`${C.accent}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Ic n="briefcase" s={18} c={C.accent} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.text1 }}>{app.job_title}</div>
              <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>{[app.department,app.location].filter(Boolean).join(' · ')}</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
              <Badge label={app.status} color={statusColor(app.status)} />
              <div style={{ fontSize:11, color:C.text3 }}>Applied {relativeTime(app.applied_at)}</div>
            </div>
          </div>
        ))
      }
    </Card>
  );
}

function InterviewsSection({ token }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`/api/candidate-hub/${token}/interviews`)
      .then(r=>r.json()).then(d=>{setItems(Array.isArray(d)?d:[]);setLoading(false);}).catch(()=>setLoading(false));
  }, [token]);
  const upcoming = items.filter(i => new Date(`${i.date}T${i.time||'00:00'}`) >= new Date());
  const past     = items.filter(i => new Date(`${i.date}T${i.time||'00:00'}`) < new Date());

  const InterviewCard = ({ iv }) => {
    const isPast = new Date(`${iv.date}T${iv.time||'00:00'}`) < new Date();
    return (
      <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', gap:16, alignItems:'flex-start', opacity:isPast?0.7:1 }}>
        <div style={{ minWidth:52, textAlign:'center', background:isPast?C.surface2:C.accentL, borderRadius:12, padding:'8px 4px', border:`1px solid ${isPast?C.border:C.accent+'30'}` }}>
          <div style={{ fontSize:20, fontWeight:800, color:isPast?C.text3:C.accent, lineHeight:1 }}>{new Date(iv.date).getDate()}</div>
          <div style={{ fontSize:10, color:isPast?C.text3:C.accent, fontWeight:600, marginTop:2 }}>{new Date(iv.date).toLocaleDateString('en-GB',{month:'short'}).toUpperCase()}</div>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={{ fontSize:14, fontWeight:700, color:C.text1 }}>{iv.type_name}</span>
            <Badge label={iv.status} color={statusColor(iv.status)} />
          </div>
          {iv.job_name && <div style={{ fontSize:12, color:C.text2, marginBottom:6 }}>{iv.job_name}</div>}
          <div style={{ display:'flex', flexWrap:'wrap', gap:12, fontSize:12, color:C.text3 }}>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}><Ic n="clock" s={12} c={C.text3}/>{formatTime(iv.time)} · {iv.duration} min</span>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}>
              {iv.format==='Video Call'||iv.format==='Video'?<><Ic n="video" s={12} c={C.text3}/> Video</>
              :iv.format==='Phone'?<><Ic n="phone" s={12} c={C.text3}/> Phone</>
              :<><Ic n="map" s={12} c={C.text3}/> {iv.format||'Onsite'}</>}
            </span>
            {iv.interviewers?.length>0 && <span style={{ display:'flex', alignItems:'center', gap:4 }}><Ic n="user" s={12} c={C.text3}/>{iv.interviewers.slice(0,2).join(', ')}{iv.interviewers.length>2&&` +${iv.interviewers.length-2}`}</span>}
          </div>
          {iv.video_link && !isPast && (
            <a href={iv.video_link} target="_blank" rel="noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:10, padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600, background:C.accent, color:'white', textDecoration:'none' }}>
              <Ic n="video" s={12} c="white"/> Join Meeting
            </a>
          )}
          {iv.notes_for_candidate && (
            <div style={{ marginTop:10, padding:'8px 12px', borderRadius:8, background:C.amberL, border:`1px solid ${C.amber}30`, fontSize:12, color:C.text2 }}>
              <strong style={{ color:C.amber }}>Note:</strong> {iv.notes_for_candidate}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader icon="calendar" title="My Interviews" count={items.length} />
      {loading ? <Spinner /> : items.length===0 ? <Empty icon="calendar" text="No interviews scheduled yet." /> : (
        <>
          {upcoming.length>0 && (<><div style={{ padding:'10px 20px 6px', fontSize:11, fontWeight:700, color:C.accent, textTransform:'uppercase', letterSpacing:'0.05em' }}>Upcoming</div>{upcoming.map(iv=><InterviewCard key={iv.id} iv={iv}/>)}</>)}
          {past.length>0 && (<><div style={{ padding:'10px 20px 6px', fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.05em' }}>Past</div>{past.map(iv=><InterviewCard key={iv.id} iv={iv}/>)}</>)}
        </>
      )}
    </Card>
  );
}

function OffersSection({ token }) {
  const [offers, setOffers] = useState([]); const [loading, setLoading] = useState(true);
  const [showDeclineModal, setShowDeclineModal] = useState(null);
  const [declineReason, setDeclineReason] = useState(''); const [working, setWorking] = useState(false);
  useEffect(() => { fetch(`/api/candidate-hub/${token}/offers`).then(r=>r.json()).then(d=>{setOffers(Array.isArray(d)?d:[]);setLoading(false);}).catch(()=>setLoading(false)); }, [token]);

  const respond = async (offerId, action, reason) => {
    setWorking(true);
    try {
      const r = await fetch(`/api/candidate-hub/${token}/offers/${offerId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action, decline_reason:reason}) });
      const d = await r.json();
      if (d.ok) { setOffers(prev=>prev.map(o=>o.id===offerId?{...o,status:d.status}:o)); setShowDeclineModal(null); setDeclineReason(''); }
    } finally { setWorking(false); }
  };

  const pkgTotal = (o) => {
    if (o.total_package) return o.total_package;
    let t = parseFloat(o.base_salary)||0;
    if (o.bonus) t += o.bonus_type==='percentage' ? t*(parseFloat(o.bonus)/100) : parseFloat(o.bonus);
    (o.package_items||[]).forEach(item => { if (!item.exclude_from_total) t += parseFloat(item.value)||0; });
    return t;
  };

  return (
    <>
      <Card>
        <CardHeader icon="gift" title="My Offers" count={offers.length} />
        {loading ? <Spinner /> : offers.length===0 ? <Empty icon="gift" text="No offers yet." /> :
          offers.map(offer => (
            <div key={offer.id} style={{ padding:'20px', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:C.text1 }}>{offer.job_name||'Offer Letter'}</div>
                  {offer.job_department && <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>{offer.job_department}</div>}
                </div>
                <Badge label={offer.status.replace(/_/g,' ')} color={statusColor(offer.status)} />
              </div>
              <div style={{ background:C.surface2, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden', marginBottom:16 }}>
                <div style={{ padding:'10px 16px', fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:`1px solid ${C.border}` }}>Compensation Package</div>
                {[
                  ['Base Salary', formatCurrency(offer.base_salary, offer.currency)],
                  offer.bonus?['Bonus', offer.bonus_type==='percentage'?`${offer.bonus}% of base`:formatCurrency(offer.bonus,offer.currency)]:null,
                  ...(offer.package_items||[]).map(item=>[item.label||item.name, formatCurrency(item.value,offer.currency)]),
                ].filter(Boolean).map(([label,value])=>(
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 16px', borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
                    <span style={{ color:C.text2 }}>{label}</span><span style={{ fontWeight:600, color:C.text1 }}>{value}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 16px', background:C.accentL, fontSize:14 }}>
                  <span style={{ fontWeight:700, color:C.accent }}>Total Package</span>
                  <span style={{ fontWeight:800, color:C.accent }}>{formatCurrency(pkgTotal(offer),offer.currency)}</span>
                </div>
              </div>
              <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
                {offer.start_date && <div style={{ padding:'8px 14px', background:C.greenL, borderRadius:10, border:`1px solid ${C.green}30` }}><div style={{ fontSize:10, color:C.green, fontWeight:700, textTransform:'uppercase' }}>Start Date</div><div style={{ fontSize:13, fontWeight:700, color:C.text1, marginTop:2 }}>{formatDate(offer.start_date)}</div></div>}
                {offer.expiry_date && offer.status==='sent' && <div style={{ padding:'8px 14px', background:C.amberL, borderRadius:10, border:`1px solid ${C.amber}30` }}><div style={{ fontSize:10, color:C.amber, fontWeight:700, textTransform:'uppercase' }}>Respond By</div><div style={{ fontSize:13, fontWeight:700, color:C.text1, marginTop:2 }}>{formatDate(offer.expiry_date)}</div></div>}
              </div>
              {offer.terms && <div style={{ marginBottom:16, padding:'12px 16px', background:C.surface2, borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, color:C.text2, lineHeight:1.6 }}>{offer.terms}</div>}
              {offer.status==='sent' && (
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={()=>respond(offer.id,'accept')} disabled={working} style={{ flex:1, padding:'12px', borderRadius:10, border:'none', background:C.green, color:'white', fontSize:14, fontWeight:700, cursor:working?'wait':'pointer', fontFamily:F, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><Ic n="check" s={16} c="white"/> Accept Offer</button>
                  <button onClick={()=>setShowDeclineModal(offer.id)} disabled={working} style={{ flex:1, padding:'12px', borderRadius:10, border:`1.5px solid ${C.red}`, background:'transparent', color:C.red, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:F, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><Ic n="x" s={16} c={C.red}/> Decline</button>
                </div>
              )}
              {offer.status==='accepted' && <div style={{ padding:'12px 16px', background:C.greenL, borderRadius:10, border:`1px solid ${C.green}30`, textAlign:'center' }}><div style={{ fontSize:14, fontWeight:700, color:C.green }}>✓ Offer Accepted</div><div style={{ fontSize:12, color:C.text3, marginTop:2 }}>Congratulations! The team will be in touch with next steps.</div></div>}
              {offer.status==='declined' && <div style={{ padding:'12px 16px', background:C.redL, borderRadius:10, border:`1px solid ${C.red}30`, textAlign:'center' }}><div style={{ fontSize:13, color:C.red, fontWeight:600 }}>Offer Declined</div></div>}
            </div>
          ))
        }
      </Card>
      {showDeclineModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:C.surface, borderRadius:16, padding:24, maxWidth:400, width:'100%' }}>
            <div style={{ fontSize:16, fontWeight:700, color:C.text1, marginBottom:4 }}>Decline Offer</div>
            <div style={{ fontSize:13, color:C.text3, marginBottom:16 }}>Would you like to share a reason? (optional)</div>
            <textarea value={declineReason} onChange={e=>setDeclineReason(e.target.value)} rows={3} placeholder="e.g. Accepted another offer, compensation expectations..." style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F, outline:'none', resize:'vertical', boxSizing:'border-box' }}/>
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button onClick={()=>{setShowDeclineModal(null);setDeclineReason('');}} style={{ flex:1, padding:'10px', borderRadius:10, border:`1px solid ${C.border}`, background:'transparent', color:C.text2, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F }}>Cancel</button>
              <button onClick={()=>respond(showDeclineModal,'decline',declineReason)} disabled={working} style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background:C.red, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F }}>{working?'Sending…':'Decline Offer'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MessagesSection({ token }) {
  const [msgs, setMsgs] = useState([]); const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState(''); const [sending, setSending] = useState(false); const [sent, setSent] = useState(false);
  useEffect(() => { fetch(`/api/candidate-hub/${token}/messages`).then(r=>r.json()).then(d=>{setMsgs(Array.isArray(d)?d:[]);setLoading(false);}).catch(()=>setLoading(false)); }, [token]);

  const sendReply = async () => {
    if (!reply.trim()) return; setSending(true);
    try {
      await fetch(`/api/candidate-hub/${token}/messages`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({body:reply}) });
      setSent(true); setReply(''); setTimeout(()=>setSent(false),3000);
    } finally { setSending(false); }
  };

  return (
    <Card>
      <CardHeader icon="message" title="Messages" count={msgs.length} />
      {loading ? <Spinner /> : msgs.length===0 ? <Empty icon="inbox" text="No messages yet. Any communications will appear here." /> :
        msgs.map(m => (
          <div key={m.id} style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`, borderLeft:`3px solid ${m.direction==='inbound'?C.green:C.accent}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Badge label={{email:'Email',sms:'SMS',whatsapp:'WhatsApp'}[m.type]||m.type} color={m.direction==='inbound'?C.green:C.accent} />
                {m.direction==='inbound' && <span style={{ fontSize:11, color:C.text3 }}>Your reply</span>}
              </div>
              <span style={{ fontSize:11, color:C.text3 }}>{relativeTime(m.created_at)}</span>
            </div>
            {m.subject && <div style={{ fontSize:13, fontWeight:700, color:C.text1, marginBottom:4 }}>{m.subject}</div>}
            <div style={{ fontSize:13, color:C.text2, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{m.body}</div>
          </div>
        ))
      }
      <div style={{ padding:'16px 20px', borderTop:`1px solid ${C.border}` }}>
        <div style={{ fontSize:12, fontWeight:600, color:C.text2, marginBottom:8 }}>Send a message</div>
        <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={3} placeholder="Type your message here…" style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F, outline:'none', resize:'vertical', boxSizing:'border-box', marginBottom:10 }}/>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10 }}>
          {sent && <span style={{ fontSize:12, color:C.green }}>✓ Message sent</span>}
          <button onClick={sendReply} disabled={sending||!reply.trim()} style={{ padding:'9px 18px', borderRadius:10, border:'none', background:reply.trim()?C.accent:C.border, color:reply.trim()?'white':C.text3, fontSize:13, fontWeight:700, cursor:reply.trim()?'pointer':'default', fontFamily:F, display:'flex', alignItems:'center', gap:8 }}>
            <Ic n="send" s={14} c={reply.trim()?'white':C.text3}/>{sending?'Sending…':'Send'}
          </button>
        </div>
      </div>
    </Card>
  );
}

function DocumentsSection({ token }) {
  const [docs, setDocs] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`/api/candidate-hub/${token}/documents`).then(r=>r.json()).then(d=>{setDocs(Array.isArray(d)?d:[]);setLoading(false);}).catch(()=>setLoading(false)); }, [token]);
  return (
    <Card>
      <CardHeader icon="file" title="Documents" count={docs.length} />
      {loading ? <Spinner /> : docs.length===0 ? <Empty icon="file" text="No documents uploaded yet." /> :
        docs.map(doc => (
          <div key={doc.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 20px', borderBottom:`1px solid ${C.border}` }}>
            <div style={{ width:36, height:36, borderRadius:10, background:C.purpleL, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Ic n="file" s={16} c={C.purple}/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{doc.name}</div>
              <div style={{ fontSize:11, color:C.text3 }}>{doc.file_type} · {relativeTime(doc.created_at)}</div>
            </div>
          </div>
        ))
      }
    </Card>
  );
}

const TABS = [
  { id:'applications', icon:'briefcase', label:'Applications' },
  { id:'interviews',   icon:'calendar',  label:'Interviews'   },
  { id:'offers',       icon:'gift',      label:'Offers'       },
  { id:'messages',     icon:'message',   label:'Messages'     },
  { id:'documents',    icon:'file',      label:'Documents'    },
];

export default function CandidateHub() {
  const token = window.location.pathname.match(/^\/hub\/(.+)$/)?.[1];
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('applications');

  useEffect(() => {
    if (!token) { setError('No access token found in the URL.'); setLoading(false); return; }
    fetch(`/api/candidate-hub/verify/${token}`)
      .then(r=>r.json())
      .then(d => { if (d.error) setError(d.error); else setState(d); setLoading(false); })
      .catch(() => { setError('Unable to load your hub. Please check your link and try again.'); setLoading(false); });
  }, [token]);

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F }}>
      <div style={{ textAlign:'center' }}><Spinner/><div style={{ fontSize:14, color:C.text3, marginTop:8 }}>Loading your hub…</div></div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F, padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:420 }}>
        <div style={{ width:60, height:60, borderRadius:18, background:C.redL, border:`1px solid ${C.red}30`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <Ic n="alert" s={28} c={C.red}/>
        </div>
        <div style={{ fontSize:22, fontWeight:800, color:C.text1, marginBottom:8 }}>Access Error</div>
        <div style={{ fontSize:14, color:C.text3, lineHeight:1.7, marginBottom:24 }}>{error}</div>
        <div style={{ fontSize:12, color:C.text3 }}>If you need help, please contact your recruiter.</div>
      </div>
    </div>
  );

  const { candidate, brand } = state;
  const initials = [(candidate.first_name||'')[0],(candidate.last_name||'')[0]].filter(Boolean).join('').toUpperCase()||'?';
  const primary = brand?.primary_color || C.accent;

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:F }}>
      {/* Header */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, zIndex:50, boxShadow:'0 2px 12px rgba(91,91,214,0.06)' }}>
        <div style={{ padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {brand?.logo_url ? (
              <img src={brand.logo_url} alt={brand.company_name||''} style={{ height:30, maxWidth:120, objectFit:'contain' }}/>
            ) : (
              <div style={{ width:34, height:34, borderRadius:10, background:`linear-gradient(135deg, ${primary}, #4338CA)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ color:'white', fontSize:14, fontWeight:900 }}>{brand?.company_name?.[0]?.toUpperCase() || 'V'}</span>
              </div>
            )}
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:C.text1, lineHeight:1 }}>Candidate Hub</div>
              <div style={{ fontSize:10, color:C.text3, letterSpacing:'0.04em' }}>{brand?.company_name ? brand.company_name.toUpperCase() : 'POWERED BY VERCENTIC'}</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text1 }}>{candidate.first_name} {candidate.last_name}</div>
              {candidate.email && <div style={{ fontSize:11, color:C.text3 }}>{candidate.email}</div>}
            </div>
            <div style={{ width:36, height:36, borderRadius:'50%', background:`linear-gradient(135deg, ${primary}, #4338CA)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'white' }}>{initials}</div>
          </div>
        </div>
        <div style={{ display:'flex', borderTop:`1px solid ${C.border}`, overflowX:'auto' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{ display:'flex', alignItems:'center', gap:7, padding:'11px 18px', border:'none', background:'transparent', cursor:'pointer', fontSize:13, fontWeight:activeTab===tab.id?700:500, color:activeTab===tab.id?primary:C.text3, borderBottom:activeTab===tab.id?`2.5px solid ${primary}`:'2.5px solid transparent', fontFamily:F, whiteSpace:'nowrap', transition:'color 0.15s' }}>
              <Ic n={tab.icon} s={15} c={activeTab===tab.id?primary:C.text3}/>{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:760, margin:'0 auto', padding:'28px 20px' }}>
        {activeTab==='applications' && (
          <div style={{ marginBottom:20, padding:'16px 20px', background:`linear-gradient(135deg, ${C.accentL}, #F5F3FF)`, borderRadius:16, border:`1px solid ${C.accent}20`, display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:14, background:`linear-gradient(135deg, ${C.accent}, #4338CA)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:18, fontWeight:800, color:'white' }}>{initials}</div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:C.text1 }}>Welcome back, {candidate.first_name}</div>
              <div style={{ fontSize:13, color:C.text2, marginTop:2 }}>Track your applications, upcoming interviews, and offers all in one place.</div>
            </div>
          </div>
        )}
        {activeTab==='applications' && <ApplicationsSection token={token}/>}
        {activeTab==='interviews'   && <InterviewsSection   token={token}/>}
        {activeTab==='offers'       && <OffersSection       token={token}/>}
        {activeTab==='messages'     && <MessagesSection     token={token}/>}
        {activeTab==='documents'    && <DocumentsSection    token={token}/>}
      </div>

      <div style={{ padding:'24px', textAlign:'center', fontSize:11, color:C.text3, borderTop:`1px solid ${C.border}`, background:C.surface, marginTop:40 }}>
        Powered by Vercentic · This is a secure, personalised link for you only. Do not share this URL.
      </div>
    </div>
  );
}
