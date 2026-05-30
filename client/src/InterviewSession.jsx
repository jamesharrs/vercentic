/**
 * Vercentic — AI Voice Interview Page
 * client/src/InterviewSession.jsx
 * Public page at /interview/:token — no login required
 */
import { useState, useEffect, useRef, useCallback } from "react";

const F = "'Geist', -apple-system, sans-serif";

// Inline Lucide SVG icon — no dependency, works on public pages
const SVG_PATHS = {
  mic:        "M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8",
  clock:      "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  shield:     "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  type:       "M4 7V4h16v3M9 20h6M12 4v16",
  bot:        "M12 8V4H8M2 8h20M4 8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2M9 13h.01M15 13h.01M10 17s.667.667 2 .667S14 17 14 17",
  check:      "M20 6L9 17l-5-5",
  alert:      "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  send:       "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  keyboard:   "M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zM8 13H5m4 0H7m4-3H5m6 0H9m4 0h-2m2 3h2m0 0h2m-4-3h4m0 3h-2",
};
const Ic = ({ n, s=20, c='white', style }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,...style}}>
    {(SVG_PATHS[n]||'').split('M').filter(Boolean).map((d,i)=><path key={i} d={'M'+d}/>)}
  </svg>
);

function MicBars({ active, color = '#6366f1' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:3, height:24 }}>
      {[3,6,9,6,3,8,4,7,3].map((h, i) => (
        <div key={i} style={{
          width:3, borderRadius:2, background: active ? color : '#d1d5db',
          height: active ? h : 4,
          animation: active ? `barPulse ${0.4 + i*0.07}s ease-in-out infinite alternate` : 'none',
        }}/>
      ))}
      <style>{`@keyframes barPulse{from{transform:scaleY(0.5)}to{transform:scaleY(1.5)}}`}</style>
    </div>
  );
}

function useSpeech() {
  const audioCtxRef = useRef(null);
  const sourceRef   = useRef(null);

  // Must be called SYNCHRONOUSLY inside a user-gesture handler, then awaited
  // before any subsequent speak() call so the AudioContext is guaranteed to be
  // in the 'running' state before we try to decode and play audio.
  //
  // Why AudioContext instead of new Audio().play():
  // The previous approach played a silent <audio> element in the gesture, which
  // unlocks that one element but the unlock expires once async code runs (e.g.
  // after await fetch(...)). iOS then rejects the next new Audio().play() call
  // with NotAllowedError, the Web Speech fallback fires silently without an
  // onerror, onEnd never gets called, and agentState sticks at "speaking" forever.
  //
  // AudioContext.resume() inside a gesture grants permission that persists for
  // the entire browser session — subsequent createBufferSource().start() calls
  // work even after long async operations.
  const unlock = useCallback(async () => {
    if (audioCtxRef.current) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      // Play a 1-frame silent buffer synchronously — this is the gesture "proof"
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      // Await resume so the context is fully running before speak() is called
      await ctx.resume();
      audioCtxRef.current = ctx;
    } catch { /* ignore */ }
  }, []);

  const speak = useCallback(async (text, onEnd) => {
    // Stop anything currently playing
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
    }

    try {
      const res = await fetch('/api/ai-interview/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`TTS ${res.status}`);
      // Fetch as ArrayBuffer — required for AudioContext.decodeAudioData()
      const arrayBuf = await res.arrayBuffer();

      // Ensure we have a running AudioContext
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { onEnd?.(); return; }
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      const source   = ctx.createBufferSource();
      source.buffer  = audioBuf;
      source.connect(ctx.destination);
      sourceRef.current = source;
      source.onended = () => { sourceRef.current = null; onEnd?.(); };
      source.start(0);
    } catch (err) {
      // TTS unavailable — the text is already displayed on screen, so just
      // advance the flow. Do NOT fall back to Web Speech API: on iOS it is
      // also gesture-restricted and fails silently (no onerror), which would
      // leave agentState stuck at "speaking" indefinitely.
      console.warn('[TTS]', err.message);
      onEnd?.();
    }
  }, []);

  const stop = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
    }
  }, []);

  return { speak, stop, unlock };
}

function useSpeechRec(language = 'en-US') {
  const recRef = useRef(null);
  const startListening = useCallback((onResult, onEnd) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { onEnd?.(''); return; }
    const rec = new SR();
    rec.lang = language; rec.continuous = false; rec.interimResults = false;
    // Guard: onerror always fires before onend on mobile Safari — ensure onEnd
    // is called at most once so we don't double-set state or double-start listening.
    let finished = false;
    const finish = () => { if (!finished) { finished = true; onEnd?.(); } };
    rec.onresult = e => onResult(e.results[0]?.[0]?.transcript || '');
    rec.onerror = () => finish();
    rec.onend   = () => finish();
    rec.start(); recRef.current = rec;
  }, [language]);
  const stopListening = useCallback(() => recRef.current?.stop(), []);
  return { startListening, stopListening };
}

export default function InterviewSession() {
  const token = window.location.pathname.split('/interview/')[1]?.split('/')[0] || '';
  const [phase, setPhase]       = useState('loading');
  const [session, setSession]   = useState(null);
  const [error, setError]       = useState('');
  const [agentState, setAgentState] = useState('idle');
  const [transcript, setTranscript] = useState([]);
  const [currentText, setCurrentText] = useState('');
  const [candidateInput, setCandidateInput] = useState('');
  const [useTextMode, setUseTextMode] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [result, setResult]     = useState(null);
  const historyRef = useRef([]);

  const { speak, stop: stopSpeaking, unlock: unlockAudio } = useSpeech();
  const { startListening, stopListening } = useSpeechRec(session?.agent?.language || 'en-US');

  useEffect(() => {
    if (!token) { setError('Invalid interview link'); setPhase('error'); return; }
    fetch(`/api/ai-interview/session/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setPhase('error'); return; }
        setSession(data);
        // Apply brand kit to the page
        const b = data.brand;
        if (b?.favicon_url) {
          let link = document.querySelector("link[rel~='icon']");
          if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
          link.href = b.favicon_url;
        }
        if (b?.company_name) document.title = `Interview · ${b.company_name}`;
        if (b?.font_family) {
          const font = b.font_family.replace(/['"]/g,'').split(',')[0].trim();
          const link = document.createElement('link');
          link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;600;700;800&display=swap`;
          link.rel = 'stylesheet';
          document.head.appendChild(link);
        }
        setPhase('waiting');
      })
      .catch(() => { setError('Could not connect.'); setPhase('error'); });
  }, [token]);

  // Safety timeout: if agentState gets stuck at "speaking" (e.g. audio fails
  // silently on iOS without firing onended/onerror), reset to idle after 30 s
  // so the candidate can continue typing or re-tapping the mic.
  useEffect(() => {
    if (agentState !== 'speaking') return;
    const t = setTimeout(() => setAgentState(s => s === 'speaking' ? 'idle' : s), 30000);
    return () => clearTimeout(t);
  }, [agentState]);

  const sendToAI = useCallback(async (msg) => {
    setAgentState('thinking'); setCurrentText('');
    const newHistory = [...historyRef.current, { role:'user', content:msg }];
    historyRef.current = newHistory;
    setTranscript(prev => [...prev, { role:'user', content:msg, timestamp:new Date().toISOString() }]);
    try {
      const resp = await fetch('/api/ai-interview/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ token, history: newHistory.slice(0,-1), candidate_message: msg })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      historyRef.current = [...historyRef.current, { role:'assistant', content:data.reply }];
      setTranscript(prev => [...prev, { role:'assistant', content:data.reply, timestamp:new Date().toISOString() }]);
      setExchangeCount(data.exchange_count || exchangeCount + 1);
      setCurrentText(data.reply);
      if (data.is_complete) {
        setAgentState('speaking');
        speak(data.reply, () => { setAgentState('idle'); handleComplete(); });
      } else {
        setAgentState('speaking');
        // Go idle after speaking — don't auto-start listening. See startInterview
        // comment: auto-starting SpeechRecognition causes the mic permission loop
        // on mobile Safari. User taps the mic button explicitly when ready.
        speak(data.reply, () => setAgentState('idle'));
      }
    } catch (err) {
      console.error('[sendToAI]', err);
      setAgentState('idle');
      setCurrentText("I had a technical issue — could you repeat that?");
    }
  }, [token, exchangeCount, useTextMode]);

  const listenFlow = useCallback(() => {
    setAgentState('listening'); setCurrentText('');
    startListening(
      result => { if (result.trim()) sendToAI(result); },
      () => { setAgentState('idle'); setCurrentText("I didn't catch that — speak when ready, or type below."); }
    );
  }, [startListening, sendToAI]);

  const startInterview = useCallback(async () => {
    // Await the AudioContext unlock so it's fully running before speak() fires.
    // On mobile Safari, speak() must play audio into an already-running context
    // — if ctx.resume() hasn't resolved yet, decodeAudioData / source.start()
    // silently fail and the greeting never plays.
    await unlockAudio();
    setPhase('live');
    const intro = session.agent.persona_description ||
      `Hi ${session.candidate_name||'there'}, I'm ${session.agent.persona_name}. Thanks for joining today's interview for the ${session.job_title} role. To begin, could you tell me a bit about yourself?`;
    setCurrentText(intro);
    historyRef.current = [{ role:'assistant', content:intro }];
    setTranscript([{ role:'assistant', content:intro, timestamp:new Date().toISOString() }]);
    setAgentState('speaking');
    // After the greeting, go idle — don't auto-start listening.
    // On mobile Safari, SpeechRecognition.start() outside a direct user gesture
    // triggers a fresh permission prompt on every call, causing an infinite loop.
    // The user taps the mic button explicitly when ready to speak.
    speak(intro, () => setAgentState('idle'));
  }, [session, speak, unlockAudio]);

  const handleComplete = useCallback(async () => {
    setPhase('processing'); stopSpeaking(); stopListening();
    try {
      const resp = await fetch('/api/ai-interview/complete', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ token, transcript })
      });
      setResult(await resp.json());
    } catch { setResult({ success:true }); }
    setPhase('done');
  }, [token, transcript, stopSpeaking, stopListening]);

  const handleTextSubmit = () => {
    if (!candidateInput.trim() || agentState === 'thinking' || agentState === 'speaking') return;
    const msg = candidateInput.trim(); setCandidateInput('');
    sendToAI(msg);
  };

  const agentColor = session?.agent?.avatar_color || '#6366f1';
  // Brand kit values with sensible fallbacks for the dark interview theme
  const brand = session?.brand || {};
  const brandPrimary = brand.primary_color || agentColor;
  const brandFont    = brand.font_family ? `'${brand.font_family.replace(/['"]/g,'').split(',')[0].trim()}', ${F}` : F;
  const brandBg      = null; // keep dark bg for interview atmosphere regardless of brand bg
  const brandLogo    = brand.logo_dark_url || brand.logo_url || null;
  const brandCompany = brand.company_name || null;
  const spinStyle = { width:40, height:40, borderRadius:'50%', border:`3px solid ${brandPrimary}`, borderTopColor:'transparent', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' };
  const css = `@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes dotBounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}`;

  if (phase==='loading') return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0f172a',fontFamily:F}}><style>{css}</style><div style={{textAlign:'center',color:'#94a3b8'}}><div style={spinStyle}/>Setting up your interview…</div></div>;
  if (phase==='error')   return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0f172a',fontFamily:F,padding:24}}><style>{css}</style><div style={{textAlign:'center',maxWidth:400}}><div style={{width:64,height:64,borderRadius:'50%',background:'rgba(239,68,68,0.15)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}><Ic n="alert" s={32} c="#ef4444"/></div><h2 style={{color:'#f1f5f9',fontSize:22,fontWeight:800,margin:'0 0 10px'}}>Interview Unavailable</h2><p style={{color:'#94a3b8',lineHeight:1.6,margin:0}}>{error}</p></div></div>;
  if (phase==='done')    return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#0f172a,#1e1b4b)',fontFamily:brandFont,padding:24}}><style>{css}</style><div style={{textAlign:'center',maxWidth:480,animation:'fadeUp .6s ease'}}><div style={{width:80,height:80,borderRadius:'50%',background:'#059669',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px'}}><Ic n="check" s={36} c="white"/></div><h1 style={{color:'#f1f5f9',fontSize:28,fontWeight:900,margin:'0 0 12px'}}>Interview Complete</h1><p style={{color:'#94a3b8',fontSize:16,lineHeight:1.6,margin:'0 0 24px'}}>Thank you, {session?.candidate_name||'for your time'}. Your responses have been saved and our team will be in touch.</p>{brandLogo&&<img src={brandLogo} alt="" style={{height:28,maxWidth:120,objectFit:'contain',opacity:.5,marginTop:16}}/>}<p style={{fontSize:13,color:'#475569'}}>You can close this window.</p></div></div>;
  if (phase==='processing') return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#0f172a,#1e1b4b)',fontFamily:brandFont}}><style>{css}</style><div style={{textAlign:'center',color:'#94a3b8'}}><div style={spinStyle}/>Saving your interview…</div></div>;

  if (phase==='waiting') return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0f172a,#1e1b4b)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:brandFont,padding:24}}>
      <style>{css}</style>
      <div style={{textAlign:'center',maxWidth:480,animation:'fadeUp .5s ease'}}>
        {/* Brand logo or avatar */}
        {brandLogo ? (
          <div style={{marginBottom:20}}>
            <img src={brandLogo} alt={brandCompany||''} style={{height:40,maxWidth:180,objectFit:'contain',marginBottom:12}}/>
          </div>
        ) : null}
        <div style={{width:80,height:80,borderRadius:'50%',background:brandPrimary,display:'flex',alignItems:'center',justifyContent:'center',margin:`0 auto ${brandLogo?'12':'20'}px`,boxShadow:`0 8px 32px ${brandPrimary}60`}}><Ic n="bot" s={38} c="white"/></div>
        <h1 style={{color:'#f1f5f9',fontSize:26,fontWeight:900,margin:'0 0 8px'}}>Interview with {session?.agent?.persona_name}</h1>
        {brandCompany&&<p style={{color:`${brandPrimary}cc`,fontSize:13,margin:'0 0 4px',fontWeight:600}}>{brandCompany}</p>}
        <p style={{color:'#94a3b8',fontSize:15,margin:'0 0 24px'}}>Role: <strong style={{color:'#e2e8f0'}}>{session?.job_title}</strong>{session?.candidate_name&&<> · Hi <strong style={{color:'#e2e8f0'}}>{session.candidate_name}</strong></>}</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:28}}>
          {[
            ['mic',    'Voice interview',  'Speak your answers — Alex listens'],
            ['clock',  '15–20 minutes',    'Take your time'],
            ['shield', 'Recorded',         'Transcript saved securely'],
            ['type',   'Text fallback',    "Can't use voice? Type instead"],
          ].map(([icon,title,desc])=>(
            <div key={title} style={{padding:14,background:'rgba(255,255,255,0.05)',borderRadius:12,border:'1px solid rgba(255,255,255,0.08)',textAlign:'left'}}>
              <div style={{marginBottom:8}}><Ic n={icon} s={18} c={brandPrimary}/></div>
              <div style={{fontSize:12,fontWeight:700,color:'#f1f5f9',marginBottom:3}}>{title}</div>
              <div style={{fontSize:11,color:'#64748b',lineHeight:1.4}}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,justifyContent:'center',marginBottom:24}}>
          <span style={{fontSize:13,color:'#94a3b8'}}>Voice</span>
          <div onClick={()=>setUseTextMode(!useTextMode)} style={{width:44,height:24,borderRadius:12,background:useTextMode?'#475569':brandPrimary,cursor:'pointer',position:'relative',transition:'background .2s'}}>
            <div style={{width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:useTextMode?23:3,transition:'left .2s'}}/>
          </div>
          <span style={{fontSize:13,color:'#94a3b8'}}>Text</span>
        </div>
        <button onClick={startInterview} style={{padding:'14px 40px',borderRadius:brand.button_radius||'14px',border:'none',background:`linear-gradient(135deg,${brandPrimary},${brandPrimary}cc)`,color:'#fff',fontSize:16,fontWeight:800,cursor:'pointer',fontFamily:brandFont,boxShadow:`0 8px 32px ${brandPrimary}40`}}>
          Begin Interview
        </button>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(180deg,#0f172a,#1a1040)',display:'flex',flexDirection:'column',fontFamily:brandFont}}>
      <style>{css}</style>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)',backdropFilter:'blur(8px)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {brandLogo
            ? <img src={brandLogo} alt={brandCompany||''} style={{height:24,maxWidth:100,objectFit:'contain'}}/>
            : <div style={{width:32,height:32,borderRadius:'50%',background:brandPrimary,display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n="bot" s={16} c="white"/></div>
          }
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'#f1f5f9'}}>{brandCompany||session?.agent?.persona_name}</div>
            <div style={{fontSize:11,color:'#64748b'}}>{session?.job_title}</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:12,color:'#64748b'}}>{exchangeCount} exchanges</span>
          <button onClick={()=>setUseTextMode(!useTextMode)} style={{padding:'5px 10px',borderRadius:7,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',color:'#94a3b8',fontSize:11,cursor:'pointer',fontFamily:F,display:'flex',alignItems:'center',gap:5}}>
            {useTextMode?<><Ic n="mic" s={11} c="#94a3b8"/> Voice</> : <><Ic n="keyboard" s={11} c="#94a3b8"/> Text</>}
          </button>
        </div>
      </div>

      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 20px',gap:28}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
          <div style={{position:'relative',width:96,height:96}}>
            {agentState==='speaking'&&<div style={{position:'absolute',inset:-8,borderRadius:'50%',background:`${brandPrimary}30`,animation:'barPulse 1.5s ease-out infinite'}}/>}
            <div style={{width:96,height:96,borderRadius:'50%',background:`linear-gradient(135deg,${brandPrimary},${brandPrimary}cc)`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 32px rgba(0,0,0,0.3)'}}><Ic n="bot" s={44} c="white"/></div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 14px',background:'rgba(255,255,255,0.06)',borderRadius:99,border:'1px solid rgba(255,255,255,0.08)'}}>
            {agentState==='speaking'&&<MicBars active color={brandPrimary}/>}
            {agentState==='listening'&&<div style={{display:'flex',gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:'#10b981',animation:`dotBounce 1.2s ${i*0.2}s infinite`}}/>)}</div>}
            {agentState==='thinking'&&<div style={{width:14,height:14,borderRadius:'50%',border:`2px solid ${brandPrimary}`,borderTopColor:'transparent',animation:'spin 0.6s linear infinite'}}/>}
            <span style={{fontSize:12,color:'#94a3b8'}}>{agentState==='speaking'?`${session?.agent?.persona_name} is speaking…`:agentState==='listening'?'Listening…':agentState==='thinking'?'Thinking…':'Your turn'}</span>
          </div>
        </div>
        {currentText&&<div style={{maxWidth:600,width:'100%',animation:'fadeUp .3s ease'}}><div style={{padding:'16px 20px',background:'rgba(255,255,255,0.07)',borderRadius:'4px 16px 16px 16px',border:'1px solid rgba(255,255,255,0.1)',fontSize:15,color:'#e2e8f0',lineHeight:1.7}}>{currentText}</div></div>}
        {!useTextMode&&agentState==='idle'&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}><button onClick={listenFlow} style={{width:72,height:72,borderRadius:'50%',border:'none',background:`linear-gradient(135deg,${brandPrimary},${brandPrimary}cc)`,color:'#fff',cursor:'pointer',boxShadow:`0 8px 32px ${brandPrimary}60`,display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n="mic" s={28} c="white"/></button><span style={{fontSize:12,color:'#64748b'}}>Tap to speak</span></div>}
        {!useTextMode&&agentState==='listening'&&<button onClick={()=>{stopListening();setAgentState('idle');}} style={{padding:'10px 24px',borderRadius:99,border:'2px solid #10b981',background:'transparent',color:'#10b981',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:brandFont,display:'flex',alignItems:'center',gap:6}}><Ic n="check" s={14} c="#10b981"/> Done speaking</button>}
      </div>

      <div style={{padding:'16px 20px',borderTop:'1px solid rgba(255,255,255,0.06)',background:'rgba(0,0,0,0.3)'}}>
        <div style={{maxWidth:600,margin:'0 auto',display:'flex',gap:10}}>
          <input value={candidateInput} onChange={e=>setCandidateInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleTextSubmit();}}} placeholder={useTextMode?'Type your response…':'Or type your answer here…'} disabled={agentState==='thinking'}
            style={{flex:1,padding:'11px 16px',borderRadius:12,border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.06)',color:'#f1f5f9',fontSize:16,fontFamily:F,outline:'none',WebkitAppearance:'none'}}/>
          <button onClick={handleTextSubmit} disabled={!candidateInput.trim()||agentState==='thinking'}
            style={{padding:'11px 16px',borderRadius:12,border:'none',background:candidateInput.trim()?brandPrimary:'#334155',color:'#fff',cursor:'pointer',fontFamily:brandFont,transition:'background .15s',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Ic n="send" s={18} c="white"/>
          </button>
        </div>
      </div>
    </div>
  );
}
