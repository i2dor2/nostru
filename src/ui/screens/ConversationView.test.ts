import { describe, it, expect, vi } from 'vitest';

vi.mock('../messages/hooks', () => ({ useConversations: vi.fn(() => []), useSendDM: vi.fn(() => vi.fn()) }));
vi.mock('../context/AccountContext', () => ({ useAccount: vi.fn(() => ({ session: { status: 'locked' } })) }));
vi.mock('../feed/hooks', () => ({ useProfile: vi.fn(() => null) }));
vi.mock('../../core/keys', () => ({ encodePubkey: vi.fn(s => s), truncateNpub: vi.fn(s => s) }));

describe('ConversationView module API', () => {
  it('exports ConversationView as a function', async () => {
    const { ConversationView } = await import('./ConversationView');
    expect(typeof ConversationView).toBe('function');
  });
});
