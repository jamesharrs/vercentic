// client/src/RequestFeatureModal.jsx
// Lets any user submit a feature request directly, without going through the
// Copilot. Lands in the same Super Admin → Feature Requests queue as
// Copilot-logged requests, tagged source:"manual" so admins can tell the
// two apart. Identity is resolved server-side from the X-User-Id header
// apiClient.js already attaches — no session plumbing needed here.

import { useState } from "react";
import api from "./apiClient.js";

const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  text1: "#111827", text2: "#4B5563", text3: "#9CA3AF",
  border: "#E5E7EB", accent: "#4361EE", accentLight: "#EEF2FF",
  green: "#0CAF77", greenLight: "#F0FDF4",
};
const CATEGORIES = ["Feature", "Improvement", "Bug", "Other"];
const PATHS = {
  bulb:  "M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.5.5 1 1.3 1 2.5h6c0-1.2.5-2 1-2.5A6 6 0 0012 3z",
  x:     "M18 6L6 18M6 6l12 12",
  check: "M20 6L9 17l-5-5",
};
const Ic = ({ n, s = 16, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n]} />
  </svg>
);

export default function RequestFeatureModal({ environment, contextLabel, onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Feature");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await api.post("/feature-requests", {
        environment_id: environment?.id || null,
        source: "manual",
        request_text: title.trim(),
        description: description.trim(),
        category,
        context_label: contextLabel || null,
      });
      setDone(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,.45)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: 440, maxWidth: "90vw", padding: 22, fontFamily: F }}>

        {done ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.greenLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <Ic n="check" s={20} c={C.green} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text1, marginBottom: 4 }}>Thanks — got it</div>
            <div style={{ fontSize: 12.5, color: C.text3, marginBottom: 18 }}>Your request has been sent to the product team for review.</div>
            <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text2, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: F }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ic n="bulb" s={16} c={C.accent} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text1 }}>Request a feature</div>
              <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: C.text3 }}>
                <Ic n="x" s={16} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: C.text3, marginBottom: 16, paddingLeft: 42 }}>
              Tell us what you need — every request goes straight to the team building this platform.
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  style={{
                    flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: F,
                    border: `1.5px solid ${category === cat ? C.accent : C.border}`,
                    background: category === cat ? C.accentLight : "transparent",
                    color: category === cat ? C.accent : C.text2,
                  }}>
                  {cat}
                </button>
              ))}
            </div>

            <input
              autoFocus value={title} onChange={e => setTitle(e.target.value)}
              placeholder="What would you like to be able to do?"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, marginBottom: 10, fontFamily: F, boxSizing: "border-box" }}
            />
            <textarea
              value={description} onChange={e => setDescription(e.target.value)} rows={4}
              placeholder="Any extra detail — why it'd help, how you imagine it working (optional)"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, marginBottom: 6, fontFamily: F, resize: "vertical", boxSizing: "border-box" }}
            />
            {/* contextLabel is still sent to the server with the request — just not shown here */}

            <button
              onClick={submit} disabled={!title.trim() || saving}
              style={{
                width: "100%", padding: "10px", borderRadius: 8, border: "none", marginTop: 8,
                background: C.accent, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: F,
                opacity: (!title.trim() || saving) ? 0.55 : 1,
              }}>
              {saving ? "Sending…" : "Send request"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
