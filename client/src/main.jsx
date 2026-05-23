import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ToastProvider } from './Toast.jsx'
import { I18nProvider } from './i18n/I18nContext.jsx'
import { ConfirmProvider } from './ConfirmDialog.jsx'
import ErrorBoundary, { setupGlobalErrorHandlers } from './ErrorBoundary.jsx'
import { MobileShell } from './MobileApp.jsx'
import { getSession } from './usePermissions.js'
import { SpeedInsights } from '@vercel/speed-insights/react'

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
    const [envError, setEnvError] = React.useState(null);

    const loadEnv = React.useCallback(() => {
      setEnvError(null);
      // Use the authenticated apiClient so X-User-Id / X-Tenant-Slug headers
      // are attached — required for multi-tenant data scoping.
      import('./apiClient.js').then(({ default: api }) => {
        api.get('/environments')
          .then(envs => {
            if (Array.isArray(envs) && envs.length > 0) {
              setEnv(envs.find(e => e.is_default) || envs[0]);
            } else {
              setEnvError('No environments available for this account');
            }
          })
          .catch(err => {
            console.error('[mobile] env load failed', err);
            setEnvError(err?.message || 'Could not reach the server');
          });
      });
    }, []);

    React.useEffect(() => { loadEnv(); }, [loadEnv]);

    return (
      <MobileShell
        session={existingSession.user}
        environment={env}
        envError={envError}
        onRetryEnv={loadEnv}
        objects={[]}
      />
    );
  };

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ToastProvider>
        <MobileRoot />
      </ToastProvider>
    </React.StrictMode>
  );
} else {
  // Desktop — render full app as before
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <ToastProvider>
          <ConfirmProvider>
          <I18nProvider>
            <App />
            <SpeedInsights />
          </I18nProvider>
          </ConfirmProvider>
        </ToastProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
