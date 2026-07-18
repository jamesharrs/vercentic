// client/src/LinkedInFinder.jsx
import { useState, useCallback, useEffect } from "react";
import { authHeaders } from "./apiClient.js";

const tFetch = (path, opts = {}) =>
  fetch(path.startsWith("http") ? path : `/api${path.startsWith("/") ? "" : "/"}${path}`,
    { credentials: 'include', ...opts, headers: { ...authHeaders(), ...(opts.headers || {}) } });

function LinkedInIcon({ color = "#0077b5", size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"
        stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="2" y="9" width="4" height="12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="4" cy="4" r="2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const ConfBadge = ({ confidence }) => {
  const map = {
    high:   { bg: "#d1fae5", color: "#065f46", label: "High confidence" },
    medium: { bg: "#fef3c7", color: "#92400e", label: "Medium confidence" },
    low:    { bg: "#fee2e2", color: "#991b1b", label: "Low confidence" },
  };
  const s = map[confidence] || map.low;
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20, background:s.bg, color:s.color }}>
      {s.label}
    </span>
  );
};

export default function LinkedInFinderButton({ record, fields, onFound }) {
  const [state, setState]     = useState("idle");
  const [result, setResult]   = useState(null);
  const [showModal, setShowModal] = useState(false);

  const d = record?.data || {};
  const hasLinkedIn = !!d.linkedin;
  const isPerson    = fields?.some(f => f.api_key === "first_name");

  const handleFind = useCallback(async () => {
    if (!record) return;
    setState("loading");
    try {
      const resp = await tFetch("/linkedin-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: d.first_name || "",
          last_name:  d.last_name  || "",
          email:      d.email      || "",
          company:    d.company    || d.entity || "",
          location:   d.location   || d.city   || "",
          job_title:  d.job_title  || d.current_title || "",
        }),
      });
      if (!resp.ok) throw new Error("Search failed");
      const data = await resp.json();
      setResult(data);
      setState(data.linkedin_url ? "found" : "not_found");
      setShowModal(true);
    } catch (err) {
      console.error("[LinkedInFinder]", err);
      setState("error");
      setShowModal(true);
    }
  }, [record, d]);

  const handleApply = useCallback(async () => {
    if (!result?.linkedin_url || !record?.id) return;
    await tFetch(`/records/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { ...d, linkedin: result.linkedin_url } }),
    });
    onFound?.(result.linkedin_url);
    setShowModal(false);
    setState("idle");
  }, [result, record, d, onFound]);

  if (!isPerson) return null;

  const btnStyle = {
    display:"flex", alignItems:"center", gap:6,
    padding:"7px 13px", borderRadius:8, border:"1.5px solid #0077b5",
    background: hasLinkedIn ? "#e8f4fd" : "white",
    color:"#0077b5", fontSize:12, fontWeight:600,
    cursor: state === "loading" ? "default" : "pointer",
    fontFamily:"inherit", whiteSpace:"nowrap",
    opacity: state === "loading" ? 0.8 : 1, transition:"all 0.15s",
  };

  return (
    <>
      <button style={btnStyle}
        onClick={hasLinkedIn ? () => window.open(d.linkedin, "_blank") : handleFind}
        disabled={state === "loading"}
      >
        <LinkedInIcon />
        {state === "loading" ? "Searching…" : hasLinkedIn ? "View LinkedIn" : "Find LinkedIn"}
      </button>

      {showModal && (
        <div onClick={() => setShowModal(false)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.4)",
          zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:"white", borderRadius:16, padding:28, maxWidth:420, width:"90%",
            boxShadow:"0 20px 60px rgba(0,0,0,0.25)",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ width:44, height:44, borderRadius:10, background:"#0077b5",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <LinkedInIcon color="white" size={22} />
              </div>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:"#111827" }}>LinkedIn Profile Finder</div>
                <div style={{ fontSize:12, color:"#6b7280" }}>
                  {[d.first_name, d.last_name].filter(Boolean).join(" ")}
                </div>
              </div>
              <button onClick={() => setShowModal(false)}
                style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:"#9ca3af", fontSize:18 }}>✕</button>
            </div>

            {state === "error" && (
              <div style={{ padding:16, background:"#fee2e2", borderRadius:10, color:"#991b1b", fontSize:13 }}>
                Search failed — please try again or add the URL manually.
              </div>
            )}

            {state === "not_found" && (
              <div style={{ padding:16, background:"#f9fafb", borderRadius:10, textAlign:"center" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
                <div style={{ fontSize:14, fontWeight:600, color:"#111827", marginBottom:4 }}>No profile found</div>
                <div style={{ fontSize:13, color:"#6b7280" }}>
                  {result?.reason || "Couldn't find a matching LinkedIn profile."}
                </div>
              </div>
            )}

            {state === "found" && result?.linkedin_url && (
              <>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:"#6b7280", textTransform:"uppercase",
                    letterSpacing:"0.05em", marginBottom:8 }}>Profile found</div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px",
                    background:"#f0f9ff", borderRadius:10, border:"1.5px solid #bae6fd" }}>
                    <LinkedInIcon color="#0077b5" size={18} />
                    <a href={result.linkedin_url} target="_blank" rel="noreferrer"
                      style={{ color:"#0077b5", fontSize:13, fontWeight:600, textDecoration:"none",
                        flex:1, wordBreak:"break-all" }}>
                      {result.linkedin_url}
                    </a>
                    <button onClick={() => navigator.clipboard.writeText(result.linkedin_url)}
                      style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", fontSize:11 }}>
                      Copy
                    </button>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
                  <ConfBadge confidence={result.confidence} />
                  {result.reason && <span style={{ fontSize:11, color:"#9ca3af" }}>{result.reason}</span>}
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={() => setShowModal(false)} style={{
                    flex:1, padding:"10px 0", borderRadius:8, border:"1px solid #e5e7eb",
                    background:"white", color:"#374151", fontSize:13, fontWeight:600, cursor:"pointer",
                  }}>Dismiss</button>
                  <button onClick={handleApply} style={{
                    flex:2, padding:"10px 0", borderRadius:8, border:"none",
                    background:"#0077b5", color:"white", fontSize:13, fontWeight:700, cursor:"pointer",
                  }}>Apply to Record</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function useLinkedInAutoSearch({ record, fields, onFound }) {
  const [autoSearched, setAutoSearched] = useState(false);

  const triggerAutoSearch = useCallback(async () => {
    if (autoSearched) return;
    const d = record?.data || {};
    if (d.linkedin) return;
    if (!fields?.some(f => f.api_key === "first_name")) return;
    const createdAt = record?.created_at ? new Date(record.created_at) : null;
    const ageSeconds = createdAt ? (Date.now() - createdAt.getTime()) / 1000 : 9999;
    if (ageSeconds > 60) return;
    setAutoSearched(true);
    try {
      const resp = await tFetch("/linkedin-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: d.first_name || "", last_name: d.last_name || "",
          email: d.email || "", company: d.company || d.entity || "",
          location: d.location || d.city || "", job_title: d.job_title || d.current_title || "",
        }),
      });
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.linkedin_url && data.confidence === "high") {
        await tFetch(`/records/${record.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { ...d, linkedin: data.linkedin_url } }),
        });
        onFound?.(data.linkedin_url, data.confidence);
      } else if (data.linkedin_url) {
        onFound?.(data.linkedin_url, data.confidence, true);
      }
    } catch (err) {
      console.warn("[LinkedInFinder] Auto-search failed:", err);
    }
  }, [record, fields, autoSearched, onFound]);

  return { triggerAutoSearch };
}
