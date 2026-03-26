/**
 * Vercentic — AI Voice Interview Page
 * client/src/InterviewSession.jsx
 * Public page at /interview/:token — no login required
 */
import { useState, useEffect, useRef, useCallback } from "react";

const F = "'Geist', -apple-system, sans-serif";

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

function useSpeech(language = 'en-US') {
  const speak = useCallback((text, onEnd) => {
    if (!window.speechSynthesis) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = language; u.rate = 0.95; u.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const pref = voices.find(v => v.lang.startsWith(language.slice(0,2)) && v.localService);
    if (pref) u.voice = pref;
    u.onend = () => onEnd?.(); u.onerror = () => onEnd?.();
    window.speechSynthesis.speak(u);
  }, [language]);
  const stop = useCallback(() => window.speechSynthesis?.cancel(), []);
  return { speak, stop };
}

function useSpeechRec(language = 'en-US') {
  const recRef = useRef(null);
  const startListening = useCallback((onResult, onEnd) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { onEnd?.(''); return; }
    const rec = new SR();
    rec.lang = language; rec.continuous = false; rec.interimResults = false;
    rec.onresult = e => onResult(e.results[0]?.[0]?.transcript || '');
    rec.onend = () => onEnd?.(); rec.onerror = () => onEnd?.();
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

  const { speak, stop: stopSpeaking } = useSpeech(session?.agent?.language || 'en-US');
  const { startListening, stopListening } = useSpeechRec(session?.agent?.language || 'en-US');

  useEffect(() => {
    if (!token) { setError('Invalid interview link'); setPhase('error'); return; }
    fetch(`/api/ai-interview/session/${token}`)
      .then(r => r.json())
      .then(data => { if (data.error) { setError(data.error); setPhase('error'); return; } setSession(data); setPhase('waiting'); })
      .catch(() => { setError('Could not connect.'); setPhase('error'); });
  }, [token]);

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
        speak(data.reply, () => { if (!useTextMode) listenFlow(); else setAgentState('idle'); });
      }
    } catch { setAgentState('idle'); setCurrentText("I had a technical issue — could you repeat that?"); }
  }, [token, exchangeCount, useTextMode]);

  const listenFlow = useCallback(() => {
    setAgentState('listening'); setCurrentText('');
    startListening(
      result => { if (result.trim()) sendToAI(result); },
      () => { setAgentState('idle'); setCurrentText("I didn't catch that — speak when ready, or type below."); }
    );
  }, [startListening, sendToAI]);

  const startInterview = useCallback(() => {
    setPhase('live');
    const intro = session.agent.persona_description ||
      `Hi ${session.candidate_name||'there'}, I'm ${session.agent.persona_name}. Thanks for joining today's interview for the ${session.job_title} role. To begin, could you tell me a bit about yourself?`;
    setCurrentText(intro);
    historyRef.current = [{ role:'assistant', content:intro }];
    setTranscript([{ role:'assistant', content:intro, timestamp:new Date().toISOString() }]);
    setAgentState('speaking');
    speak(intro, () => { if (!useTextMode) listenFlow(); else setAgentState('idle'); });
  }, [session, speak, listenFlow, useTextMode]);

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
  const spinStyle = { width:40, height:40, borderRadius:'50%', border:`3px solid ${agentColor}`, borderTopColor:'transparent', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' };

  const css = `@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes dotBounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}`;

  if (phase==='loading') return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0f172a',fontFamily:F}}><style>{css}</style><div style={{textAlign:'center',color:'#94a3b8'}}><div style={spinStyle}/>Setting up your interview…</div></div>;
  if (phase==='error')   return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0f172a',fontFamily:F,padding:24}}><style>{css}</style><div style={{textAlign:'center',maxWidth:400}}><div style={{fontSize:48,marginBottom:16}}>⚠️</div><h2 style={{color:'#f1f5f9',fontSize:22,fontWeight:800,margin:'0 0 10px'}}>Interview Unavailable</h2><p style={{color:'#94a3b8',lineHeight:1.6,margin:0}}>{error}</p></div></div>;
  if (phase==='done')    return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#0f172a,#1e1b4b)',fontFamily:F,padding:24}}><style>{css}</style><div style={{textAlign:'center',maxWidth:480,animation:'fadeUp .6s ease'}}><div style={{width:80,height:80,borderRadius:'50%',background:'#059669',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',fontSize:36}}>✓</div><h1 style={{color:'#f1f5f9',fontSize:28,fontWeight:900,margin:'0 0 12px'}}>Interview Complete</h1><p style={{color:'#94a3b8',fontSize:16,lineHeight:1.6,margin:'0 0 24px'}}>Thank you, {session?.candidate_name||'for your time'}. Your responses have been saved and our team will be in touch.</p><p style={{fontSize:13,color:'#475569'}}>You can close this window.</p></div></div>;
  if (phase==='processing') return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#0f172a,#1e1b4b)',fontFamily:F}}><style>{css}</style><div style={{textAlign:'center',color:'#94a3b8'}}><div style={spinStyle}/>Saving your interview…</div></div>;

  if (phase==='waiting') return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0f172a,#1e1b4b)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F,padding:24}}>
      <style>{css}</style>
      <div style={{textAlign:'center',maxWidth:480,animation:'fadeUp .5s ease'}}>
        <div style={{width:80,height:80,borderRadius:'50%',background:agentColor,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:36,boxShadow:`0 8px 32px ${agentColor}60`}}>🤖</div>
        <h1 style={{color:'#f1f5f9',fontSize:26,fontWeight:900,margin:'0 0 8px'}}>Interview with {session?.agent?.persona_name}</h1>
        <p style={{color:'#94a3b8',fontSize:15,margin:'0 0 24px'}}>Role: <strong style={{color:'#e2e8f0'}}>{session?.job_title}</strong>{session?.candidate_name&&<> · Hi <strong style={{color:'#e2e8f0'}}>{session.candidate_name}</strong> 👋</>}</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:28}}>
          {[['🎤','Voice interview','Speak your answers — Alex listens'],['⏱','15–20 minutes','Take your time'],['🔒','Recorded','Transcript saved securely'],['💡','Text fallback','Can\'t use voice? Type instead']].map(([icon,title,desc])=>(
            <div key={title} style={{padding:14,background:'rgba(255,255,255,0.05)',borderRadius:12,border:'1px solid rgba(255,255,255,0.08)',textAlign:'left'}}>
              <div style={{fontSize:20,marginBottom:6}}>{icon}</div>
              <div style={{fontSize:12,fontWeight:700,color:'#f1f5f9',marginBottom:3}}>{title}</div>
              <div style={{fontSize:11,color:'#64748b',lineHeight:1.4}}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,justifyContent:'center',marginBottom:24}}>
          <span style={{fontSize:13,color:'#94a3b8'}}>Voice</span>
          <div onClick={()=>setUseTextMode(!useTextMode)} style={{width:44,height:24,borderRadius:12,background:useTextMode?'#475569':agentColor,cursor:'pointer',position:'relative',transition:'background .2s'}}>
            <div style={{width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:useTextMode?23:3,transition:'left .2s'}}/>
          </div>
          <span style={{fontSize:13,color:'#94a3b8'}}>Text</span>
        </div>
        <button onClick={startInterview} style={{padding:'14px 40px',borderRadius:14,border:'none',background:`linear-gradient(135deg,${agentColor},${agentColor}cc)`,color:'#fff',fontSize:16,fontWeight:800,cursor:'pointer',fontFamily:F,boxShadow:`0 8px 32px ${agentColor}40`}}>
          Begin Interview
        </button>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(180deg,#0f172a,#1a1040)',display:'flex',flexDirection:'column',fontFamily:F}}>
      <style>{css}</style>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,borderRadius:'50%',background:agentColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🤖</div>
          <div><div style={{fontSize:13,fontWeight:700,color:'#f1f5f9'}}>{session?.agent?.persona_name}</div><div style={{fontSize:11,color:'#64748b'}}>AI Interviewer · {session?.job_title}</div></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:12,color:'#64748b'}}>{exchangeCount} exchanges</span>
          <button onClick={()=>setUseTextMode(!useTextMode)} style={{padding:'5px 10px',borderRadius:7,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',color:'#94a3b8',fontSize:11,cursor:'pointer',fontFamily:F}}>
            {useTextMode?'🎤 Voice':'⌨️ Text'}
          </button>
        </div>
      </div>

      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 20px',gap:28}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
          <div style={{position:'relative',width:96,height:96}}>
            {agentState==='speaking'&&<div style={{position:'absolute',inset:-8,borderRadius:'50%',background:`${agentColor}30`,animation:'barPulse 1.5s ease-out infinite'}}/>}
            <div style={{width:96,height:96,borderRadius:'50%',background:`linear-gradient(135deg,${agentColor},${agentColor}cc)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,boxShadow:'0 8px 32px rgba(0,0,0,0.3)'}}>🤖</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 14px',background:'rgba(255,255,255,0.06)',borderRadius:99,border:'1px solid rgba(255,255,255,0.08)'}}>
            {agentState==='speaking'&&<MicBars active color={agentColor}/>}
            {agentState==='listening'&&<div style={{display:'flex',gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:'#10b981',animation:`dotBounce 1.2s ${i*0.2}s infinite`}}/>)}</div>}
            {agentState==='thinking'&&<div style={{width:14,height:14,borderRadius:'50%',border:`2px solid ${agentColor}`,borderTopColor:'transparent',animation:'spin 0.6s linear infinite'}}/>}
            <span style={{fontSize:12,color:'#94a3b8'}}>{agentState==='speaking'?`${session?.agent?.persona_name} is speaking…`:agentState==='listening'?'Listening…':agentState==='thinking'?'Thinking…':'Your turn'}</span>
          </div>
        </div>
        {currentText&&<div style={{maxWidth:600,width:'100%',animation:'fadeUp .3s ease'}}><div style={{padding:'16px 20px',background:'rgba(255,255,255,0.07)',borderRadius:'4px 16px 16px 16px',border:'1px solid rgba(255,255,255,0.1)',fontSize:15,color:'#e2e8f0',lineHeight:1.7}}>{currentText}</div></div>}
        {!useTextMode&&agentState==='idle'&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}><button onClick={listenFlow} style={{width:72,height:72,borderRadius:'50%',border:'none',background:`linear-gradient(135deg,${agentColor},${agentColor}cc)`,color:'#fff',fontSize:28,cursor:'pointer',boxShadow:`0 8px 32px ${agentColor}60`}}>🎤</button><span style={{fontSize:12,color:'#64748b'}}>Tap to speak</span></div>}
        {!useTextMode&&agentState==='listening'&&<button onClick={()=>{stopListening();setAgentState('idle');}} style={{padding:'10px 24px',borderRadius:99,border:'2px solid #10b981',background:'transparent',color:'#10b981',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F}}>✓ Done speaking</button>}
      </div>

      <div style={{padding:'16px 20px',borderTop:'1px solid rgba(255,255,255,0.06)',background:'rgba(0,0,0,0.3)'}}>
        <div style={{maxWidth:600,margin:'0 auto',display:'flex',gap:10}}>
          <input value={candidateInput} onChange={e=>setCandidateInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleTextSubmit();}}} placeholder={useTextMode?'Type your response…':'Or type your answer here…'} disabled={agentState==='thinking'||agentState==='speaking'}
            style={{flex:1,padding:'11px 16px',borderRadius:12,border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.06)',color:'#f1f5f9',fontSize:14,fontFamily:F,outline:'none'}}/>
          <button onClick={handleTextSubmit} disabled={!candidateInput.trim()||agentState==='thinking'||agentState==='speaking'}
            style={{padding:'11px 18px',borderRadius:12,border:'none',background:candidateInput.trim()?agentColor:'#334155',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:F,transition:'background .15s'}}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
