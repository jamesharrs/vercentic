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

export default function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true); setError("");
    try {
      // Include ?tenant= from URL so server searches the right store
      const tenantParam = new URLSearchParams(window.location.search).get('tenant');
      const loginUrl = tenantParam ? `/api/users/login?tenant=${encodeURIComponent(tenantParam)}` : "/api/users/login";
      const data = await api.post(loginUrl, { email, password });
      const { role, permissions, tenant_slug, ...user } = data;
      // Store tenant_slug in session so every API call can send the right header
      setSession({ user, role, permissions, tenant_slug });
      // Pre-warm permission cache from server
      loadMyPermissions().catch(() => {});
      onLogin({ user, role, permissions, tenant_slug });
    } catch (e) {
      setError(e.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f0f4ff 0%,#fafbff 60%,#f5f0ff 100%)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'DM Sans',-apple-system,sans-serif" }}>

      <div style={{ width:"100%", maxWidth:420, padding:"0 20px" }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:40, justifyContent:"center" }}>
          <div style={{ width:44, height:44, borderRadius:12,
            background:"linear-gradient(135deg,#4f46e5,#7c3aed)",
            display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 14px #4f46e540" }}>
            <span style={{ color:"white", fontSize:20, fontWeight:900 }}>T</span>
          </div>
          <div>
            <div style={{ fontSize:22, fontWeight:800, color:"#1a1a2e", lineHeight:1 }}>TalentOS</div>
            <div style={{ fontSize:11, color:"#6b7280", letterSpacing:"0.08em", textTransform:"uppercase" }}>Platform</div>
          </div>
        </div>

        {/* Card */}
        <div style={{ background:"white", borderRadius:20, padding:"36px 32px", boxShadow:"0 4px 40px #1a1a2e12, 0 1px 3px #1a1a2e08" }}>
          <h2 style={{ margin:"0 0 6px", fontSize:20, fontWeight:800, color:"#1a1a2e" }}>Sign in</h2>
          <p style={{ margin:"0 0 28px", fontSize:13, color:"#6b7280" }}>Enter your credentials to continue</p>

          {error && (
            <div style={{ background:"#fff5f5", border:"1px solid #fecaca", borderRadius:10, padding:"10px 14px",
              fontSize:13, color:"#dc2626", marginBottom:20 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={handleKey}
              type="email" placeholder="you@company.com" autoFocus
              style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:"1.5px solid #e5e7eb",
                fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box",
                color:"#1a1a2e", background:"#fafafa", transition:"border .15s" }}
              onFocus={e=>e.target.style.borderColor="#4f46e5"}
              onBlur={e=>e.target.style.borderColor="#e5e7eb"}
            />
          </div>

          <div style={{ marginBottom:28 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Password</label>
            <input value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={handleKey}
              type="password" placeholder="••••••••"
              style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:"1.5px solid #e5e7eb",
                fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box",
                color:"#1a1a2e", background:"#fafafa", transition:"border .15s" }}
              onFocus={e=>e.target.style.borderColor="#4f46e5"}
              onBlur={e=>e.target.style.borderColor="#e5e7eb"}
            />
          </div>

          <button onClick={handleSubmit} disabled={loading || !email || !password}
            style={{ width:"100%", padding:"13px", borderRadius:11, border:"none",
              background: (loading||!email||!password) ? "#e5e7eb" : "linear-gradient(135deg,#4f46e5,#7c3aed)",
              color: (loading||!email||!password) ? "#9ca3af" : "white",
              fontSize:14, fontWeight:700, fontFamily:"inherit", cursor:(loading||!email||!password)?"not-allowed":"pointer",
              transition:"all .15s", boxShadow:(loading||!email||!password)?"none":"0 4px 14px #4f46e540" }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>

        <p style={{ textAlign:"center", fontSize:12, color:"#9ca3af", marginTop:20 }}>
          TalentOS · Secure Platform
        </p>
      </div>
    </div>
  );
}
