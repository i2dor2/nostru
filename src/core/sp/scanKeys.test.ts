import { describe, it, expect, vi } from 'vitest';
import { resolveScanKeys } from './scanKeys';
import { deriveScanPriv, deriveSpendPriv, deriveSpendPub, derivePaymentPriv, privToXonlyPubHex } from '../nsp';

vi.mock('../store/paymentKey', () => ({
  loadPaymentKey: vi.fn(),
}));

import { loadPaymentKey } from '../store/paymentKey';

// Minimal valid secp256k1 private key (scalar 1 - only for tests, never real use)
const SOCIAL_PRIV = '0000000000000000000000000000000000000000000000000000000000000001';
const SOCIAL_PUB  = '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';

describe('resolveScanKeys - social (default)', () => {
  it('returns keys derived from social privkey', async () => {
    const keys = await resolveScanKeys('social', SOCIAL_PRIV, SOCIAL_PUB);
    expect(keys.scanPriv).toBe(deriveScanPriv(SOCIAL_PRIV));
    expect(keys.spendPub).toBe(deriveSpendPub(SOCIAL_PUB));
    expect(keys.spendPriv).toBe(deriveSpendPriv(SOCIAL_PRIV));
  });

  it('defaults to social when mode is undefined', async () => {
    const keys = await resolveScanKeys(undefined, SOCIAL_PRIV, SOCIAL_PUB);
    expect(keys.scanPriv).toBe(deriveScanPriv(SOCIAL_PRIV));
  });
});

describe('resolveScanKeys - deterministic', () => {
  it('returns keys derived from payment_priv (not social priv)', async () => {
    const payPriv = derivePaymentPriv(SOCIAL_PRIV);
    const keys = await resolveScanKeys('deterministic', SOCIAL_PRIV, SOCIAL_PUB);
    expect(keys.scanPriv).toBe(deriveScanPriv(payPriv));
    expect(keys.spendPub).toBe(deriveSpendPub(privToXonlyPubHex(payPriv)));
    expect(keys.spendPriv).toBe(deriveSpendPriv(payPriv));
  });

  it('differs from social mode keys', async () => {
    const social = await resolveScanKeys('social', SOCIAL_PRIV, SOCIAL_PUB);
    const det    = await resolveScanKeys('deterministic', SOCIAL_PRIV, SOCIAL_PUB);
    expect(det.scanPriv).not.toBe(social.scanPriv);
  });

  it('default (no index) equals index 1', async () => {
    const def = await resolveScanKeys('deterministic', SOCIAL_PRIV, SOCIAL_PUB);
    const i1  = await resolveScanKeys('deterministic', SOCIAL_PRIV, SOCIAL_PUB, 1);
    expect(def.scanPriv).toBe(i1.scanPriv);
    expect(def.spendPub).toBe(i1.spendPub);
  });

  it('index 2 produces different keys than index 1', async () => {
    const i1 = await resolveScanKeys('deterministic', SOCIAL_PRIV, SOCIAL_PUB, 1);
    const i2 = await resolveScanKeys('deterministic', SOCIAL_PRIV, SOCIAL_PUB, 2);
    expect(i2.scanPriv).not.toBe(i1.scanPriv);
    expect(i2.spendPub).not.toBe(i1.spendPub);
  });

  it('index is ignored in social mode', async () => {
    const s1 = await resolveScanKeys('social', SOCIAL_PRIV, SOCIAL_PUB, 1);
    const s2 = await resolveScanKeys('social', SOCIAL_PRIV, SOCIAL_PUB, 2);
    expect(s1.scanPriv).toBe(s2.scanPriv);
  });
});

describe('resolveScanKeys - independent', () => {
  it('uses the loaded payment privkey', async () => {
    const payPriv = '0000000000000000000000000000000000000000000000000000000000000002';
    vi.mocked(loadPaymentKey).mockResolvedValueOnce(payPriv);
    const keys = await resolveScanKeys('independent', SOCIAL_PRIV, SOCIAL_PUB);
    expect(keys.scanPriv).toBe(deriveScanPriv(payPriv));
    expect(keys.spendPub).toBe(deriveSpendPub(privToXonlyPubHex(payPriv)));
    expect(keys.spendPriv).toBe(deriveSpendPriv(payPriv));
  });

  it('throws when no independent payment key is stored', async () => {
    vi.mocked(loadPaymentKey).mockResolvedValueOnce(null);
    await expect(resolveScanKeys('independent', SOCIAL_PRIV, SOCIAL_PUB)).rejects.toThrow('No independent payment key');
  });
});
