import { useState, useEffect } from 'react'
import PortalPageRenderer from './portals/PortalPageRenderer.jsx'
import api, { tFetch, API_ORIGIN } from './apiClient.js'

const Spinner = ({ color = '#4361EE' }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#EEF2FF' }}>
    <div style={{ width:40, height:40, border:`4px solid ${color}30`, borderTop:`4px solid ${color}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

const ErrorScreen = ({ message }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#FEF2F2', fontFamily:"'DM Sans', sans-serif" }}>
    <div style={{ textAlign:'center', maxWidth:440, padding:40 }}>
      <div style={{ width:64, height:64, borderRadius:'50%', background:'#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
      <h2 style={{ margin:'0 0 8px', fontSize:20, fontWeight:800, color:'#0F1729' }}>Portal Unavailable</h2>
      <p style={{ color:'#6B7280', fontSize:14, lineHeight:1.6 }}>{message}</p>
    </div>
  </div>
)

// ── Internal-portal login gate ────────────────────────────────────────────────
// Any portal with access_type === 'internal' (hiring-manager portals, agency
// portals, other logged-in-only tools) needs a real TalentOS user account —
// email + the same password they'd use to log into the main app. On success
// we store a short-lived portal session token (POST /api/portals/:id/session,
// 8h expiry, verified server-side against global._portalSessions in
// hm_portal.js/portals.js) in localStorage, keyed per portal id so a visitor
// with access to several internal portals doesn't get logged out of one by
// logging into another.
const tokenKey = (portalId) => `talentos_portal_token_${portalId}`

function PortalLoginScreen({ portal, onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const primary = portal.theme?.primaryColor || portal.branding?.primary_color || '#4361EE'
  const company = portal.branding?.company_name || portal.name || 'TalentOS'
  const logo = portal.branding?.logo_url

  const submit = async (e) => {
    e.preventDefault()
    if (!email || !password || busy) return
    setBusy(true); setError('')
    // NOTE: api.post never rejects/throws on a non-2xx response (see apiClient.js
    // handleMutationResponse) — it always resolves the parsed JSON body. So we
    // must check the resolved body for an `error` field / missing token
    // explicitly rather than relying on try/catch to catch a failed login.
    try {
      const res = await api.post(`/portals/${portal.id}/session`, { email, password })
      if (!res || res.error || !res.token) {
        setError(res?.error === 'Invalid credentials' ? 'Incorrect email or password.' : 'Unable to sign in right now — try again in a moment.')
        return
      }
      const sessionData = { token: res.token, expires_at: res.expires_at, user: res.user }
      localStorage.setItem(tokenKey(portal.id), JSON.stringify(sessionData))
      onSuccess(sessionData)
    } catch (err) {
      setError('Unable to sign in right now — try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F5F6FA', fontFamily:"'DM Sans', sans-serif", padding:20 }}>
      <form onSubmit={submit} style={{ width:'100%', maxWidth:380, background:'#fff', borderRadius:20, padding:'36px 32px', boxShadow:'0 20px 60px rgba(15,23,41,0.08)', border:'1px solid #EEF0F5' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:26, textAlign:'center' }}>
          {logo
            ? <img src={logo} alt={company} style={{ height:36, marginBottom:14, objectFit:'contain' }}/>
            : <div style={{ width:44, height:44, borderRadius:12, background:primary, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:18, marginBottom:14 }}>{company.slice(0,1).toUpperCase()}</div>
          }
          <div style={{ fontSize:18, fontWeight:800, color:'#0F1729' }}>{company}</div>
          <div style={{ fontSize:13, color:'#6B7280', marginTop:2 }}>Sign in to continue</div>
        </div>

        <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Email</label>
        <input type="email" autoFocus value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"
          style={{ width:'100%', boxSizing:'border-box', padding:'11px 14px', borderRadius:10, border:'1.5px solid #E5E7EB', fontSize:14, marginBottom:16, fontFamily:'inherit', outline:'none' }}
          onFocus={e=>e.target.style.borderColor=primary} onBlur={e=>e.target.style.borderColor='#E5E7EB'} />

        <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"
          style={{ width:'100%', boxSizing:'border-box', padding:'11px 14px', borderRadius:10, border:'1.5px solid #E5E7EB', fontSize:14, marginBottom:8, fontFamily:'inherit', outline:'none' }}
          onFocus={e=>e.target.style.borderColor=primary} onBlur={e=>e.target.style.borderColor='#E5E7EB'} />

        {error && <div style={{ fontSize:12.5, color:'#DC2626', background:'#FEF2F2', border:'1px solid #FEE2E2', borderRadius:8, padding:'8px 10px', marginTop:8, marginBottom:4 }}>{error}</div>}

        <button type="submit" disabled={busy || !email || !password}
          style={{ width:'100%', marginTop:16, padding:'12px', borderRadius:10, border:'none', background:primary, color:'#fff', fontWeight:700, fontSize:14, cursor: busy?'default':'pointer', opacity: (busy || !email || !password) ? 0.65 : 1, fontFamily:'inherit' }}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>

        <div style={{ fontSize:11.5, color:'#9CA3AF', textAlign:'center', marginTop:18 }}>This is a private, internal portal. Access is restricted to invited users.</div>
      </form>
    </div>
  )
}

export default function PortalApp({ slug }) {
  const [portal,  setPortal]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [session, setSession] = useState(null)   // { token, expires_at, user } once authenticated
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    if (!slug) {
      setError('No portal slug provided.')
      setLoading(false)
      return
    }

    // Strip leading slashes — /new-careers and new-careers both work
    const cleanSlug = slug.replace(/^\/+/, '')

    api.get(`/portals/slug/${cleanSlug}`)
      .then(p => {
        // Inject page title
        document.title = p.branding?.company_name || p.name || 'Portal'
        // Inject custom font if configured
        const font = p.theme?.fontFamily || p.branding?.font
        if (font) {
          const fontName = font.replace(/['"]/g, '').split(',')[0].trim()
          const link = document.createElement('link')
          link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700;800&display=swap`
          link.rel = 'stylesheet'
          document.head.appendChild(link)
        }
        setPortal(p)
        setLoading(false)
      })
      .catch(err => {
        const status = String(err?.status || err?.message || '')
        if (status === '403') {
          setError('This portal exists but has not been published yet. Open the portal builder and click Publish.')
        } else if (status === '404') {
          setError('No portal found at this URL. Check the link and try again.')
        } else if (status === '401') {
          setError('This portal is not available. It may have been unpublished or the URL is incorrect.')
        } else {
          setError('This portal is not available. It may have been unpublished or the URL is incorrect.')
        }
        setLoading(false)
      })
  }, [slug])

  // Once we know the portal, and it requires login, check for a still-valid
  // stored token before showing the login screen (avoids re-prompting on
  // every page load within the 8h session window).
  useEffect(() => {
    if (!portal || portal.access_type !== 'internal') { setCheckingSession(false); return }
    const raw = localStorage.getItem(tokenKey(portal.id))
    if (!raw) { setCheckingSession(false); return }
    let stored
    try { stored = JSON.parse(raw) } catch { localStorage.removeItem(tokenKey(portal.id)); setCheckingSession(false); return }
    if (!stored?.token || (stored.expires_at && new Date(stored.expires_at) < new Date())) {
      localStorage.removeItem(tokenKey(portal.id)); setCheckingSession(false); return
    }
    // NOTE: api.get's signature is (path) => fetch(...) — it does NOT accept a
    // second `{headers}` argument (silently ignored), so it can't be used to
    // send X-Portal-Token. tFetch does support custom headers, but it takes a
    // full URL (no auto '/api' prefix) and — like every method in apiClient —
    // never rejects on a non-2xx response, so we check the resolved body for
    // `.valid` explicitly rather than relying on .catch().
    tFetch(`${API_ORIGIN}/api/portals/${portal.id}/session`, { headers: { 'X-Portal-Token': stored.token } })
      .then(res => {
        if (res?.valid) { setSession(stored) }
        else { localStorage.removeItem(tokenKey(portal.id)) }
        setCheckingSession(false)
      })
      .catch(() => { localStorage.removeItem(tokenKey(portal.id)); setCheckingSession(false) })
  }, [portal])

  if (loading || (portal && portal.access_type === 'internal' && checkingSession)) {
    return <Spinner color={portal?.theme?.primaryColor || portal?.branding?.primary_color} />
  }
  if (error || !portal) return <ErrorScreen message={error || 'Portal not found.'} />

  if (portal.access_type === 'internal' && !session) {
    return <PortalLoginScreen portal={portal} onSuccess={setSession} />
  }

  // Lets a visitor switch accounts without reaching for DevTools — clears the
  // stored token for THIS portal only (other internal portals they're signed
  // into keep their own session, per the per-portal-id key scheme above) and
  // drops back to the login screen.
  const handleLogout = () => {
    localStorage.removeItem(tokenKey(portal.id))
    setSession(null)
  }

  return <PortalPageRenderer portal={portal} api={api} portalSession={session} onLogout={handleLogout} />
}
