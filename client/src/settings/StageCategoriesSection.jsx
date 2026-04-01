import { useState, useEffect, useCallback } from "react";

const C = { accent: '#4361EE', text1: '#111827', text2: '#374151', text3: '#6B7280', bg: '#EEF2FF', white: 'white', border: '#E5E7EB', red: '#EF4444' };
const F = "'Space Grotesk', 'DM Sans', system-ui, sans-serif";

const api = {
  get: async (path) => { const r = await fetch(path); return r.json(); },
  post: async (path, body) => { const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json(); },
  patch: async (path, body) => { const r = await fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json(); },
  delete: async (path) => { const r = await fetch(path, { method: 'DELETE' }); return r.json(); },
};

const PRESET_COLORS = ['#3B82F6','#F59E0B','#8B5CF6','#06B6D4','#10B981','#EF4444','#6B7280','#F97316','#EC4899','#14B8A6'];

function CategoryModal({ cat, onSave, onClose }) {
  const [form, setForm] = useState({
    name: cat?.name || '',
    color: cat?.color || '#6B7280',
    description: cat?.description || '',
    is_terminal: cat?.is_terminal || false,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: C.white, borderRadius: 14, padding: 24, width: 400, fontFamily: F }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, marginBottom: 20 }}>
          {cat ? 'Edit Category' : 'New Category'}
        </div>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 4 }}>Name</label>
        <input value={form.name} onChange={e => set('name', e.target.value)}
          style={{ width: '100%', border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '8px 10px',
            fontSize: 13, fontFamily: F, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 8 }}>Colour</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {PRESET_COLORS.map(c => (
            <div key={c} onClick={() => set('color', c)}
              style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                border: form.color === c ? `3px solid ${C.text1}` : '3px solid transparent',
                outline: form.color === c ? `2px solid ${c}` : 'none', transition: 'all .1s' }} />
          ))}
          <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
            style={{ width: 28, height: 28, border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 0 }} />
        </div>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 4 }}>Description</label>
        <input value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="What does this category represent?"
          style={{ width: '100%', border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '8px 10px',
            fontSize: 13, fontFamily: F, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 20 }}>
          <input type="checkbox" checked={form.is_terminal} onChange={e => set('is_terminal', e.target.checked)} />
          <span style={{ fontSize: 13, color: C.text2 }}>Terminal stage (end of workflow process)</span>
        </label>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', borderRadius: 8, border: `1px solid ${C.border}`,
            background: 'transparent', color: C.text2, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={!form.name.trim()}
            style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: C.accent,
              color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F }}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default function StageCategoriesSection({ environment }) {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | cat object
  const [saving, setSaving] = useState(false);

  const envId = environment?.id;

  const load = useCallback(async () => {
    if (!envId) return;
    setLoading(true);
    const data = await api.get(`/api/stage-categories?environment_id=${envId}`);
    setCats(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [envId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    setSaving(true);
    if (editing === 'new') {
      await api.post('/api/stage-categories', { ...form, environment_id: envId });
    } else {
      await api.patch(`/api/stage-categories/${editing.id}`, form);
    }
    await load();
    setEditing(null);
    setSaving(false);
  };

  const handleDelete = async (cat) => {
    if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return;
    await api.delete(`/api/stage-categories/${cat.id}`);
    await load();
  };

  const handleMoveUp = async (cat, idx) => {
    if (idx === 0) return;
    const ordered = [...cats];
    [ordered[idx - 1], ordered[idx]] = [ordered[idx], ordered[idx - 1]];
    await api.post('/api/stage-categories/reorder', { environment_id: envId, ordered_ids: ordered.map(c => c.id) });
    await load();
  };

  const handleMoveDown = async (cat, idx) => {
    if (idx === cats.length - 1) return;
    const ordered = [...cats];
    [ordered[idx], ordered[idx + 1]] = [ordered[idx + 1], ordered[idx]];
    await api.post('/api/stage-categories/reorder', { environment_id: envId, ordered_ids: ordered.map(c => c.id) });
    await load();
  };

  if (loading) return <div style={{ padding: 32, color: C.text3, fontFamily: F }}>Loading…</div>;

  return (
    <div style={{ fontFamily: F, maxWidth: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text1 }}>Stage Categories</div>
          <div style={{ fontSize: 13, color: C.text3, marginTop: 2 }}>Group workflow stages into high-level phases for cleaner reporting and UI.</div>
        </div>
        <button onClick={() => setEditing('new')}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: C.accent, color: C.white,
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F }}>+ Add Category</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cats.map((cat, idx) => (
          <div key={cat.id} style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 12,
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Colour swatch */}
            <div style={{ width: 12, height: 40, borderRadius: 4, background: cat.color, flexShrink: 0 }} />
            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>{cat.name}</span>
                {cat.is_system && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99,
                  background: '#F3F4F6', color: C.text3, fontWeight: 600 }}>system</span>}
                {cat.is_terminal && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99,
                  background: '#FEF3C7', color: '#92400E', fontWeight: 600 }}>terminal</span>}
              </div>
              {cat.description && <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>{cat.description}</div>}
            </div>
            {/* Sort order */}
            <div style={{ fontSize: 11, color: C.text3, minWidth: 40, textAlign: 'center' }}>#{cat.sort_order + 1}</div>
            {/* Actions */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => handleMoveUp(cat, idx)} disabled={idx === 0}
                style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 8px',
                  cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? C.text3 : C.text2, fontSize: 12 }}>↑</button>
              <button onClick={() => handleMoveDown(cat, idx)} disabled={idx === cats.length - 1}
                style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 8px',
                  cursor: idx === cats.length - 1 ? 'default' : 'pointer', color: idx === cats.length - 1 ? C.text3 : C.text2, fontSize: 12 }}>↓</button>
              <button onClick={() => setEditing(cat)}
                style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px',
                  cursor: 'pointer', color: C.text2, fontSize: 12, fontFamily: F }}>Edit</button>
              {!cat.is_system && (
                <button onClick={() => handleDelete(cat)}
                  style={{ background: 'none', border: `1px solid ${C.red}20`, borderRadius: 6, padding: '4px 10px',
                    cursor: 'pointer', color: C.red, fontSize: 12, fontFamily: F }}>Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <CategoryModal
          cat={editing === 'new' ? null : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
