import { describe, it, expect } from 'vitest';
import { isDecisionFresh, DECISION_HISTORY_MAX_AGE_MS } from '../../apps/search-ui/src/hooks/useDecisionHistory.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe('isDecisionFresh', () => {
  it('returns false for null history', () => {
    expect(isDecisionFresh(null)).toBe(false);
  });

  it('returns false for undefined history', () => {
    expect(isDecisionFresh(undefined)).toBe(false);
  });

  it('returns false when savedAt is missing', () => {
    expect(isDecisionFresh({})).toBe(false);
    expect(isDecisionFresh({ cards: {} })).toBe(false);
  });

  it('returns false when savedAt is not a string', () => {
    expect(isDecisionFresh({ savedAt: 12345 })).toBe(false);
  });

  it('returns true for a decision saved 1 hour ago', () => {
    const savedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(isDecisionFresh({ savedAt })).toBe(true);
  });

  it('returns true for a decision saved 6 days ago', () => {
    const savedAt = new Date(Date.now() - 6 * ONE_DAY_MS).toISOString();
    expect(isDecisionFresh({ savedAt })).toBe(true);
  });

  it('returns false for a decision saved 8 days ago', () => {
    const savedAt = new Date(Date.now() - 8 * ONE_DAY_MS).toISOString();
    expect(isDecisionFresh({ savedAt })).toBe(false);
  });

  it('returns false exactly at the max age boundary', () => {
    const savedAt = new Date(Date.now() - DECISION_HISTORY_MAX_AGE_MS).toISOString();
    expect(isDecisionFresh({ savedAt }, Date.now())).toBe(false);
  });

  it('respects a custom nowMs parameter', () => {
    const savedAt = new Date(1_000_000).toISOString(); // very old absolute date
    // Pass a nowMs that is only 1 hour later → fresh
    expect(isDecisionFresh({ savedAt }, 1_000_000 + 60 * 60 * 1000)).toBe(true);
    // Pass a nowMs that is 8 days later → stale
    expect(isDecisionFresh({ savedAt }, 1_000_000 + 8 * ONE_DAY_MS)).toBe(false);
  });

  it('DECISION_HISTORY_MAX_AGE_MS is 7 days', () => {
    expect(DECISION_HISTORY_MAX_AGE_MS).toBe(7 * ONE_DAY_MS);
  });
});
