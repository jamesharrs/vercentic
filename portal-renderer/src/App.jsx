import { useState, useEffect } from 'react'
import CareerSite from './portals/CareerSite.jsx'
import HMPortal from './portals/HMPortal.jsx'
import AgencyPortal from './portals/AgencyPortal.jsx'
import OnboardingPortal from './portals/OnboardingPortal.jsx'
import PortalPageRenderer from './portals/PortalPageRenderer.jsx'
import CohortPortal from './portals/CohortPortal.jsx'
import BotInterview from './BotInterview.jsx'
import CandidateCopilot from './CandidateCopilot.jsx'

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
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#FEF2F2', fontFamily:"'DM Sans', sans-serif" }}>
    <div style={{ textAlign:'center', maxWidth:400, padding:40 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
      <h2 style={{ margin:'0 0 8px', fontSize:20, fontWeight:800, color:'#0F1729' }}>Portal Unavailable</h2>
      <p style={{ color:'#6B7280', fontSize:14 }}>{message}</p>
    </div>
  </div>
)

export default function App() {
  const [portal, setPortal] = useState(null)
  const [objects, setObjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Bot interview route — /bot/:token (no portal token needed)
  const botToken = window.location.pathname.match(/^\/bot\/(.+)$/)?.[1];
  if (botToken) return <BotInterview token={botToken}/>;

  // Read slug from URL: ?portal=SLUG or /portal/SLUG
  // Strip leading slashes so ?portal=/careers and ?portal=careers both work
  const _qs = new URLSearchParams(window.location.search).get('portal')
  const _path = window.location.pathname
  const rawToken = _qs
    || _path.split('/portal/')[1]
    || (_path !== '/' ? _path : null)
  const token = rawToken?.replace(/^\/+/, '') || ''

  useEffect(() => {
    if (!token) { setError('No portal provided. Add ?portal=YOUR_SLUG to the URL.'); setLoading(false); return; }
    api.get(`/portals/slug/${token}`)
      .then(async p => {
        setPortal(p)
        // Inject branding into document
        document.title = p.branding?.company_name || p.name || 'Portal'
        if (p.branding?.font) {
          const link = document.createElement('link')
          link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(p.branding.font)}:wght@400;500;600;700;800&display=swap`
          link.rel = 'stylesheet'
          document.head.appendChild(link)
        }
        // Load objects for this environment
        const objs = await api.get(`/objects?environment_id=${p.environment_id}`)
        setObjects(Array.isArray(objs) ? objs : [])
        setLoading(false)
      })
      .catch(() => { setError('This portal is not available. It may have been unpublished or the link is invalid.'); setLoading(false); })
  }, [token])

  if (loading) return <Spinner color={portal?.branding?.primary_color}/>
  if (error || !portal) return <ErrorScreen message={error}/>

  // Optional viewer identity — passed via ?as=email@company.com on the URL.
  // Used by the HM portal Share Inbox widget to identify the recipient.
  const viewerEmail = new URLSearchParams(window.location.search).get('as') || null;

  const props = { portal, objects, api, viewerEmail }
  const PortalComponent = {
    career_site:    CareerSite,
    hm_portal:      HMPortal,
    agency_portal:  AgencyPortal,
    onboarding:     OnboardingPortal,
    campaign:       PortalPageRenderer,
    page_builder:   PortalPageRenderer,
    cohort:         CohortPortal,
  }[portal.type];

  if (!PortalComponent) return <ErrorScreen message={`Unknown portal type: ${portal.type}`}/>;

  // The candidate-facing copilot is deliberately NOT shown on the Hiring
  // Manager Portal — it has its own, more capable internal assistant
  // (session-gated, sees the whole job history) built into hm_portal's
  // "New Role → Ask the assistant" flow instead. See POST /:id/hm/chat
  // in server/routes/hm_portal.js for why it needs to be a separate,
  // higher-privilege endpoint rather than reusing this one.
  return (
    <>
      <PortalComponent {...props}/>
      {portal.type !== 'hm_portal' && <CandidateCopilot portal={portal} api={api} />}
    </>
  );
}
