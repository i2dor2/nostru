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

import { getIdentityIndex, setIdentityIndex, getMaxIdentityIndex } from './identityIndex';

const PK = 'aabbcc';

beforeEach(() => {
  for (const k of Object.keys(memStore)) delete memStore[k];
});

describe('getIdentityIndex', () => {
  it('returns 1 when nothing is stored', async () => {
    expect(await getIdentityIndex(PK)).toBe(1);
  });

  it('returns the stored value after setIdentityIndex', async () => {
    await setIdentityIndex(PK, 3);
    expect(await getIdentityIndex(PK)).toBe(3);
  });

  it('is scoped per pubkey', async () => {
    await setIdentityIndex(PK, 4);
    expect(await getIdentityIndex('other')).toBe(1);
  });
});

describe('setIdentityIndex', () => {
  it('clamps values below 1 to 1', async () => {
    await setIdentityIndex(PK, 0);
    expect(await getIdentityIndex(PK)).toBe(1);
  });

  it('clamps negative values to 1', async () => {
    await setIdentityIndex(PK, -5);
    expect(await getIdentityIndex(PK)).toBe(1);
  });

  it('floors fractional values', async () => {
    await setIdentityIndex(PK, 2.9);
    expect(await getIdentityIndex(PK)).toBe(2);
  });

  it('updates max when setting a higher value', async () => {
    await setIdentityIndex(PK, 5);
    expect(await getMaxIdentityIndex(PK)).toBe(5);
  });

  it('does not lower max when stepping back', async () => {
    await setIdentityIndex(PK, 5);
    await setIdentityIndex(PK, 2);
    expect(await getMaxIdentityIndex(PK)).toBe(5);
    expect(await getIdentityIndex(PK)).toBe(2);
  });
});

describe('getMaxIdentityIndex', () => {
  it('returns 1 when nothing is stored', async () => {
    expect(await getMaxIdentityIndex(PK)).toBe(1);
  });
});
