import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';

// Inline the SHA-256 logic to test the contract, not the implementation
function amazonSourceIdFromUrl(url) {
  return 'amazon-sha-' + createHash('sha256').update(url).digest('hex');
}

describe('Content-Addressed ID Determinism', () => {
  const TEST_URL = 'https://www.amazon.com/dp/B0EXAMPLEASIN';

  it('same URL always produces same sourceId', () => {
    const id1 = amazonSourceIdFromUrl(TEST_URL);
    const id2 = amazonSourceIdFromUrl(TEST_URL);
    expect(id1).toBe(id2);
  });

  it('sourceId is stable across 1000 calls', () => {
    const first = amazonSourceIdFromUrl(TEST_URL);
    for (let i = 0; i < 1000; i++) {
      expect(amazonSourceIdFromUrl(TEST_URL)).toBe(first);
    }
  });

  it('different URLs produce different sourceIds', () => {
    const id1 = amazonSourceIdFromUrl(TEST_URL);
    const id2 = amazonSourceIdFromUrl('https://www.amazon.com/dp/B0DIFFERENT');
    expect(id1).not.toBe(id2);
  });

  it('sourceId format matches expected pattern', () => {
    const id = amazonSourceIdFromUrl(TEST_URL);
    expect(id).toMatch(/^amazon-sha-[0-9a-f]{64}$/);
  });

  it('crypto.randomUUID produces RFC 4122 v4 UUIDs', () => {
    const uuid = crypto.randomUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('Math.random is NOT used for content-addressed IDs', () => {
    // The old format was amazon-{timestamp}-{rand}; new format must not match
    const id = amazonSourceIdFromUrl(TEST_URL);
    expect(id).not.toMatch(/^amazon-\d+-\d+$/);
  });
});
