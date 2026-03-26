import { createContext, useContext, useState, useEffect } from "react";

// ─── Theme definitions ────────────────────────────────────────────────────────
export const SCHEMES = {
  default: {
    label: "Indigo",
    swatch: ["#0F1729", "#4361EE"],
    accent: "#4361EE",
    accentDark: "#0F1729",
    accentLight: "#EEF2FF",
    accentMid: "#7B93F5",
    gradient: "135deg, #0F1729, #4361EE",
  },
  ocean: {
    label: "Ocean",
    swatch: ["#0f4c75", "#00b4d8"],
    accent: "#00b4d8",
    accentDark: "#0f4c75",
    accentLight: "#e0f7fa",
    accentMid: "#48cae4",
    gradient: "135deg, #0f4c75, #00b4d8",
  },
  sunset: {
    label: "Sunset",
    swatch: ["#c9184a", "#ff7c43"],
    accent: "#c9184a",
    accentDark: "#6b0026",
    accentLight: "#ffe0eb",
    accentMid: "#e8577a",
    gradient: "135deg, #c9184a, #ff7c43",
  },
  forest: {
    label: "Forest",
    swatch: ["#1b4332", "#40916c"],
    accent: "#40916c",
    accentDark: "#1b4332",
    accentLight: "#d8f3dc",
    accentMid: "#74c69d",
    gradient: "135deg, #1b4332, #40916c",
  },
  violet: {
    label: "Violet",
    swatch: ["#4a0e8f", "#9b5de5"],
    accent: "#9b5de5",
    accentDark: "#4a0e8f",
    accentLight: "#f0e6ff",
    accentMid: "#b07cf5",
    gradient: "135deg, #4a0e8f, #9b5de5",
  },
};

export const FONTS = {
  geist:   { label: "Geist (Vercentic)", value: "'Geist', -apple-system, sans-serif" },
  dm:      { label: "DM Sans",  value: "'Geist', -apple-system, sans-serif" },
  inter:   { label: "Inter",    value: "'Inter', -apple-system, sans-serif" },
  jakarta: { label: "Jakarta",  value: "'Plus Jakarta Sans', -apple-system, sans-serif" },
  mono:    { label: "Mono",     value: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace" },
};

export const DENSITIES = {
  comfortable: { label: "Comfortable", base: 13, padding: 10, radius: 10 },
  compact:     { label: "Compact",     base: 12, padding:  7, radius:  8 },
};

const DEFAULT_PREFS = {
  scheme: "default",
  dark:   false,
  font:   "geist",
  density: "comfortable",
};

// ─── Context ──────────────────────────────────────────────────────────────────
export const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

// ─── CSS injection ────────────────────────────────────────────────────────────
function applyTheme(prefs) {
  const s = SCHEMES[prefs.scheme] || SCHEMES.default;
  const dark = prefs.dark;
  const d = DENSITIES[prefs.density] || DENSITIES.comfortable;

  const vars = {
    "--t-accent":       s.accent,
    "--t-accent-dark":  s.accentDark,
    "--t-accent-light": s.accentLight,
    "--t-accent-mid":   s.accentMid,
    "--t-gradient":     s.gradient,

    "--t-bg":         dark ? "#0f1117" : "#EEF2FF",
    "--t-surface":    dark ? "#1a1d27" : "#ffffff",
    "--t-surface2":   dark ? "#22262f" : "#F5F7FF",
    "--t-surface3":   dark ? "#2a2f3a" : "#EEF2FF",
    "--t-border":     dark ? "#2e3340" : "#E8ECF8",
    "--t-border2":    dark ? "#383d4a" : "#E8ECF8",

    "--t-text1":      dark ? "#f0f0f5" : "#0F1729",
    "--t-text2":      dark ? "#9ba3b5" : "#4B5675",
    "--t-text3":      dark ? "#6b7480" : "#9DA8C7",

    "--t-nav-bg":       dark ? "#13161f" : "#ffffff",
    "--t-nav-active":   dark ? `${s.accent}22` : `${s.accentLight}`,
    "--t-nav-active-c": s.accent,
    "--t-nav-text":     dark ? "#9ba3b5" : "#6b7280",

    "--t-font":       FONTS[prefs.font]?.value || FONTS.dm.value,
    "--t-base":       d.base + "px",
    "--t-pad":        d.padding + "px",
    "--t-radius":     d.radius + "px",
  };

  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }) {
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem("talentos_theme");
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch { return DEFAULT_PREFS; }
  });

  useEffect(() => {
    applyTheme(prefs);
    localStorage.setItem("talentos_theme", JSON.stringify(prefs));
  }, [prefs]);

  const update = (key, value) => setPrefs(p => ({ ...p, [key]: value }));

  return (
    <ThemeContext.Provider value={{ prefs, update, schemes: SCHEMES, fonts: FONTS, densities: DENSITIES }}>
      {children}
    </ThemeContext.Provider>
  );
}
