# Test Baseline — M-pre (2026-05-28)

Recorded after M-pre fixes. All three suites must pass before any feature work begins.

## Results

| Suite | Command | Result |
|---|---|---|
| vitest | `npm run test` | ✅ 18 files, 185 tests passed |
| system | `npm run test:node` | ✅ PASS |
| regression | `npm run test:regression` | ✅ PASS |

## Fixes applied in M-pre

### P.1 — tests/system.test.js:194
`noResultProfile.budgetUsd` lowered from 700 → 200.
Catalog now includes sub-$700 devices ($369+), defeating the "impossible profile" intent.
At $200, no device in the catalog can satisfy the constraint, forcing `no_viable_option` or recovery.

### P.2 — packages/postgres-persistence/src/crypto.js
Upgraded from AES-256-CBC (fixed zero IV) to AES-256-GCM (random 12-byte IV, auth tag).
Wire format: `"v2:" + base64(iv[12] + tag[16] + ciphertext)`.
Legacy CBC rows (no `v2:` prefix) remain decryptable for backward compat.
New test file: `tests/unit/crypto.vitest.js` (5 tests).

### P.3 — i18n
No changes needed. All 7 locales already use `ui.json`.
