import { describe, it, expect, vi, beforeEach } from 'vitest';

const memStore: Record<string, unknown> = {};

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: memStore[key] })),
      set: vi.fn(async (data: Record<string, unknown>) => { Object.assign(memStore, data); }),
    },
  },
});

import { getSavedRelays, saveRelays, type RelayConfig } from './relays';

beforeEach(() => {
  delete memStore['relays'];
});

describe('getSavedRelays', () => {
  it('returns defaults when nothing saved', async () => {
    const result = await getSavedRelays();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toMatchObject({ url: expect.any(String), read: true, write: true });
  });

  it('converts old string[] format to RelayConfig[]', async () => {
    memStore['relays'] = ['wss://relay.damus.io', 'wss://nos.lol'];
    const result = await getSavedRelays();
    expect(result).toEqual([
      { url: 'wss://relay.damus.io', read: true, write: true },
      { url: 'wss://nos.lol', read: true, write: true },
    ]);
  });

  it('loads RelayConfig[] as-is', async () => {
    const configs: RelayConfig[] = [
      { url: 'wss://relay.damus.io', read: true, write: false },
      { url: 'wss://nos.lol', read: false, write: true },
    ];
    memStore['relays'] = configs;
    const result = await getSavedRelays();
    expect(result).toEqual(configs);
  });
});

describe('saveRelays', () => {
  it('stores RelayConfig[] to chrome storage', async () => {
    const configs: RelayConfig[] = [{ url: 'wss://relay.damus.io', read: true, write: true }];
    await saveRelays(configs);
    expect(memStore['relays']).toEqual(configs);
  });
});
