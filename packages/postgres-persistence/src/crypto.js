// @ts-check
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// ── Credential Encryption ─────────────────────────────────────────────────────
// AES-256-GCM with a key derived from ENCRYPTION_KEY env var.
// Wire format (new):    "v2:" + base64(iv[12] + authTag[16] + ciphertext)
// Wire format (legacy): base64(ciphertext) — CBC with fixed zero IV, backward compat.
// Credentials are encrypted before DB storage and decrypted on read.

/** @returns {Buffer} */
function _getEncKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY environment variable is required');
  return scryptSync(key.slice(0, 32), "majorlogic-salt", 32);
}

/**
 * @param {Record<string, unknown> | null | undefined} plainObj
 * @returns {Record<string, unknown> | { _enc: string } | null | undefined}
 */
export function encryptCredentials(plainObj) {
  if (!plainObj || Object.keys(plainObj).length === 0) return plainObj;
  const key = _getEncKey(); // throws if ENCRYPTION_KEY missing — never store plaintext silently
  const iv = randomBytes(12); // GCM standard: 96-bit random IV, unique per encryption
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const json = JSON.stringify(plainObj);
  const ciphertext = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag(); // 16-byte authentication tag — detects tampering
  return { _enc: "v2:" + Buffer.concat([iv, tag, ciphertext]).toString("base64") };
}

/**
 * @param {{ _enc?: string } | Record<string, unknown> | null | undefined} stored
 * @param {{ integrationSlug?: string }} [opts]
 * @returns {Record<string, unknown>}
 */
export function decryptCredentials(stored, { integrationSlug = 'unknown' } = {}) {
  if (!stored || !stored._enc) return /** @type {Record<string, unknown>} */ (stored ?? {});
  const encStr = /** @type {string} */ (stored._enc);
  try {
    const key = _getEncKey();
    if (encStr.startsWith("v2:")) {
      // GCM format: iv(12) + tag(16) + ciphertext
      const raw = Buffer.from(encStr.slice(3), "base64");
      const iv = raw.subarray(0, 12);
      const tag = raw.subarray(12, 28);
      const ciphertext = raw.subarray(28);
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return JSON.parse(dec.toString("utf8"));
    } else {
      // Legacy CBC format (fixed zero IV) — backward compat for rows written before M-pre
      const raw = Buffer.from(encStr, "base64");
      const iv = Buffer.alloc(16, 0);
      const decipher = createDecipheriv("aes-256-cbc", key, iv);
      const dec = Buffer.concat([decipher.update(raw), decipher.final()]);
      return JSON.parse(dec.toString("utf8"));
    }
  } catch (e) {
    console.warn(`[crypto] decryptCredentials failed for integration "${integrationSlug}" — ENCRYPTION_KEY may have rotated:`, /** @type {Error} */ (e).message);
    return {};
  }
}

/**
 * @param {Record<string, unknown>} obj
 * @returns {Record<string, unknown>}
 */
export function maskCredentials(obj) {
  /** @type {Record<string, unknown>} */
  const masked = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string" && v.length > 8) {
      masked[k] = `${v.slice(0, 4)}${"*".repeat(Math.min(v.length - 8, 20))}${v.slice(-4)}`;
    } else {
      masked[k] = v;
    }
  }
  return masked;
}
