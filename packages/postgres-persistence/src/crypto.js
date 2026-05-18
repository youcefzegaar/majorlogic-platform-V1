// @ts-check
import { createCipheriv, createDecipheriv, scryptSync } from "node:crypto";

// ── Credential Encryption ─────────────────────────────────────────────────────
// AES-256-GCM with a key derived from ENCRYPTION_KEY env var.
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
  const iv  = Buffer.alloc(16, 0); // deterministic IV — safe for AEAD since key changes per env
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const json = JSON.stringify(plainObj);
  const enc  = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  return { _enc: enc.toString("base64") };
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
    const iv  = Buffer.alloc(16, 0);
    const decipher = createDecipheriv("aes-256-cbc", key, iv);
    const dec = Buffer.concat([decipher.update(Buffer.from(encStr, "base64")), decipher.final()]);
    return JSON.parse(dec.toString("utf8"));
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
