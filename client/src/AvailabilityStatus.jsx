// client/src/AvailabilityStatus.jsx
import { useState, useEffect, useCallback, useRef } from 'react';

const STATUS_META = {
  available: { label:'Available',      color:'#0CA678', dot:'#0CA678' },
  away:      { label:'Away',           color:'#F59F00', dot:'#F59F00' },
  dnd:       { label:'Do not disturb', color:'#E03131', dot:'#E03131' },
  offline:   { label:'Offline',        color:'#9CA3AF', dot:'#9CA3AF' },
};
const HEARTBEAT_INTERVAL = 5 * 60 * 1000;
const F = "'DM Sans', sans-serif";

export default function AvailabilityStatus({ userId, compact = false }) {
  const [status, setStatus] = useState('available');
  const [open,   setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);
  const dropdownRef         = useRef(null);

  const loadStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const res  = await fetch('/api/availability/me', { headers: { 'x-user-id': userId } });
      const data = await res.json();
      if (data.status) setStatus(data.status);
    } catch {}
  }, [userId]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  useEffect(() => {
    if (!userId) return;
    const beat = async () => {
      try {
        const res  = await fetch('/api/availability/heartbeat', { method:'POST', headers:{ 'x-user-id':userId } });
        const data = await res.json();
        if (data.status) setStatus(data.status);
      } catch {}
    };
    beat();
    const iv = setInterval(beat, HEARTBEAT_INTERVAL);
    return () => clearInterval(iv);
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSet = async (newStatus) => {
    setOpen(false);
    if (newStatus === status) return;
    setSaving(true);
    try {
      await fetch('/api/availability/status', { method:'PATCH', headers:{'Content-Type':'application/json','x-user-id':userId}, body:JSON.stringify({ status:newStatus }) });
      setStatus(newStatus);
    } catch {}
    setSaving(false);
  };

  const meta = STATUS_META[status] || STATUS_META.offline;

  if (compact) {
    return (
      <div ref={dropdownRef} onClick={() => setOpen(o => !o)} style={{ position:'relative', cursor:'pointer', display:'inline-flex' }}>
        <div style={{ width:10, height:10, borderRadius:'50%', background:meta.dot, border:'2px solid white', cursor:'pointer' }} />
        {open && (
          <div style={{ position:'absolute', bottom:18, left:0, zIndex:999, background:'white', borderRadius:10, border:'1px solid #E5E7EB', boxShadow:'0 4px 16px rgba(0,0,0,0.12)', overflow:'hidden', minWidth:170 }}>
            {Object.entries(STATUS_META).map(([key, m]) => (
              <button key={key} onClick={() => handleSet(key)} style={{ width:'100%', padding:'9px 14px', border:'none', background:status===key?'#EEF1FF':'white', cursor:'pointer', textAlign:'left', fontFamily:F, display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:9, height:9, borderRadius:'50%', background:m.dot, flexShrink:0 }} />
                <span style={{ fontSize:13, color:'#111827', fontWeight:status===key?700:400 }}>{m.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position:'relative', display:'inline-flex' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 10px', borderRadius:20, border:'1px solid #E5E7EB', background:'white', cursor:'pointer', fontFamily:F }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:meta.dot, flexShrink:0 }} />
        <span style={{ fontSize:12, color:'#374151', fontWeight:600 }}>{saving ? '…' : meta.label}</span>
        <span style={{ fontSize:10, color:'#9CA3AF' }}>▾</span>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'110%', left:0, zIndex:999, background:'white', borderRadius:10, border:'1px solid #E5E7EB', boxShadow:'0 4px 16px rgba(0,0,0,0.12)', overflow:'hidden', minWidth:180 }}>
          {Object.entries(STATUS_META).map(([key, m]) => (
            <button key={key} onClick={() => handleSet(key)} style={{ width:'100%', padding:'10px 14px', border:'none', background:status===key?'#EEF1FF':'white', cursor:'pointer', textAlign:'left', fontFamily:F, display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid #F3F4F6' }}>
              <div style={{ width:9, height:9, borderRadius:'50%', background:m.dot, flexShrink:0 }} />
              <span style={{ fontSize:13, color:'#111827', fontWeight:status===key?700:400 }}>{m.label}</span>
              {status===key && <span style={{ marginLeft:'auto', fontSize:11, color:'#4361EE', fontWeight:700 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
