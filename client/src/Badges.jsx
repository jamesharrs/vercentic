// client/src/Badges.jsx
// Vercentic — Achievements & Engagement Dashboard
// Three views: Activity Feed · Leaderboard · My Badges
// Feature-flag gated via access_achievements permission

import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "./apiClient.js";

const api = { get: (path) => apiClient.get(path) };

const C = {
  bg:          "var(--t-bg, #f0f2ff)",
  surface:     "var(--t-surface, #ffffff)",
  border:      "var(--t-border, #e8eaf0)",
  text1:       "var(--t-text1, #0f172a)",
  text2:       "var(--t-text2, #374151)",
  text3:       "var(--t-text3, #9ca3af)",
  accent:      "var(--t-accent, #4361EE)",
  accentLight: "var(--t-accent-light, #eef1ff)",
};
const F = "var(--t-font, 'DM Sans', -apple-system, sans-serif)";

const TIER = {
  bronze:   { color:'#b45309', bg:'#fef3c7', label:'Bronze'   },
  silver:   { color:'#6b7280', bg:'#f3f4f6', label:'Silver'   },
  gold:     { color:'#d97706', bg:'#fffbeb', label:'Gold'     },
  platinum: { color:'#7c3aed', bg:'#f5f3ff', label:'Platinum' },
};

const PATHS = {
  award:        "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12",
  star:         "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  users:        "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  trophy:       "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z",
  target:       "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  zap:          "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  database:     "M21 5c0 2.21-4.03 4-9 4S3 7.21 3 5M21 5c0-2.21-4.03-4-9-4S3 2.79 3 5M21 12c0 2.21-4.03 4-9 4s-9-1.79-9-4M3 5v14c0 2.21 4.03 4 9 4s9-1.79 9-4V5",
  layers:       "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  calendar:     "M3 4h18v18H3V4zM16 2v4M8 2v4M3 10h18",
  check:        "M20 6L9 17l-5-5",
  box:          "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  sparkles:     "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z",
  dollar:       "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  mail:         "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  link:         "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  heart:        "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  clipboard:    "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z",
  "bar-chart-2":"M18 20V10M12 20V4M6 20v-6",
  workflow:     "M22 12h-4l-3 9L9 3l-3 9H2",
  phone:        "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 1.18h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.72 2.81a2 2 0 0 1-.45 2.11L7.09 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.36 1.85.6 2.81.72A2 2 0 0 1 21 16.92z",
  compass:      "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z",
  "git-branch": "M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9",
  "trending-up":"M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
  bot:          "M12 2a2 2 0 0 1 2 2v1h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1v1a7 7 0 0 1-14 0V9H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V4a2 2 0 0 1 2-2h2zm-2 9a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm4 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm-4 4h4",
  message:      "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  refresh:      "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  flame:        "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z",
  user:         "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
};
const Ic = ({ n, s=16, c="currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {PATHS[n] && <path d={PATHS[n]}/>}
  </svg>
);

const relTime = (ts) => {
  if (!ts) return "—";
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
  return new Date(ts).toLocaleDateString();
};

const Avatar = ({ initials, color=C.accent, size=36 }) => (
  <div style={{ width:size, height:size, borderRadius:"50%", background:color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
    <span style={{ color:"white", fontSize:size*0.33, fontWeight:700 }}>{initials}</span>
  </div>
);

const TierBadge = ({ tier }) => {
  const t = TIER[tier] || TIER.bronze;
  return <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 7px", borderRadius:99, background:t.bg, color:t.color, fontSize:10, fontWeight:700, letterSpacing:"0.04em" }}>{t.label.toUpperCase()}</span>;
};

const PointsBadge = ({ pts }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:99, background:C.accentLight, color:C.accent, fontSize:11, fontWeight:700 }}>
    <Ic n="star" s={10} c={C.accent}/> {pts.toLocaleString()} pts
  </span>
);

const ProgressBar = ({ pct, color=C.accent }) => (
  <div style={{ height:5, background:C.border, borderRadius:99, overflow:"hidden" }}>
    <div style={{ height:"100%", width:`${Math.min(100,pct)}%`, background:color, borderRadius:99, transition:"width 0.6s cubic-bezier(0.4,0,0.2,1)" }}/>
  </div>
);

const BadgeCard = ({ badge, earned, progress, compact=false }) => {
  const t = TIER[badge.tier] || TIER.bronze;
  return (
    <div style={{ padding:compact?"10px 12px":16, borderRadius:12, border:`1.5px solid ${earned?badge.color+"40":C.border}`,
      background:earned?badge.color+"08":C.surface, opacity:earned?1:0.6, transition:"all 0.15s",
      display:"flex", flexDirection:compact?"row":"column", alignItems:compact?"center":"flex-start", gap:compact?10:8 }}>
      <div style={{ width:compact?32:44, height:compact?32:44, borderRadius:compact?8:12, background:earned?badge.color:C.border,
        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <Ic n={badge.icon} s={compact?15:20} c="white"/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
          <span style={{ fontSize:compact?12:13, fontWeight:700, color:C.text1 }}>{badge.name}</span>
          <TierBadge tier={badge.tier}/>
        </div>
        {!compact && <div style={{ fontSize:11, color:C.text3, marginBottom:8, lineHeight:1.4 }}>{badge.desc}</div>}
        {earned ? (
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <PointsBadge pts={badge.points}/>
            {!compact && <span style={{ fontSize:10, color:C.text3 }}>Earned {relTime(badge.awarded_at)}</span>}
          </div>
        ) : progress && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:10, color:C.text3 }}>{progress.current.toLocaleString()} / {progress.threshold.toLocaleString()}</span>
              <span style={{ fontSize:10, color:C.text3 }}>{progress.pct}%</span>
            </div>
            <ProgressBar pct={progress.pct} color={badge.color}/>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Leaderboard ──────────────────────────────────────────────────────────────
function Leaderboard({ environment, currentUserId }) {
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [userBadges, setUserBadges] = useState(null);
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    api.get("/badges/leaderboard").then(d => { setData(Array.isArray(d)?d:[]); setLoading(false); }).catch(()=>setLoading(false));
  }, [environment?.id]);

  const openUser = async (user) => {
    setSelected(user); setUserLoading(true);
    try { const d = await api.get(`/badges/user/${user.id}`); setUserBadges(d); } catch {}
    setUserLoading(false);
  };

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, color:C.text3, fontFamily:F }}>Loading leaderboard…</div>;
  if (data.length === 0) return <div style={{ textAlign:"center", padding:60, color:C.text3, fontFamily:F }}><Ic n="users" s={40} c={C.border}/><div style={{ marginTop:12, fontSize:14 }}>No activity yet — start using Vercentic to earn badges!</div></div>;

  const top3 = data.slice(0,3);
  const rest  = data.slice(3);
  const PODIUM_ORDER = top3.length>=3?[top3[1],top3[0],top3[2]]:top3;
  const PODIUM_H = [100,130,80];
  const PODIUM_RANK = [2,1,3];
  const MEDAL_COL = ["#9ca3af","#d97706","#b45309"];

  return (
    <div style={{ display:"flex", gap:24, fontFamily:F, height:"100%" }}>
      <div style={{ flex:1, minWidth:0 }}>
        {/* Podium */}
        <div style={{ background:C.surface, borderRadius:16, border:`1px solid ${C.border}`, padding:"24px 20px 0", marginBottom:20, overflow:"hidden" }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:20 }}>Top Performers</div>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
            {PODIUM_ORDER.map((user,idx) => {
              if (!user) return null;
              const h=PODIUM_H[idx]; const rank=PODIUM_RANK[idx]; const med=MEDAL_COL[idx]; const isFirst=rank===1;
              return (
                <div key={user.id} style={{ display:"flex", flexDirection:"column", alignItems:"center", width:110 }}>
                  <Avatar initials={user.avatar_initials} color={user.role_color||C.accent} size={isFirst?52:44}/>
                  <div style={{ fontSize:isFirst?13:12, fontWeight:700, color:C.text1, marginTop:8, textAlign:"center", maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.name}</div>
                  <PointsBadge pts={user.points}/>
                  <div style={{ width:"100%", height:h, marginTop:10, background:isFirst?`linear-gradient(180deg,#fef3c7,#fde68a)`:idx===0?`linear-gradient(180deg,#f3f4f6,#e5e7eb)`:`linear-gradient(180deg,#fff7ed,#fed7aa)`, borderRadius:"10px 10px 0 0", display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:12 }}>
                    <span style={{ fontSize:22, fontWeight:900, color:med }}>#{rank}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Full list */}
        <div style={{ background:C.surface, borderRadius:16, border:`1px solid ${C.border}`, overflow:"hidden" }}>
          <div style={{ padding:"16px 20px 12px", borderBottom:`1px solid ${C.border}` }}><div style={{ fontSize:13, fontWeight:700, color:C.text1 }}>All Users</div></div>
          {data.map((user,idx) => {
            const isMe=user.id===currentUserId; const isSel=selected?.id===user.id;
            return (
              <div key={user.id} onClick={()=>openUser(user)} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 20px", cursor:"pointer", background:isSel?C.accentLight:isMe?"#fefce8":"transparent", borderBottom:`1px solid ${C.border}`, transition:"background 0.1s" }}>
                <span style={{ width:24, textAlign:"center", fontSize:12, fontWeight:700, color:idx<3?MEDAL_COL[idx]:C.text3 }}>{idx<3?["🥇","🥈","🥉"][idx]:`#${idx+1}`}</span>
                <Avatar initials={user.avatar_initials} color={user.role_color||C.accent} size={32}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{user.name}{isMe&&<span style={{ marginLeft:6, fontSize:10, color:C.accent, fontWeight:700 }}>YOU</span>}</div>
                  <div style={{ fontSize:11, color:C.text3 }}>{user.role}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:11, color:C.text3 }}>{user.badge_count} badges</span>
                  <PointsBadge pts={user.points}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* User detail panel */}
      {selected && (
        <div style={{ width:300, flexShrink:0, background:C.surface, borderRadius:16, border:`1px solid ${C.border}`, overflow:"hidden", display:"flex", flexDirection:"column", maxHeight:"calc(100vh - 160px)", overflowY:"auto" }}>
          <div style={{ padding:"20px 20px 16px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <Avatar initials={selected.avatar_initials} color={selected.role_color||C.accent} size={48}/>
              <div><div style={{ fontSize:15, fontWeight:700, color:C.text1 }}>{selected.name}</div><div style={{ fontSize:12, color:C.text3 }}>{selected.role}</div></div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <div style={{ flex:1, background:C.bg, borderRadius:10, padding:"10px 12px", textAlign:"center" }}><div style={{ fontSize:20, fontWeight:800, color:C.accent }}>{selected.points.toLocaleString()}</div><div style={{ fontSize:10, color:C.text3, marginTop:1 }}>Points</div></div>
              <div style={{ flex:1, background:C.bg, borderRadius:10, padding:"10px 12px", textAlign:"center" }}><div style={{ fontSize:20, fontWeight:800, color:C.accent }}>{selected.badge_count}</div><div style={{ fontSize:10, color:C.text3, marginTop:1 }}>Badges</div></div>
            </div>
          </div>
          <div style={{ padding:16, flex:1 }}>
            {userLoading ? <div style={{ textAlign:"center", padding:20, color:C.text3 }}>Loading…</div> : userBadges ? (
              <>
                <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Earned ({userBadges.badge_count})</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
                  {userBadges.badges.filter(b=>b.earned).map(b=><BadgeCard key={b.id} badge={b} earned progress={b.progress} compact/>)}
                </div>
                <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>In Progress</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {userBadges.badges.filter(b=>!b.earned&&b.progress.pct>0).slice(0,5).map(b=><BadgeCard key={b.id} badge={b} earned={false} progress={b.progress} compact/>)}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Catalogue (My Badges) ────────────────────────────────────────────────────
function Catalogue({ environment, currentUserId }) {
  const [myBadges, setMyBadges] = useState(null);
  const [cat, setCat]           = useState("All");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!currentUserId) { setLoading(false); return; }
    api.get(`/badges/user/${currentUserId}`).then(d=>{ setMyBadges(d); setLoading(false); }).catch(()=>setLoading(false));
  }, [currentUserId]);

  const categories = ["All",...new Set((myBadges?.badges||[]).map(b=>b.category))];
  const visible    = (myBadges?.badges||[]).filter(b=>cat==="All"||b.category===cat);
  const tiers      = ["platinum","gold","silver","bronze"];
  const earned     = (myBadges?.badges||[]).filter(b=>b.earned).length;
  const total      = (myBadges?.badges||[]).length;

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, color:C.text3, fontFamily:F }}>Loading badges…</div>;

  return (
    <div style={{ fontFamily:F }}>
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        {[{label:"Earned",val:earned,icon:"award",color:C.accent},{label:"Points",val:(myBadges?.total_points||0).toLocaleString(),icon:"star",color:"#d97706"},{label:"Remaining",val:total-earned,icon:"target",color:"#7c3aed"},{label:"Complete",val:`${Math.round(earned/Math.max(1,total)*100)}%`,icon:"check",color:"#059669"}].map(s=>(
          <div key={s.label} style={{ flex:1, background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:"14px 16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}><Ic n={s.icon} s={14} c={s.color}/><span style={{ fontSize:11, color:C.text3 }}>{s.label}</span></div>
            <div style={{ fontSize:22, fontWeight:800, color:C.text1 }}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {categories.map(c=>(
          <button key={c} onClick={()=>setCat(c)} style={{ padding:"6px 14px", borderRadius:99, border:`1.5px solid ${cat===c?C.accent:C.border}`, background:cat===c?C.accentLight:C.surface, color:cat===c?C.accent:C.text2, fontSize:12, fontWeight:cat===c?700:500, cursor:"pointer", fontFamily:F }}>{c}</button>
        ))}
      </div>
      {tiers.map(tier => {
        const badges = visible.filter(b=>b.tier===tier);
        if (badges.length===0) return null;
        const t = TIER[tier];
        return (
          <div key={tier} style={{ marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <div style={{ height:3, width:16, background:t.color, borderRadius:99 }}/>
              <span style={{ fontSize:12, fontWeight:700, color:t.color, textTransform:"uppercase", letterSpacing:"0.06em" }}>{t.label}</span>
              <span style={{ fontSize:11, color:C.text3 }}>· {badges.filter(b=>b.earned).length}/{badges.length} earned</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:10 }}>
              {badges.map(b=><BadgeCard key={b.id} badge={b} earned={b.earned} progress={b.progress}/>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Engagement Feed ──────────────────────────────────────────────────────────
function EngagementFeed({ environment, currentUserId }) {
  const [feed, setFeed]       = useState([]);
  const [leaderboard, setLdb] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const refreshRef             = useRef(null);

  const load = useCallback(async () => {
    try {
      const [f,l] = await Promise.all([
        api.get(`/badges/engagement?environment_id=${environment?.id||""}&limit=80`),
        api.get("/badges/leaderboard"),
      ]);
      setFeed(Array.isArray(f)?f:[]); setLdb(Array.isArray(l)?l.slice(0,8):[]);
    } catch {}
    setLoading(false);
  }, [environment?.id]);

  useEffect(() => { load(); refreshRef.current=setInterval(load,60_000); return ()=>clearInterval(refreshRef.current); }, [load]);

  const TYPE_META = { badge:{label:"Badge",color:"#7c3aed",icon:"award"}, record:{label:"Record",color:"#4361EE",icon:"database"}, interview:{label:"Interview",color:"#0891b2",icon:"calendar"}, offer:{label:"Offer",color:"#059669",icon:"dollar"} };
  const filtered = filter==="all"?feed:feed.filter(e=>e.type===filter);

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, color:C.text3, fontFamily:F }}>Loading activity…</div>;

  return (
    <div style={{ display:"flex", gap:20, fontFamily:F, alignItems:"flex-start" }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ background:C.surface, borderRadius:16, border:`1px solid ${C.border}`, marginBottom:16, overflow:"hidden" }}>
          <div style={{ padding:"16px 20px 14px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#10b981", boxShadow:"0 0 0 3px #d1fae5" }}/>
              <span style={{ fontSize:14, fontWeight:700, color:C.text1 }}>Live Activity</span>
            </div>
            <button onClick={load} style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"none", cursor:"pointer", color:C.text3, fontSize:12, fontFamily:F }}><Ic n="refresh" s={12}/> Refresh</button>
          </div>
          <div style={{ padding:"10px 16px", display:"flex", gap:6 }}>
            {["all","badge","record","interview","offer"].map(f => {
              const meta=TYPE_META[f]; const active=filter===f;
              return <button key={f} onClick={()=>setFilter(f)} style={{ padding:"5px 12px", borderRadius:99, border:`1.5px solid ${active?(meta?.color||C.accent):C.border}`, background:active?(meta?.color||C.accent)+"12":"transparent", color:active?(meta?.color||C.accent):C.text3, fontSize:11, fontWeight:active?700:500, cursor:"pointer", fontFamily:F, display:"flex", alignItems:"center", gap:4 }}>
                {meta&&<Ic n={meta.icon} s={10} c={active?meta.color:C.text3}/>}{f==="all"?"All":meta?.label}
              </button>;
            })}
          </div>
        </div>
        {filtered.length===0 ? (
          <div style={{ textAlign:"center", padding:48, color:C.text3, background:C.surface, borderRadius:16, border:`1px solid ${C.border}` }}>
            <Ic n="flame" s={36} c={C.border}/><div style={{ marginTop:10, fontSize:13 }}>No activity yet — get your team using Vercentic!</div>
          </div>
        ) : (
          <div style={{ background:C.surface, borderRadius:16, border:`1px solid ${C.border}`, overflow:"hidden" }}>
            {filtered.map((ev,i) => {
              const meta=TYPE_META[ev.type]||TYPE_META.record; const isBadge=ev.type==="badge";
              return (
                <div key={ev.id} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"13px 20px", borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none" }}>
                  <Avatar initials={ev.user_initials||"?"} color={C.accent} size={32}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                      <span style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{ev.user_name}</span>
                      <span style={{ fontSize:12, color:C.text2 }}>{ev.title}</span>
                      {isBadge&&ev.meta&&<span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:ev.meta.color+"18", color:ev.meta.color, border:`1px solid ${ev.meta.color}30` }}><Ic n={ev.meta.icon||"award"} s={9} c={ev.meta.color}/> +{ev.meta.points} pts</span>}
                    </div>
                    <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>{ev.subtitle&&<span style={{ marginRight:8 }}>{ev.subtitle}</span>}<span>{relTime(ev.timestamp)}</span></div>
                  </div>
                  <div style={{ width:28, height:28, borderRadius:8, background:meta.color+"15", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ic n={meta.icon} s={13} c={meta.color}/></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mini leaderboard sidebar */}
      <div style={{ width:260, flexShrink:0 }}>
        <div style={{ background:C.surface, borderRadius:16, border:`1px solid ${C.border}`, overflow:"hidden" }}>
          <div style={{ padding:"16px 16px 12px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}><Ic n="trophy" s={14} c="#d97706"/><span style={{ fontSize:13, fontWeight:700, color:C.text1 }}>Leaderboard</span></div>
          </div>
          {leaderboard.map((user,idx) => {
            const medals=["🥇","🥈","🥉"]; const isMe=user.id===currentUserId;
            return (
              <div key={user.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", borderBottom:idx<leaderboard.length-1?`1px solid ${C.border}`:"none", background:isMe?"#fefce8":"transparent" }}>
                <span style={{ width:20, fontSize:13, textAlign:"center" }}>{idx<3?medals[idx]:<span style={{ fontSize:11, color:C.text3 }}>#{idx+1}</span>}</span>
                <Avatar initials={user.avatar_initials} color={user.role_color||C.accent} size={28}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.name}{isMe&&<span style={{ marginLeft:4, fontSize:9, color:C.accent, fontWeight:700 }}>YOU</span>}</div>
                  <div style={{ fontSize:10, color:C.text3 }}>{user.points.toLocaleString()} pts</div>
                </div>
              </div>
            );
          })}
          {leaderboard.length===0&&<div style={{ padding:"24px 16px", textAlign:"center", color:C.text3, fontSize:12 }}>No activity yet</div>}
        </div>
        <div style={{ marginTop:12, background:`linear-gradient(135deg,${C.accent} 0%,#7c3aed 100%)`, borderRadius:16, padding:"20px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}><Ic n="sparkles" s={16} c="white"/><span style={{ fontSize:12, fontWeight:700, color:"white" }}>Keep Going!</span></div>
          <div style={{ fontSize:13, fontWeight:600, color:"white", lineHeight:1.5, marginBottom:8 }}>Complete actions to earn badges and climb the leaderboard.</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)" }}>{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'})}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function BadgesModule({ environment, session }) {
  const [view, setView]   = useState("engagement");
  const currentUserId     = session?.user?.id || null;
  const VIEWS = [
    { id:"engagement",  label:"Activity Feed", icon:"flame"  },
    { id:"leaderboard", label:"Leaderboard",   icon:"trophy" },
    { id:"catalogue",   label:"My Badges",     icon:"award"  },
  ];
  return (
    <div style={{ fontFamily:F, padding:"24px 32px", maxWidth:1400 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:C.text1 }}>Achievements</h1>
          <div style={{ fontSize:13, color:C.text3, marginTop:3 }}>Earn badges, climb the leaderboard, and track your team's activity</div>
        </div>
        <div style={{ display:"flex", gap:4, background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:4 }}>
          {VIEWS.map(v=>(
            <button key={v.id} onClick={()=>setView(v.id)} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:9, border:"none", cursor:"pointer", background:view===v.id?C.accent:"transparent", color:view===v.id?"white":C.text2, fontSize:13, fontWeight:view===v.id?700:500, fontFamily:F }}>
              <Ic n={v.icon} s={14} c={view===v.id?"white":C.text3}/>{v.label}
            </button>
          ))}
        </div>
      </div>
      {view==="engagement"  && <EngagementFeed  environment={environment} currentUserId={currentUserId}/>}
      {view==="leaderboard" && <Leaderboard     environment={environment} currentUserId={currentUserId}/>}
      {view==="catalogue"   && <Catalogue       environment={environment} currentUserId={currentUserId}/>}
    </div>
  );
}
