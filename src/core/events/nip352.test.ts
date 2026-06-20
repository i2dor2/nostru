import { describe, it, expect, vi } from 'vitest';
import { fetchNip352Address, publishNip352Address } from './nip352';

function makeEvent(sp1: string | null, createdAt: number, d = 'mainnet') {
  const tags: string[][] = [['d', d]];
  if (sp1 !== null) tags.push(['sp1', sp1]);
  return { tags, created_at: createdAt };
}

function makeNdk(events: ReturnType<typeof makeEvent>[]) {
  return { fetchEvents: vi.fn().mockResolvedValue(new Set(events)) } as never;
}

const PUBKEY = 'a'.repeat(64);
const SP1 = 'sp1qqtest';

function makePublishNdk() {
  const sign = vi.fn().mockResolvedValue(undefined);
  const publish = vi.fn().mockResolvedValue(undefined);
  const NDKEvent = vi.fn(() => ({ sign, publish, tags: [] }));
  const ndk = {} as never;
  return { ndk, NDKEvent, sign, publish };
}

vi.mock('@nostr-dev-kit/ndk', async () => {
  const actual = await vi.importActual<typeof import('@nostr-dev-kit/ndk')>('@nostr-dev-kit/ndk');
  return {
    ...actual,
    NDKEvent: vi.fn().mockImplementation((_ndk: unknown, init: { kind: number; content: string; tags: string[][] }) => ({
      kind: init.kind,
      content: init.content,
      tags: init.tags,
      sign: vi.fn().mockResolvedValue(undefined),
      publish: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('publishNip352Address', () => {
  it('signs and publishes a kind:10352 event with correct tags', async () => {
    const mockEvent = { sign: vi.fn().mockResolvedValue(undefined), publish: vi.fn().mockResolvedValue(undefined), tags: [] as string[][] };
    const { NDKEvent } = await import('@nostr-dev-kit/ndk');
    vi.mocked(NDKEvent).mockImplementationOnce((_ndk, init) => {
      mockEvent.tags = (init as { tags: string[][] }).tags;
      return mockEvent as never;
    });
    const ndk = {} as never;
    await publishNip352Address(ndk, 'sp1qqtest');
    expect(mockEvent.sign).toHaveBeenCalled();
    expect(mockEvent.publish).toHaveBeenCalled();
    expect(mockEvent.tags).toContainEqual(['d', 'mainnet']);
    expect(mockEvent.tags).toContainEqual(['sp1', 'sp1qqtest']);
  });

  it('uses the provided network in the d tag', async () => {
    const mockEvent = { sign: vi.fn().mockResolvedValue(undefined), publish: vi.fn().mockResolvedValue(undefined), tags: [] as string[][] };
    const { NDKEvent } = await import('@nostr-dev-kit/ndk');
    vi.mocked(NDKEvent).mockImplementationOnce((_ndk, init) => {
      mockEvent.tags = (init as { tags: string[][] }).tags;
      return mockEvent as never;
    });
    const ndk = {} as never;
    await publishNip352Address(ndk, 'sp1qqsignet', 'signet');
    expect(mockEvent.tags).toContainEqual(['d', 'signet']);
    expect(mockEvent.tags).toContainEqual(['sp1', 'sp1qqsignet']);
  });
});

describe('fetchNip352Address', () => {
  it('returns null when no events found', async () => {
    const ndk = makeNdk([]);
    expect(await fetchNip352Address(ndk, PUBKEY)).toBeNull();
  });

  it('returns the sp1 tag value from a valid event', async () => {
    const ndk = makeNdk([makeEvent(SP1, 1000)]);
    expect(await fetchNip352Address(ndk, PUBKEY)).toBe(SP1);
  });

  it('picks the most recent event when multiple exist', async () => {
    const ndk = makeNdk([
      makeEvent('sp1qqold', 900),
      makeEvent('sp1qqnew', 1100),
      makeEvent('sp1qqmid', 1000),
    ]);
    expect(await fetchNip352Address(ndk, PUBKEY)).toBe('sp1qqnew');
  });

  it('returns null when the event has no sp1 tag', async () => {
    const ndk = makeNdk([makeEvent(null, 1000)]);
    expect(await fetchNip352Address(ndk, PUBKEY)).toBeNull();
  });

  it('queries with correct filter', async () => {
    const ndk = makeNdk([]);
    await fetchNip352Address(ndk, PUBKEY, 'signet');
    expect(ndk.fetchEvents).toHaveBeenCalledWith({
      kinds: [10352],
      authors: [PUBKEY],
      '#d': ['signet'],
      limit: 5,
    });
  });
});
