import { useState, useEffect } from 'react'
import { tFetch } from './apiClient.js'
import PortalPageRenderer from './portals/PortalPageRenderer.jsx'
import CandidateCopilot from './CandidateCopilot.jsx'

const api = {
  get:  p    => tFetch(p).then(r => r.json ? r.json() : r),
  post: (p, b) => tFetch(p, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(b) }).then(r => r.json ? r.json() : r),
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
    // Try to get environment_id from user session for scoped lookup
    let envParam = '';
    try {
      const sess = JSON.parse(sessionStorage.getItem('talentos_session') || '{}');
      if (sess.environment?.id) envParam = `?environment_id=${sess.environment.id}`;
    } catch {}
    api.get(`/portals/slug/${cleanSlug}${envParam}`)
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
      .catch(err => {
        const status = err?.message || String(err);
        if (status === '403') {
          setError('This portal exists but has not been published yet. Open the portal builder and click Publish.');
        } else if (status === '404') {
          setError('No portal found at this URL. Check the link and try again.');
        } else {
          setError('This portal is not available. It may have been unpublished or the URL is incorrect.');
        }
        setLoading(false);
      })
  }, [slug])

  if (loading) return <Spinner color={portal?.branding?.primary_color}/>
  if (error || !portal) return <ErrorScreen message={error}/>

  // Internal portal — require login
  if (portal.access_type === 'internal') {
    return <InternalPortalGate portal={portal} api={api}/>
  }

  // Public portal — render directly
  return (<>
    <PortalPageRenderer portal={portal} api={api}/>
    <CandidateCopilot portal={portal} api={api}/>
  </>);
}

// ─── Internal Portal Gate ─────────────────────────────────────────────────────
function InternalPortalGate({ portal, api }) {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [loginError, setLoginError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const br = portal.branding || portal.theme || {}
  const primary = br.primary_color || br.primaryColor || '#4361EE'
  const STORAGE_KEY = `vercentic_portal_user_${portal.id}`

  // Check if already logged in via sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const u = JSON.parse(saved)
        if (u?.id) {
          if (portal.allowed_roles?.length) {
            const roleSlug = u.role?.slug || ''
            if (portal.allowed_roles.includes(roleSlug) || roleSlug === 'super_admin' || roleSlug === 'admin') {
              setUser(u)
            } else {
              setLoginError('You do not have permission to access this portal.')
            }
          } else {
            setUser(u)
          }
        }
      }
    } catch {}
    setChecking(false)
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoggingIn(true)
    setLoginError('')
    try {
      const res = await api.post('/users/auth/login', { email, password })
      if (res?.id || res?.user?.id) {
        const u = res.user || res
        if (portal.allowed_roles?.length) {
          const roleSlug = u.role?.slug || ''
          if (!portal.allowed_roles.includes(roleSlug) && roleSlug !== 'super_admin' && roleSlug !== 'admin') {
            setLoginError('You do not have permission to access this portal.')
            setLoggingIn(false)
            return
          }
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(u))
        setUser(u)
      } else {
        setLoginError(res?.error || 'Invalid credentials')
      }
    } catch {
      setLoginError('Login failed. Please try again.')
    }
    setLoggingIn(false)
  }

  if (checking) return <Spinner color={primary}/>
  if (user) return (<><PortalPageRenderer portal={portal} api={api}/><CandidateCopilot portal={portal} api={api}/></>);

  // Login screen
  const font = br.font || "'Geist', sans-serif"
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:`linear-gradient(135deg, ${primary}08, ${primary}18)`, fontFamily:font }}>
      <div style={{ width:380, background:'white', borderRadius:16, boxShadow:'0 8px 32px rgba(0,0,0,.1)',
        overflow:'hidden' }}>
        <div style={{ padding:'32px 32px 0', textAlign:'center' }}>
          {br.logo_url && <img src={br.logo_url} alt="" style={{ height:36, marginBottom:16, objectFit:'contain' }}/>}
          <h2 style={{ margin:'0 0 6px', fontSize:20, fontWeight:800, color:'#0F1729' }}>
            {br.company_name || portal.name || 'Portal Login'}
          </h2>
          <p style={{ margin:'0 0 24px', fontSize:13, color:'#9CA3AF' }}>
            Sign in to access this portal
          </p>
        </div>
        <form onSubmit={handleLogin} style={{ padding:'0 32px 32px', display:'flex', flexDirection:'column', gap:12 }}>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email"
            style={{ padding:'10px 14px', borderRadius:8, border:'1.5px solid #E8ECF8', fontSize:14, fontFamily:font,
              outline:'none', width:'100%', boxSizing:'border-box' }} autoFocus/>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password"
            style={{ padding:'10px 14px', borderRadius:8, border:'1.5px solid #E8ECF8', fontSize:14, fontFamily:font,
              outline:'none', width:'100%', boxSizing:'border-box' }}/>
          {loginError && <div style={{ fontSize:12, color:'#EF4444', padding:'6px 10px', background:'#FEF2F2',
            borderRadius:6 }}>{loginError}</div>}
          <button type="submit" disabled={loggingIn || !email || !password}
            style={{ padding:'11px', borderRadius:8, border:'none', background:primary, color:'white',
              fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:font,
              opacity:(!email||!password||loggingIn)?0.5:1 }}>
            {loggingIn ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
