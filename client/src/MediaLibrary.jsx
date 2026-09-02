// client/src/MediaLibrary.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Asset / Media Library — curated stock photos + custom uploads, reusable
// across job headers, portals, and email templates.
//
// Exports:
//   default  MediaLibrarySettings  — full gallery page (Settings → Media Library)
//   named    MediaPickerModal      — reusable picker modal used by any feature
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import api, { tFetch } from "./apiClient.js";

const C = {
  bg: "var(--t-bg)", surface: "var(--t-surface)", border: "var(--t-border)",
  accent: "var(--t-accent)", accentLight: "var(--t-accent-light)",
  text1: "var(--t-text1)", text2: "var(--t-text2)", text3: "var(--t-text3)",
  danger: "#ef4444", success: "#16a34a", amber: "#f79009", purple: "#7c3aed",
};
const F = "inherit";

const PATHS = {
  image:"M21 3H3v18h18V3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21",
  upload:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  search:"M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z",
  x:"M18 6L6 18M6 6l12 12", check:"M20 6L9 17l-5-5",
  trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  sparkles:"M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM5 17l.7 2.1L8 20l-2.3.9L5 23l-.7-2.1L2 20l2.3-.9L5 17zM19 15l.9 2.6L22 18.5l-2.1.9L19 22l-.9-2.6L16 18.5l2.1-.9L19 15z",
  plus:"M12 5v14M5 12h14", filter:"M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  alertTriangle:"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
};
const Ic = ({ n, s = 14, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n] || PATHS.image} />
  </svg>
);

const Btn = ({ children, onClick, v = "primary", sz = "md", disabled, style = {} }) => {
  const sz2 = { sm: { padding: "5px 10px", fontSize: 11 }, md: { padding: "8px 16px", fontSize: 13 } };
  const vars = {
    primary: { background: C.accent, color: "#fff", border: "none" },
    secondary: { background: "var(--t-surface2, #f9fafb)", color: C.text2, border: `1px solid ${C.border}` },
    danger: { background: "#FEF2F2", color: C.danger, border: `1px solid ${C.danger}30` },
    ghost: { background: "transparent", color: C.text2, border: `1px solid ${C.border}` },
    ai: { background: `linear-gradient(135deg,#7c3aed,#4361EE)`, color: "#fff", border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "flex", alignItems: "center", gap: 6, borderRadius: 8, fontFamily: F, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "all .12s",
      ...sz2[sz], ...vars[v], ...style,
    }}>{children}</button>
  );
};

const inpSt = { width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: F, color: C.text1, outline: "none", boxSizing: "border-box", background: C.surface };

// ── Shared data hook — used by both the full gallery and the picker modal ────
function useMediaAssets(environment, initialCategory) {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory || "");
  const [typeFilter, setTypeFilter] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    if (!environment?.id) return;
    setLoading(true);
    const qs = new URLSearchParams({ environment_id: environment.id });
    if (search) qs.set("search", search);
    if (category) qs.set("category", category);
    if (typeFilter) qs.set("type", typeFilter);
    api.get(`/media-library?${qs.toString()}`)
      .then(d => { setAssets(Array.isArray(d?.assets) ? d.assets : []); setCategories(d?.categories || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [environment?.id, search, category, typeFilter]);

  useEffect(() => { load(); }, [load]);

  // Suggests name/category/tags for an existing asset by analysing the image
  // itself with Claude Vision. Returns the suggestion — caller decides whether
  // to apply it (manual button) or persist it directly (auto-tag on upload).
  const aiTag = useCallback(async (assetId) => {
    const res = await api.post(`/media-library/${assetId}/ai-tag`, {});
    if (res?.error) throw new Error(res.error);
    return res; // { name, category, tags }
  }, []);

  const upload = useCallback(async (files) => {
    if (!environment?.id || !files?.length) return;
    setUploading(true);
    const failures = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("environment_id", environment.id);
      fd.append("name", file.name.replace(/\.[^.]+$/, ""));
      try {
        const res = await tFetch("/api/media-library/upload", { method: "POST", body: fd });
        if (res?.error) {
          failures.push(`${file.name}: ${res.error}`);
          continue;
        }
        const asset = res;
        // Auto-tag in the background — doesn't block the upload loop; refreshes
        // the grid once the suggestion lands so the name/tags appear live.
        aiTag(asset.id).then(sugg => api.patch(`/media-library/${asset.id}`, sugg)).then(load).catch(() => {});
      } catch (e) {
        failures.push(`${file.name}: ${e.message || "Upload failed"}`);
      }
    }
    setUploading(false);
    load();
    if (failures.length) window.__toast?.alert?.(failures.join("\n"));
  }, [environment?.id, load, aiTag]);

  const remove = useCallback(async (id) => {
    await api.del(`/media-library/${id}`);
    load();
  }, [load]);

  const editAsset = useCallback(async (id, patch) => {
    await api.patch(`/media-library/${id}`, patch);
    load();
  }, [load]);

  return { assets, categories, loading, uploading, search, setSearch, category, setCategory, typeFilter, setTypeFilter, upload, remove, editAsset, aiTag, reload: load };
}

// ── Asset tile ─────────────────────────────────────────────────────────────
const AssetCard = ({ asset, selected, onClick, onEdit, onDelete, pickerMode }) => {
  const [broken, setBroken] = useState(false);
  return (
    <div onClick={onClick} style={{
      position: "relative", borderRadius: 12, overflow: "hidden", cursor: "pointer",
      border: `2px solid ${selected ? C.accent : C.border}`, background: C.surface,
      transition: "all .12s", aspectRatio: "4/3",
    }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = `${C.accent}80`; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = C.border; }}>
      {broken ? (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, background: "#FEF2F2", color: C.danger }}>
          <Ic n="alertTriangle" s={18} c={C.danger} />
          <span style={{ fontSize: 10, fontWeight: 600 }}>Image unavailable</span>
        </div>
      ) : (
        <img src={asset.url} alt={asset.name} onError={() => setBroken(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      )}
      {selected && (
        <div style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ic n="check" s={13} c="#fff" />
        </div>
      )}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "18px 8px 6px", background: "linear-gradient(transparent,rgba(0,0,0,0.72))" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.name}</div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{asset.type === "stock" ? "Stock" : "Custom"}</div>
      </div>
      {!pickerMode && (onEdit || onDelete) && (
        <div style={{ position: "absolute", top: 6, left: 6, display: "flex", gap: 4 }}>
          {onEdit && <button onClick={e => { e.stopPropagation(); onEdit(asset); }} style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "rgba(255,255,255,0.9)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="edit" s={12} c={C.text2} /></button>}
          {onDelete && <button onClick={e => { e.stopPropagation(); onDelete(asset); }} style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "rgba(255,255,255,0.9)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="trash" s={12} c={C.danger} /></button>}
        </div>
      )}
    </div>
  );
};

// ── Upload dropzone ────────────────────────────────────────────────────────
const UploadDropzone = ({ onFiles, uploading }) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); onFiles([...e.dataTransfer.files]); }}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragOver ? C.accent : C.border}`, borderRadius: 12, padding: "20px 16px",
        textAlign: "center", cursor: "pointer", background: dragOver ? C.accentLight : "transparent", transition: "all .15s",
      }}>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={e => { onFiles([...e.target.files]); e.target.value = ""; }} />
      <Ic n="upload" s={20} c={dragOver ? C.accent : C.text3} />
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, marginTop: 6 }}>
        {uploading ? "Uploading…" : "Drop images here or click to upload"}
      </div>
      <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>JPG, PNG, GIF, WEBP · up to 25MB each</div>
    </div>
  );
};

// ── Edit metadata modal ────────────────────────────────────────────────────
const EditAssetModal = ({ asset, categories, onSave, onClose, onAiTag }) => {
  const [name, setName] = useState(asset.name);
  const [category, setCategory] = useState(asset.category);
  const [tags, setTags] = useState((asset.tags || []).join(", "));
  const [tagging, setTagging] = useState(false);
  const handleAiTag = async () => {
    setTagging(true);
    try {
      const sugg = await onAiTag(asset.id);
      setName(sugg.name || name);
      setCategory(sugg.category || category);
      setTags((sugg.tags || []).join(", "));
    } catch (e) { window.__toast?.alert?.(e.message || "Could not analyse image"); }
    setTagging(false);
  };
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: C.surface, borderRadius: 16, width: "100%", maxWidth: 420, padding: 22, fontFamily: F }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text1 }}>Edit Image</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><Ic n="x" s={16} c={C.text3} /></button>
        </div>
        <img src={asset.url} alt="" style={{ width: "100%", height: 130, objectFit: "cover", borderRadius: 10, marginBottom: 12 }} />
        {onAiTag && (
          <Btn v="ai" onClick={handleAiTag} disabled={tagging} style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}>
            <Ic n="sparkles" s={13} c="#fff" />{tagging ? "Analysing…" : "Auto-tag with AI"}
          </Btn>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: C.text3, display: "block", marginBottom: 4 }}>Name</label><input value={name} onChange={e => setName(e.target.value)} style={inpSt} /></div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, display: "block", marginBottom: 4 }}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inpSt}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: C.text3, display: "block", marginBottom: 4 }}>Tags (comma separated)</label><input value={tags} onChange={e => setTags(e.target.value)} placeholder="team, office, culture" style={inpSt} /></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <Btn v="ghost" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Cancel</Btn>
          <Btn onClick={() => onSave({ name, category, tags: tags.split(",").map(t => t.trim()).filter(Boolean) })} style={{ flex: 2, justifyContent: "center" }}>Save Changes</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Shared filter bar ──────────────────────────────────────────────────────
const FilterBar = ({ search, setSearch, category, setCategory, typeFilter, setTypeFilter, categories }) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
    <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search images…"
        style={{ ...inpSt, paddingLeft: 30 }} />
      <div style={{ position: "absolute", left: 10, top: 9, pointerEvents: "none" }}><Ic n="search" s={13} c={C.text3} /></div>
    </div>
    <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inpSt, width: "auto", minWidth: 150 }}>
      <option value="">All categories</option>
      {categories.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
    <div style={{ display: "flex", borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      {[["", "All"], ["stock", "Stock"], ["custom", "Custom"]].map(([v, l]) => (
        <button key={v} onClick={() => setTypeFilter(v)} style={{
          padding: "7px 12px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: F,
          background: typeFilter === v ? C.accent : "transparent", color: typeFilter === v ? "#fff" : C.text2,
        }}>{l}</button>
      ))}
    </div>
  </div>
);

// ── Reusable picker modal ──────────────────────────────────────────────────
// aiContext (optional): { title, department, description } — shows an
// "✨ Suggest best image" button that calls the AI-select endpoint.
export function MediaPickerModal({ environment, category: initialCategory, onSelect, onClose, title = "Choose an image", aiContext }) {
  const m = useMediaAssets(environment, initialCategory);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  const handleSuggest = async () => {
    setSuggesting(true); setSuggestion(null);
    try {
      const res = await api.post("/media-library/ai-select", {
        environment_id: environment.id,
        title: aiContext?.title || "", department: aiContext?.department || "", description: aiContext?.description || "",
      });
      if (res?.asset) setSuggestion(res);
    } catch { window.__toast?.alert?.("Could not get a suggestion right now"); }
    setSuggesting(false);
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: C.surface, borderRadius: 16, width: "100%", maxWidth: 780, maxHeight: "86vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: F, boxShadow: "0 24px 64px rgba(0,0,0,.25)" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text1, display: "flex", alignItems: "center", gap: 8 }}><Ic n="image" s={16} c={C.accent} />{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><Ic n="x" s={17} c={C.text3} /></button>
        </div>

        {aiContext && (
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, background: "linear-gradient(135deg,#F5F3FF,#EEF2FF)" }}>
            {!suggestion ? (
              <Btn v="ai" onClick={handleSuggest} disabled={suggesting} style={{ width: "100%", justifyContent: "center" }}>
                <Ic n="sparkles" s={14} c="#fff" />{suggesting ? "Thinking…" : `Suggest best image for "${aiContext.title || "this role"}"`}
              </Btn>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img src={suggestion.asset.url} alt="" style={{ width: 56, height: 42, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text1 }}>{suggestion.asset.name}</div>
                  <div style={{ fontSize: 11, color: C.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{suggestion.reason}</div>
                </div>
                <Btn sz="sm" onClick={() => { onSelect(suggestion.asset); onClose(); }}>Use This</Btn>
                <Btn sz="sm" v="ghost" onClick={() => setSuggestion(null)}>Retry</Btn>
              </div>
            )}
          </div>
        )}

        <div style={{ padding: "14px 20px 0" }}>
          <FilterBar {...m} categories={m.categories} />
        </div>
        <div style={{ padding: "14px 20px" }}>
          <UploadDropzone onFiles={m.upload} uploading={m.uploading} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
          {m.loading ? (
            <div style={{ textAlign: "center", padding: 40, color: C.text3, fontSize: 13 }}>Loading…</div>
          ) : m.assets.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: C.text3, fontSize: 13 }}>No images match your filters.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10 }}>
              {m.assets.map(a => (
                <AssetCard key={a.id} asset={a} pickerMode onClick={() => { onSelect(a); onClose(); }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Full Settings page ─────────────────────────────────────────────────────
export default function MediaLibrarySettings({ environment }) {
  const m = useMediaAssets(environment);
  const [editing, setEditing] = useState(null);

  const handleDelete = async (asset) => {
    if (!(await window.__confirm?.({ title: `Delete "${asset.name}"?`, danger: true }))) return;
    m.remove(asset.id);
  };

  const stockCount = m.assets.filter(a => a.type === "stock").length;
  const customCount = m.assets.filter(a => a.type === "custom").length;

  return (
    <div style={{ fontFamily: F }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text1 }}>Media Library</div>
          <div style={{ fontSize: 13, color: C.text3, marginTop: 2 }}>
            Images for job headers, portals and email templates — {stockCount} stock, {customCount} custom
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <UploadDropzone onFiles={m.upload} uploading={m.uploading} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <FilterBar {...m} categories={m.categories} />
      </div>

      {m.loading ? (
        <div style={{ textAlign: "center", padding: 60, color: C.text3 }}>Loading…</div>
      ) : m.assets.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: C.text3, border: `2px dashed ${C.border}`, borderRadius: 12 }}>
          No images match your filters.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
          {m.assets.map(a => (
            <AssetCard key={a.id} asset={a} onEdit={setEditing} onDelete={handleDelete} onClick={() => setEditing(a)} />
          ))}
        </div>
      )}

      {editing && (
        <EditAssetModal
          asset={editing}
          categories={m.categories}
          onClose={() => setEditing(null)}
          onSave={async (patch) => { await m.editAsset(editing.id, patch); setEditing(null); }}
          onAiTag={m.aiTag}
        />
      )}
    </div>
  );
}
