// Shared utilities for all portal renderers

export const css = (br = {}) => ({
  primary:  br.primary_color  || br.primaryColor  || '#4361EE',
  bg:       br.bg_color       || br.bgColor        || '#F8FAFF',
  text:     br.text_color     || br.textColor      || '#0F1729',
  button:   br.button_color   || br.primaryColor   || br.primary_color || '#4361EE',
  font:     `'${br.font || br.fontFamily?.replace(/'/g,'') || 'DM Sans'}', -apple-system, sans-serif`,
  surface:  '#FFFFFF',
  border:   '#E8ECF8',
  text2:    '#4B5675',
  text3:    '#9DA8C7',
})

export const STATUS_COLORS = {
  Open:'#0CAF77', Active:'#0CAF77', Draft:'#9DA8C7', Filled:'#4361EE',
  Closed:'#EF4444', 'On Hold':'#F79009', Passive:'#F79009', Placed:'#4361EE',
}

export const Badge = ({ children, color = '#4361EE' }) => (
  <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99,
    background:`${color}18`, color, display:'inline-block' }}>{children}</span>
)

export const Avatar = ({ name, color, size = 40 }) => {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()
  return (
    <div style={{ width:size, height:size, borderRadius:size/3, background:`${color}20`,
      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <span style={{ fontSize:size*0.35, fontWeight:800, color }}>{initials}</span>
    </div>
  )
}

export const Btn = ({ children, onClick, outline, color = '#4361EE', disabled, full, style = {} }) => (
  <button onClick={onClick} disabled={disabled} style={{
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
    padding:'10px 20px', borderRadius:10, border: outline ? `2px solid ${color}` : 'none',
    background: outline ? 'transparent' : color, color: outline ? color : 'white',
    fontSize:14, fontWeight:700, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, width: full ? '100%' : 'auto',
    transition:'all .15s', ...style,
  }}>{children}</button>
)

export const Input = ({ label, value, onChange, placeholder, type = 'text', required }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
    {label && <label style={{ fontSize:13, fontWeight:600, color:'#4B5675' }}>{label}{required&&<span style={{color:'#EF4444',marginLeft:3}}>*</span>}</label>}
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} required={required}
      style={{ padding:'10px 14px', borderRadius:10, border:'1.5px solid #E8ECF8', fontSize:14,
        fontFamily:'inherit', color:'#0F1729', outline:'none', width:'100%', boxSizing:'border-box' }}
      onFocus={e => e.target.style.borderColor = '#4361EE'}
      onBlur={e => e.target.style.borderColor = '#E8ECF8'}/>
  </div>
)

export const Section = ({ children, style = {} }) => (
  <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px', ...style }}>{children}</div>
)

export const recordTitle = (record, object) => {
  if (!record?.data) return 'Untitled'
  const keys = ['first_name', 'job_title', 'pool_name', 'name', 'title']
  const nameKey = keys.find(k => record.data[k])
  const last = record.data.last_name ? ` ${record.data.last_name}` : ''
  return nameKey ? (record.data[nameKey] + last) : 'Untitled'
}
