import { describe, it, expect } from 'vitest';
import { createCipheriv, scryptSync } from 'node:crypto';

// Set ENCRYPTION_KEY before importing the module
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-only';

const { encryptCredentials, decryptCredentials } = await import(
  '../../packages/postgres-persistence/src/crypto.js'
);

/** Produces a legacy CBC-encrypted blob matching the old fixed-IV scheme */
function makeLegacyCbcBlob(plain) {
  const rawKey = scryptSync('test-encryption-key-for-unit-tests-only'.slice(0, 32), 'majorlogic-salt', 32);
  const iv = Buffer.alloc(16, 0);
  const cipher = createCipheriv('aes-256-cbc', rawKey, iv);
  const json = JSON.stringify(plain);
  const ct = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  return { _enc: ct.toString('base64') };
}

describe('credential encryption (AES-256-GCM)', () => {
  it('encrypt then decrypt returns original object', () => {
    const plain = { api_key: 'sk-abc123', client_secret: 'supersecret' };
    const encrypted = encryptCredentials(plain);
    expect(encrypted).toHaveProperty('_enc');
    expect(encrypted._enc).toMatch(/^v2:/); // GCM format marker
    const decrypted = decryptCredentials(encrypted);
    expect(decrypted).toEqual(plain);
  });

  it('same input produces different ciphertext each call (random IV)', () => {
    const plain = { api_key: 'same-value' };
    const enc1 = encryptCredentials(plain);
    const enc2 = encryptCredentials(plain);
    expect(enc1._enc).not.toBe(enc2._enc);
  });

  it('tampered ciphertext returns empty object (GCM auth tag rejected)', () => {
    const plain = { api_key: 'secret' };
    const encrypted = encryptCredentials(plain);
    const raw = Buffer.from(encrypted._enc, 'base64');
    raw[30] ^= 0xff; // flip a byte in ciphertext region
    const tampered = { _enc: raw.toString('base64') };
    const result = decryptCredentials(tampered, { integrationSlug: 'test' });
    expect(result).toEqual({});
  });

  it('decrypts legacy CBC format (backward compat)', () => {
    const legacyStored = makeLegacyCbcBlob({ legacy_key: 'old-value' });
    const decrypted = decryptCredentials(legacyStored, { integrationSlug: 'legacy-test' });
    expect(decrypted).toEqual({ legacy_key: 'old-value' });
  });

  it('returns passthrough for empty or null credentials', () => {
    expect(encryptCredentials(null)).toBeNull();
    expect(encryptCredentials({})).toEqual({});
    expect(decryptCredentials(null)).toEqual({});
    expect(decryptCredentials({})).toEqual({});
  });
});
