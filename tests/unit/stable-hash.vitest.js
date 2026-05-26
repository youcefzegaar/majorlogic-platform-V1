/**
 * stable-hash.vitest.js
 *
 * Unit tests for _stableStringify — the key-order-independent serializer used
 * by the orchestrator to build cache keys that are stable regardless of how
 * callers construct their input objects.
 */

import { describe, it, expect } from 'vitest';
import { _stableStringify } from '../../packages/decision-orchestrator/src/index.js';

describe('_stableStringify', () => {
  it('serializes primitives the same as JSON.stringify', () => {
    expect(_stableStringify(42)).toBe('42');
    expect(_stableStringify('hello')).toBe('"hello"');
    expect(_stableStringify(true)).toBe('true');
    expect(_stableStringify(null)).toBe('null');
    expect(_stableStringify(3.14)).toBe('3.14');
  });

  it('sorts object keys alphabetically', () => {
    const result = _stableStringify({ z: 1, a: 2, m: 3 });
    expect(result).toBe('{"a":2,"m":3,"z":1}');
  });

  it('produces identical output for the same object regardless of key insertion order', () => {
    const objABC = { a: 1, b: 2, c: 3 };
    const objCBA = { c: 3, b: 2, a: 1 };
    const objBAC = { b: 2, a: 1, c: 3 };

    const base = _stableStringify(objABC);
    expect(_stableStringify(objCBA)).toBe(base);
    expect(_stableStringify(objBAC)).toBe(base);
  });

  it('sorts nested object keys recursively', () => {
    const obj = { z: { y: 1, x: 2 }, a: { d: 3, b: 4 } };
    const result = _stableStringify(obj);
    // Top-level: a before z; nested: b before d, x before y
    expect(result).toBe('{"a":{"b":4,"d":3},"z":{"x":2,"y":1}}');
  });

  it('produces identical output for the same nested object with different key order at every level', () => {
    const v1 = { profile: { budget: 1000, needs: 'coding' }, filters: { os: 'windows', ram: 16 } };
    const v2 = { filters: { ram: 16, os: 'windows' }, profile: { needs: 'coding', budget: 1000 } };

    expect(_stableStringify(v1)).toBe(_stableStringify(v2));
  });

  it('preserves array element order (arrays are NOT sorted)', () => {
    expect(_stableStringify([3, 1, 2])).toBe('[3,1,2]');
    expect(_stableStringify([3, 1, 2])).not.toBe('[1,2,3]');
  });

  it('handles arrays of objects with stable inner serialization', () => {
    const arr1 = [{ b: 2, a: 1 }, { d: 4, c: 3 }];
    const arr2 = [{ a: 1, b: 2 }, { c: 3, d: 4 }];
    expect(_stableStringify(arr1)).toBe(_stableStringify(arr2));
  });

  it('handles deeply nested mixed structure', () => {
    const obj = {
      z: [{ y: true, x: null }, 42],
      a: { nested: { last: 'z', first: 'a' } }
    };
    const result = _stableStringify(obj);
    // a before z at top level; first before last inside nested
    expect(result).toBe('{"a":{"nested":{"first":"a","last":"z"}},"z":[{"x":null,"y":true},42]}');
  });

  it('two calls with the same data always produce the same string', () => {
    const data = { budget: 1200, requirements: { ram: 16, storage: 512 }, domainId: 'laptop-student-us' };
    expect(_stableStringify(data)).toBe(_stableStringify(data));
  });

  it('different data produces different strings', () => {
    const a = { budget: 1000, ram: 8  };
    const b = { budget: 1000, ram: 16 };
    expect(_stableStringify(a)).not.toBe(_stableStringify(b));
  });
});
