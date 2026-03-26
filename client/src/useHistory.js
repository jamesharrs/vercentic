// client/src/useHistory.js
import { useState, useCallback } from "react";

const MAX_HISTORY = 20;
const PINNED_KEY = "talentos_pinned";
const HISTORY_KEY = "talentos_history";

function loadPinned() {
  try { return JSON.parse(localStorage.getItem(PINNED_KEY) || "[]"); }
  catch { return []; }
}
function savePinned(p) {
  localStorage.setItem(PINNED_KEY, JSON.stringify(p));
}

export function useHistory() {
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
    catch { return []; }
  });
  const [pinned, setPinnedState] = useState(loadPinned);

  // Push a new entry — deduplicates by id+nav
  const push = useCallback((entry) => {
    setHistory(prev => {
      const next = [
        { ...entry, ts: Date.now() },
        ...prev.filter(e => !(e.id === entry.id && e.nav === entry.nav)),
      ].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  const togglePin = useCallback((entry) => {
    setPinnedState(prev => {
      const exists = prev.some(p => p.id === entry.id && p.nav === entry.nav);
      const next = exists
        ? prev.filter(p => !(p.id === entry.id && p.nav === entry.nav))
        : [{ ...entry }, ...prev].slice(0, 10);
      savePinned(next);
      return next;
    });
  }, []);

  const isPinned = useCallback((entry) =>
    pinned.some(p => p.id === entry.id && p.nav === entry.nav),
  [pinned]);

  return { history, pinned, push, clear, togglePin, isPinned };
}
