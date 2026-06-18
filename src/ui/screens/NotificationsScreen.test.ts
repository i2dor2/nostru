import { describe, it, expect, vi } from 'vitest';

vi.mock('../context/AccountContext', () => ({ useAccount: vi.fn(() => ({ session: { status: 'loading' } })) }));
vi.mock('../feed/hooks', () => ({ useFeed: vi.fn(() => ({ events: [], eose: false })), useProfile: vi.fn(() => null) }));
vi.mock('../../core/keys', () => ({ encodePubkey: vi.fn(s => s), truncateNpub: vi.fn(s => s) }));
vi.mock('../context/NavContext', () => ({ useNav: vi.fn(() => ({ push: vi.fn() })) }));

describe('NotificationsScreen module API', () => {
  it('exports NotificationsScreen as a function', async () => {
    const { NotificationsScreen } = await import('./NotificationsScreen');
    expect(typeof NotificationsScreen).toBe('function');
  });
});
