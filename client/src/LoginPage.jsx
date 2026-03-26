import { useState } from "react";
import { loadMyPermissions } from "./api.js";
import { setSession } from "./usePermissions.js";

const api = {
  post: async (url, body) => {
    const r = await fetch(url, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Request failed");
    return data;
  }
};

// Vercentic SVG icon — white version for dark backgrounds
const VIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <path d="M8 52 L40 36 L72 52 L40 68 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M8 52 L8 62 L40 78 L40 68 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M72 52 L72 62 L40 78 L40 68 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.3"/>
    <path d="M20 34 L40 24 L60 34 L40 44 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M20 34 L20 42 L40 52 L40 44 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M60 34 L60 42 L40 52 L40 44 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.3"/>
    <path d="M28 18 L40 12 L52 18 L40 24 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M28 18 L28 24 L40 30 L40 24 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M52 18 L52 24 L40 30 L40 24 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.3"/>
  </svg>
);

export default function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true); setError("");
    try {
      // Detect tenant from subdomain (e.g. client.vercentic.com → 'client')
      // or fall back to ?tenant= query param
      const { getTenantSlug } = await import('./apiClient.js');
      const tenantSlug = getTenantSlug();
      const loginUrl = "/api/users/login";
      const data = await api.post(loginUrl, { email, password });
      const { role, permissions, tenant_slug, ...user } = data;
      // Use the slug we detected (subdomain takes priority over what server returns
      // since the server login searches all stores and returns where the user was found)
      const resolvedTenant = (tenant_slug && tenant_slug !== 'master') ? tenant_slug 
                           : (tenantSlug && tenantSlug !== 'master') ? tenantSlug 
                           : null;
      setSession({ user, role, permissions, tenant_slug: resolvedTenant });
      loadMyPermissions().catch(() => {});
      // Strip ?tenant= from URL after login so it doesn't persist
      if (window.location.search) {
        window.history.replaceState({}, '', window.location.pathname);
      }
      onLogin({ user, role, permissions, tenant_slug: resolvedTenant });
    } catch (e) {
      setError(e.message === "Failed to fetch" ? "Cannot reach the server. Please check your connection." : e.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  const F     = "'Geist', -apple-system, sans-serif";
  const FW    = "'Space Grotesk', sans-serif";
  const ready = !loading && email && password;

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .login-left-panel { display: none !important; }
          .login-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    <div className="login-grid" style={{ minHeight:"100vh", display:"grid", gridTemplateColumns:"1fr 1fr", fontFamily: F }}>

      {/* Left — indigo/navy branded panel — hidden on narrow viewports via media query */}
      <div style={{
        position:"relative", overflow:"hidden",
        background:"linear-gradient(135deg,#1a1a2e 0%,#3b5bdb 100%)",
        display:"flex", flexDirection:"column", justifyContent:"space-between", padding:48,
      }} className="login-left-panel">
        {/* Subtle radial glow */}
        <div style={{ position:"absolute", inset:0,
          background:"radial-gradient(ellipse at 20% 30%,rgba(99,102,241,0.35) 0%,transparent 55%),radial-gradient(ellipse at 80% 70%,rgba(67,97,238,0.25) 0%,transparent 50%)" }}/>
        {/* Grid overlay */}
        <div style={{ position:"absolute", inset:0,
          backgroundImage:"linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)",
          backgroundSize:"60px 60px" }}/>

        {/* Content */}
        <div style={{ position:"relative", zIndex:1 }}>
          {/* Logo lockup */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:72 }}>
            <VIcon size={26}/>
            <span style={{ fontFamily:FW, fontSize:20, fontWeight:700, letterSpacing:"-0.5px", color:"white" }}>Vercentic</span>
          </div>
          <h1 style={{ fontFamily:FW, fontSize:"clamp(28px,3.5vw,48px)", fontWeight:700, letterSpacing:"-1.5px", lineHeight:1.05, color:"white", marginBottom:18 }}>
            The modern<br/>people platform.
          </h1>
          <p style={{ fontSize:14, color:"rgba(255,255,255,0.6)", lineHeight:1.75, maxWidth:320, margin:"0 0 36px" }}>
            Intelligence built in. Not bolted on. Configure, manage, report and deliver — in one continuous loop.
          </p>
          {[
            "100% AI-powered, infinitely configurable",
            "Built for enterprise TA and RPO teams",
            "One organic platform — not a stack of tools",
          ].map(f => (
            <div key={f} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, fontSize:13, fontWeight:500, color:"rgba(255,255,255,0.72)" }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:"rgba(255,255,255,0.45)", flexShrink:0 }}/>
              {f}
            </div>
          ))}
        </div>
        <div style={{ position:"relative", zIndex:1, fontSize:12, color:"rgba(255,255,255,0.28)" }}>
          Vercentic · The modern people platform · 2026
        </div>
      </div>

      {/* Right — login form */}
      <div style={{ background:"white", display:"flex", alignItems:"center", justifyContent:"center", padding:48, borderLeft:"1px solid #E5E7EB" }}>
        <div style={{ width:"100%", maxWidth:360 }}>
          <h2 style={{ margin:"0 0 5px", fontSize:22, fontWeight:700, color:"#0F1729", fontFamily:FW, letterSpacing:"-0.5px" }}>Welcome back</h2>
          <p style={{ margin:"0 0 32px", fontSize:13, color:"#6B7280" }}>Sign in to your Vercentic workspace</p>

          {error && (
            <div style={{ background:"#fff5f5", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#dc2626", marginBottom:18, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
              <span>{error}</span>
              {error.includes("reach") && <span style={{ fontSize:11, color:"#9CA3AF", whiteSpace:"nowrap" }}>Check server</span>}
            </div>
          )}

          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:5 }}>Email address</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={handleKey}
              type="email" placeholder="you@organisation.com" autoFocus
              style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1.5px solid #E5E7EB",
                fontSize:13, fontFamily:F, outline:"none", boxSizing:"border-box", color:"#0F1729",
                background:"#FAFAFA", transition:"border .15s" }}
              onFocus={e=>e.target.style.borderColor="#4361EE"}
              onBlur={e=>e.target.style.borderColor="#E5E7EB"}
            />
          </div>

          <div style={{ marginBottom:24 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:5 }}>Password</label>
            <input value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={handleKey}
              type="password" placeholder="••••••••"
              style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1.5px solid #E5E7EB",
                fontSize:13, fontFamily:F, outline:"none", boxSizing:"border-box", color:"#0F1729",
                background:"#FAFAFA", transition:"border .15s" }}
              onFocus={e=>e.target.style.borderColor="#4361EE"}
              onBlur={e=>e.target.style.borderColor="#E5E7EB"}
            />
          </div>

          <button onClick={handleSubmit} disabled={!ready}
            style={{ width:"100%", padding:"11px", borderRadius:8, border:"none",
              background: ready ? "#4361EE" : "#E5E7EB",
              color: ready ? "white" : "#9CA3AF",
              fontSize:14, fontWeight:600, fontFamily:F, cursor:ready?"pointer":"not-allowed",
              transition:"all .15s", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {loading ? "Signing in…" : (
              <>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1L12 6.5L6.5 12M1 6.5H12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Sign in
              </>
            )}
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:10, margin:"18px 0" }}>
            <div style={{ flex:1, height:1, background:"#E5E7EB" }}/>
            <span style={{ fontSize:11, color:"#9CA3AF", fontWeight:500 }}>OR</span>
            <div style={{ flex:1, height:1, background:"#E5E7EB" }}/>
          </div>

          <button style={{ width:"100%", padding:"10px", borderRadius:8, border:"1.5px solid #E5E7EB",
            background:"white", color:"#374151", fontSize:13, fontFamily:F, fontWeight:500,
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12h6M12 9v6"/></svg>
            Continue with SSO
          </button>

          <p style={{ textAlign:"center", fontSize:12, color:"#9CA3AF", marginTop:24, lineHeight:1.7 }}>
            <span style={{ color:"#4361EE", cursor:"pointer" }}>Forgot password?</span>
            {" · "}
            <span style={{ color:"#4361EE", cursor:"pointer" }}>Contact your admin</span>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
