/**
 * CandidateHub.jsx — client/src/CandidateHub.jsx
 * Candidate-facing hub. Accessed at /hub path.
 * Completely separate from the admin app.
 */
import { useState, useEffect, useCallback } from 'react';

const BASE = '/api/hub';
async function hubApi(path, opts = {}) {
  const token = sessionStorage.getItem('hub_session');
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

const DEFAULT_BRAND = { primaryColor: '#4361EE', bgColor: '#EEF2FF', textColor: '#0F1729',
  fontFamily: "'Inter', -apple-system, sans-serif", borderRadius: '12px',
  companyName: 'Vercentic', logoUrl: '', tagline: 'Track your application journey' };

function HubIcon({ name, size = 20, color = 'currentColor' }) {
  const paths = {
    mail:      'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
    check:     'M20 6L9 17l-5-5',
    clock:     'M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2M12 6v6l4 2',
    briefcase: 'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2',
    gift:      'M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
    file:      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
    video:     'M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z',
    map:       'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 10a1 1 0 1 0 2 0 1 1 0 0 0-2 0',
    alert:     'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
    loader:    'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83',
    arrow:     'M5 12h14M12 5l7 7-7 7',
    chevron:   'M9 18l6-6-6-6',
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name] || ''}/>
    </svg>
  );
}

function Badge({ children, color = '#4361EE', bg }) {
  return <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 10px',
    borderRadius:99, fontSize:11, fontWeight:700, background: bg || `${color}18`, color }}>{children}</span>;
}
function Btn({ children, onClick, variant='primary', disabled, style={}, brand }) {
  const accent = brand?.primaryColor || '#4361EE';
  const variants = {
    primary: { background:accent, color:'white' },
    outline: { background:'transparent', color:accent, border:`1.5px solid ${accent}` },
    ghost:   { background:'#F3F4F6', color:'#374151' },
    danger:  { background:'#FEE2E2', color:'#DC2626', border:'1.5px solid #FCA5A5' },
  };
  return <button onClick={disabled ? undefined : onClick} style={{
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
    padding:'10px 22px', borderRadius:99, border:'none', cursor:disabled?'not-allowed':'pointer',
    fontSize:14, fontWeight:700, fontFamily:'inherit', transition:'opacity .15s',
    opacity:disabled?0.5:1, ...variants[variant], ...style }}>{children}</button>;
}

function RequestForm({ brand, portalId, onSent }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!email.trim()) return setError('Please enter your email address.');
    setLoading(true); setError('');
    try {
      await hubApi('/request-link', { method:'POST', body:{ email:email.trim(), portal_id:portalId } });
      onSent(email.trim());
    } catch(e) { setError(e.error || 'Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ minHeight:'100vh', background:brand.bgColor, display:'flex', alignItems:'center',
      justifyContent:'center', padding:24, fontFamily:brand.fontFamily }}>
      <div style={{ background:'white', borderRadius:20, padding:'48px 40px', maxWidth:440, width:'100%',
        boxShadow:'0 8px 40px rgba(0,0,0,0.10)', textAlign:'center' }}>
        {brand.logoUrl
          ? <img src={brand.logoUrl} alt={brand.companyName} style={{ maxHeight:48, maxWidth:180, objectFit:'contain', marginBottom:28 }}/>
          : <div style={{ width:52, height:52, borderRadius:14, background:brand.primaryColor, display:'flex',
              alignItems:'center', justifyContent:'center', margin:'0 auto 28px' }}>
              <span style={{ color:'white', fontSize:22, fontWeight:900 }}>{brand.companyName.charAt(0)}</span>
            </div>}
        <h1 style={{ margin:'0 0 8px', fontSize:22, fontWeight:800, color:brand.textColor }}>Your application hub</h1>
        <p style={{ margin:'0 0 32px', color:'#6B7280', fontSize:14, lineHeight:1.6 }}>{brand.tagline}</p>
        <div style={{ textAlign:'left', marginBottom:16 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Email address</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}
            placeholder="you@example.com" autoFocus
            style={{ width:'100%', boxSizing:'border-box', padding:'12px 14px',
              border:`1.5px solid ${error?'#FCA5A5':'#E5E7EB'}`, borderRadius:10, fontSize:14,
              outline:'none', fontFamily:'inherit', color:'#0F1729' }}/>
          {error && <p style={{ margin:'6px 0 0', fontSize:12, color:'#DC2626', display:'flex', gap:4, alignItems:'center' }}>
            <HubIcon name="alert" size={12} color="#DC2626"/> {error}</p>}
        </div>
        <Btn onClick={submit} disabled={loading} brand={brand} style={{ width:'100%' }}>
          {loading ? <><HubIcon name="loader" size={14}/> Sending link…</> : <><HubIcon name="mail" size={14}/> Send me a magic link</>}
        </Btn>
        <p style={{ margin:'20px 0 0', fontSize:12, color:'#9CA3AF', lineHeight:1.6 }}>We'll email you a secure link. No password needed.</p>
      </div>
    </div>
  );
}

function LinkSentScreen({ email, brand, onRetry }) {
  return (
    <div style={{ minHeight:'100vh', background:brand.bgColor, display:'flex', alignItems:'center',
      justifyContent:'center', padding:24, fontFamily:brand.fontFamily }}>
      <div style={{ background:'white', borderRadius:20, padding:'48px 40px', maxWidth:440, width:'100%',
        boxShadow:'0 8px 40px rgba(0,0,0,0.10)', textAlign:'center' }}>
        <div style={{ width:64, height:64, borderRadius:18, background:`${brand.primaryColor}18`,
          display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
          <HubIcon name="mail" size={28} color={brand.primaryColor}/>
        </div>
        <h2 style={{ margin:'0 0 8px', fontSize:20, fontWeight:800, color:brand.textColor }}>Check your inbox</h2>
        <p style={{ margin:'0 0 24px', color:'#6B7280', fontSize:14, lineHeight:1.7 }}>
          We've sent a secure link to <strong>{email}</strong>. Click it to access your hub — it expires in 15 minutes.
        </p>
        <Btn onClick={onRetry} variant="ghost" brand={brand} style={{ width:'100%' }}>Use a different email</Btn>
      </div>
    </div>
  );
}

function StageTracker({ stages, currentIndex, brand }) {
  if (!stages.length) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', overflowX:'auto', paddingBottom:4 }}>
      {stages.map((s, i) => {
        const done = i < currentIndex, current = i === currentIndex, accent = brand.primaryColor;
        return (
          <div key={s.id} style={{ display:'flex', alignItems:'center', flexShrink:0 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <div style={{ width:24, height:24, borderRadius:'50%', border:'2px solid',
                borderColor:done||current?accent:'#E5E7EB', background:done?accent:current?`${accent}18`:'white',
                display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}>
                {done ? <HubIcon name="check" size={12} color="white"/>
                  : current ? <div style={{ width:8, height:8, borderRadius:'50%', background:accent }}/> : null}
              </div>
              <span style={{ fontSize:10, fontWeight:current?700:500, color:current?accent:done?'#374151':'#9CA3AF',
                whiteSpace:'nowrap', maxWidth:72, overflow:'hidden', textOverflow:'ellipsis', textAlign:'center' }}>
                {s.name}
              </span>
            </div>
            {i < stages.length-1 && <div style={{ height:2, width:32, background:done?accent:'#E5E7EB',
              marginBottom:18, flexShrink:0, transition:'background .2s' }}/>}
          </div>
        );
      })}
    </div>
  );
}

function OfferCard({ offer, brand }) {
  const [responding, setResponding] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const respond = async (offerId, action) => {
    setLoading(true);
    try { await hubApi(`/offers/${offerId}`, { method:'PATCH', body:{ action, notes:note } }); window.location.reload(); }
    catch(e) { alert(e.error || 'Something went wrong'); setLoading(false); }
  };
  const pending  = offer.status === 'sent';
  const accepted = offer.status === 'accepted';
  const statusCol = accepted?'#0CAF77':offer.status==='expired'?'#9CA3AF':offer.status==='declined'?'#DC2626':brand.primaryColor;
  const expiring = offer.expiry_date && new Date(offer.expiry_date) < new Date(Date.now()+3*86400000);
  return (
    <div style={{ borderRadius:14, border:`1.5px solid ${statusCol}30`, background:`${statusCol}06`, padding:'18px 20px', marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:'#0F1729' }}>
            {offer.currency} {Number(offer.base_salary||0).toLocaleString()}
            <span style={{ fontSize:12, fontWeight:500, color:'#6B7280' }}> / year</span>
          </div>
          {offer.bonus && <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>+ {offer.currency} {Number(offer.bonus).toLocaleString()} bonus</div>}
        </div>
        <Badge color={statusCol}>{offer.status.charAt(0).toUpperCase()+offer.status.slice(1)}</Badge>
      </div>
      <div style={{ display:'flex', gap:20, flexWrap:'wrap', marginBottom:pending?16:0 }}>
        {offer.start_date && <div>
          <div style={{ fontSize:10, fontWeight:700, color:'#9CA3AF', marginBottom:2 }}>START DATE</div>
          <div style={{ fontSize:13, fontWeight:600, color:'#374151' }}>{new Date(offer.start_date).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</div>
        </div>}
        {offer.expiry_date && <div>
          <div style={{ fontSize:10, fontWeight:700, color:'#9CA3AF', marginBottom:2 }}>OFFER EXPIRES</div>
          <div style={{ fontSize:13, fontWeight:600, color:expiring?'#F59F00':'#374151' }}>
            {new Date(offer.expiry_date).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}
            {expiring&&pending&&<span style={{ fontSize:11, color:'#F59F00', marginLeft:6 }}>Expiring soon</span>}
          </div>
        </div>}
      </div>
      {pending && !responding && (
        <div style={{ display:'flex', gap:10 }}>
          <Btn brand={brand} onClick={()=>setResponding(offer.id)} style={{ flex:1 }}><HubIcon name="check" size={14}/> Accept Offer</Btn>
          <Btn brand={brand} variant="outline" onClick={()=>setResponding(`d-${offer.id}`)} style={{ flex:1 }}>Decline</Btn>
        </div>
      )}
      {responding === offer.id && (
        <div style={{ marginTop:8 }}>
          <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="Any notes? (optional)"
            style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', borderRadius:8,
              border:'1.5px solid #E5E7EB', fontSize:13, fontFamily:'inherit', resize:'none', marginBottom:8 }}/>
          <div style={{ display:'flex', gap:8 }}>
            <Btn brand={brand} onClick={()=>respond(offer.id,'accept')} disabled={loading} style={{ flex:2 }}>
              {loading?'Confirming…':'Confirm Acceptance'}
            </Btn>
            <Btn brand={brand} variant="ghost" onClick={()=>setResponding(null)} style={{ flex:1 }}>Cancel</Btn>
          </div>
        </div>
      )}
      {responding === `d-${offer.id}` && (
        <div style={{ marginTop:8 }}>
          <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="Reason? (optional)"
            style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', borderRadius:8,
              border:'1.5px solid #FCA5A5', fontSize:13, fontFamily:'inherit', resize:'none', marginBottom:8 }}/>
          <div style={{ display:'flex', gap:8 }}>
            <Btn brand={brand} variant="danger" onClick={()=>respond(offer.id,'decline')} disabled={loading} style={{ flex:2 }}>
              {loading?'Declining…':'Confirm Decline'}
            </Btn>
            <Btn brand={brand} variant="ghost" onClick={()=>setResponding(null)} style={{ flex:1 }}>Cancel</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function ApplicationCard({ app, interviews, offers, brand }) {
  const [expanded, setExpanded] = useState(false);
  const hub = app.hub_config;
  const appInterviews = interviews.filter(i => i.job_id === app.job_id);
  const appOffers     = offers.filter(o => o.job_id === app.job_id);
  const statusColor = !hub?'#9CA3AF':app.stage_name==='Hired'?'#0CAF77':app.stage_name==='Rejected'?'#DC2626':brand.primaryColor;
  return (
    <div style={{ background:'white', borderRadius:16, border:'1px solid #F0F0F0',
      boxShadow:'0 2px 12px rgba(0,0,0,0.06)', overflow:'hidden', marginBottom:16 }}>
      <div style={{ padding:'18px 20px', cursor:'pointer', display:'flex', alignItems:'flex-start', gap:14 }}
        onClick={()=>setExpanded(e=>!e)}>
        <div style={{ width:44, height:44, borderRadius:12, background:`${brand.primaryColor}14`,
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <HubIcon name="briefcase" size={20} color={brand.primaryColor}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#0F1729', marginBottom:2 }}>{app.job_title}</div>
          <div style={{ fontSize:12, color:'#6B7280' }}>
            Applied {new Date(app.applied_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
          <Badge color={statusColor}>{app.status}</Badge>
          <div style={{ transform:expanded?'rotate(90deg)':'none', transition:'transform .2s' }}>
            <HubIcon name="chevron" size={14} color="#9CA3AF"/>
          </div>
        </div>
      </div>
      {app.stages.length > 0 && (
        <div style={{ padding:'0 20px 16px', overflowX:'auto' }}>
          <StageTracker stages={app.stages} currentIndex={app.stage_index} brand={brand}/>
        </div>
      )}
      {hub?.message && (
        <div style={{ margin:'0 20px 16px', padding:'12px 14px', background:`${brand.primaryColor}08`,
          borderRadius:10, fontSize:13, color:'#374151', lineHeight:1.6, borderLeft:`3px solid ${brand.primaryColor}` }}>
          {hub.message}
        </div>
      )}
      {expanded && hub && (
        <div style={{ padding:'0 20px 20px', borderTop:'1px solid #F9FAFB' }}>
          {hub.sections?.interviews !== false && appInterviews.length > 0 && (
            <div style={{ marginTop:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#6B7280', marginBottom:10, textTransform:'uppercase', letterSpacing:'.5px' }}>Interviews</div>
              {appInterviews.map(iv => {
                const dt = new Date(`${iv.date}T${iv.time||'09:00'}`);
                const past = dt < new Date();
                return (
                  <div key={iv.id} style={{ display:'flex', gap:12, padding:'12px 14px', borderRadius:12, marginBottom:8,
                    background:past?'#F9FAFB':`${brand.primaryColor}06`, border:`1px solid ${past?'#F0F0F0':`${brand.primaryColor}20`}` }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:past?'#F3F4F6':`${brand.primaryColor}14`,
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <HubIcon name="video" size={16} color={past?'#9CA3AF':brand.primaryColor}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#0F1729' }}>{iv.format}</div>
                      <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>
                        {dt.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})} · {iv.time} · {iv.duration_min} min
                      </div>
                      {iv.location && <div style={{ fontSize:12, color:brand.primaryColor, marginTop:4 }}>
                        {iv.location.startsWith('http')
                          ? <a href={iv.location} target="_blank" rel="noreferrer" style={{ color:brand.primaryColor, fontWeight:600 }}>Join call →</a>
                          : iv.location}
                      </div>}
                    </div>
                    <Badge color={past?'#9CA3AF':'#0CAF77'}>{past?'Completed':'Upcoming'}</Badge>
                  </div>
                );
              })}
            </div>
          )}
          {hub.sections?.offers !== false && appOffers.length > 0 && (
            <div style={{ marginTop:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#6B7280', marginBottom:10, textTransform:'uppercase', letterSpacing:'.5px' }}>Offer</div>
              {appOffers.map(o => <OfferCard key={o.id} offer={o} brand={brand}/>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Dashboard({ profile, applications, interviews, offers, brand }) {
  const firstName = profile?.first_name || 'there';
  const pendingOffer = offers.find(o => o.status === 'sent');
  const upcomingInterviews = interviews.filter(i => new Date(`${i.date}T${i.time||'09:00'}`) >= new Date());

  return (
    <div style={{ minHeight:'100vh', background:brand.bgColor, fontFamily:brand.fontFamily }}>
      {/* Top bar */}
      <div style={{ background:'white', borderBottom:'1px solid #F0F0F0', padding:'0 24px', height:60,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {brand.logoUrl
            ? <img src={brand.logoUrl} alt={brand.companyName} style={{ maxHeight:32, maxWidth:120, objectFit:'contain' }}/>
            : <div style={{ width:32, height:32, borderRadius:8, background:brand.primaryColor,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ color:'white', fontSize:14, fontWeight:900 }}>{brand.companyName.charAt(0)}</span>
              </div>}
          <span style={{ fontSize:13, fontWeight:700, color:'#0F1729' }}>Application Hub</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:`${brand.primaryColor}18`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:13, fontWeight:700, color:brand.primaryColor }}>
            {firstName.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize:13, color:'#374151', fontWeight:600 }}>{firstName} {profile?.last_name||''}</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:680, margin:'0 auto', padding:'32px 20px' }}>
        <div style={{ marginBottom:28 }}>
          <h1 style={{ margin:'0 0 4px', fontSize:22, fontWeight:800, color:'#0F1729' }}>Hi, {firstName} 👋</h1>
          <p style={{ margin:0, color:'#6B7280', fontSize:14 }}>
            {applications.length === 0 ? 'No applications found for this email.'
              : `You have ${applications.length} active application${applications.length!==1?'s':''}.`}
          </p>
        </div>

        {/* Pending offer alert */}
        {pendingOffer && (
          <div style={{ background:`${brand.primaryColor}10`, border:`1.5px solid ${brand.primaryColor}30`,
            borderRadius:14, padding:'14px 18px', marginBottom:24,
            display:'flex', alignItems:'center', gap:12 }}>
            <HubIcon name="gift" size={20} color={brand.primaryColor}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#0F1729' }}>You have a pending offer for {pendingOffer.job_title}</div>
              <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>Review and respond below</div>
            </div>
            <HubIcon name="arrow" size={16} color={brand.primaryColor}/>
          </div>
        )}

        {/* No applications */}
        {applications.length === 0 && (
          <div style={{ background:'white', borderRadius:16, padding:'48px 32px', textAlign:'center',
            border:'1px solid #F0F0F0', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ width:56, height:56, borderRadius:16, background:'#F3F4F6',
              display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <HubIcon name="briefcase" size={24} color="#9CA3AF"/>
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:'#374151', marginBottom:6 }}>No applications yet</div>
            <div style={{ fontSize:13, color:'#9CA3AF', lineHeight:1.6 }}>When you apply for a role, your applications will appear here.</div>
          </div>
        )}

        {/* Application cards */}
        {applications.map(app => (
          <ApplicationCard key={app.id} app={app} interviews={interviews} offers={offers} brand={brand}/>
        ))}

        {/* Upcoming interviews summary */}
        {upcomingInterviews.length > 0 && (
          <div style={{ background:'white', borderRadius:16, border:'1px solid #F0F0F0',
            boxShadow:'0 2px 12px rgba(0,0,0,0.06)', overflow:'hidden', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'16px 20px', borderBottom:'1px solid #F9FAFB' }}>
              <div style={{ width:32, height:32, borderRadius:9, background:`${brand.primaryColor}14`,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <HubIcon name="video" size={15} color={brand.primaryColor}/>
              </div>
              <span style={{ fontSize:14, fontWeight:700, color:'#0F1729' }}>Upcoming Interviews</span>
            </div>
            <div style={{ padding:'16px 20px' }}>
              {upcomingInterviews.slice(0,3).map(iv => {
                const dt = new Date(`${iv.date}T${iv.time||'09:00'}`);
                const daysAway = Math.ceil((dt - new Date()) / 86400000);
                return (
                  <div key={iv.id} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid #F9FAFB' }}>
                    <div style={{ background:`${brand.primaryColor}10`, borderRadius:10,
                      padding:'8px 12px', textAlign:'center', minWidth:48, flexShrink:0 }}>
                      <div style={{ fontSize:16, fontWeight:800, color:brand.primaryColor, lineHeight:1 }}>{dt.getDate()}</div>
                      <div style={{ fontSize:10, color:brand.primaryColor, fontWeight:700 }}>
                        {dt.toLocaleDateString('en-GB',{month:'short'}).toUpperCase()}
                      </div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#0F1729' }}>{iv.job_title}</div>
                      <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>{iv.format} · {iv.time} · {iv.duration_min} min</div>
                    </div>
                    <Badge color={daysAway<=1?'#DC2626':daysAway<=3?'#F59F00':'#0CAF77'}>
                      {daysAway===0?'Today':daysAway===1?'Tomorrow':`In ${daysAway}d`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ textAlign:'center', marginTop:32, color:'#C4C4CC', fontSize:12 }}>
          Powered by {brand.companyName} · Your data is kept secure and private
        </div>
      </div>
    </div>
  );
}

export default function CandidateHub() {
  const [phase, setPhase]   = useState('loading');
  const [email, setEmail]   = useState('');
  const [brand, setBrand]   = useState(DEFAULT_BRAND);
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [interviews,   setInterviews]   = useState([]);
  const [offers,       setOffers]       = useState([]);

  const urlParams  = new URLSearchParams(window.location.search);
  const tokenParam = urlParams.get('token');
  const portalParam = urlParams.get('portal_id');

  // Load portal branding
  useEffect(() => {
    const pid = portalParam || sessionStorage.getItem('hub_portal_id');
    if (!pid) return;
    sessionStorage.setItem('hub_portal_id', pid);
    fetch(`/api/hub/portal-branding?portal_id=${pid}`)
      .then(r => r.json())
      .then(d => { if (d.branding?.primaryColor) setBrand(b => ({ ...b, ...d.branding })); })
      .catch(() => {});
  }, []);

  const loadDashboard = useCallback(async () => {
    setPhase('loading');
    try {
      const [prof, apps, ivs, offs] = await Promise.all([
        hubApi('/profile'), hubApi('/applications'),
        hubApi('/interviews'), hubApi('/offers'),
      ]);
      setProfile(prof); setApplications(apps);
      setInterviews(ivs); setOffers(offs);
      setPhase('dashboard');
    } catch {
      sessionStorage.removeItem('hub_session');
      setPhase('request');
    }
  }, []);

  useEffect(() => {
    if (!tokenParam) {
      const existing = sessionStorage.getItem('hub_session');
      if (existing) loadDashboard(); else setPhase('request');
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.replaceState({}, '', url.toString());

    fetch(`/api/hub/verify?token=${encodeURIComponent(tokenParam)}`)
      .then(r => r.json())
      .then(d => {
        if (d.session_token) { sessionStorage.setItem('hub_session', d.session_token); loadDashboard(); }
        else setPhase('request');
      })
      .catch(() => setPhase('request'));
  }, [tokenParam, loadDashboard]);

  const portalId = portalParam || sessionStorage.getItem('hub_portal_id');

  if (phase === 'loading') return (
    <div style={{ minHeight:'100vh', background:brand.bgColor, display:'flex',
      alignItems:'center', justifyContent:'center', fontFamily:brand.fontFamily }}>
      <div style={{ textAlign:'center', color:'#9CA3AF' }}>
        <HubIcon name="loader" size={32} color={brand.primaryColor}/>
        <div style={{ marginTop:12, fontSize:14 }}>Loading your hub…</div>
      </div>
    </div>
  );

  if (phase === 'sent') return (
    <LinkSentScreen email={email} brand={brand}
      onRetry={() => { setEmail(''); setPhase('request'); }}/>
  );

  if (phase === 'request') return (
    <RequestForm brand={brand} portalId={portalId}
      onSent={sentEmail => { setEmail(sentEmail); setPhase('sent'); }}/>
  );

  return <Dashboard profile={profile} applications={applications}
    interviews={interviews} offers={offers} brand={brand}/>;
}
