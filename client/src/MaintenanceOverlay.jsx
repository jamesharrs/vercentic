import { useState, useEffect, useRef } from "react";

// ── Maintenance Overlay ─────────────────────────────────────────────────────
// Shows a full-screen overlay when the API server is unreachable (e.g. during
// Railway deployment). Polls /api/health every few seconds and auto-dismisses
// once the server responds again.
//
// Usage in App.jsx:
//   import MaintenanceOverlay from "./MaintenanceOverlay";
//   // Inside the App component render:
//   <MaintenanceOverlay apiUrl="/api/health" />

const POLL_INTERVAL_DOWN = 4000;   // Poll every 4s when API is down
const POLL_INTERVAL_UP   = 30000;  // Poll every 30s when API is up (background check)
const GRACE_PERIOD       = 3000;   // Wait 3s of failures before showing overlay (avoid flash)
const DISMISS_DELAY      = 1200;   // Keep "We're back!" message visible for 1.2s before fading

const FONT = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";

// Simple animated dots for "Updating..."
function PulsingDots() {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setDots(d => d >= 3 ? 1 : d + 1), 500);
    return () => clearInterval(t);
  }, []);
  return <span style={{ letterSpacing: 2 }}>{".".repeat(dots)}</span>;
}

// Animated progress bar (indeterminate)
function ProgressBar({ color = "#4361EE" }) {
  return (
    <div style={{
      width: 200, height: 3, borderRadius: 99, overflow: "hidden",
      background: `${color}22`, margin: "0 auto"
    }}>
      <div style={{
        width: "40%", height: "100%", borderRadius: 99,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        animation: "maintenance-slide 1.5s ease-in-out infinite",
      }} />
      <style>{`
        @keyframes maintenance-slide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        @keyframes maintenance-fade-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes maintenance-fade-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes maintenance-pulse {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        @keyframes maintenance-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Status icon SVGs
function StatusIcon({ status }) {
  if (status === "recovering") {
    return (
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "linear-gradient(135deg, #0CA678, #12B886)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 8px 32px rgba(12, 166, 120, 0.3)",
        animation: "maintenance-fade-in 0.4s ease"
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }

  return (
    <div style={{
      width: 56, height: 56, borderRadius: 16,
      background: "linear-gradient(135deg, #4361EE, #3B5BDB)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 8px 32px rgba(67, 97, 238, 0.25)",
    }}>
      {/* Refresh/sync icon with spin animation */}
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: "maintenance-spin 2s linear infinite" }}>
        <path d="M21 2v6h-6" />
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M3 22v-6h6" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      </svg>
    </div>
  );
}

export default function MaintenanceOverlay({ apiUrl = "/api/health" }) {
  const [apiDown, setApiDown]       = useState(false);  // true = API confirmed unreachable
  const [showOverlay, setShowOverlay] = useState(false); // true = overlay visible (after grace period)
  const [recovering, setRecovering] = useState(false);   // true = API just came back, showing "We're back!"
  const [fadeOut, setFadeOut]       = useState(false);   // true = fade-out animation playing
  const [downSince, setDownSince]   = useState(null);    // timestamp when API went down
  const [checkCount, setCheckCount] = useState(0);       // number of checks since going down

  const failStartRef = useRef(null);  // first failure timestamp (for grace period)
  const wasDownRef   = useRef(false); // track previous state to detect transitions

  useEffect(() => {
    let timer = null;
    let mounted = true;

    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const r = await fetch(apiUrl, { signal: controller.signal, cache: "no-store" });
        clearTimeout(timeout);

        if (r.ok) {
          // API is up
          if (wasDownRef.current) {
            // Transition: down → up — show "We're back!" briefly
            wasDownRef.current = false;
            if (mounted) {
              setRecovering(true);
              setApiDown(false);
              setCheckCount(0);
              setTimeout(() => {
                if (mounted) setFadeOut(true);
                setTimeout(() => {
                  if (mounted) {
                    setShowOverlay(false);
                    setRecovering(false);
                    setFadeOut(false);
                    setDownSince(null);
                  }
                }, 400);
              }, DISMISS_DELAY);
            }
          }
          failStartRef.current = null;
          if (mounted && !recovering) {
            setApiDown(false);
          }
          // Schedule next check (long interval when up)
          timer = setTimeout(checkHealth, POLL_INTERVAL_UP);
        } else {
          throw new Error(`HTTP ${r.status}`);
        }
      } catch (e) {
        // API is down
        const now = Date.now();
        if (!failStartRef.current) failStartRef.current = now;

        if (mounted) {
          setCheckCount(c => c + 1);

          // Only show overlay after grace period (avoid flash on transient errors)
          if (now - failStartRef.current >= GRACE_PERIOD) {
            if (!wasDownRef.current) {
              setDownSince(new Date());
              wasDownRef.current = true;
            }
            setApiDown(true);
            setShowOverlay(true);
          }
        }
        // Schedule next check (short interval when down)
        timer = setTimeout(checkHealth, POLL_INTERVAL_DOWN);
      }
    };

    checkHealth();
    return () => { mounted = false; clearTimeout(timer); };
  }, [apiUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render anything if overlay isn't needed
  if (!showOverlay) return null;

  const elapsed = downSince ? Math.floor((Date.now() - downSince.getTime()) / 1000) : 0;
  const elapsedStr = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "rgba(255, 255, 255, 0.92)",
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONT,
      animation: fadeOut ? "maintenance-fade-out 0.4s ease forwards" : "maintenance-fade-in 0.5s ease",
    }}>
      <div style={{
        textAlign: "center", maxWidth: 420, padding: "0 24px",
        animation: "maintenance-fade-in 0.6s ease",
      }}>
        {/* Icon */}
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "center" }}>
          <StatusIcon status={recovering ? "recovering" : "down"} />
        </div>

        {/* Title */}
        <h2 style={{
          margin: "0 0 8px", fontSize: 22, fontWeight: 800,
          color: recovering ? "#0CA678" : "#1a1a2e",
          letterSpacing: "-0.02em", lineHeight: 1.2,
        }}>
          {recovering ? "We're back!" : (
            <>Updating Vercentic<PulsingDots /></>
          )}
        </h2>

        {/* Subtitle */}
        <p style={{
          margin: "0 0 20px", fontSize: 14, lineHeight: 1.6,
          color: "#6b7280", fontWeight: 400,
        }}>
          {recovering
            ? "Everything is up and running. Resuming now."
            : "We're deploying an update. This usually takes less than a minute."
          }
        </p>

        {/* Progress bar (only when down) */}
        {!recovering && <ProgressBar />}

        {/* Status details (only when down) */}
        {!recovering && (
          <div style={{
            marginTop: 24, display: "flex", justifyContent: "center", gap: 24,
            fontSize: 12, color: "#9ca3af",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#F59F00",
                animation: "maintenance-pulse 1.5s ease-in-out infinite",
              }} />
              <span>Checking{checkCount > 1 ? ` (${checkCount})` : ""}</span>
            </div>
            {elapsed > 5 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{elapsedStr}</span>
              </div>
            )}
          </div>
        )}

        {/* Help text */}
        {!recovering && elapsed > 60 && (
          <p style={{
            marginTop: 20, fontSize: 12, color: "#9ca3af",
            background: "#f9fafb", borderRadius: 10, padding: "10px 16px",
            border: "1px solid #f0f0f0",
          }}>
            Taking longer than expected? Try refreshing the page.{" "}
            <a href="https://status.railway.com" target="_blank" rel="noreferrer"
              style={{ color: "#4361EE", textDecoration: "none", fontWeight: 600 }}>
              Check Railway status →
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
