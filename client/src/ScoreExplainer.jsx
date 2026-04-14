/**
 * client/src/ScoreExplainer.jsx
 * Shared AI score explainability component.
 * Usage: <ScoreExplainer score={82} reasons={[...]} gaps={[...]} label="Match score" />
 * - Hover → compact tooltip with top reasons
 * - Click → full modal breakdown with visual bars
 */
import { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";

const F = "var(--t-font,'Plus Jakarta Sans',sans-serif)";
const C = {
  surface: "var(--t-surface,#ffffff)",
  border:  "var(--t-border,#E8EBF4)",
  text1:   "var(--t-text1,#0F1729)",
  text2:   "var(--t-text2,#374151)",
  text3:   "var(--t-text3,#6B7280)",
  accent:  "var(--t-accent,#4361EE)",
  green:   "#0CAF77", greenL: "#F0FDF4",
  amber:   "#F59F00", amberL: "#FFFBEB",
  red:     "#E03131", redL:   "#FFF5F5",
};

const scoreColor  = s => s >= 75 ? C.green  : s >= 50 ? C.amber  : C.red;
const scoreBg     = s => s >= 75 ? C.greenL : s >= 50 ? C.amberL : C.redL;
const scoreLabel  = s => s >= 75 ? "Strong match" : s >= 50 ? "Partial match" : "Weak match";

function CheckIcon({ ok }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke={ok ? C.green : C.amber} strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}>
      <path d={ok ? "M20 6L9 17l-5-5" : "M12 9v4M12 17h.01"} />
    </svg>
  );
}

// ── Tooltip (hover) ───────────────────────────────────────────────────────────
function ScoreTooltip({ score, reasons = [], gaps = [], triggerRect = null }) {
  const col = scoreColor(score);
  const topReasons = reasons.slice(0, 3);
  const topGaps    = gaps.slice(0, 2);

  // Position using fixed coords derived from the trigger element's bounding rect
  // so the tooltip escapes any overflow:hidden ancestor (e.g. the Copilot panel)
  const posStyle = triggerRect
    ? {
        position: "fixed",
        // Place above the trigger; if too close to top, flip below
        bottom: triggerRect.top > 220
          ? `${window.innerHeight - triggerRect.top + 8}px`
          : "auto",
        top: triggerRect.top <= 220
          ? `${triggerRect.bottom + 8}px`
          : "auto",
        // Centre on the trigger ring, clamped so it doesn't overflow the right edge
        left: Math.min(
          triggerRect.left + triggerRect.width / 2 - 120,
          window.innerWidth - 252,
        ) + "px",
      }
    : {
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
      };

  const tooltip = (
    <div style={{
      ...posStyle,
      zIndex: 99999, width: 240,
      background: "#0f0f1a", color: "white", borderRadius: 12,
      padding: "12px 14px", boxShadow: "0 8px 30px rgba(0,0,0,.35)",
      fontFamily: F, pointerEvents: "none",
    }}>
      {/* Arrow — only shown in absolute mode (inside same stacking context) */}
      {!triggerRect && (
        <div style={{position:"absolute",bottom:-6,left:"50%",transform:"translateX(-50%)",
          width:12,height:6,overflow:"hidden"}}>
          <div style={{width:12,height:12,background:"#0f0f1a",transform:"rotate(45deg)",
            transformOrigin:"center",marginTop:-6}}/>
        </div>
      )}
      {/* Score line */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.7)"}}>AI Match Score</span>
        <span style={{fontSize:15,fontWeight:900,color:col}}>{score}%</span>
      </div>
      {/* Reasons */}
      {topReasons.map((r,i) => (
        <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",marginBottom:4}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.green}
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginTop:2,flexShrink:0}}>
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span style={{fontSize:11,color:"rgba(255,255,255,.85)",lineHeight:1.4}}>{r}</span>
        </div>
      ))}
      {topGaps.map((g,i) => (
        <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",marginBottom:4}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.amber}
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginTop:2,flexShrink:0}}>
            <path d="M12 9v4M12 17h.01"/>
          </svg>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)",lineHeight:1.4}}>{g}</span>
        </div>
      ))}
      <div style={{marginTop:8,fontSize:10,color:"rgba(255,255,255,.4)",textAlign:"center"}}>Click for full breakdown</div>
    </div>
  );

  // When we have viewport coordinates, portal into document.body to escape overflow:hidden ancestors
  return triggerRect
    ? ReactDOM.createPortal(tooltip, document.body)
    : tooltip;
}

// ── Modal (click) ─────────────────────────────────────────────────────────────
function ScoreModal({ score, reasons = [], gaps = [], criteriaScores, skillsDetail, candidateName, jobName, onClose }) {
  const col = scoreColor(score);
  const bg  = scoreBg(score);
  const [skillsOpen, setSkillsOpen] = useState(false);

  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const CRITERION_COLORS = {
    title:"#e64980", skills:"#4361EE", location:"#0CAF77",
    experience:"#F79009", availability:"#7C3AED", rating:"#ef4444",
  };

  const hasCriteria = criteriaScores && Object.keys(criteriaScores).length > 0;
  const hasSkills   = skillsDetail && (skillsDetail.matched?.length || skillsDetail.close?.length || skillsDetail.missing?.length || skillsDetail.extra?.length);

  return (
    <div style={{position:"fixed",inset:0,zIndex:10000,display:"flex",alignItems:"center",
      justifyContent:"center",background:"rgba(15,23,41,.5)",backdropFilter:"blur(3px)"}}
      onClick={onClose}>
      <div style={{background:C.surface,borderRadius:20,padding:28,width:500,maxWidth:"95vw",
        maxHeight:"90vh",overflowY:"auto",
        boxShadow:"0 24px 60px rgba(0,0,0,.2)",fontFamily:F}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:C.text1,marginBottom:4}}>AI Match Breakdown</div>
            {candidateName && <div style={{fontSize:12,color:C.text3}}>{candidateName}{jobName ? ` → ${jobName}` : ""}</div>}
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",
            padding:4,color:C.text3,fontSize:20,lineHeight:1,marginTop:-2}}>×</button>
        </div>

        {/* Overall score gauge */}
        <div style={{display:"flex",alignItems:"center",gap:20,padding:"14px 18px",
          borderRadius:14,background:bg,border:`1.5px solid ${col}30`,marginBottom:20}}>
          <div style={{position:"relative",width:64,height:64,flexShrink:0}}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke={`${col}20`} strokeWidth="6"/>
              <circle cx="32" cy="32" r="26" fill="none" stroke={col} strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${score*1.634} 163.4`} strokeDashoffset="40.9"
                transform="rotate(-90 32 32)"/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:17,fontWeight:900,color:col,lineHeight:1}}>{score}</span>
              <span style={{fontSize:8,color:col,fontWeight:700}}>%</span>
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800,color:col,marginBottom:2}}>{scoreLabel(score)}</div>
            <div style={{fontSize:11,color:C.text2}}>
              {reasons.length} positive signal{reasons.length!==1?"s":""}
              {gaps.length>0?` · ${gaps.length} gap${gaps.length!==1?"s":""}`:""}</div>
            <div style={{marginTop:7,height:5,borderRadius:99,background:`${col}20`,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${score}%`,background:col,borderRadius:99,transition:"width .6s"}}/>
            </div>
          </div>
        </div>

        {/* Per-criterion breakdown */}
        {hasCriteria && (
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",
              letterSpacing:".06em",marginBottom:10}}>Score by criterion</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {Object.entries(criteriaScores).map(([id, cs]) => {
                const color = CRITERION_COLORS[id] || C.accent;
                const pct   = cs.max > 0 ? Math.round((cs.earned/cs.max)*100) : 0;
                const isSkillsRow = id === "skills";
                return (
                  <div key={id}
                    onClick={isSkillsRow && hasSkills ? ()=>setSkillsOpen(o=>!o) : undefined}
                    style={{borderRadius:10,border:`1px solid ${C.border}`,overflow:"hidden",
                      cursor:isSkillsRow&&hasSkills?"pointer":"default",
                      transition:"box-shadow .12s",
                      boxShadow:isSkillsRow&&skillsOpen?"0 0 0 2px "+color+"33":"none"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px"}}>
                      {/* Colour dot */}
                      <div style={{width:8,height:8,borderRadius:"50%",background:color,flexShrink:0}}/>
                      {/* Label */}
                      <span style={{fontSize:12,fontWeight:600,color:C.text1,flex:1}}>{cs.label}</span>
                      {/* Earned / Max */}
                      <span style={{fontSize:11,fontWeight:700,color:color,minWidth:52,textAlign:"right"}}>
                        {cs.earned}<span style={{color:C.text3,fontWeight:400}}>/{cs.max}</span>
                      </span>
                      {/* Pct */}
                      <span style={{fontSize:11,color:C.text3,minWidth:32,textAlign:"right"}}>{pct}%</span>
                      {/* Expand chevron for skills */}
                      {isSkillsRow && hasSkills && (
                        <span style={{fontSize:11,color:C.text3,transform:skillsOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
                      )}
                    </div>
                    {/* Mini bar */}
                    <div style={{height:3,background:`${color}15`}}>
                      <div style={{height:"100%",width:`${pct}%`,background:color,transition:"width .5s ease"}}/>
                    </div>

                    {/* Skills expandable detail */}
                    {isSkillsRow && hasSkills && skillsOpen && (
                      <div style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`,background:"#fafbff"}}>

                        {skillsDetail.matched?.length > 0 && (
                          <div style={{marginBottom:10}}>
                            <div style={{fontSize:10,fontWeight:700,color:C.green,textTransform:"uppercase",
                              letterSpacing:".05em",marginBottom:6}}>✓ Matched ({skillsDetail.matched.length})</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                              {skillsDetail.matched.map((m,i)=>(
                                <span key={i} style={{fontSize:11,padding:"3px 9px",borderRadius:99,
                                  background:C.greenL,color:C.green,fontWeight:600,border:`1px solid ${C.green}30`}}
                                  title={m.candidate!==m.required?`Candidate has: ${m.candidate}`:undefined}>
                                  {m.required}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {skillsDetail.close?.length > 0 && (
                          <div style={{marginBottom:10}}>
                            <div style={{fontSize:10,fontWeight:700,color:C.amber,textTransform:"uppercase",
                              letterSpacing:".05em",marginBottom:6}}>≈ Close match ({skillsDetail.close.length})</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                              {skillsDetail.close.map((m,i)=>(
                                <span key={i} style={{fontSize:11,padding:"3px 9px",borderRadius:99,
                                  background:C.amberL,color:C.amber,fontWeight:600,border:`1px solid ${C.amber}30`}}
                                  title={`Candidate has: ${m.candidate}`}>
                                  {m.required}
                                </span>
                              ))}
                            </div>
                            <div style={{fontSize:10,color:C.text3,marginTop:5,fontStyle:"italic"}}>Half-credit applied. Candidate has related but not identical skills.</div>
                          </div>
                        )}

                        {skillsDetail.missing?.length > 0 && (
                          <div style={{marginBottom:10}}>
                            <div style={{fontSize:10,fontWeight:700,color:C.red,textTransform:"uppercase",
                              letterSpacing:".05em",marginBottom:6}}>✗ Missing ({skillsDetail.missing.length})</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                              {skillsDetail.missing.map((s,i)=>(
                                <span key={i} style={{fontSize:11,padding:"3px 9px",borderRadius:99,
                                  background:C.redL,color:C.red,fontWeight:600,border:`1px solid ${C.red}30`}}>
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {skillsDetail.extra?.length > 0 && (
                          <div>
                            <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",
                              letterSpacing:".05em",marginBottom:6}}>+ Additional skills</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                              {skillsDetail.extra.slice(0,8).map((s,i)=>(
                                <span key={i} style={{fontSize:11,padding:"3px 9px",borderRadius:99,
                                  background:`${C.accent}10`,color:C.accent,fontWeight:500,border:`1px solid ${C.accent}20`}}>
                                  {s}
                                </span>
                              ))}
                              {skillsDetail.extra.length>8 && <span style={{fontSize:11,color:C.text3,padding:"3px 0"}}>+{skillsDetail.extra.length-8} more</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fallback: plain reasons/gaps if no criteriaScores */}
        {!hasCriteria && (
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
            {reasons.map((r,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"9px 12px",borderRadius:9,background:C.greenL,border:`1px solid ${C.green}25`}}>
                <CheckIcon ok={true}/><span style={{fontSize:13,color:C.text2,lineHeight:1.5}}>{r}</span>
              </div>
            ))}
            {gaps.map((g,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"9px 12px",borderRadius:9,background:C.amberL,border:`1px solid ${C.amber}25`}}>
                <CheckIcon ok={false}/><span style={{fontSize:13,color:C.text2,lineHeight:1.5}}>{g}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{padding:"9px 12px",borderRadius:9,background:`${C.accent}08`,
          border:`1px solid ${C.accent}20`,fontSize:11,color:C.text3,lineHeight:1.6}}>
          Scores use weighted criteria from your AI Matching settings. They are a guide — always apply your own judgement.
          {hasSkills && <span style={{color:C.accent,fontWeight:600}}> Click the Skills row to see the full skills breakdown.</span>}
        </div>
      </div>
    </div>
  );
}

// ── Main ScoreExplainer — score ring with hover tooltip + click modal ─────────
export default function ScoreExplainer({
  score,
  reasons = [],
  gaps = [],
  criteriaScores,
  skillsDetail,
  candidateName,
  jobName,
  size = 44,
  fontSize = 12,
}) {
  const [hovered, setHovered] = useState(false);
  const [open, setOpen]       = useState(false);
  const ref = useRef(null);
  const col = scoreColor(score);
  const hasDetail = reasons.length > 0 || gaps.length > 0;

  if (score == null) return null;

  return (
    <>
      <div
        ref={ref}
        style={{ position: "relative", display: "inline-flex", cursor: hasDetail ? "pointer" : "default" }}
        onMouseEnter={() => hasDetail && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={e => { if (!hasDetail) return; e.stopPropagation(); setOpen(true); setHovered(false); }}
      >
        {/* Score ring */}
        <div style={{
          width: size, height: size, borderRadius: "50%",
          border: `3px solid ${col}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", background: `${col}10`,
          transition: "transform .15s, box-shadow .15s",
          ...(hovered ? { transform: "scale(1.1)", boxShadow: `0 0 0 3px ${col}25` } : {}),
        }}>
          <span style={{ fontSize, fontWeight: 800, color: col, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 8, color: col, opacity: 0.7 }}>%</span>
        </div>

        {/* Hover tooltip — portalled so it escapes overflow:hidden ancestors */}
        {hovered && hasDetail && (
          <ScoreTooltip
            score={score} reasons={reasons} gaps={gaps}
            triggerRect={ref.current?.getBoundingClientRect?.() ?? null}
          />
        )}
      </div>

      {/* Click modal */}
      {open && (
        <ScoreModal
          score={score}
          reasons={reasons}
          gaps={gaps}
          criteriaScores={criteriaScores}
          skillsDetail={skillsDetail}
          candidateName={candidateName}
          jobName={jobName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// Also export a compact inline badge version for lists/tables
export function ScoreBadge({ score, reasons = [], gaps = [], size = "sm" }) {
  const [open, setOpen] = useState(false);
  const col = scoreColor(score);
  const hasDetail = reasons.length > 0 || gaps.length > 0;
  const pad  = size === "sm" ? "3px 10px" : "5px 14px";
  const fz   = size === "sm" ? 11 : 13;

  if (score == null) return null;
  return (
    <>
      <span
        onClick={e => { if (!hasDetail) return; e.stopPropagation(); setOpen(true); }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: pad, borderRadius: 99, fontSize: fz, fontWeight: 700,
          background: `${col}15`, color: col, border: `1px solid ${col}30`,
          cursor: hasDetail ? "pointer" : "default",
          transition: "opacity .1s",
        }}
        onMouseEnter={e => { if (hasDetail) e.currentTarget.style.opacity = ".75"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        title={hasDetail ? "Click to see score breakdown" : undefined}
      >
        {score}% match
        {hasDetail && <span style={{ fontSize: fz - 1, opacity: 0.6 }}>ⓘ</span>}
      </span>
      {open && (
        <ScoreModal score={score} reasons={reasons} gaps={gaps} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
