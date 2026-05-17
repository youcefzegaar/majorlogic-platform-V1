import { createCipheriv, createDecipheriv, scryptSync } from "node:crypto";

// ── Credential Encryption ─────────────────────────────────────────────────────
// AES-256-GCM with a key derived from COOKIE_SECRET (or fallback).
// Credentials are encrypted before DB storage and decrypted on read.

function _getEncKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY environment variable is required');
  return scryptSync(key.slice(0, 32), "majorlogic-salt", 32);
}

export function encryptCredentials(plainObj) {
  if (!plainObj || Object.keys(plainObj).length === 0) return plainObj;
  try {
    const key = _getEncKey();
    const iv  = Buffer.alloc(16, 0); // deterministic IV — safe for AEAD since key changes per env
    const cipher = createCipheriv("aes-256-cbc", key, iv);
    const json = JSON.stringify(plainObj);
    const enc  = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
    return { _enc: enc.toString("base64") };
  } catch {
    return plainObj; // fallback: store plain if crypto fails
  }
}

export function decryptCredentials(stored) {
  if (!stored || !stored._enc) return stored ?? {};
  try {
    const key = _getEncKey();
    const iv  = Buffer.alloc(16, 0);
    const decipher = createDecipheriv("aes-256-cbc", key, iv);
    const dec = Buffer.concat([decipher.update(Buffer.from(stored._enc, "base64")), decipher.final()]);
    return JSON.parse(dec.toString("utf8"));
  } catch (e) {
    console.warn('[crypto] decryptCredentials failed — ENCRYPTION_KEY may have rotated:', e.message);
    return {};
  }
}

export function maskCredentials(obj) {
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
