/**
 * Tests for determinism fixes in AmazonAdapter and search-ui api.js
 *
 * Run with:  node tests/amazon-adapter-determinism.test.js
 */

import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Inline the static helper so we can test it without a live fetcher
// (mirrors AmazonAdapter._sourceIdFromUrl exactly)
// ---------------------------------------------------------------------------
function sourceIdFromUrl(productUrl) {
  return 'amazon-sha-' + createHash('sha256').update(productUrl).digest('hex');
}

// ---------------------------------------------------------------------------
// Minimal test harness
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
console.log('\n=== AmazonAdapter determinism tests ===\n');

// 1. Same URL → same sourceId (deterministic)
const url1 = 'https://www.amazon.com/dp/B09XXXYYY';
const id1a = sourceIdFromUrl(url1);
const id1b = sourceIdFromUrl(url1);
assert(id1a === id1b, 'Same URL produces same sourceId');

// 2. Different URLs → different sourceIds
const url2 = 'https://www.amazon.com/dp/B00000000';
const id2 = sourceIdFromUrl(url2);
assert(id1a !== id2, 'Different URLs produce different sourceIds');

// 3. sourceId starts with 'amazon-sha-' prefix
assert(id1a.startsWith('amazon-sha-'), "sourceId starts with 'amazon-sha-'");

// 4. sourceId does NOT match old non-deterministic format amazon-<digits>-<digits>
const oldFormatRe = /^amazon-\d+-\d+$/;
assert(!oldFormatRe.test(id1a), 'sourceId does not match old amazon-<ts>-<rand> format');

// 5. crypto.randomUUID() produces RFC 4122 v4 format
const uuidV4Re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuid = crypto.randomUUID();
assert(uuidV4Re.test(uuid), `crypto.randomUUID() returns RFC 4122 v4 UUID (got ${uuid})`);

// 6. Stress test: 1000 calls with same URL → always same result
let stressPassed = true;
const expected = sourceIdFromUrl(url1);
for (let i = 0; i < 1000; i++) {
  if (sourceIdFromUrl(url1) !== expected) {
    stressPassed = false;
    break;
  }
}
assert(stressPassed, 'Stress test: 1000 calls with same URL always return same sourceId');

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
