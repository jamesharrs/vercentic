import { useState, useEffect } from 'react'
import PortalPageRenderer from './portals/PortalPageRenderer.jsx'

const api = {
  get: p => fetch(`/api${p}`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
  post: (p, b) => fetch(`/api${p}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(b) }).then(r => r.json()),
}

const Spinner = ({ color = '#4361EE' }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#EEF2FF' }}>
    <div style={{ width:40, height:40, border:`4px solid ${color}30`, borderTop:`4px solid ${color}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

const ErrorScreen = ({ message }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#FEF2F2', fontFamily:"'Geist', sans-serif" }}>
    <div style={{ textAlign:'center', maxWidth:400, padding:40 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
      <h2 style={{ margin:'0 0 8px', fontSize:20, fontWeight:800, color:'#0F1729' }}>Portal Unavailable</h2>
      <p style={{ color:'#6B7280', fontSize:14 }}>{message}</p>
    </div>
  </div>
)

export default function PortalApp({ slug }) {
  const [portal, setPortal] = useState(null)
  const [objects, setObjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!slug) { setError('No portal provided.'); setLoading(false); return; }
    // Strip any leading slashes so both /careers and careers work
    const cleanSlug = slug.replace(/^\/+/, '');
    api.get(`/portals/slug/${cleanSlug}`)
      .then(async p => {
        setPortal(p)
        document.title = p.branding?.company_name || p.name || 'Portal'
        if (p.branding?.font) {
          const link = document.createElement('link')
          link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(p.branding.font)}:wght@400;500;600;700;800&display=swap`
          link.rel = 'stylesheet'
          document.head.appendChild(link)
        }
        const objs = await api.get(`/objects?environment_id=${p.environment_id}`)
        setObjects(Array.isArray(objs) ? objs : [])
        setLoading(false)
      })
      .catch(() => { setError('This portal is not available.'); setLoading(false); })
  }, [slug])

  if (loading) return <Spinner color={portal?.branding?.primary_color}/>
  if (error || !portal) return <ErrorScreen message={error}/>

  const props = { portal, objects, api }
  // Always use the page renderer — it renders the actual pages/widgets from the builder
  return <PortalPageRenderer portal={portal} api={api}/>
}
