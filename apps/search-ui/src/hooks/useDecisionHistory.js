import { useLocalStorage } from './useLocalStorage';

const KEY = 'ml_last_decision_v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function useDecisionHistory() {
  const [history, setHistory] = useLocalStorage(KEY, null);

  const isFresh = history != null
    && typeof history.savedAt === 'string'
    && (Date.now() - new Date(history.savedAt).getTime()) < MAX_AGE_MS;

  const saveDecision = (snapshot) => {
    setHistory({ ...snapshot, savedAt: new Date().toISOString() });
  };

  const clearHistory = () => setHistory(null);

  return {
    lastDecision: isFresh ? history : null,
    saveDecision,
    clearHistory,
  };
}

// ── Pure helper for tests ────────────────────────────────────────────────────

export function isDecisionFresh(history, nowMs = Date.now()) {
  if (!history || typeof history.savedAt !== 'string') return false;
  return (nowMs - new Date(history.savedAt).getTime()) < MAX_AGE_MS;
}

export const DECISION_HISTORY_MAX_AGE_MS = MAX_AGE_MS;
