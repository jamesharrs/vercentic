/**
 * RichTextEditor.jsx
 * Lightweight WYSIWYG editor — no external dependencies.
 * Uses contentEditable + execCommand for formatting.
 * Stores and emits HTML strings.
 */

import { useRef, useEffect, useCallback, useState } from "react";

/* ─── Toolbar button definitions ─────────────────────────────────────────── */
const FORMATS = [
  { cmd:"bold",            icon:"B",         title:"Bold (⌘B)",      style:{fontWeight:800} },
  { cmd:"italic",          icon:"I",         title:"Italic (⌘I)",    style:{fontStyle:"italic"} },
  { cmd:"underline",       icon:"U",         title:"Underline (⌘U)", style:{textDecoration:"underline"} },
  { cmd:"strikeThrough",   icon:"S̶",         title:"Strikethrough" },
  null, // divider
  { cmd:"insertUnorderedList", icon:"•≡",    title:"Bullet list" },
  { cmd:"insertOrderedList",   icon:"1≡",    title:"Numbered list" },
  null, // divider
  { cmd:"justifyLeft",     icon:"⬛⬛⬛\n■□□\n■□□", title:"Align left",   svgPath:"M3 6h18M3 12h12M3 18h15" },
  { cmd:"justifyCenter",   icon:"center",   title:"Align centre",   svgPath:"M3 6h18M6 12h12M4.5 18h15" },
  null,
  { cmd:"_link",           icon:"link",     title:"Insert / edit link", svgPath:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" },
  { cmd:"_unlink",         icon:"unlink",   title:"Remove link",        svgPath:"M18.84 12.25l1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.004 5.004 0 0 0-7.07.12l-1.71 1.72M5.17 11.75l-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.004 5.004 0 0 0 7.07-.12l1.71-1.71M8 8l8 8" },
  null,
  { cmd:"_h1",             icon:"H1",       title:"Heading 1" },
  { cmd:"_h2",             icon:"H2",       title:"Heading 2" },
  { cmd:"removeFormat",    icon:"Tx",       title:"Clear formatting" },
];

/* ─── Tiny SVG icon ───────────────────────────────────────────────────────── */
const SvgIcon = ({ path, size=14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={path}/>
  </svg>
);

/* ─── Toolbar button ──────────────────────────────────────────────────────── */
const Btn = ({ fmt, active, onAction }) => {
  const isActive = active;
  return (
    <button
      title={fmt.title}
      onMouseDown={e => { e.preventDefault(); onAction(fmt.cmd); }}
      style={{
        display:"inline-flex", alignItems:"center", justifyContent:"center",
        width:28, height:28, borderRadius:5, border:"none", cursor:"pointer",
        fontFamily:"ui-serif,serif",
        fontSize: fmt.svgPath ? 11 : (fmt.cmd.startsWith("_h") ? 11 : 12),
        fontWeight: fmt.cmd==="bold" ? 800 : 600,
        background: isActive ? "#e0e7ff" : "transparent",
        color: isActive ? "#3b5bdb" : "#374151",
        transition:"background .1s",
        padding: 0,
        lineHeight:1,
        flexShrink:0,
      }}
      onMouseEnter={e=>{ if(!isActive) e.currentTarget.style.background="#f3f4f6"; }}
      onMouseLeave={e=>{ if(!isActive) e.currentTarget.style.background="transparent"; }}
    >
      {fmt.svgPath ? <SvgIcon path={fmt.svgPath}/> : fmt.icon}
    </button>
  );
};

/* ─── Link modal ──────────────────────────────────────────────────────────── */
const LinkModal = ({ position, onConfirm, onClose, initialUrl="" }) => {
  const [url, setUrl] = useState(initialUrl);
  const inputRef = useRef(null);
  useEffect(()=>{ setTimeout(()=>inputRef.current?.focus(), 50); }, []);
  return (
    <div style={{ position:"fixed", top:position.y, left:position.x, zIndex:9999,
      background:"white", border:"1px solid #e5e7eb", borderRadius:10,
      boxShadow:"0 8px 24px rgba(0,0,0,0.12)", padding:"12px 14px", width:280,
      fontFamily:"'DM Sans',-apple-system,sans-serif" }}>
      <div style={{ fontSize:12, fontWeight:700, color:"#374151", marginBottom:6 }}>Insert link</div>
      <input ref={inputRef} value={url} onChange={e=>setUrl(e.target.value)}
        onKeyDown={e=>{ if(e.key==="Enter"){e.preventDefault();onConfirm(url);} if(e.key==="Escape") onClose(); }}
        placeholder="https://example.com"
        style={{ width:"100%", boxSizing:"border-box", padding:"7px 10px", borderRadius:7,
          border:"1.5px solid #d1d5db", fontSize:13, fontFamily:"inherit",
          outline:"none", marginBottom:8 }}/>
      <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
        <button onClick={onClose}
          style={{ padding:"5px 12px", borderRadius:7, border:"1px solid #e5e7eb",
            background:"transparent", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          Cancel
        </button>
        <button onClick={()=>onConfirm(url)}
          style={{ padding:"5px 12px", borderRadius:7, border:"none",
            background:"#3b5bdb", color:"white", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          Insert
        </button>
      </div>
    </div>
  );
};


/* ─── Main editor component ──────────────────────────────────────────────── */
export default function RichTextEditor({ value, onChange, placeholder, autoFocus, minHeight=120 }) {
  const editorRef  = useRef(null);
  const savedSel   = useRef(null);
  const [activeFormats, setActiveFormats] = useState({});
  const [linkModal, setLinkModal] = useState(null); // { x, y, initialUrl }

  /* Sync external value on mount only */
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || "")) {
      editorRef.current.innerHTML = value || "";
    }
  }, []); // eslint-disable-line

  /* Auto-focus */
  useEffect(() => {
    if (autoFocus) setTimeout(()=>editorRef.current?.focus(), 50);
  }, [autoFocus]);

  /* Track active formats for toolbar state */
  const updateActiveFormats = useCallback(() => {
    const f = {};
    ["bold","italic","underline","strikeThrough",
     "insertUnorderedList","insertOrderedList",
     "justifyLeft","justifyCenter"].forEach(cmd => {
      try { f[cmd] = document.queryCommandState(cmd); } catch {}
    });
    setActiveFormats(f);
  }, []);

  /* Save selection before toolbar button click (mousedown) */
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedSel.current = sel.getRangeAt(0).cloneRange();
  }, []);

  /* Restore selection after toolbar button click */
  const restoreSelection = useCallback(() => {
    if (!savedSel.current) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedSel.current);
  }, []);

  /* Execute a format command */
  const execCmd = useCallback((cmd) => {
    editorRef.current?.focus();

    if (cmd === "_link") {
      // Get existing link href if cursor is inside one
      const sel = window.getSelection();
      const anchor = sel?.anchorNode?.parentElement?.closest("a");
      const rect = editorRef.current?.getBoundingClientRect() || { x:200, y:200 };
      saveSelection();
      setLinkModal({ x: rect.left + 8, y: rect.bottom + 8, initialUrl: anchor?.href || "" });
      return;
    }

    if (cmd === "_unlink") {
      restoreSelection();
      document.execCommand("unlink", false, null);
      onChange(editorRef.current?.innerHTML || "");
      return;
    }

    if (cmd === "_h1" || cmd === "_h2") {
      const tag = cmd === "_h1" ? "H1" : "H2";
      restoreSelection();
      const sel = window.getSelection();
      if (sel?.anchorNode) {
        const block = sel.anchorNode.nodeType === 1
          ? sel.anchorNode
          : sel.anchorNode.parentElement;
        if (block?.tagName === tag) {
          document.execCommand("formatBlock", false, "P");
        } else {
          document.execCommand("formatBlock", false, tag);
        }
      }
      onChange(editorRef.current?.innerHTML || "");
      return;
    }

    restoreSelection();
    document.execCommand(cmd, false, null);
    onChange(editorRef.current?.innerHTML || "");
    updateActiveFormats();
  }, [onChange, saveSelection, restoreSelection, updateActiveFormats]);

  /* Confirm link insert */
  const handleLinkConfirm = useCallback((url) => {
    setLinkModal(null);
    restoreSelection();
    editorRef.current?.focus();
    if (url) {
      const href = url.startsWith("http") ? url : `https://${url}`;
      document.execCommand("createLink", false, href);
      // Make link open in new tab
      const sel = window.getSelection();
      if (sel?.anchorNode) {
        const a = sel.anchorNode.parentElement?.closest("a");
        if (a) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
      }
    }
    onChange(editorRef.current?.innerHTML || "");
  }, [onChange, restoreSelection]);

  const handleInput = useCallback(() => {
    onChange(editorRef.current?.innerHTML || "");
    updateActiveFormats();
  }, [onChange, updateActiveFormats]);

  const handleKeyDown = useCallback((e) => {
    // Keyboard shortcuts
    if (e.metaKey || e.ctrlKey) {
      if (e.key==="b") { e.preventDefault(); execCmd("bold"); }
      if (e.key==="i") { e.preventDefault(); execCmd("italic"); }
      if (e.key==="u") { e.preventDefault(); execCmd("underline"); }
      if (e.key==="k") { e.preventDefault(); execCmd("_link"); }
    }
    updateActiveFormats();
  }, [execCmd, updateActiveFormats]);

  /* Paste as plain text to avoid bringing in external formatting */
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    onChange(editorRef.current?.innerHTML || "");
  }, [onChange]);

  const isEmpty = !value || value === "" || value === "<br>";

  return (
    <div style={{ position:"relative", fontFamily:"'DM Sans',-apple-system,sans-serif" }}>
      {/* Toolbar */}
      <div style={{ display:"flex", alignItems:"center", gap:2, flexWrap:"wrap",
        padding:"6px 8px", borderRadius:"10px 10px 0 0",
        border:"1.5px solid #d1d5db", borderBottom:"1px solid #e5e7eb",
        background:"#f9fafb" }}>
        {FORMATS.map((fmt, i) =>
          fmt === null
            ? <div key={i} style={{ width:1, height:18, background:"#e5e7eb", margin:"0 2px" }}/>
            : <Btn key={fmt.cmd} fmt={fmt} active={!!activeFormats[fmt.cmd]}
                onAction={execCmd}/>
        )}
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        onPaste={handlePaste}
        onSelect={updateActiveFormats}
        style={{
          minHeight, padding:"10px 12px",
          border:"1.5px solid #d1d5db", borderTop:"none",
          borderRadius:"0 0 10px 10px",
          outline:"none", fontSize:13, lineHeight:1.7,
          color:"#111827", background:"white",
          overflowY:"auto",
          fontFamily:"'DM Sans',-apple-system,sans-serif",
          /* Style headings, links, lists rendered inside */
        }}
      />

      {/* Placeholder */}
      {isEmpty && (
        <div style={{ position:"absolute", top:46, left:14,
          fontSize:13, color:"#9ca3af", pointerEvents:"none", userSelect:"none" }}>
          {placeholder || "Add rich text…"}
        </div>
      )}

      {/* Inline styles for rendered content */}
      <style>{`
        [contenteditable] h1 { font-size:1.4em; font-weight:800; margin:.4em 0; }
        [contenteditable] h2 { font-size:1.15em; font-weight:700; margin:.35em 0; }
        [contenteditable] a  { color:#3b5bdb; text-decoration:underline; }
        [contenteditable] ul { list-style:disc; padding-left:1.4em; margin:.25em 0; }
        [contenteditable] ol { list-style:decimal; padding-left:1.4em; margin:.25em 0; }
        [contenteditable] strong { font-weight:700; }
        [contenteditable] em { font-style:italic; }
      `}</style>

      {/* Link modal */}
      {linkModal && (
        <>
          <div style={{ position:"fixed", inset:0, zIndex:9998 }}
            onClick={()=>setLinkModal(null)}/>
          <LinkModal
            position={linkModal}
            initialUrl={linkModal.initialUrl}
            onConfirm={handleLinkConfirm}
            onClose={()=>setLinkModal(null)}/>
        </>
      )}
    </div>
  );
}
