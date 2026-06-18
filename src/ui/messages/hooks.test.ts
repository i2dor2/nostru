// Message hooks are React glue; protocol behaviour is covered by:
//   src/core/dm/nip17.test.ts  (gift wrap send + decrypt round-trip)
//   src/core/dm/nip04.test.ts  (kind-4 send + decrypt round-trip)
// This file verifies exports exist so renames surface immediately.

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../core/ndk', () => ({ useNDK: vi.fn(() => ({ ndk: null })) }));
vi.mock('../context/AccountContext', () => ({
  useAccount: vi.fn(() => ({ session: { status: 'locked' } })),
}));
vi.mock('../../core/keys', () => ({ bytesToHex: vi.fn(() => 'aa') }));
vi.mock('../../core/dm/nip17', () => ({ decryptNip17GiftWrap: vi.fn(), sendNip17: vi.fn() }));
vi.mock('../../core/dm/nip04', () => ({ decryptNip04: vi.fn() }));

describe('messages/hooks module API', () => {
  it('exports useConversations and useSendDM as functions', async () => {
    const { useConversations, useSendDM } = await import('./hooks');
    expect(typeof useConversations).toBe('function');
    expect(typeof useSendDM).toBe('function');
  });
});
