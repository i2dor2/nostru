// OnboardingScreen is a multi-step React view; behaviour is verified by manual
// E2E. This file confirms the export exists and mocks heavy deps so renames
// and import errors surface immediately.

import { describe, it, expect, vi } from 'vitest';

vi.mock('../context/AccountContext', () => ({
  useAccount: vi.fn(() => ({
    createAccount: vi.fn(),
    importKey: vi.fn(),
  })),
}));

vi.mock('../../core/keys', () => ({
  generateKeypair: vi.fn(() => ({ privkey: new Uint8Array(32), pubkey: 'a'.repeat(64) })),
  encodePubkey: vi.fn(() => 'npub1test'),
  encodePrivkey: vi.fn(() => 'nsec1test'),
}));

describe('OnboardingScreen', () => {
  it('exports OnboardingScreen', async () => {
    const mod = await import('./OnboardingScreen');
    expect(typeof mod.OnboardingScreen).toBe('function');
  });
});
