import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import type NDK from '@nostr-dev-kit/ndk';
import type { RelayConfig } from '../store/relays';

vi.mock('@nostr-dev-kit/ndk');

import { publishRelayList } from './lists';

type FakeEvent = { kind: number; content: string; tags: string[][]; publish: ReturnType<typeof vi.fn> };

function makeNdk(): NDK {
  return {} as NDK;
}

describe('publishRelayList', () => {
  let publishMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    publishMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(NDKEvent).mockClear();
    vi.mocked(NDKEvent).mockImplementation(() => ({
      kind: 0,
      content: '',
      tags: [] as string[][],
      publish: publishMock,
    }) as unknown as NDKEvent);
  });

  it('publishes kind 10002 and calls publish', async () => {
    await publishRelayList(makeNdk(), [{ url: 'wss://relay.damus.io', read: true, write: true }]);
    const ev = vi.mocked(NDKEvent).mock.results[0].value as FakeEvent;
    expect(ev.kind).toBe(10002);
    expect(publishMock).toHaveBeenCalled();
  });

  it('tags read+write relay as ["r", url]', async () => {
    const relays: RelayConfig[] = [{ url: 'wss://relay.damus.io', read: true, write: true }];
    await publishRelayList(makeNdk(), relays);
    const ev = vi.mocked(NDKEvent).mock.results[0].value as FakeEvent;
    expect(ev.tags).toContainEqual(['r', 'wss://relay.damus.io']);
    expect(ev.tags.find(t => t[0] === 'r' && t[1] === 'wss://relay.damus.io')).toHaveLength(2);
  });

  it('tags read-only relay as ["r", url, "read"]', async () => {
    const relays: RelayConfig[] = [{ url: 'wss://nos.lol', read: true, write: false }];
    await publishRelayList(makeNdk(), relays);
    const ev = vi.mocked(NDKEvent).mock.results[0].value as FakeEvent;
    expect(ev.tags).toContainEqual(['r', 'wss://nos.lol', 'read']);
  });

  it('tags write-only relay as ["r", url, "write"]', async () => {
    const relays: RelayConfig[] = [{ url: 'wss://nostr.wine', read: false, write: true }];
    await publishRelayList(makeNdk(), relays);
    const ev = vi.mocked(NDKEvent).mock.results[0].value as FakeEvent;
    expect(ev.tags).toContainEqual(['r', 'wss://nostr.wine', 'write']);
  });

  it('handles mixed relays with correct tag per relay', async () => {
    const relays: RelayConfig[] = [
      { url: 'wss://a.io', read: true, write: true },
      { url: 'wss://b.io', read: true, write: false },
      { url: 'wss://c.io', read: false, write: true },
    ];
    await publishRelayList(makeNdk(), relays);
    const ev = vi.mocked(NDKEvent).mock.results[0].value as FakeEvent;
    expect(ev.tags).toContainEqual(['r', 'wss://a.io']);
    expect(ev.tags).toContainEqual(['r', 'wss://b.io', 'read']);
    expect(ev.tags).toContainEqual(['r', 'wss://c.io', 'write']);
    expect(ev.tags).toHaveLength(3);
  });
});
