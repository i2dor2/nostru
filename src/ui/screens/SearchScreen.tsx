import { useState, useCallback } from 'react';
import { IconSearch, IconX } from '@tabler/icons-react';
import type { NDKFilter } from '@nostr-dev-kit/ndk';
import { useFeed } from '../feed/hooks';
import { NoteCard } from '../components/NoteCard';

export function buildFilter(query: string): NDKFilter {
  const trimmed = query.trim();
  if (trimmed.startsWith('#')) {
    const tag = trimmed.slice(1).toLowerCase();
    return { kinds: [1], '#t': [tag], limit: 50 };
  }
  // NIP-50 search - relays that don't support it will return nothing
  return { kinds: [1], search: trimmed, limit: 50 };
}

export function SearchScreen() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  const filter = buildFilter(query);
  const { events, eose } = useFeed(filter, query.length > 0);

  const handleSearch = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed) setQuery(trimmed);
  }, [input]);

  const handleClear = useCallback(() => {
    setInput('');
    setQuery('');
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <IconSearch size={15} className="text-zinc-400 shrink-0" />
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search notes or #hashtag..."
            className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-zinc-400"
          />
          {input && (
            <button onClick={handleClear} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" aria-label="Clear">
              <IconX size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {query === '' && (
          <div className="flex flex-col items-center justify-center h-full gap-1 text-zinc-400">
            <IconSearch size={28} strokeWidth={1.5} />
            <p className="text-sm">Search Nostr</p>
            <p className="text-xs">Try a keyword or #hashtag</p>
          </div>
        )}
        {query !== '' && !eose && events.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        )}
        {query !== '' && eose && events.length === 0 && (
          <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
            No results for &ldquo;{query}&rdquo;
          </div>
        )}
        {events.map(ev => <NoteCard key={ev.id} event={ev} />)}
      </div>
    </div>
  );
}
