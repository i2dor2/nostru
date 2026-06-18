import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyNip05 } from './nip05';

const PUBKEY = 'abc123def456';
const IDENTIFIER = 'alice@example.com';

function mockFetch(names: Record<string, string>, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve({ names }),
  }));
}

beforeEach(() => {
  vi.restoreAllMocks();
  // clear module-level cache between tests by re-importing won't work,
  // so we rely on each test using a unique identifier to avoid cache hits
});

describe('verifyNip05', () => {
  it('returns true when pubkey matches the nostr.json entry', async () => {
    mockFetch({ alice: PUBKEY });
    expect(await verifyNip05('alice@example.com', PUBKEY)).toBe(true);
  });

  it('returns false when pubkey does not match', async () => {
    mockFetch({ alice: 'different-pubkey' });
    expect(await verifyNip05('alice@other.com', PUBKEY)).toBe(false);
  });

  it('returns false when the name is not in nostr.json', async () => {
    mockFetch({});
    expect(await verifyNip05('unknown@example.com', PUBKEY)).toBe(false);
  });

  it('returns false when fetch responds with non-ok status', async () => {
    mockFetch({}, false);
    expect(await verifyNip05('alice@bad.com', PUBKEY)).toBe(false);
  });

  it('returns false when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    expect(await verifyNip05('alice@unreachable.com', PUBKEY)).toBe(false);
  });

  it('returns false for identifiers missing the @ separator', async () => {
    mockFetch({ alice: PUBKEY });
    expect(await verifyNip05('nodomain', PUBKEY)).toBe(false);
  });

  it('uses cached result on second call without re-fetching', async () => {
    mockFetch({ bob: PUBKEY });
    await verifyNip05('bob@cached.com', PUBKEY);
    await verifyNip05('bob@cached.com', PUBKEY);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });
});
