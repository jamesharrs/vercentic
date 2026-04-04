import { useState, useEffect, useCallback } from 'react'
import { css, Badge, Btn, Avatar, STATUS_COLORS, recordTitle } from './shared.jsx'

// ── Icon helper (inline SVG, no external dependency) ──────────────────────────
const Ic = ({ n, s=16, c='currentColor' }) => {
  const P = {
    chevron_down: 'M6 9l6 6 6-6',
    chevron_right: 'M9 18l6-6-6-6',
    chevron_up: 'M18 15l-6-6-6 6',
    check: 'M20 6L9 17l-5-5',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    calendar: 'M3 4h18v18H3V4zm0 4h18M8 2v4m8-4v4',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    briefcase: 'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 1-2-2h-4a2 2 0 0 1-2 2v2',
    arrow_right: 'M5 12h14M12 5l7 7-7 7',
    loader: 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83',
    thumbs_up: 'M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3',
    x: 'M18 6L6 18M6 6l12 12',
    plus: 'M12 5v14M5 12h14',
    filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
    list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  }
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={P[n] || P.alert}/>
    </svg>
  )
}

// ── CTA Action types ──────────────────────────────────────────────────────────
// Each CTA button the admin can configure per widget
export const CTA_ACTIONS = {
  move_stage:       { label: 'Move Stage',       icon: 'arrow_right', color: '#4361EE' },
  arrange_interview:{ label: 'Arrange Interview', icon: 'calendar',    color: '#7C3AED' },
  approve_offer:    { label: 'Approve Offer',     icon: 'thumbs_up',   color: '#059669' },
  reject:           { label: 'Reject',            icon: 'x',           color: '#DC2626' },
  submit_feedback:  { label: 'Submit Feedback',   icon: 'message',     color: '#D97706' },
  view_profile:     { label: 'View Profile',      icon: 'eye',         color: '#4B5563' },
  custom:           { label: 'Custom',            icon: 'arrow_right', color: '#4361EE' },
}

// ── Feedback modal (scorecard-style quick feedback) ───────────────────────────
function FeedbackModal({ record, color, onClose, onSave }) {
  const [score, setScore]  = useState(null)
  const [note, setNote]    = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave({ record_id: record.id, score, note })
    setSaving(false)
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9999,
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:18,
        padding:28, width:380, boxShadow:'0 32px 80px rgba(0,0,0,0.2)' }}>
        <div style={{ fontWeight:800, fontSize:16, color:'#0F1729', marginBottom:4 }}>Submit Feedback</div>
        <div style={{ fontSize:12, color:'#9DA8C7', marginBottom:20 }}>{recordTitle(record)}</div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'#4B5675', marginBottom:8 }}>Rating</div>
          <div style={{ display:'flex', gap:8 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={()=>setScore(n)} style={{
                width:40, height:40, borderRadius:10,
                border: `2px solid ${score===n ? color : '#E8ECF8'}`,
                background: score===n ? color : 'transparent',
                color: score===n ? 'white' : '#9DA8C7',
                fontSize:14, fontWeight:700, cursor:'pointer', transition:'all .15s'
              }}>{n}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'#4B5675', marginBottom:6 }}>Notes</div>
          <textarea value={note} onChange={e=>setNote(e.target.value)} rows={4}
            placeholder="Your feedback and observations…"
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #E8ECF8',
              fontSize:13, fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box' }}
            onFocus={e=>e.target.style.borderColor=color}
            onBlur={e=>e.target.style.borderColor='#E8ECF8'}/>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:10,
            border:'1.5px solid #E8ECF8', background:'transparent', color:'#6B7280',
            fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !score} style={{ flex:2, padding:'10px', borderRadius:10,
            border:'none', background: score ? color : '#E8ECF8', color: score ? 'white' : '#9DA8C7',
            fontSize:13, fontWeight:700, cursor: score ? 'pointer' : 'not-allowed', fontFamily:'inherit' }}>
            {saving ? 'Saving…' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Move Stage modal ──────────────────────────────────────────────────────────
function MoveStageModal({ record, stages, color, onClose, onMove }) {
  const [selected, setSelected] = useState('')
  const [saving, setSaving]     = useState(false)

  const handleMove = async () => {
    if (!selected) return
    setSaving(true)
    await onMove({ record_id: record.id, stage: selected })
    setSaving(false)
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9999,
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:18,
        padding:28, width:340, boxShadow:'0 32px 80px rgba(0,0,0,0.2)' }}>
        <div style={{ fontWeight:800, fontSize:16, color:'#0F1729', marginBottom:4 }}>Move to Stage</div>
        <div style={{ fontSize:12, color:'#9DA8C7', marginBottom:20 }}>{recordTitle(record)}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
          {stages.map(s => (
            <button key={s} onClick={()=>setSelected(s)} style={{
              padding:'10px 14px', borderRadius:10, textAlign:'left', cursor:'pointer',
              border: `1.5px solid ${selected===s ? color : '#E8ECF8'}`,
              background: selected===s ? `${color}12` : 'transparent',
              color: selected===s ? color : '#374151', fontSize:13, fontWeight:600, fontFamily:'inherit'
            }}>{s}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:10,
            border:'1.5px solid #E8ECF8', background:'transparent', color:'#6B7280',
            fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          <button onClick={handleMove} disabled={saving||!selected} style={{ flex:2, padding:'10px', borderRadius:10,
            border:'none', background: selected ? color : '#E8ECF8', color: selected ? 'white' : '#9DA8C7',
            fontSize:13, fontWeight:700, cursor: selected ? 'pointer' : 'not-allowed', fontFamily:'inherit' }}>
            {saving ? 'Moving…' : 'Move Stage'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Record Card (Card display mode) ──────────────────────────────────────────
function RecordCard({ record, widgetConfig, color, api, onAction, fields }) {
  const d = record.data || {}
  const name = recordTitle(record)
  const { cta_buttons = [], show_fields = [] } = widgetConfig

  const visibleFields = show_fields.length
    ? fields.filter(f => show_fields.includes(f.api_key))
    : fields.slice(0, 4)

  return (
    <div style={{ background:'#fff', borderRadius:14, border:'1.5px solid #E8ECF8',
      padding:'16px 18px', marginBottom:10, transition:'box-shadow .15s' }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.07)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
        <Avatar name={name} color={color} size={40}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#0F1729',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
          <div style={{ fontSize:11, color:'#9DA8C7', marginTop:2 }}>
            {[d.current_title, d.department, d.job_title].filter(Boolean)[0] || ''}
          </div>
        </div>
        {d.status && <Badge color={STATUS_COLORS[d.status]||'#9DA8C7'}>{d.status}</Badge>}
      </div>

      {/* Configured fields */}
      {visibleFields.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:12,
          padding:'10px 12px', background:'#F8F9FF', borderRadius:10 }}>
          {visibleFields.map(f => {
            const val = d[f.api_key]
            if (!val && val !== 0) return null
            return (
              <div key={f.id} style={{ display:'flex', gap:8, fontSize:12 }}>
                <span style={{ color:'#9DA8C7', fontWeight:600, width:100, flexShrink:0,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</span>
                <span style={{ color:'#374151' }}>
                  {Array.isArray(val) ? val.join(', ') : String(val)}
                </span>
              </div>
            )
          }).filter(Boolean)}
        </div>
      )}

      {/* CTA buttons */}
      {cta_buttons.length > 0 && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {cta_buttons.map((btn, i) => {
            const meta = CTA_ACTIONS[btn.action] || CTA_ACTIONS.custom
            return (
              <button key={i} onClick={() => onAction(btn.action, record)} style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer',
                background: btn.color || meta.color, color:'white',
                fontSize:12, fontWeight:700, fontFamily:'inherit', transition:'opacity .15s'
              }}
              onMouseEnter={e=>e.currentTarget.style.opacity='0.85'}
              onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                <Ic n={meta.icon} s={12} c="white"/>
                {btn.label || meta.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Record Row (Table display mode) ──────────────────────────────────────────
function RecordRow({ record, widgetConfig, color, fields, onAction }) {
  const d = record.data || {}
  const name = recordTitle(record)
  const { cta_buttons = [], show_fields = [] } = widgetConfig
  const visibleFields = show_fields.length ? fields.filter(f => show_fields.includes(f.api_key)) : fields.slice(0, 3)

  return (
    <tr style={{ borderBottom:'1px solid #F3F4F6' }}
      onMouseEnter={e=>e.currentTarget.style.background='#F8F9FF'}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      <td style={{ padding:'12px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Avatar name={name} color={color} size={32}/>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#0F1729' }}>{name}</div>
            <div style={{ fontSize:11, color:'#9DA8C7' }}>
              {[d.current_title, d.job_title].filter(Boolean)[0] || ''}
            </div>
          </div>
        </div>
      </td>
      {visibleFields.map(f => (
        <td key={f.id} style={{ padding:'12px 16px', fontSize:12, color:'#4B5675' }}>
          {(() => {
            const val = d[f.api_key]
            if (!val && val !== 0) return <span style={{ color:'#D1D5DB' }}>—</span>
            if (f.api_key === 'status') return <Badge color={STATUS_COLORS[val]||'#9DA8C7'}>{val}</Badge>
            if (Array.isArray(val)) return val.join(', ')
            return String(val)
          })()}
        </td>
      ))}
      <td style={{ padding:'12px 16px' }}>
        <div style={{ display:'flex', gap:6 }}>
          {cta_buttons.map((btn, i) => {
            const meta = CTA_ACTIONS[btn.action] || CTA_ACTIONS.custom
            return (
              <button key={i} onClick={() => onAction(btn.action, record)} style={{
                display:'flex', alignItems:'center', gap:4,
                padding:'5px 10px', borderRadius:7, border:'none', cursor:'pointer',
                background: btn.color || meta.color, color:'white',
                fontSize:11, fontWeight:700, fontFamily:'inherit'
              }}>
                <Ic n={meta.icon} s={11} c="white"/>
                {btn.label || meta.label}
              </button>
            )
          })}
        </div>
      </td>
    </tr>
  )
}

// ── Main HMWidget component ───────────────────────────────────────────────────
// widgetConfig shape:
//   { id, title, list_id, display_mode ('card'|'table'|'kanban'),
//     cta_buttons: [{action, label, color}],
//     show_fields: [api_key, ...],
//     empty_message, stages: [string] }
export default function HMWidget({ widgetConfig, portal, api, color, user }) {
  const [records,   setRecords]   = useState([])
  const [fields,    setFields]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [search,    setSearch]    = useState('')
  const [modal,     setModal]     = useState(null) // { type, record }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const objectId = widgetConfig.object_id
      const listId   = widgetConfig.list_id
      if (!objectId) { setLoading(false); return }

      // Build query — use list filters if a list is selected, otherwise all records
      let url = `/records?object_id=${objectId}&environment_id=${portal.environment_id}&limit=50`

      if (listId) {
        try {
          const list = await api.get(`/saved-views/${listId}`)
          if (list?.filter_chip) {
            url += `&filter_key=${encodeURIComponent(list.filter_chip.fieldKey)}&filter_value=${encodeURIComponent(list.filter_chip.fieldValue)}`
          } else if (list?.filters?.length) {
            const f = list.filters[0]
            if (f.field && f.value) url += `&filter_key=${encodeURIComponent(f.field)}&filter_value=${encodeURIComponent(f.value)}`
          }
        } catch { /* list not found — still show all records */ }
      }

      const [recRes, fldRes] = await Promise.all([
        api.get(url),
        api.get(`/fields?object_id=${objectId}`),
      ])
      setRecords(Array.isArray(recRes) ? recRes : (recRes.records || []))
      setFields(Array.isArray(fldRes) ? fldRes : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [widgetConfig.object_id, widgetConfig.list_id, portal.environment_id])

  useEffect(() => { loadData() }, [loadData])

  // ── Action dispatcher ──────────────────────────────────────────────────────
  const handleAction = (action, record) => {
    if (action === 'submit_feedback')   setModal({ type: 'feedback',   record })
    else if (action === 'move_stage')   setModal({ type: 'move_stage', record })
    else if (action === 'arrange_interview') {
      // Simple confirmation — full scheduling in future phase
      setModal({ type: 'arrange_interview', record })
    }
    else if (action === 'approve_offer') {
      setModal({ type: 'approve_offer', record })
    }
    else if (action === 'reject') {
      setModal({ type: 'reject', record })
    }
    else if (action === 'view_profile') {
      // Could open a detail overlay — for now, link to main app
      window.open(`/people/${record.id}`, '_blank')
    }
  }

  const handleSaveFeedback = async ({ record_id, score, note }) => {
    await api.patch(`/records/${record_id}`, { data: { rating: score, feedback_note: note }, updated_by: user?.email })
    loadData()
  }

  const handleMoveStage = async ({ record_id, stage }) => {
    await api.patch(`/records/${record_id}`, { data: { status: stage }, updated_by: user?.email })
    loadData()
  }

  const handleApproveOffer = async () => {
    if (!modal?.record) return
    await api.patch(`/records/${modal.record.id}`, { data: { status: 'Approved' }, updated_by: user?.email })
    setModal(null)
    loadData()
  }

  const handleReject = async () => {
    if (!modal?.record) return
    await api.patch(`/records/${modal.record.id}`, { data: { status: 'Rejected' }, updated_by: user?.email })
    setModal(null)
    loadData()
  }

  // ── Filtered records ───────────────────────────────────────────────────────
  const filtered = search
    ? records.filter(r => JSON.stringify(r.data).toLowerCase().includes(search.toLowerCase()))
    : records

  const stages = widgetConfig.stages || []
  const { display_mode = 'card', title, empty_message, cta_buttons = [], show_fields = [] } = widgetConfig
  const visibleFields = show_fields.length ? fields.filter(f => show_fields.includes(f.api_key)) : fields.slice(0, 3)

  return (
    <div style={{ background:'#fff', borderRadius:16, border:'1.5px solid #E8ECF8',
      overflow:'hidden', marginBottom:24 }}>
      {/* Widget header */}
      <div style={{ padding:'16px 20px', borderBottom:'1px solid #E8ECF8',
        display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:800, color:'#0F1729' }}>{title || 'My List'}</div>
          {!loading && (
            <div style={{ fontSize:11, color:'#9DA8C7', marginTop:2 }}>
              {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
              {search && ` matching "${search}"`}
            </div>
          )}
        </div>
        {/* Search */}
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search…" style={{
            padding:'7px 12px', borderRadius:8, border:'1.5px solid #E8ECF8',
            fontSize:12, fontFamily:'inherit', outline:'none', width:160,
          }}
          onFocus={e=>e.target.style.borderColor=color}
          onBlur={e=>e.target.style.borderColor='#E8ECF8'}/>
      </div>

      {/* Body */}
      <div style={{ padding: display_mode === 'table' ? 0 : '16px 20px' }}>
        {loading ? (
          <div style={{ padding:'40px 0', textAlign:'center', color:'#9DA8C7' }}>
            <Ic n="loader" s={20} c="#9DA8C7"/><div style={{ marginTop:8, fontSize:12 }}>Loading…</div>
          </div>
        ) : error ? (
          <div style={{ padding:'24px', textAlign:'center', color:'#DC2626', fontSize:12 }}>
            <Ic n="alert" s={18} c="#DC2626"/><div style={{ marginTop:6 }}>{error}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'40px 0', textAlign:'center', color:'#9DA8C7' }}>
            <Ic n="users" s={24} c="#D1D5DB"/>
            <div style={{ marginTop:10, fontSize:13, color:'#9DA8C7' }}>
              {empty_message || 'No records to show'}
            </div>
          </div>
        ) : display_mode === 'table' ? (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#F8F9FF', borderBottom:'1.5px solid #E8ECF8' }}>
                  <th style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#9DA8C7' }}>NAME</th>
                  {visibleFields.map(f => (
                    <th key={f.id} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#9DA8C7' }}>
                      {f.name.toUpperCase()}
                    </th>
                  ))}
                  <th style={{ padding:'10px 16px' }}/>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <RecordRow key={r.id} record={r} widgetConfig={widgetConfig}
                    color={color} fields={fields} onAction={handleAction}/>
                ))}
              </tbody>
            </table>
          </div>
        ) : display_mode === 'kanban' ? (
          // Kanban — group by stage
          <div style={{ display:'flex', gap:14, overflowX:'auto', paddingBottom:8 }}>
            {(stages.length ? stages : ['—']).map(stage => {
              const cols = stages.length
                ? filtered.filter(r => (r.data?.status||'') === stage)
                : filtered
              return (
                <div key={stage} style={{ minWidth:240, flex:'0 0 240px' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#9DA8C7',
                    padding:'6px 10px', background:'#F3F4F6', borderRadius:8,
                    marginBottom:10, textTransform:'uppercase', letterSpacing:'0.04em' }}>
                    {stage} · {cols.length}
                  </div>
                  {cols.map(r => (
                    <RecordCard key={r.id} record={r} widgetConfig={widgetConfig}
                      color={color} api={api} onAction={handleAction} fields={fields}/>
                  ))}
                </div>
              )
            })}
          </div>
        ) : (
          // Card (default)
          filtered.map(r => (
            <RecordCard key={r.id} record={r} widgetConfig={widgetConfig}
              color={color} api={api} onAction={handleAction} fields={fields}/>
          ))
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'feedback' && (
        <FeedbackModal record={modal.record} color={color}
          onClose={()=>setModal(null)} onSave={handleSaveFeedback}/>
      )}
      {modal?.type === 'move_stage' && (
        <MoveStageModal record={modal.record} stages={stages} color={color}
          onClose={()=>setModal(null)} onMove={handleMoveStage}/>
      )}
      {modal?.type === 'approve_offer' && (
        <div onClick={()=>setModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:18,
            padding:28, width:320, textAlign:'center', boxShadow:'0 32px 80px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>✅</div>
            <div style={{ fontWeight:800, fontSize:16, color:'#0F1729', marginBottom:8 }}>Approve Offer?</div>
            <div style={{ fontSize:12, color:'#9DA8C7', marginBottom:20 }}>{recordTitle(modal.record)}</div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setModal(null)} style={{ flex:1, padding:'10px', borderRadius:10,
                border:'1.5px solid #E8ECF8', background:'transparent', color:'#6B7280',
                fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
              <button onClick={handleApproveOffer} style={{ flex:2, padding:'10px', borderRadius:10,
                border:'none', background:'#059669', color:'white',
                fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Approve</button>
            </div>
          </div>
        </div>
      )}
      {modal?.type === 'reject' && (
        <div onClick={()=>setModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:18,
            padding:28, width:320, textAlign:'center', boxShadow:'0 32px 80px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>❌</div>
            <div style={{ fontWeight:800, fontSize:16, color:'#0F1729', marginBottom:8 }}>Reject?</div>
            <div style={{ fontSize:12, color:'#9DA8C7', marginBottom:20 }}>{recordTitle(modal.record)}</div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setModal(null)} style={{ flex:1, padding:'10px', borderRadius:10,
                border:'1.5px solid #E8ECF8', background:'transparent', color:'#6B7280',
                fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
              <button onClick={handleReject} style={{ flex:2, padding:'10px', borderRadius:10,
                border:'none', background:'#DC2626', color:'white',
                fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
