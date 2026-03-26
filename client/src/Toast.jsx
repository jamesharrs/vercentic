import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const ToastCtx = createContext(null);

const ICONS = {
  success: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>,
  error:   <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  warning: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  info:    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
};
const S = {
  success: { bg:"#f0fdf4", border:"#86efac", icon:"#16a34a", text:"#14532d" },
  error:   { bg:"#fff1f2", border:"#fca5a5", icon:"#dc2626", text:"#7f1d1d" },
  warning: { bg:"#fffbeb", border:"#fcd34d", icon:"#d97706", text:"#78350f" },
  info:    { bg:"#eff6ff", border:"#93c5fd", icon:"#2563eb", text:"#1e3a8a" },
};
const F = "'DM Sans',-apple-system,sans-serif";
const X = <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

function ToastItem({ id, type="info", message, onDismiss, duration=5000 }) {
  const [vis, setVis] = useState(false);
  const s = S[type] || S.info;
  const t = useRef(null);
  useEffect(() => {
    requestAnimationFrame(() => setVis(true));
    if (duration > 0) t.current = setTimeout(dismiss, duration);
    return () => clearTimeout(t.current);
  }, []);
  const dismiss = () => { setVis(false); setTimeout(() => onDismiss(id), 280); };
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px",
      background:s.bg, border:`1.5px solid ${s.border}`, borderRadius:12,
      boxShadow:"0 4px 20px rgba(0,0,0,.10)", fontFamily:F, fontSize:13, color:s.text,
      maxWidth:380, width:"100%",
      transform:vis?"translateX(0) scale(1)":"translateX(40px) scale(0.96)",
      opacity:vis?1:0, transition:"transform 0.25s cubic-bezier(0.34,1.56,0.64,1),opacity 0.25s ease" }}>
      <div style={{ color:s.icon, flexShrink:0, marginTop:1 }}>{ICONS[type]}</div>
      <div style={{ flex:1, lineHeight:1.5, fontWeight:500 }}>{message}</div>
      <button onClick={dismiss} style={{ background:"none", border:"none", cursor:"pointer",
        padding:2, color:s.icon, opacity:0.6, display:"flex", borderRadius:4, flexShrink:0 }}
        onMouseEnter={e=>e.currentTarget.style.opacity="1"}
        onMouseLeave={e=>e.currentTarget.style.opacity="0.6"}>{X}</button>
    </div>
  );
}

function AlertModal({ message, type="warning", onClose }) {
  const [vis, setVis] = useState(false);
  const s = S[type] || S.warning;
  useEffect(() => { requestAnimationFrame(() => setVis(true)); }, []);
  const close = () => { setVis(false); setTimeout(onClose, 200); };
  useEffect(() => {
    const h = e => { if (e.key==="Escape"||e.key==="Enter") close(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return createPortal(
    <div style={{ position:"fixed", inset:0, zIndex:99999, background:"rgba(0,0,0,.45)",
      display:"flex", alignItems:"center", justifyContent:"center",
      opacity:vis?1:0, transition:"opacity 0.2s ease", fontFamily:F }}
      onClick={close}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"white", borderRadius:18,
        padding:"28px 28px 24px", maxWidth:420, width:"90vw",
        boxShadow:"0 24px 80px rgba(0,0,0,.22)",
        transform:vis?"scale(1) translateY(0)":"scale(0.94) translateY(12px)",
        transition:"transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:s.bg,
            border:`1.5px solid ${s.border}`, display:"flex", alignItems:"center",
            justifyContent:"center", flexShrink:0, color:s.icon }}>{ICONS[type]}</div>
          <div style={{ flex:1, fontSize:14, fontWeight:500, color:"#111827", lineHeight:1.6 }}>
            {message}
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end" }}>
          <button autoFocus onClick={close}
            style={{ padding:"9px 24px", borderRadius:10, border:"none", background:s.icon,
              color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:F }}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
            onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
            Got it
          </button>
        </div>
      </div>
    </div>, document.body
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [modal,  setModal]  = useState(null);
  const counter = useRef(0);

  const dismiss  = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), []);
  const add      = useCallback((type, msg, dur) => {
    const id = ++counter.current;
    setToasts(p => [...p, { id, type, message:msg, duration:dur }]);
  }, []);
  const alertFn  = useCallback((msg, type="warning") =>
    new Promise(resolve => setModal({ message:msg, type, resolve })), []);
  const closeModal = useCallback(() => { modal?.resolve?.(); setModal(null); }, [modal]);

  const ctx = {
    success:(m,d)=>add("success",m,d), error:(m,d)=>add("error",m,d),
    warning:(m,d)=>add("warning",m,d), info:(m,d)=>add("info",m,d),
    alert: alertFn,
  };

  // Global shim — lets non-hook code call window.__toast.alert(...)
  useEffect(() => { window.__toast = ctx; return () => { window.__toast = null; }; }, [alertFn]);

  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      {createPortal(
        <div style={{ position:"fixed", bottom:24, right:24, display:"flex",
          flexDirection:"column", gap:8, zIndex:99990, alignItems:"flex-end", pointerEvents:"none" }}>
          {toasts.map(t => <div key={t.id} style={{ pointerEvents:"auto" }}><ToastItem {...t} onDismiss={dismiss}/></div>)}
        </div>, document.body
      )}
      {modal && <AlertModal message={modal.message} type={modal.type} onClose={closeModal}/>}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx) || {
    success:()=>{}, error:()=>{}, warning:()=>{}, info:()=>{},
    alert: msg => { window.__toast ? window.__toast.alert(msg) : window.alert(msg); return Promise.resolve(); }
  };
}
