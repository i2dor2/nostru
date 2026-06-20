import { describe, it, expect, vi } from 'vitest';
import { fetchNip352Address } from './nip352';

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
