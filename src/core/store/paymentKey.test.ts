import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock chrome.storage.local
const store: Record<string, unknown> = {};
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: store[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => { Object.assign(store, items); }),
      remove: vi.fn(async (key: string) => { delete store[key]; }),
    },
  },
});

import { generatePaymentPriv, paymentPubHex, savePaymentKey, loadPaymentKey, clearPaymentKey } from './paymentKey';

const SOCIAL_PUB = 'a'.repeat(64);
const SOCIAL_PRIV = 'b'.repeat(64);
const SOCIAL_PRIV2 = 'c'.repeat(64);

beforeEach(() => { Object.keys(store).forEach(k => delete store[k]); });

describe('generatePaymentPriv', () => {
  it('returns a 64-char hex string', () => {
    const priv = generatePaymentPriv();
    expect(priv).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates unique keys on each call', () => {
    expect(generatePaymentPriv()).not.toBe(generatePaymentPriv());
  });
});

describe('paymentPubHex', () => {
  it('returns a 64-char x-only pubkey hex', () => {
    const pub = paymentPubHex(generatePaymentPriv());
    expect(pub).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same private key', () => {
    const priv = generatePaymentPriv();
    expect(paymentPubHex(priv)).toBe(paymentPubHex(priv));
  });
});

describe('savePaymentKey + loadPaymentKey', () => {
  it('roundtrips the payment privkey', async () => {
    const payPriv = generatePaymentPriv();
    await savePaymentKey(SOCIAL_PUB, payPriv, SOCIAL_PRIV);
    expect(await loadPaymentKey(SOCIAL_PUB, SOCIAL_PRIV)).toBe(payPriv);
  });

  it('returns null when no key stored', async () => {
    expect(await loadPaymentKey(SOCIAL_PUB, SOCIAL_PRIV)).toBeNull();
  });

  it('returns null when decrypted with a different social privkey', async () => {
    await savePaymentKey(SOCIAL_PUB, generatePaymentPriv(), SOCIAL_PRIV);
    expect(await loadPaymentKey(SOCIAL_PUB, SOCIAL_PRIV2)).toBeNull();
  });
});

describe('clearPaymentKey', () => {
  it('removes the stored key so loadPaymentKey returns null', async () => {
    await savePaymentKey(SOCIAL_PUB, generatePaymentPriv(), SOCIAL_PRIV);
    await clearPaymentKey(SOCIAL_PUB);
    expect(await loadPaymentKey(SOCIAL_PUB, SOCIAL_PRIV)).toBeNull();
  });
});
