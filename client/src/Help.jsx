// Help.jsx — In-app help centre with search, section navigation, and Copilot integration
import { useState, useMemo, useRef, useEffect } from "react";
import { HELP_SECTIONS, HELP_ARTICLES } from "./helpContent";

const F = "var(--t-font, 'Geist', -apple-system, sans-serif)";

// Icon paths
const IP = {
  home:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  list:"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  briefcase:"M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
  layers:"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  mail:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  calendar:"M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18",
  dollar:"M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  "bar-chart-2":"M18 20V10M12 20V4M6 20v-6",
  "file-text":"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  clipboard:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z",
  "git-branch":"M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9",
  settings:"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9 1.65 1.65 0 0 0 4.27 7.18l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  monitor:"M20 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zM8 21h8M12 17v4",
  search:"M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  chevron:"M9 18l6-6-6-6",
  arrow:"M19 12H5M12 5l-7 7 7 7",
  "help-circle":"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01",
};

const Ic = ({ n, s=16, c="currentColor", style={} }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink:0, ...style }}>
    {(IP[n]||"").split(" M").map((d,i)=><path key={i} d={i===0?d:"M"+d}/>)}
  </svg>
);

const CALLOUT = {
  tip:  { bg:"#E6FAF5", border:"#0CA678", label:"Tip",  lc:"#0CA678" },
  note: { bg:"#FFF9DB", border:"#F59F00", label:"Note", lc:"#F59F00" },
  ai:   { bg:"#F3F0FF", border:"#7950F2", label:"AI",   lc:"#7950F2" },
};

const Block = ({ block }) => {
  if (['p','tip','note','ai'].includes(block.type) && !['tip','note','ai'].includes(block.type)) {
    return <p style={{ margin:"0 0 12px", lineHeight:1.7, color:"var(--t-text2)", fontSize:14 }}>{block.text}</p>;
  }
  if (block.type === 'p') return <p style={{ margin:"0 0 12px", lineHeight:1.7, color:"var(--t-text2)", fontSize:14 }}>{block.text}</p>;
  if (block.type === 'list') return (
    <ul style={{ margin:"0 0 12px", paddingLeft:20 }}>
      {block.items.map((item,i)=><li key={i} style={{ color:"var(--t-text2)", fontSize:14, lineHeight:1.7, marginBottom:4 }}>{item}</li>)}
    </ul>
  );
  if (block.type === 'steps') return (
    <ol style={{ margin:"0 0 12px", paddingLeft:0, listStyle:"none" }}>
      {block.items.map((item,i)=>(
        <li key={i} style={{ display:"flex", gap:10, marginBottom:8, alignItems:"flex-start" }}>
          <span style={{ flexShrink:0, width:22, height:22, borderRadius:"50%", background:"var(--t-accent)", color:"white", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:F, marginTop:1 }}>{i+1}</span>
          <span style={{ color:"var(--t-text2)", fontSize:14, lineHeight:1.6 }}>{item}</span>
        </li>
      ))}
    </ol>
  );
  if (['tip','note','ai'].includes(block.type)) {
    const s = CALLOUT[block.type];
    return (
      <div style={{ display:"flex", gap:10, background:s.bg, borderLeft:`3px solid ${s.border}`, borderRadius:"0 8px 8px 0", padding:"10px 14px", margin:"0 0 12px" }}>
        <span style={{ fontSize:11, fontWeight:800, color:s.lc, flexShrink:0, paddingTop:2, fontFamily:F }}>{s.label}</span>
        <span style={{ fontSize:13, color:"var(--t-text2)", lineHeight:1.6 }}>{block.text}</span>
      </div>
    );
  }
  return null;
};

const ArticleView = ({ article, onBack, onAskCopilot }) => {
  const section = HELP_SECTIONS.find(s=>s.id===article.section);
  return (
    <div style={{ maxWidth:680 }}>
      <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:"var(--t-text3)", fontSize:13, padding:"0 0 16px", fontFamily:F }}>
        <Ic n="arrow" s={14} c="var(--t-text3)"/> Back to {section?.label ?? "Help"}
      </button>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
        <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:section?.color+"18", color:section?.color }}>
          <Ic n={section?.icon??"list"} s={11} c={section?.color}/>{section?.label}
        </span>
      </div>
      <h1 style={{ margin:"0 0 8px", fontSize:22, fontWeight:800, color:"var(--t-text1)", fontFamily:F, lineHeight:1.3 }}>{article.title}</h1>
      <p style={{ margin:"0 0 24px", fontSize:14, color:"var(--t-text3)", lineHeight:1.6 }}>{article.summary}</p>
      <div style={{ borderTop:"1px solid var(--t-border)", paddingTop:20 }}>
        {article.content.map((block,i)=><Block key={i} block={block}/>)}
      </div>
      <div style={{ marginTop:32, padding:"16px 20px", background:"linear-gradient(135deg,#F3F0FF 0%,#EEF2FF 100%)", borderRadius:12, border:"1px solid #E8E4FF", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:"var(--t-text1)", fontFamily:F }}>Still have questions?</div>
          <div style={{ fontSize:12, color:"var(--t-text3)", marginTop:2 }}>Ask the AI Copilot — it can read this guide and answer follow-up questions.</div>
        </div>
        <button onClick={()=>onAskCopilot(article.title)} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:"#7950F2", border:"none", borderRadius:8, color:"white", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:F, whiteSpace:"nowrap" }}>
          <Ic n="zap" s={13} c="white"/>Ask Copilot
        </button>
      </div>
    </div>
  );
};

const ArticleCard = ({ article, onClick }) => {
  const [h,setH]=useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ background:"var(--t-surface)", border:`1px solid ${h?"var(--t-accent)40":"var(--t-border)"}`, borderRadius:12, padding:"14px 16px", cursor:"pointer", boxShadow:h?"0 4px 16px rgba(0,0,0,.08)":"0 1px 4px rgba(0,0,0,.07)", transform:h?"translateY(-1px)":"none", transition:"all .15s" }}>
      <div style={{ fontSize:14, fontWeight:700, color:"var(--t-text1)", fontFamily:F, marginBottom:4 }}>{article.title}</div>
      <div style={{ fontSize:12, color:"var(--t-text3)", lineHeight:1.5 }}>{article.summary}</div>
    </div>
  );
};

export default function Help({ onOpenCopilot }) {
  const [query, setQuery]         = useState("");
  const [activeSection, setSection] = useState(null);
  const [activeArticle, setArticle] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return HELP_ARTICLES.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.keywords.some(k=>k.includes(q)) ||
      a.content.some(b=>(b.text||(b.items||[]).join(" ")).toLowerCase().includes(q))
    ).slice(0,10);
  }, [query]);

  const isSearching = query.trim().length >= 2;
  const sectionArticles = useMemo(()=>activeSection?HELP_ARTICLES.filter(a=>a.section===activeSection):[],[activeSection]);

  const openArticle = (article) => { setArticle(article); setSection(article.section); setQuery(""); };
  const handleAskCopilot = (title) => {
    if (onOpenCopilot) onOpenCopilot(`I was reading the help article "${title}". Can you tell me more about this?`);
  };

  if (activeArticle) return (
    <div style={{ padding:"32px 40px", minHeight:"100%", background:"var(--t-bg)", fontFamily:F }}>
      <ArticleView article={activeArticle} onBack={()=>setArticle(null)} onAskCopilot={handleAskCopilot}/>
    </div>
  );

  if (activeSection && !isSearching) {
    const sec = HELP_SECTIONS.find(s=>s.id===activeSection);
    return (
      <div style={{ padding:"32px 40px", minHeight:"100%", background:"var(--t-bg)", fontFamily:F }}>
        <button onClick={()=>setSection(null)} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:"var(--t-text3)", fontSize:13, padding:"0 0 20px", fontFamily:F }}>
          <Ic n="arrow" s={14} c="var(--t-text3)"/>All topics
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:sec.color+"18", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Ic n={sec.icon} s={18} c={sec.color}/>
          </div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"var(--t-text1)" }}>{sec.label}</h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {sectionArticles.map(a=><ArticleCard key={a.id} article={a} onClick={()=>openArticle(a)}/>)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:F, background:"var(--t-bg)", minHeight:"100%" }}>
      {/* Hero */}
      <div style={{ background:"linear-gradient(135deg,#0F1729 0%,var(--t-accent) 100%)", padding:"40px 40px 48px" }}>
        <h1 style={{ margin:"0 0 6px", fontSize:26, fontWeight:800, color:"white" }}>Help Centre</h1>
        <p style={{ margin:"0 0 24px", fontSize:14, color:"rgba(255,255,255,0.7)", lineHeight:1.6 }}>Search articles or browse by topic. The AI Copilot can also answer your questions.</p>
        <div style={{ position:"relative", maxWidth:520 }}>
          <Ic n="search" s={16} c="rgba(255,255,255,0.5)" style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)" }}/>
          <input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)}
            placeholder="Search — e.g. 'how do I add a candidate' or 'export records'"
            style={{ width:"100%", boxSizing:"border-box", padding:"12px 14px 12px 42px", borderRadius:10, border:"1px solid rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.1)", color:"white", fontSize:14, fontFamily:F, outline:"none" }}/>
        </div>
      </div>

      {/* Search results */}
      {isSearching && (
        <div style={{ padding:"24px 40px" }}>
          {searchResults.length===0 ? (
            <div style={{ textAlign:"center", padding:"48px 0", color:"var(--t-text3)" }}>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:6, color:"var(--t-text2)" }}>No results for "{query}"</div>
              <div style={{ fontSize:13 }}>Try different keywords, or{" "}
                <button onClick={()=>onOpenCopilot?.(`How do I ${query}?`)} style={{ background:"none", border:"none", color:"var(--t-accent)", cursor:"pointer", fontSize:13, fontFamily:F, fontWeight:600 }}>ask the Copilot</button>.
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--t-text3)", marginBottom:12, textTransform:"uppercase", letterSpacing:"0.06em" }}>{searchResults.length} result{searchResults.length!==1?"s":""}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, maxWidth:680 }}>
                {searchResults.map(a=>{
                  const sec=HELP_SECTIONS.find(s=>s.id===a.section);
                  return (
                    <div key={a.id} onClick={()=>openArticle(a)} style={{ background:"var(--t-surface)", border:"1px solid var(--t-border)", borderRadius:10, padding:"12px 16px", cursor:"pointer", display:"flex", alignItems:"flex-start", gap:12 }}>
                      <div style={{ width:30, height:30, borderRadius:8, background:(sec?.color??"#3B5BDB")+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                        <Ic n={sec?.icon??"list"} s={14} c={sec?.color??"#3B5BDB"}/>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:"var(--t-text1)", marginBottom:2 }}>{a.title}</div>
                        <div style={{ fontSize:12, color:"var(--t-text3)", lineHeight:1.5 }}>{a.summary}</div>
                      </div>
                      <Ic n="chevron" s={14} c="var(--t-text3)" style={{ marginTop:6 }}/>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop:20, padding:"12px 16px", background:"var(--t-accent-light,#EEF2FF)", borderRadius:10, display:"flex", alignItems:"center", gap:10, maxWidth:680 }}>
                <Ic n="zap" s={15} c="#7950F2"/>
                <span style={{ fontSize:13, color:"var(--t-text2)", flex:1 }}>Not finding what you need?</span>
                <button onClick={()=>onOpenCopilot?.(`How do I ${query}?`)} style={{ padding:"6px 14px", borderRadius:7, border:"none", background:"#7950F2", color:"white", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:F }}>Ask Copilot</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Home */}
      {!isSearching && (
        <div style={{ padding:"32px 40px" }}>
          {/* Copilot banner */}
          <div style={{ background:"linear-gradient(135deg,#F3F0FF 0%,#EEF2FF 100%)", border:"1px solid #E8E4FF", borderRadius:14, padding:"16px 20px", marginBottom:32, display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#7950F2,#3B5BDB)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Ic n="zap" s={20} c="white"/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:800, color:"var(--t-text1)", fontFamily:F, marginBottom:2 }}>Ask the AI Copilot</div>
              <div style={{ fontSize:13, color:"var(--t-text3)", lineHeight:1.5 }}>The Copilot knows this guide and can answer questions in plain language.</div>
            </div>
            <button onClick={()=>onOpenCopilot?.("I need help with Vercentic. ")} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", background:"#7950F2", border:"none", borderRadius:9, color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:F, whiteSpace:"nowrap" }}>
              <Ic n="zap" s={14} c="white"/>Open Copilot
            </button>
          </div>

          {/* Sections grid */}
          <div style={{ fontSize:12, fontWeight:700, color:"var(--t-text3)", marginBottom:14, textTransform:"uppercase", letterSpacing:"0.06em" }}>Browse by topic</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:10, marginBottom:36 }}>
            {HELP_SECTIONS.map(sec=>{
              const count=HELP_ARTICLES.filter(a=>a.section===sec.id).length;
              return (
                <div key={sec.id} onClick={()=>setSection(sec.id)} style={{ background:"var(--t-surface)", border:"1px solid var(--t-border)", borderRadius:12, padding:"14px 16px", cursor:"pointer", transition:"all .15s" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=sec.color+"50";e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.08)";e.currentTarget.style.transform="translateY(-1px)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--t-border)";e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="none";}}>
                  <div style={{ width:32, height:32, borderRadius:9, background:sec.color+"18", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
                    <Ic n={sec.icon} s={16} c={sec.color}/>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--t-text1)", marginBottom:3 }}>{sec.label}</div>
                  <div style={{ fontSize:11, color:"var(--t-text3)" }}>{count} article{count!==1?"s":""}</div>
                </div>
              );
            })}
          </div>

          {/* Popular articles */}
          <div style={{ fontSize:12, fontWeight:700, color:"var(--t-text3)", marginBottom:14, textTransform:"uppercase", letterSpacing:"0.06em" }}>Popular articles</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {["gs-create","ppl-cv","jobs-pipeline","ai-overview","rec-filter","comms-send","int-schedule","pb-overview"].map(id=>{
              const a=HELP_ARTICLES.find(x=>x.id===id); if(!a) return null;
              const sec=HELP_SECTIONS.find(s=>s.id===a.section);
              return (
                <div key={id} onClick={()=>openArticle(a)} style={{ display:"flex", alignItems:"center", gap:10, background:"var(--t-surface)", border:"1px solid var(--t-border)", borderRadius:10, padding:"10px 14px", cursor:"pointer" }}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--t-surface2)"}
                  onMouseLeave={e=>e.currentTarget.style.background="var(--t-surface)"}>
                  <Ic n={sec?.icon??"list"} s={14} c={sec?.color??"#3B5BDB"}/>
                  <span style={{ fontSize:13, color:"var(--t-text1)", fontWeight:600, flex:1 }}>{a.title}</span>
                  <Ic n="chevron" s={13} c="var(--t-text3)"/>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
