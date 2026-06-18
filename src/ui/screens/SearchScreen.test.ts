import { describe, it, expect, vi } from 'vitest';
import { buildFilter } from './SearchScreen';

vi.mock('../feed/hooks', () => ({ useFeed: vi.fn(() => ({ events: [], eose: false })) }));
vi.mock('../components/NoteCard', () => ({ NoteCard: vi.fn(() => null) }));

describe('buildFilter', () => {
  it('uses NIP-50 search field for plain text', () => {
    const f = buildFilter('bitcoin');
    expect(f.search).toBe('bitcoin');
    expect(f['#t']).toBeUndefined();
    expect(f.kinds).toContain(1);
  });

  it('uses #t tag for hashtag queries', () => {
    const f = buildFilter('#nostr');
    expect(f['#t']).toEqual(['nostr']);
    expect(f.search).toBeUndefined();
  });

  it('lowercases the hashtag', () => {
    const f = buildFilter('#Bitcoin');
    expect(f['#t']).toEqual(['bitcoin']);
  });

  it('limits results', () => {
    expect(buildFilter('test').limit).toBe(50);
    expect(buildFilter('#tag').limit).toBe(50);
  });
});

describe('SearchScreen module API', () => {
  it('exports SearchScreen as a function', async () => {
    const { SearchScreen } = await import('./SearchScreen');
    expect(typeof SearchScreen).toBe('function');
  });
});
