import { describe, it, expect, vi } from 'vitest';

vi.mock('../messages/hooks', () => ({ useConversations: vi.fn(() => []) }));
vi.mock('../context/NavContext', () => ({ useNav: vi.fn(() => ({ push: vi.fn() })) }));
vi.mock('../feed/hooks', () => ({ useProfile: vi.fn(() => null) }));
vi.mock('../../core/keys', () => ({ encodePubkey: vi.fn(s => s), truncateNpub: vi.fn(s => s) }));

describe('MessagesScreen module API', () => {
  it('exports MessagesScreen as a function', async () => {
    const { MessagesScreen } = await import('./MessagesScreen');
    expect(typeof MessagesScreen).toBe('function');
  });
});
