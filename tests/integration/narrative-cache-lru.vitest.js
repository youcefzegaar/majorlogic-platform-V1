import { describe, it, expect, beforeEach } from 'vitest';
import { NarrativeCache } from '../../packages/decision-orchestrator/src/NarrativeCache.js';

describe('NarrativeCache — LRU + TTL', () => {
  let cache;

  beforeEach(() => {
    cache = new NarrativeCache(1000, 3); // TTL 1s, maxSize 3 for easy testing
  });

  it('returns null on cold miss', () => {
    expect(cache.get('ir1', 'in1', 'e1')).toBeNull();
  });

  it('stores and retrieves a narrative', () => {
    cache.set('ir1', 'in1', 'e1', 'Great choice for CS students.');
    expect(cache.get('ir1', 'in1', 'e1')).toBe('Great choice for CS students.');
  });

  it('evicts oldest entry when maxSize exceeded', () => {
    cache.set('ir1', 'in1', 'e1', 'story-1');
    cache.set('ir1', 'in1', 'e2', 'story-2');
    cache.set('ir1', 'in1', 'e3', 'story-3');
    // Access e1 to promote it in LRU order
    cache.get('ir1', 'in1', 'e1');
    // Adding e4 should evict e2 (oldest unaccessed)
    cache.set('ir1', 'in1', 'e4', 'story-4');
    expect(cache.get('ir1', 'in1', 'e2')).toBeNull(); // evicted
    expect(cache.get('ir1', 'in1', 'e1')).toBe('story-1'); // still alive (promoted)
    expect(cache.get('ir1', 'in1', 'e4')).toBe('story-4'); // new entry
  });

  it('expires entries after TTL', async () => {
    cache.set('ir1', 'in1', 'e1', 'expiring story');
    expect(cache.get('ir1', 'in1', 'e1')).toBe('expiring story');
    await new Promise(r => setTimeout(r, 1100)); // wait past TTL
    expect(cache.get('ir1', 'in1', 'e1')).toBeNull();
  });

  it('returns null for incomplete keys', () => {
    expect(cache.get(null, 'in1', 'e1')).toBeNull();
    expect(cache.get('ir1', null, 'e1')).toBeNull();
    expect(cache.get('ir1', 'in1', null)).toBeNull();
  });

  it('tracks hit rate correctly', () => {
    cache.set('ir1', 'in1', 'e1', 'story');
    cache.get('ir1', 'in1', 'e1'); // hit
    cache.get('ir1', 'in1', 'e9'); // miss
    const s = cache.stats();
    expect(s.hits).toBe(1);
    expect(s.misses).toBe(1);
    expect(s.hitRate).toBe('50.00%');
  });
});
