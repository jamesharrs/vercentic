/**
 * RichTextEditor.jsx — Tiptap-based rich text editor for Vercentic email composer
 * Features: bold, italic, underline, strikethrough, headings, lists, links, images,
 *           text alignment, horizontal rule, undo/redo, AI toolbar overlay
 */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { useState, useCallback, useRef } from "react";
import ReactDOM from "react-dom";

// ── Colours ──────────────────────────────────────────────────────────────────
const T = {
  border:   "#E8ECF4",
  text1:    "#0D0F1A",
  text2:    "#4A4A5A",
  text3:    "#9CA3AF",
  accent:   "#4361EE",
  accentLt: "#EEF1FF",
  bg:       "#FFFFFF",
  toolbarBg:"#FFFFFF",
  hover:    "#F1F3FA",
};

// ── Toolbar button ────────────────────────────────────────────────────────────
function Btn({ title, active, disabled, onClick, children }) {
  return (
    <button
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      style={{
        width: 28, height: 28, borderRadius: 6, border: "none", padding: 0,
        background: active ? T.accentLt : "transparent",
        color: active ? T.accent : disabled ? T.text3 : T.text2,
        cursor: disabled ? "default" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background .1s, color .1s",
      }}
      onMouseEnter={e => { if (!active && !disabled) e.currentTarget.style.background = T.hover; }}
      onMouseLeave={e => { if (!active && !disabled) e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 18, background: T.border, margin: "0 4px", flexShrink: 0 }}/>;
}

// ── SVG icon helper ───────────────────────────────────────────────────────────
function Ico({ d, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  );
}

const ICONS = {
  bold:        "M6 4h8a4 4 0 010 8H6zM6 12h9a4 4 0 010 8H6z",
  italic:      "M19 4h-9M14 20H5M15 4L9 20",
  underline:   "M6 3v7a6 6 0 006 6 6 6 0 006-6V3M4 21h16",
  strike:      "M17.3 12H6.7M10 8.5c0-1.7 1.3-2.5 3-2.5s3 .8 3 2.5c0 .5-.1 1-.3 1.5M7 15.5c0 1.7 1.3 2.5 3 2.5h4",
  h1:          "M4 12h16M4 6h6M4 18h6M18 6l-4 12",
  h2:          "M4 12h8M4 6h4M4 18h4M14 8c0-1.1.9-2 2-2h1a2 2 0 012 2c0 2-3 3-5 5h5",
  ul:          "M9 6h11M9 12h11M9 18h11M5 6h.01M5 12h.01M5 18h.01",
  ol:          "M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M3 18h2a1 1 0 001-1v-1a1 1 0 00-1-1H4a1 1 0 01-1-1V13a1 1 0 011-1h2",
  blockquote:  "M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z",
  hr:          "M3 12h18",
  link:        "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  unlink:      "M18.84 12.25l1.72-1.71a5 5 0 00-7.07-7.07l-1.72 1.71M5.16 11.75l-1.72 1.71a5 5 0 007.07 7.07l1.71-1.71M8 12l8 0",
  image:       "M21 15a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v8zM3 15l5-5 4 4 3-3 5 5",
  alignLeft:   "M21 6H3M15 12H3M17 18H3",
  alignCenter: "M21 6H3M17 12H7M19 18H5",
  alignRight:  "M21 6H3M21 12H9M21 18H11",
  undo:        "M3 7v6h6M3 13A9 9 0 1021 12",
  redo:        "M21 7v6h-6M21 13A9 9 0 113 12",
  code:        "M16 18l6-6-6-6M8 6l-6 6 6 6",
};

// ── Link modal ────────────────────────────────────────────────────────────────
function LinkModal({ initial, onConfirm, onClose }) {
  const [url, setUrl] = useState(initial || "https://");
  return ReactDOM.createPortal(
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:10000,
      display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"white", borderRadius:14, padding:"20px 22px", width:360,
        boxShadow:"0 16px 48px rgba(0,0,0,.16)" }}>
        <div style={{ fontSize:14, fontWeight:700, color:T.text1, marginBottom:12 }}>Insert link</div>
        <input autoFocus value={url} onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onConfirm(url); if (e.key === "Escape") onClose(); }}
          placeholder="https://example.com"
          style={{ width:"100%", boxSizing:"border-box", padding:"8px 10px", borderRadius:8,
            border:`1.5px solid ${T.border}`, fontSize:13, fontFamily:"inherit", outline:"none", marginBottom:12 }}/>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onClose}
            style={{ padding:"6px 14px", borderRadius:8, border:`1.5px solid ${T.border}`,
              background:"transparent", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(url)}
            style={{ padding:"6px 14px", borderRadius:8, border:"none", background:T.accent,
              color:"white", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Insert
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Image modal ───────────────────────────────────────────────────────────────
function ImageModal({ onConfirm, onClose }) {
  const [url, setUrl]   = useState("");
  const [alt, setAlt]   = useState("");
  const [tab, setTab]   = useState("url"); // url | upload
  const fileRef         = useRef();

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onConfirm(ev.target.result, alt || file.name);
  };

  return ReactDOM.createPortal(
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:10000,
      display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"white", borderRadius:14, padding:"20px 22px", width:400,
        boxShadow:"0 16px 48px rgba(0,0,0,.16)" }}>
        <div style={{ fontSize:14, fontWeight:700, color:T.text1, marginBottom:12 }}>Insert image</div>

        {/* Tab toggle */}
        <div style={{ display:"flex", gap:4, background:"#F1F3FA", borderRadius:9, padding:3, marginBottom:14 }}>
          {["url","upload"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex:1, padding:"5px 0", borderRadius:7, border:"none",
                background: tab === t ? "white" : "transparent",
                boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,.08)" : "none",
                fontSize:12, fontWeight: tab === t ? 700 : 500,
                color: tab === t ? T.text1 : T.text3, cursor:"pointer" }}>
              {t === "url" ? "From URL" : "Upload file"}
            </button>
          ))}
        </div>

        {tab === "url" ? (
          <input autoFocus value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/image.png"
            style={{ width:"100%", boxSizing:"border-box", padding:"8px 10px", borderRadius:8,
              border:`1.5px solid ${T.border}`, fontSize:13, fontFamily:"inherit", outline:"none", marginBottom:10 }}/>
        ) : (
          <div style={{ marginBottom:10 }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display:"none" }}/>
            <button onClick={() => fileRef.current?.click()}
              style={{ width:"100%", padding:"24px", borderRadius:10, border:`2px dashed ${T.border}`,
                background:"#F8F9FC", cursor:"pointer", fontSize:13, color:T.text3, fontFamily:"inherit" }}>
              📎 Click to choose an image file
            </button>
          </div>
        )}

        <input value={alt} onChange={e => setAlt(e.target.value)} placeholder="Alt text (optional)"
          style={{ width:"100%", boxSizing:"border-box", padding:"7px 10px", borderRadius:8,
            border:`1.5px solid ${T.border}`, fontSize:12, fontFamily:"inherit", outline:"none", marginBottom:12 }}/>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onClose}
            style={{ padding:"6px 14px", borderRadius:8, border:`1.5px solid ${T.border}`,
              background:"transparent", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Cancel
          </button>
          {tab === "url" && (
            <button onClick={() => url && onConfirm(url, alt)}
              style={{ padding:"6px 14px", borderRadius:8, border:"none", background:T.accent,
                color:"white", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              Insert
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main RichTextEditor ───────────────────────────────────────────────────────
export default function RichTextEditor({ value, onChange, placeholder = "Write your message…", minHeight = 220 }) {
  const [showLink,  setShowLink]  = useState(false);
  const [showImage, setShowImage] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "rte-link" } }),
      TextStyle,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ inline: false, allowBase64: true, HTMLAttributes: { class: "rte-img" } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      attributes: {
        style: `min-height:${minHeight}px; outline:none; font-family:inherit; font-size:14px; line-height:1.75; color:${T.text1}; padding:14px 0;`,
      },
    },
  });

  const insertLink = useCallback((url) => {
    if (!editor) return;
    setShowLink(false);
    if (!url || url === "https://") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkToUrl(url).setLink({ href: url }).run();
  }, [editor]);

  const insertImage = useCallback((src, alt) => {
    if (!editor) return;
    setShowImage(false);
    editor.chain().focus().setImage({ src, alt: alt || "" }).run();
  }, [editor]);

  if (!editor) return null;

  const isActive = (name, attrs) => editor.isActive(name, attrs);

  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1 }}>

      {/* ── Formatting toolbar ── */}
      <div style={{
        display:"flex", alignItems:"center", flexWrap:"wrap", gap:2, padding:"6px 8px",
        borderBottom:`1.5px solid ${T.border}`, background:T.toolbarBg,
        borderRadius:"10px 10px 0 0",
      }}>

        {/* Undo / redo */}
        <Btn title="Undo (⌘Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Ico d={ICONS.undo}/>
        </Btn>
        <Btn title="Redo (⌘⇧Z)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Ico d={ICONS.redo}/>
        </Btn>

        <Divider/>

        {/* Text style */}
        <Btn title="Bold (⌘B)" active={isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Ico d={ICONS.bold}/>
        </Btn>
        <Btn title="Italic (⌘I)" active={isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Ico d={ICONS.italic}/>
        </Btn>
        <Btn title="Underline (⌘U)" active={isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <Ico d={ICONS.underline}/>
        </Btn>
        <Btn title="Strikethrough" active={isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Ico d={ICONS.strike}/>
        </Btn>
        <Btn title="Code" active={isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Ico d={ICONS.code} size={13}/>
        </Btn>

        <Divider/>

        {/* Headings */}
        <Btn title="Heading 1" active={isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <span style={{ fontSize:11, fontWeight:800 }}>H1</span>
        </Btn>
        <Btn title="Heading 2" active={isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <span style={{ fontSize:11, fontWeight:800 }}>H2</span>
        </Btn>

        <Divider/>

        {/* Lists */}
        <Btn title="Bullet list" active={isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <Ico d={ICONS.ul}/>
        </Btn>
        <Btn title="Numbered list" active={isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <Ico d={ICONS.ol}/>
        </Btn>
        <Btn title="Blockquote" active={isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Ico d={ICONS.blockquote}/>
        </Btn>
        <Btn title="Divider line" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Ico d={ICONS.hr}/>
        </Btn>

        <Divider/>

        {/* Alignment */}
        <Btn title="Align left" active={isActive({ textAlign:"left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <Ico d={ICONS.alignLeft}/>
        </Btn>
        <Btn title="Align center" active={isActive({ textAlign:"center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <Ico d={ICONS.alignCenter}/>
        </Btn>
        <Btn title="Align right" active={isActive({ textAlign:"right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <Ico d={ICONS.alignRight}/>
        </Btn>

        <Divider/>

        {/* Link */}
        <Btn title="Insert link" active={isActive("link")} onClick={() => setShowLink(true)}>
          <Ico d={ICONS.link}/>
        </Btn>
        {isActive("link") && (
          <Btn title="Remove link" onClick={() => editor.chain().focus().unsetLink().run()}>
            <Ico d={ICONS.unlink}/>
          </Btn>
        )}

        {/* Image */}
        <Btn title="Insert image" onClick={() => setShowImage(true)}>
          <Ico d={ICONS.image}/>
        </Btn>
      </div>

      {/* ── Editor area ── */}
      <div style={{ flex:1, overflowY:"auto", cursor:"text" }}
        onClick={() => editor.commands.focus()}>
        <style>{`
          .tiptap p { margin:0 0 .5em; }
          .tiptap h1 { font-size:1.6em; font-weight:800; margin:.6em 0 .3em; }
          .tiptap h2 { font-size:1.3em; font-weight:700; margin:.5em 0 .3em; }
          .tiptap h3 { font-size:1.1em; font-weight:700; margin:.5em 0 .3em; }
          .tiptap ul, .tiptap ol { padding-left:1.4em; margin:.4em 0; }
          .tiptap li { margin:.15em 0; }
          .tiptap blockquote { border-left:3px solid #4361EE; margin:.5em 0; padding:.4em .8em; color:#6b7280; background:#f8f9ff; border-radius:0 6px 6px 0; }
          .tiptap hr { border:none; border-top:1.5px solid #E8ECF4; margin:1em 0; }
          .tiptap code { background:#F1F3FA; border-radius:4px; padding:1px 5px; font-size:.9em; font-family:monospace; }
          .tiptap pre { background:#F1F3FA; border-radius:8px; padding:10px 14px; overflow-x:auto; }
          .tiptap .rte-link { color:#4361EE; text-decoration:underline; cursor:pointer; }
          .tiptap .rte-img { max-width:100%; border-radius:8px; margin:.5em 0; }
          .tiptap p.is-editor-empty:first-child::before { color:#9CA3AF; content:attr(data-placeholder); float:left; height:0; pointer-events:none; }
          .tiptap:focus-visible { outline:none; }
        `}</style>
        <EditorContent editor={editor} style={{ padding:"0" }}/>
      </div>

      {/* Modals */}
      {showLink  && <LinkModal  initial={editor.getAttributes("link").href} onConfirm={insertLink}  onClose={() => setShowLink(false)}/>}
      {showImage && <ImageModal onConfirm={insertImage} onClose={() => setShowImage(false)}/>}
    </div>
  );
}

// Helper: convert HTML back to plain text for non-email types
export function htmlToText(html) {
  if (!html) return "";
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}
