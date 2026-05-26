/**
 * slider-guard.vitest.js
 *
 * Unit tests for toSlider — the NaN guard used in useDecisionEngine to
 * convert user-supplied priority values into valid integers for the API.
 *
 * Bug context: priorities fields can be undefined/null when form fields are
 * not filled in. Number(undefined) = NaN, which would silently corrupt the
 * profile payload sent to the decision engine.
 */

import { describe, it, expect } from 'vitest';
import { toSlider } from '../../apps/search-ui/src/hooks/useDecisionEngine.js';

describe('toSlider — NaN guard for priority fields', () => {
  it('converts valid numbers to integers', () => {
    expect(toSlider(70)).toBe(70);
    expect(toSlider(0)).toBe(0);
    expect(toSlider(100)).toBe(100);
    expect(toSlider(55.7)).toBe(56); // rounds
  });

  it('converts numeric strings to integers', () => {
    expect(toSlider('80')).toBe(80);
    expect(toSlider('0')).toBe(0);
  });

  it('returns the fallback for undefined (the core NaN bug)', () => {
    expect(toSlider(undefined)).toBe(50);       // default fallback
    expect(toSlider(undefined, 70)).toBe(70);   // custom fallback
  });

  it('converts null to 0 (Number(null) = 0 is a valid finite value)', () => {
    // null is not a "missing" priority — Number(null) = 0, which is a valid slider value
    expect(toSlider(null)).toBe(0);
    expect(toSlider(null, 30)).toBe(0); // fallback is not used since 0 is finite
  });

  it('returns the fallback for NaN', () => {
    expect(toSlider(NaN)).toBe(50);
    expect(toSlider(NaN, 60)).toBe(60);
  });

  it('returns the fallback for non-numeric strings', () => {
    expect(toSlider('high')).toBe(50);   // Number('high') = NaN → fallback
  });

  it('converts empty string to 0 (Number("") = 0 is a valid finite value)', () => {
    expect(toSlider('')).toBe(0);        // Number('') = 0, not NaN
  });

  it('clamps values below 0 to 0', () => {
    expect(toSlider(-10)).toBe(0);
    expect(toSlider(-0.1)).toBe(0);
  });

  it('clamps values above 100 to 100', () => {
    expect(toSlider(150)).toBe(100);
    expect(toSlider(999)).toBe(100);
  });

  it('never returns NaN regardless of input', () => {
    const inputs = [undefined, null, NaN, '', 'abc', {}, [], Infinity, -Infinity];
    for (const input of inputs) {
      const result = toSlider(input);
      expect(isNaN(result)).toBe(false);
      expect(isFinite(result)).toBe(true);
      expect(typeof result).toBe('number');
    }
  });
});
