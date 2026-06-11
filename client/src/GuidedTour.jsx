import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

const STEPS = [
  {
    id:"welcome",
    target:null,
    title:"Welcome to Vercentic",
    body:"This quick tour shows you the key areas of the platform in about 2 minutes. You can skip at any time and restart from the Help centre.",
    icon:"\u2746",
    placement:"center",
    ctaLabel:"Start the tour",
    dim:false,
  },
  {
    id:"sidebar",
    target:"[data-tour='sidebar-nav']",
    title:"Navigation",
    body:"The left sidebar is your main navigation. Records holds your People, Jobs and Talent Pools. Tools gives you Campaigns, Reports, Search and more.",
    placement:"right",
    navigateTo:"dashboard",
    dim:true,
  },
  {
    id:"search-create",
    target:"[data-tour='search-and-create']",
    title:"Search & Create",
    body:"Search across every record from anywhere in the platform. The + Create button lets you add a new person, job or any record in one click.",
    placement:"bottom",
    navigateTo:"dashboard",
    dim:true,
  },
  {
    id:"dashboard",
    target:null,
    title:"Your Dashboard",
    body:"Your home page shows live pipeline stats, hiring activity, open reqs by department, and a real-time activity feed. Every chart and stat is clickable — it takes you straight to the matching records.",
    placement:"center",
    navigateTo:"dashboard",
    dim:false,
  },
  {
    id:"people-prompt",
    target:"[data-tour='nav-people']",
    title:"Exploring People",
    body:"Now let's look at your People list — click People in the left sidebar to open it.",
    placement:"right",
    navigateTo:"dashboard",
    waitForClick:"[data-tour='nav-people']",
    hideNext:true,
    dim:true,
  },
  {
    id:"people-list",
    target:null,
    title:"The People list",
    body:"Every candidate and employee lives here. Use the Columns picker to choose what you see, Filters to narrow results, and save custom views as Lists to share with your team.",
    placement:"center",
    dim:false,
  },
  {
    id:"jobs",
    target:"[data-tour='nav-jobs']",
    title:"Jobs",
    body:"Manage every open role from here. The linked pipeline bar at the top of each job shows all candidates by stage — click a count to expand and advance candidates without leaving the page.",
    placement:"right",
    dim:true,
  },
  {
    id:"copilot-prompt",
    target:"[data-tour='copilot-button']",
    title:"Meet the AI Copilot",
    body:"The purple button in the bottom-right corner is your AI Copilot. Click it now to open it.",
    placement:"top",
    waitForEvent:"vercentic:copilot-opened",
    hideNext:true,
    dim:true,
  },
  {
    id:"copilot-open",
    target:"[data-tour='copilot-panel']",
    title:"What the Copilot can do",
    body:"Ask it anything in plain language — find candidates, draft emails, create records, schedule interviews, or run reports. It knows your live data and can take action directly.",
    placement:"left",
    dim:true,
  },
  {
    id:"done",
    target:null,
    title:"You're all set!",
    body:"Click the Vercentic logo any time to return to your dashboard. Find detailed guides in the Help section — and remember the Copilot is always there if you get stuck.",
    icon:"\u2713",
    placement:"center",
    isDone:true,
    ctaLabel:"Start exploring",
    dim:false,
  },
];

const PAD = 12;

function getSpotRect(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0) return null;
  return { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD*2, h: r.height + PAD*2 };
}

function resolvePos(rect, placement, tw=360, th=260) {
  if (!rect || placement === "center") return { top:"50%", left:"50%", transform:"translate(-50%,-50%)" };
  const vw = window.innerWidth, vh = window.innerHeight, G = 16;
  // For nav items on the left edge, force placement to right
  const forceRight = rect.x < 220;
  const fits = {
    right:  rect.x + rect.w + G + tw < vw,
    left:   rect.x - G - tw > 0,
    bottom: rect.y + rect.h + G + th < vh,
    top:    rect.y - G - th > 0,
  };
  let p = forceRight ? "right" : placement;
  if (!fits[p]) p = ["right","bottom","left","top"].find(x => fits[x]) || "center";
  if (p === "center") return { top:"50%", left:"50%", transform:"translate(-50%,-50%)" };
  const cx = rect.x + rect.w/2, cy = rect.y + rect.h/2;
  if (p === "right")  return { top: Math.min(Math.max(cy-th/2, G), vh-th-G), left: Math.min(rect.x+rect.w+G, vw-tw-G) };
  if (p === "left")   return { top: Math.min(Math.max(cy-th/2, G), vh-th-G), left: Math.max(rect.x-tw-G, G) };
  if (p === "bottom") return { top: Math.min(rect.y+rect.h+G, vh-th-G), left: Math.min(Math.max(cx-tw/2, G), vw-tw-G) };
  return { top: Math.max(rect.y-th-G, G), left: Math.min(Math.max(cx-tw/2, G), vw-tw-G) };
}

function Overlay({ spotRect, dim }) {
  const BG = "rgba(10,14,33,0.75)";
  const base = { position:"fixed", zIndex:9997, background:BG, pointerEvents:"none" };

  // No spotlight target — show soft dim or nothing
  if (!spotRect) {
    if (!dim) return null;
    // Soft semi-transparent backdrop so tooltip stands out but page is still visible
    return <div style={{ position:"fixed", inset:0, zIndex:9997, background:"rgba(10,14,33,0.45)", pointerEvents:"none" }} />;
  }

  const { x, y, w, h } = spotRect;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9997, pointerEvents:"none" }}>
      <div style={{ ...base, top:0,   left:0, right:0,  height:Math.max(0,y) }}/>
      <div style={{ ...base, top:y+h, left:0, right:0,  bottom:0 }}/>
      <div style={{ ...base, top:y,   left:0, width:Math.max(0,x), height:h }}/>
      <div style={{ ...base, top:y,   left:x+w, right:0, height:h }}/>
      {/* Glow ring around spotlight */}
      <div style={{
        position:"fixed", top:y-3, left:x-3, width:w+6, height:h+6,
        borderRadius:12, border:"2px solid rgba(67,97,238,0.9)",
        boxShadow:"0 0 0 4px rgba(67,97,238,0.15), 0 0 32px rgba(67,97,238,0.5)",
        zIndex:9998, pointerEvents:"none",
      }}/>
    </div>
  );
}

function Dots({ total, current }) {
  return (
    <div style={{ display:"flex", gap:5, alignItems:"center" }}>
      {Array.from({length:total}).map((_,i) => (
        <div key={i} style={{
          width:i===current?18:6, height:6, borderRadius:99,
          background:i===current?"#4361EE":i<current?"rgba(67,97,238,0.4)":"rgba(255,255,255,0.15)",
          transition:"all 0.3s",
        }}/>
      ))}
    </div>
  );
}

function Tooltip({ step, stepIndex, total, onNext, onPrev, onSkip, position, isFirst }) {
  return (
    <div style={{
      position:"fixed", zIndex:9999, width:360, ...position,
      background:"linear-gradient(135deg,#0d1117 0%,#0f1629 100%)",
      border:"1px solid rgba(67,97,238,0.3)", borderRadius:18,
      boxShadow:"0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset",
      overflow:"hidden",
      animation:"tSlideIn .28s cubic-bezier(0.34,1.3,0.64,1)",
      fontFamily:"Geist,'Geist Sans',system-ui,sans-serif",
    }}>
      <div style={{ height:3, background:"linear-gradient(90deg,#4361EE,#7c3aed)" }}/>
      <div style={{ padding:"22px 24px 20px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {step.icon && (
              <div style={{ width:36, height:36, borderRadius:10, background:"rgba(67,97,238,0.15)", border:"1px solid rgba(67,97,238,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"#4361EE" }}>{step.icon}</div>
            )}
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"rgba(67,97,238,0.8)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2 }}>
                {step.isDone?"Tour Complete":`Step ${stepIndex+1} of ${total}`}
              </div>
              <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:"#ffffff", lineHeight:1.2 }}>{step.title}</h3>
            </div>
          </div>
          <button onClick={onSkip} title="Skip tour"
            style={{ background:"none", border:"none", cursor:"pointer", padding:"4px 6px", borderRadius:6, color:"rgba(255,255,255,0.35)", fontSize:18, lineHeight:1, flexShrink:0, marginTop:-2 }}
            onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.7)"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}
          >×</button>
        </div>
        <p style={{ margin:"0 0 20px", fontSize:13.5, color:"rgba(255,255,255,0.65)", lineHeight:1.65 }}>{step.body}</p>
        {step.hideNext && (
          <div style={{ marginBottom:16, padding:"8px 12px", borderRadius:8, background:"rgba(67,97,238,0.12)", border:"1px solid rgba(67,97,238,0.25)", fontSize:12, color:"rgba(67,97,238,0.9)", display:"flex", alignItems:"center", gap:8 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v7l4 2"/><circle cx="12" cy="12" r="10"/></svg>
            Waiting for you to click...
          </div>
        )}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <Dots total={total} current={stepIndex}/>
          <div style={{ display:"flex", gap:8 }}>
            {!isFirst && !step.isDone && (
              <button onClick={onPrev}
                style={{ padding:"8px 16px", borderRadius:9, border:"1px solid rgba(255,255,255,0.12)", background:"transparent", color:"rgba(255,255,255,0.6)", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color="#fff";}}
                onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(255,255,255,0.6)";}}>Back</button>
            )}
            {!step.hideNext && (
              <button onClick={onNext}
                style={{ padding:"8px 20px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#4361EE,#6d28d9)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(67,97,238,0.35)" }}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(67,97,238,0.5)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 4px 14px rgba(67,97,238,0.35)";}}>
                {step.ctaLabel||(step.isDone?"Finish":"Next")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GuidedTour({ active, onClose, initialStep=0 }) {
  const [stepIndex, setStepIndex] = useState(initialStep);
  const [spotRect,  setSpotRect]  = useState(null);
  const [pos,       setPos]       = useState({ top:"50%", left:"50%", transform:"translate(-50%,-50%)" });
  const scrollRef  = useRef(null);
  const navigated  = useRef(false);

  const step    = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast  = stepIndex === STEPS.length - 1;

  const compute = useCallback(() => {
    const selector = step?.target || (step?.waitForClick ? step.waitForClick : null);
    if (!selector) {
      setSpotRect(null);
      setPos({ top:"50%", left:"50%", transform:"translate(-50%,-50%)" });
      return;
    }
    const r = getSpotRect(selector);
    if (!r) {
      setSpotRect(null);
      setPos({ top:"50%", left:"50%", transform:"translate(-50%,-50%)" });
      return;
    }
    setSpotRect(r);
    setPos(resolvePos(r, step.placement));
  }, [step]);

  useEffect(() => {
    if (!active) return;

    const prev = document.querySelector("[data-tour-lifted]");
    if (prev) {
      prev.style.zIndex = prev.dataset.tourOrigZIndex || "";
      prev.removeAttribute("data-tour-lifted");
      delete prev.dataset.tourOrigZIndex;
    }

    // Immediately clear spotlight when this step has no target
    const hasTarget = step?.target || step?.waitForClick;
    if (!hasTarget) {
      setSpotRect(null);
      setPos({ top:"50%", left:"50%", transform:"translate(-50%,-50%)" });
    }

    if (step?.navigateTo && !navigated.current) {
      navigated.current = true;
      window.dispatchEvent(new CustomEvent("talentos:navigate", { detail: step.navigateTo }));
    }

    const selector = step?.target || step?.waitForClick || null;
    if (selector) {
      // Retry finding element (may not be in DOM yet after navigation)
      const tryLift = (attempt) => {
        const el = document.querySelector(selector);
        if (!el && attempt < 5) {
          setTimeout(() => tryLift(attempt + 1), 200);
          return;
        }
        if (!el) { compute(); return; }

        // Walk up to stacking context root
        let liftEl = el;
        let p = el.parentElement;
        while (p && p !== document.body) {
          const pcs = window.getComputedStyle(p);
          if (pcs.position === "fixed" || (pcs.position !== "static" && pcs.zIndex !== "auto")) {
            liftEl = p; break;
          }
          p = p.parentElement;
        }
        liftEl.dataset.tourOrigZIndex = window.getComputedStyle(liftEl).zIndex;
        liftEl.dataset.tourLifted = "1";
        liftEl.style.zIndex = "10000";

        el.scrollIntoView({ behavior:"smooth", block:"nearest" });
        clearTimeout(scrollRef.current);
        scrollRef.current = setTimeout(compute, 300);
      };
      tryLift(0);
      return;
    }

    clearTimeout(scrollRef.current);
    scrollRef.current = setTimeout(compute, 150);
  }, [stepIndex, active]); // eslint-disable-line

  useEffect(() => { navigated.current = false; }, [stepIndex]);

  useEffect(() => {
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [compute]);

  useEffect(() => {
    if (!active || !step?.waitForClick) return;
    const attach = () => {
      const el = document.querySelector(step.waitForClick);
      if (!el) return null;
      const handler = () => setStepIndex(i => i+1);
      el.addEventListener("click", handler);
      return () => el.removeEventListener("click", handler);
    };
    const cleanup = attach();
    if (cleanup) return cleanup;
    const t = setTimeout(() => attach(), 600);
    return () => clearTimeout(t);
  }, [active, stepIndex]); // eslint-disable-line

  useEffect(() => {
    if (!active || !step?.waitForEvent) return;
    const handler = () => setStepIndex(i => i+1);
    window.addEventListener(step.waitForEvent, handler);
    return () => window.removeEventListener(step.waitForEvent, handler);
  }, [active, stepIndex]); // eslint-disable-line

  if (!active) {
    const prev = document.querySelector("[data-tour-lifted]");
    if (prev) {
      prev.style.zIndex = prev.dataset.tourOrigZIndex || "";
      prev.removeAttribute("data-tour-lifted");
    }
    return null;
  }

  const next = () => { if (isLast) { onClose(); return; } setStepIndex(i => i+1); };
  const prev = () => setStepIndex(i => Math.max(0, i-1));

  return createPortal(
    <>
      <style>{`@keyframes tSlideIn{from{opacity:0;transform:translateY(8px) scale(0.97)}to{opacity:1;transform:none}}`}</style>
      <Overlay spotRect={spotRect} dim={step?.dim === true}/>
      <Tooltip step={step} stepIndex={stepIndex} total={STEPS.length}
        onNext={next} onPrev={prev} onSkip={onClose}
        position={pos} isFirst={isFirst} isLast={isLast}/>
    </>,
    document.body
  );
}

export function useTour() {
  const [tourActive, setTourActive] = useState(false);
  const [tourStep,   setTourStep]   = useState(0);

  const startTour = useCallback((step=0) => {
    setTourStep(step);
    setTourActive(true);
  }, []);

  const endTour = useCallback(() => {
    setTourActive(false);
    localStorage.setItem("vercentic_tour_done", "1");
    window.dispatchEvent(new CustomEvent("vercentic:tour-done"));
  }, []);

  useEffect(() => {
    const h = (e) => startTour(e.detail?.step || 0);
    window.addEventListener("vercentic:start-tour", h);
    return () => window.removeEventListener("vercentic:start-tour", h);
  }, [startTour]);

  const TourPortal = <GuidedTour active={tourActive} onClose={endTour} initialStep={tourStep}/>;
  return { tourActive, startTour, endTour, TourPortal };
}
