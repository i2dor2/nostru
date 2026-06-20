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

import { getNewTabOverride, setNewTabOverride, getWideLayout } from './settings';

beforeEach(() => {
  delete memStore['settings'];
});

describe('newTabOverride', () => {
  it('defaults to false', async () => {
    expect(await getNewTabOverride()).toBe(false);
  });

  it('persists true after setNewTabOverride', async () => {
    await setNewTabOverride(true);
    expect(await getNewTabOverride()).toBe(true);
  });

  it('does not affect wideLayout', async () => {
    await setNewTabOverride(true);
    expect(await getWideLayout()).toBe(false);
  });
});
