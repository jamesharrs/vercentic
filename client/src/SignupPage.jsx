/**
 * SignupPage.jsx — Public self-serve signup flow
 * Route: /signup (no auth required)
 * Flow: Plan → Details → Payment (fake) → Provisioning → Done
 */
import { useState } from "react";

const F = "'Plus Jakarta Sans', 'DM Sans', sans-serif";
const C = {
  bg: "#F4F6FB", surface: "#fff", accent: "#6941C6",
  accentLight: "#F4EEFF", border: "#E5E7EB",
  text1: "#111827", text2: "#374151", text3: "#9CA3AF",
  green: "#059669", error: "#DC2626",
};

const PLANS = [
  {
    id: "starter", name: "Starter", price: 49, period: "mo",
    desc: "Perfect for small teams getting started",
    features: ["Up to 5 users", "500 candidate records", "Core ATS features", "Email support"],
    color: "#3B82F6", popular: false,
  },
  {
    id: "growth", name: "Growth", price: 149, period: "mo",
    desc: "For growing recruitment teams",
    features: ["Up to 20 users", "5,000 candidates", "AI Copilot & matching", "Workflows & automation", "Priority support"],
    color: "#6941C6", popular: true,
  },
  {
    id: "pro", name: "Pro", price: 399, period: "mo",
    desc: "Full platform for large teams",
    features: ["Unlimited users", "Unlimited records", "All AI features", "Custom portals", "Dedicated onboarding"],
    color: "#059669", popular: false,
  },
];

const STEPS = ["Plan", "Account", "Payment", "Done"];

function StepBar({ step }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 40 }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 13, fontWeight: 700, fontFamily: F,
              background: i < step ? C.accent : i === step ? C.accent : C.border,
              color: i <= step ? "white" : C.text3,
              transition: "all .2s",
            }}>
              {i < step ? (
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              ) : i + 1}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: i <= step ? C.accent : C.text3, fontFamily: F }}>{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ width: 60, height: 2, background: i < step ? C.accent : C.border, margin: "0 6px", marginBottom: 20, transition: "background .2s" }}/>
          )}
        </div>
      ))}
    </div>
  );
}

function PlanCard({ plan, selected, onSelect }) {
  return (
    <div onClick={() => onSelect(plan.id)}
      style={{
        border: `2px solid ${selected ? plan.color : C.border}`,
        borderRadius: 16, padding: "24px 20px", cursor: "pointer", position: "relative",
        background: selected ? `${plan.color}08` : "white", transition: "all .15s",
        boxShadow: selected ? `0 0 0 4px ${plan.color}20` : "none",
        flex: 1, minWidth: 200,
      }}>
      {plan.popular && (
        <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
          background: plan.color, color: "white", fontSize: 10, fontWeight: 700,
          padding: "3px 12px", borderRadius: 99, fontFamily: F, letterSpacing: "0.05em",
          textTransform: "uppercase" }}>
          Most Popular
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: plan.color }}/>
        <span style={{ fontSize: 16, fontWeight: 800, color: C.text1, fontFamily: F }}>{plan.name}</span>
      </div>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 32, fontWeight: 900, color: plan.color, fontFamily: F }}>${plan.price}</span>
        <span style={{ fontSize: 13, color: C.text3, fontFamily: F }}>/{plan.period}</span>
      </div>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 16, fontFamily: F }}>{plan.desc}</div>
      {plan.features.map(f => (
        <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth={2.5} strokeLinecap="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span style={{ fontSize: 12, color: C.text2, fontFamily: F }}>{f}</span>
        </div>
      ))}
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, error, hint, required }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text2, marginBottom: 6, fontFamily: F }}>
        {label}{required && <span style={{ color: C.error }}> *</span>}
      </label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${error ? C.error : C.border}`,
          fontSize: 14, fontFamily: F, color: C.text1, outline: "none", boxSizing: "border-box",
          background: "white", transition: "border .15s",
        }}
        onFocus={e => { e.target.style.borderColor = error ? C.error : C.accent; }}
        onBlur={e => { e.target.style.borderColor = error ? C.error : C.border; }}
      />
      {error && <div style={{ fontSize: 12, color: C.error, marginTop: 4, fontFamily: F }}>{error}</div>}
      {hint && !error && <div style={{ fontSize: 12, color: C.text3, marginTop: 4, fontFamily: F }}>{hint}</div>}
    </div>
  );
}

export default function SignupPage() {
  const [step,     setStep]     = useState(0);
  const [plan,     setPlan]     = useState("growth");
  const [form,     setForm]     = useState({ company: "", firstName: "", lastName: "", email: "", password: "", confirmPassword: "" });
  const [payment,  setPayment]  = useState({ card: "", expiry: "", cvc: "", name: "" });
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [serverErr,setServerErr]= useState("");

  const selectedPlan = PLANS.find(p => p.id === plan);

  function validateAccount() {
    const e = {};
    if (!form.company.trim()) e.company = "Company name is required";
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email is required";
    if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validatePayment() {
    const e = {};
    if (!payment.name.trim()) e.name = "Cardholder name is required";
    const rawCard = payment.card.replace(/\s/g, "");
    if (rawCard.length < 15) e.card = "Enter a valid card number";
    if (!payment.expiry.match(/^\d{2}\/\d{2}$/)) e.expiry = "Format: MM/YY";
    if (!payment.cvc.match(/^\d{3,4}$/)) e.cvc = "3 or 4 digits";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function fmtCard(v) {
    return v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})/g, "$1 ").trim();
  }
  function fmtExpiry(v) {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? d.slice(0,2) + "/" + d.slice(2) : d;
  }

  async function handleProvision() {
    if (!validatePayment()) return;
    setLoading(true);
    setServerErr("");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company:     form.company.trim(),
          firstName:   form.firstName.trim(),
          lastName:    form.lastName.trim(),
          email:       form.email.trim().toLowerCase(),
          password:    form.password,
          plan:        plan,
          // Fake payment token — replace with Stripe paymentMethodId later
          payment_token: `fake_${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");
      setResult(data);
      setStep(3);
    } catch (err) {
      setServerErr(err.message);
    }
    setLoading(false);
  }

  // ── Step 0: Plan ──────────────────────────────────────────────────────────
  const StepPlan = () => (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text1, marginBottom: 6, fontFamily: F }}>Choose your plan</h2>
      <p style={{ fontSize: 14, color: C.text3, marginBottom: 28, fontFamily: F }}>All plans include a 14-day free trial. No credit card needed to start.</p>
      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
        {PLANS.map(p => <PlanCard key={p.id} plan={p} selected={plan === p.id} onSelect={setPlan}/>)}
      </div>
      <button onClick={() => setStep(1)} style={btnStyle(selectedPlan?.color || C.accent)}>
        Continue with {selectedPlan?.name} →
      </button>
    </div>
  );

  // ── Step 1: Account details ───────────────────────────────────────────────
  const StepAccount = () => (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text1, marginBottom: 6, fontFamily: F }}>Create your account</h2>
      <p style={{ fontSize: 14, color: C.text3, marginBottom: 28, fontFamily: F }}>This will be the admin account for your Vercentic environment.</p>
      <Field label="Company name" value={form.company} onChange={v => setForm({...form,company:v})} placeholder="Acme Corp" error={errors.company} required/>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}><Field label="First name" value={form.firstName} onChange={v => setForm({...form,firstName:v})} placeholder="James" error={errors.firstName} required/></div>
        <div style={{ flex: 1 }}><Field label="Last name" value={form.lastName} onChange={v => setForm({...form,lastName:v})} placeholder="Harrison" error={errors.lastName}/></div>
      </div>
      <Field label="Work email" type="email" value={form.email} onChange={v => setForm({...form,email:v})} placeholder="james@acme.com" error={errors.email} required/>
      <Field label="Password" type="password" value={form.password} onChange={v => setForm({...form,password:v})} placeholder="Min. 8 characters" error={errors.password} hint="At least 8 characters" required/>
      <Field label="Confirm password" type="password" value={form.confirmPassword} onChange={v => setForm({...form,confirmPassword:v})} placeholder="Repeat password" error={errors.confirmPassword} required/>
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={() => setStep(0)} style={btnOutline}>← Back</button>
        <button onClick={() => { if (validateAccount()) setStep(2); }} style={btnStyle(selectedPlan?.color || C.accent)}>
          Continue →
        </button>
      </div>
    </div>
  );

  // ── Step 2: Payment ───────────────────────────────────────────────────────
  const StepPayment = () => (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text1, marginBottom: 4, fontFamily: F }}>Payment details</h2>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99,
        background: "#FEF9C3", border: "1px solid #FDE047", marginBottom: 24 }}>
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#CA8A04" strokeWidth={2} strokeLinecap="round">
          <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#92400E", fontFamily: F }}>Test mode — any card details are accepted</span>
      </div>
      <div style={{ background: "#F9FAFB", borderRadius: 12, padding: "20px", marginBottom: 20, border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: C.text2, fontFamily: F }}>{selectedPlan?.name} plan</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text1, fontFamily: F }}>${selectedPlan?.price}/mo</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: C.text3, fontFamily: F }}>14-day free trial</span>
          <span style={{ fontSize: 12, color: C.green, fontWeight: 600, fontFamily: F }}>First charge after trial</span>
        </div>
      </div>
      <Field label="Cardholder name" value={payment.name} onChange={v => setPayment({...payment,name:v})} placeholder="James Harrison" error={errors.name} required/>
      <Field label="Card number" value={payment.card} onChange={v => setPayment({...payment,card:fmtCard(v)})} placeholder="1234 5678 9012 3456" error={errors.card} required/>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}><Field label="Expiry" value={payment.expiry} onChange={v => setPayment({...payment,expiry:fmtExpiry(v)})} placeholder="MM/YY" error={errors.expiry} required/></div>
        <div style={{ flex: 1 }}><Field label="CVC" value={payment.cvc} onChange={v => setPayment({...payment,cvc:v.replace(/\D/g,"").slice(0,4)})} placeholder="123" error={errors.cvc} required/></div>
      </div>
      {serverErr && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA",
          color: C.error, fontSize: 13, fontFamily: F, marginBottom: 16 }}>{serverErr}</div>
      )}
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={() => setStep(1)} style={btnOutline} disabled={loading}>← Back</button>
        <button onClick={handleProvision} style={btnStyle(selectedPlan?.color || C.accent)} disabled={loading}>
          {loading ? "Setting up your account…" : `Start 14-day trial →`}
        </button>
      </div>
      <p style={{ fontSize: 11, color: C.text3, marginTop: 14, textAlign: "center", fontFamily: F }}>
        🔒 Secured connection. By continuing you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );

  // ── Step 3: Done ──────────────────────────────────────────────────────────
  const StepDone = () => {
    const tenantSlug = result?.tenant_slug || result?.credentials?.tenant_slug;
    // Redirect to app.vercentic.com (the app) not www.vercentic.com (the marketing site)
    // Use ?tenant= so the login page routes the request to the right tenant store
    const appBase = window.location.hostname.includes('vercentic.com')
      ? 'https://app.vercentic.com'
      : ''; // local dev — same origin
    const loginUrl = tenantSlug ? `${appBase}/?tenant=${tenantSlug}` : `${appBase}/`;
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#DCFCE7",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth={2.5} strokeLinecap="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: C.text1, marginBottom: 8, fontFamily: F }}>You're all set! 🎉</h2>
        <p style={{ fontSize: 15, color: C.text2, marginBottom: 28, fontFamily: F }}>
          Your Vercentic environment is ready. Log in with <strong>{form.email}</strong>
        </p>
        <div style={{ background: "#F0FDF4", border: "1.5px solid #86EFAC", borderRadius: 12,
          padding: "20px 24px", marginBottom: 28, textAlign: "left" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 12,
            textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: F }}>Your login details</div>
          {[
            ["Environment URL", loginUrl || "Setting up…"],
            ["Email", form.email],
            ["Plan", selectedPlan?.name],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: C.text3, fontFamily: F }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text1, fontFamily: F }}>{v}</span>
            </div>
          ))}
        </div>
        <a href={loginUrl || "/"} style={{ display: "block", ...btnStyle(C.green), textDecoration: "none", textAlign: "center" }}>
          Go to my dashboard →
        </a>
      </div>
    );
  };

  const btnStyle = (bg) => ({
    flex: 1, padding: "12px 24px", borderRadius: 10, border: "none", background: bg,
    color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: F,
    transition: "opacity .15s", opacity: 1,
    onMouseEnter: e => { e.currentTarget.style.opacity = "0.85"; },
    onMouseLeave: e => { e.currentTarget.style.opacity = "1"; },
  });
  const btnOutline = {
    padding: "12px 20px", borderRadius: 10, border: `1.5px solid ${C.border}`,
    background: "white", color: C.text2, fontSize: 14, fontWeight: 600,
    cursor: "pointer", fontFamily: F,
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 16px", fontFamily: F }}>
      {/* Header */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontSize: 18, fontWeight: 900 }}>V</span>
          </div>
          <span style={{ fontSize: 22, fontWeight: 900, color: C.text1 }}>Vercentic</span>
        </div>
        <div style={{ fontSize: 12, color: C.text3 }}>AI-Powered Talent Acquisition Platform</div>
      </div>

      {/* Card */}
      <div style={{ background: "white", borderRadius: 20, padding: "40px 40px", boxShadow: "0 4px 40px rgba(0,0,0,.08)",
        width: "100%", maxWidth: step === 0 ? 820 : 520 }}>
        {step < 3 && <StepBar step={step}/>}
        {step === 0 && <StepPlan/>}
        {step === 1 && <StepAccount/>}
        {step === 2 && <StepPayment/>}
        {step === 3 && <StepDone/>}
      </div>

      {step < 3 && (
        <div style={{ marginTop: 24, fontSize: 13, color: C.text3, textAlign: "center" }}>
          Already have an account? <a href={window.location.hostname.includes('vercentic.com') ? 'https://app.vercentic.com/' : '/'} style={{ color: C.accent, fontWeight: 600 }}>Sign in</a>
        </div>
      )}
    </div>
  );
}
