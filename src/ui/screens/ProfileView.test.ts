// ProfileView is a React view; NIP-352 discovery logic is unit-tested in
// src/core/events/nip352.test.ts. This file verifies the module export and
// mocks heavy dependencies so renames and import errors surface immediately.

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../core/ndk', () => ({
  useNDK: vi.fn(() => ({ ndk: null })),
}));
vi.mock('../context/AccountContext', () => ({
  useAccount: vi.fn(() => ({ session: { status: 'loading' } })),
}));
vi.mock('../context/NavContext', () => ({
  useNav: vi.fn(() => ({ push: vi.fn() })),
}));
vi.mock('../context/WalletContext', () => ({
  useWallet: vi.fn(() => ({ isConnected: false })),
}));
vi.mock('../../core/events/nip352', () => ({
  fetchNip352Address: vi.fn(() => Promise.resolve(null)),
}));

describe('ProfileView module API', () => {
  it('exports ProfileView as a function', async () => {
    const { ProfileView } = await import('./ProfileView');
    expect(typeof ProfileView).toBe('function');
  });
});
