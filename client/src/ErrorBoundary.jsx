// client/src/ErrorBoundary.jsx
import { Component } from 'react';

const F = "'DM Sans', -apple-system, sans-serif";

function generateCode() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ERR-${ts}-${rand}`;
}

async function reportError({ code, message, stack, component, severity = 'error', extra = {} }) {
  try {
    const session = (() => {
      try { return JSON.parse(sessionStorage.getItem('talentos_session') || '{}'); }
      catch { return {}; }
    })();
    await fetch('/api/error-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code, message, stack, component, severity,
        url: window.location.href,
        user_id: session.user?.id || null,
        user_email: session.user?.email || null,
        environment_id: session.environment?.id || null,
        environment_name: session.environment?.name || null,
        extra,
      }),
    });
  } catch { /* never let error reporting break anything */ }
}

function ErrorOverlay({ code, onRetry, onHome }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'#f8f9fc', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F, zIndex:99999 }}>
      <div style={{ maxWidth:480, width:'100%', padding:'40px 32px', background:'white', borderRadius:20, boxShadow:'0 8px 40px rgba(0,0,0,0.1)', textAlign:'center' }}>
        <div style={{ width:64, height:64, borderRadius:16, background:'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2 style={{ margin:'0 0 8px', fontSize:22, fontWeight:800, color:'#111827' }}>Something went wrong</h2>
        <p style={{ margin:'0 0 20px', fontSize:14, color:'#6B7280', lineHeight:1.6 }}>
          An unexpected error occurred. The issue has been automatically reported to our team.
        </p>
        <div style={{ background:'#F3F4F6', borderRadius:8, padding:'10px 16px', fontFamily:'ui-monospace, monospace', fontSize:13, color:'#374151', marginBottom:24, display:'inline-block' }}>
          Reference: <strong>{code}</strong>
        </div>
        <p style={{ margin:'0 0 24px', fontSize:12, color:'#9CA3AF' }}>Quote this code if you contact support.</p>
        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          <button onClick={onHome} style={{ padding:'10px 20px', borderRadius:10, border:'1.5px solid #E5E7EB', background:'white', color:'#374151', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:F }}>← Go home</button>
          <button onClick={onRetry} style={{ padding:'10px 20px', borderRadius:10, border:'none', background:'#4361EE', color:'white', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:F }}>Try again</button>
        </div>
      </div>
    </div>
  );
}

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, code: null }; }

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error, info) {
    const code = generateCode();
    this.setState({ code });
    reportError({
      code,
      message: error.message || String(error),
      stack: error.stack,
      component: info.componentStack?.split('\n')[1]?.trim() || null,
      severity: 'error',
      extra: { componentStack: info.componentStack },
    });
    console.error('[Vercentic Error]', code, error);
  }

  handleRetry = () => this.setState({ hasError: false, code: null });
  handleHome  = () => { this.setState({ hasError: false, code: null }); window.location.href = '/'; };

  render() {
    if (this.state.hasError) {
      return <ErrorOverlay code={this.state.code} onRetry={this.handleRetry} onHome={this.handleHome} />;
    }
    return this.props.children;
  }
}

export function setupGlobalErrorHandlers() {
  window.addEventListener('error', (e) => {
    if (!e.message || e.message === 'Script error.' || e.message === 'ResizeObserver loop limit exceeded') return;
    reportError({ code: generateCode(), message: e.message, stack: e.error?.stack, component: `${e.filename}:${e.lineno}`, severity: 'error' });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const message = e.reason?.message || String(e.reason) || 'Unhandled promise rejection';
    reportError({ code: generateCode(), message, stack: e.reason?.stack, component: 'Promise', severity: 'error' });
  });
}

export function logError(message, extra = {}) {
  const code = generateCode();
  reportError({ code, message: String(message), severity: 'error', extra });
  return code;
}

export function logWarning(message, extra = {}) {
  const code = generateCode();
  reportError({ code, message: String(message), severity: 'warning', extra });
  return code;
}
