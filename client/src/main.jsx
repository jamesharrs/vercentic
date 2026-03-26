import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ToastProvider } from './Toast.jsx'
import { I18nProvider } from './i18n/I18nContext.jsx'
import ErrorBoundary, { setupGlobalErrorHandlers } from './ErrorBoundary.jsx'
import { MobileShell } from './MobileApp.jsx'
import { getSession } from './usePermissions.js'

setupGlobalErrorHandlers();

// ─── Mobile-first render decision ────────────────────────────────────────────
// Check BEFORE React mounts the full desktop app so there is zero flash.
// If the user is on a narrow screen and already has a session, we skip the
// entire desktop component tree and render the mobile shell directly.
const isMobileDevice = window.innerWidth < 768;
const existingSession = isMobileDevice ? getSession() : null;

if (isMobileDevice && existingSession) {
  // Render the lightweight mobile shell immediately — no desktop code loads
  const MobileRoot = () => {
    const [env, setEnv] = React.useState(null);

    React.useEffect(() => {
      // Load the default environment quietly in the background
      fetch('/api/environments')
        .then(r => r.json())
        .then(envs => {
          if (Array.isArray(envs) && envs.length > 0) {
            setEnv(envs.find(e => e.is_default) || envs[0]);
          }
        })
        .catch(() => {});
    }, []);

    return (
      <MobileShell
        session={existingSession.user}
        environment={env}
        objects={[]}
      />
    );
  };

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <MobileRoot />
    </React.StrictMode>
  );
} else {
  // Desktop — render full app as before
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <ToastProvider>
          <I18nProvider>
            <App />
          </I18nProvider>
        </ToastProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
