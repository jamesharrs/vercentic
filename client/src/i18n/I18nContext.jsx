import { createContext, useContext, useState, useCallback, useEffect } from "react";
import en from "./en.js";

// ── Registry of available languages ─────────────────────────────────────────
export const LANGUAGES = [
  { code: "en", label: "English",    flag: "🇬🇧", dir: "ltr" },
  { code: "ar", label: "العربية",    flag: "🇦🇪", dir: "rtl" },
  { code: "fr", label: "Français",   flag: "🇫🇷", dir: "ltr" },
  { code: "de", label: "Deutsch",    flag: "🇩🇪", dir: "ltr" },
  { code: "es", label: "Español",    flag: "🇪🇸", dir: "ltr" },
  { code: "pt", label: "Português",  flag: "🇧🇷", dir: "ltr" },
];

// ── Translation cache — populated lazily by generateTranslations ─────────────
const translationCache = { en };

// ── Deep-get a dot-path value from an object ─────────────────────────────────
function deepGet(obj, path) {
  return path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

// ── Context ──────────────────────────────────────────────────────────────────
const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => localStorage.getItem("talentos_locale") || "en");
  const [translations, setTranslations] = useState(translationCache[locale] || en);
  const [generating, setGenerating] = useState(false);

  // Persist locale choice
  useEffect(() => {
    localStorage.setItem("talentos_locale", locale);
    // Apply RTL/LTR to document
    const lang = LANGUAGES.find(l => l.code === locale);
    document.documentElement.dir  = lang?.dir  || "ltr";
    document.documentElement.lang = locale;
  }, [locale]);

  // Switch to a loaded locale
  const switchLocale = useCallback((code) => {
    if (translationCache[code]) {
      setLocale(code);
      setTranslations(translationCache[code]);
    }
  }, []);

  // Generate translations via backend proxy for a target language
  const generateTranslations = useCallback(async (targetCode) => {
    const lang = LANGUAGES.find(l => l.code === targetCode);
    if (!lang || translationCache[targetCode]) {
      switchLocale(targetCode);
      return true;
    }
    setGenerating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetLanguage: lang.label,
          targetCode,
          strings: en,
        })
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      if (!data.translated) throw new Error('No translation returned');
      translationCache[targetCode] = data.translated;
      switchLocale(targetCode);
      return true;
    } catch (e) {
      console.error('Translation failed:', e);
      return false;
    } finally {
      setGenerating(false);
    }
  }, [switchLocale]);

  // t("dashboard.goodMorning") → string in active locale
  const t = useCallback((path, vars = {}) => {
    let str = deepGet(translations, path) ?? deepGet(en, path) ?? path;
    Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{${k}}`, v); });
    return str;
  }, [translations]);

  const isRTL = LANGUAGES.find(l => l.code === locale)?.dir === "rtl";

  return (
    <I18nContext.Provider value={{ locale, translations, t, switchLocale, generateTranslations, generating, isRTL, LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
