import { describe, it, expect, beforeEach } from 'vitest';
import { buildUnsubscribeUrl } from '../../packages/email-service/src/index.js';

// Mirror verifyUnsubToken logic for testing without importing the route
function verifyUnsubToken(token, secret) {
  const { createHmac, timingSafeEqual } = require('crypto');
  try {
    const dot = token.lastIndexOf('.');
    if (dot < 0) return null;
    const payload = token.slice(0, dot);
    const sig     = token.slice(dot + 1);
    const expected = createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32);
    if (sig.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const [email, leadType, expiresStr] = decoded.split(':');
    if (!email || !leadType || Date.now() > Number(expiresStr)) return null;
    return { email, leadType };
  } catch {
    return null;
  }
}

describe('buildUnsubscribeUrl', () => {
  beforeEach(() => {
    process.env.COOKIE_SECRET  = 'test-secret-that-is-long-enough-32chars';
    process.env.API_BASE_URL   = 'https://api.example.com';
  });

  it('returns a URL on the API base domain', () => {
    const url = buildUnsubscribeUrl('user@example.com', 'price_alert');
    expect(url).toMatch(/^https:\/\/api\.example\.com\/unsubscribe\?t=/);
  });

  it('embeds a base64url token with a dot separator', () => {
    const url = buildUnsubscribeUrl('user@example.com', 'save_results');
    const t = new URL(url).searchParams.get('t');
    expect(t).toBeTruthy();
    expect(t).toMatch(/^[A-Za-z0-9_-]+\.[a-f0-9]{32}$/);
  });

  it('token round-trips: verify extracts correct email and leadType', () => {
    const url = buildUnsubscribeUrl('alice@test.io', 'price_alert');
    const t   = new URL(url).searchParams.get('t');
    const parsed = verifyUnsubToken(t, process.env.COOKIE_SECRET);
    expect(parsed).not.toBeNull();
    expect(parsed.email).toBe('alice@test.io');
    expect(parsed.leadType).toBe('price_alert');
  });

  it('rejects a tampered token', () => {
    const url = buildUnsubscribeUrl('bob@test.io', 'save_results');
    const t   = new URL(url).searchParams.get('t');
    const tampered = t.slice(0, -4) + 'xxxx';
    expect(verifyUnsubToken(tampered, process.env.COOKIE_SECRET)).toBeNull();
  });

  it('rejects a token with wrong secret', () => {
    const url = buildUnsubscribeUrl('carol@test.io', 'save_results');
    const t   = new URL(url).searchParams.get('t');
    expect(verifyUnsubToken(t, 'wrong-secret-that-is-long-enough-32chars')).toBeNull();
  });

  it('produces different tokens for different emails', () => {
    const u1 = buildUnsubscribeUrl('a@test.io', 'price_alert');
    const u2 = buildUnsubscribeUrl('b@test.io', 'price_alert');
    expect(u1).not.toBe(u2);
  });
});
