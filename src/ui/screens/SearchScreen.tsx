import { useState, useCallback, useMemo } from 'react';
import { IconSearch, IconX, IconAdjustments, IconUser, IconArticle, IconNote } from '@tabler/icons-react';
import type { NDKFilter } from '@nostr-dev-kit/ndk';
import { useFeed, useProfile } from '../feed/hooks';
import { NoteCard } from '../components/NoteCard';
import { useNav } from '../context/NavContext';
import { encodePubkey, truncateNpub } from '../../core/keys';

type SearchKind = 'notes' | 'profiles' | 'articles';

const KIND_OPTIONS: { value: SearchKind; label: string; icon: React.ElementType }[] = [
  { value: 'notes', label: 'Notes', icon: IconNote },
  { value: 'profiles', label: 'Profiles', icon: IconUser },
  { value: 'articles', label: 'Articles', icon: IconArticle },
];

function dateToUnix(dateStr: string): number | undefined {
  if (!dateStr) return undefined;
  const ms = new Date(dateStr).getTime();
  return isNaN(ms) ? undefined : Math.floor(ms / 1000);
}

export function buildFilter(query: string, kind: SearchKind = 'notes', author = '', since = '', until = ''): NDKFilter {
  const trimmed = query.trim();
  const sinceTs = dateToUnix(since);
  const untilTs = dateToUnix(until);
  const base: NDKFilter = {};
  if (sinceTs) base.since = sinceTs;
  if (untilTs) base.until = untilTs;
  if (author.trim()) base.authors = [author.trim()];

  if (kind === 'profiles') {
    return { ...base, kinds: [0], search: trimmed || undefined, limit: 30 };
  }
  if (kind === 'articles') {
    return { ...base, kinds: [30023], search: trimmed || undefined, limit: 20 };
  }
  // notes
  if (trimmed.startsWith('#')) {
    return { ...base, kinds: [1], '#t': [trimmed.slice(1).toLowerCase()], limit: 50 };
  }
  return { ...base, kinds: [1], search: trimmed || undefined, limit: 50 };
}

function ProfileCard({ pubkey }: { pubkey: string }) {
  const profile = useProfile(pubkey);
  const { push } = useNav();
  const npub = encodePubkey(pubkey);
  const display = profile?.displayName ?? profile?.name ?? truncateNpub(npub);

  return (
    <button
      onClick={() => push({ view: 'profile', pubkey })}
      className="w-full flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-left"
    >
      {profile?.image
        ? <img src={profile.image} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
        : <span className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 shrink-0" />
      }
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{display}</p>
        {profile?.about && (
          <p className="text-xs text-zinc-500 truncate mt-0.5">{profile.about}</p>
        )}
        <p className="text-xs font-mono text-zinc-400 truncate mt-0.5">{truncateNpub(npub)}</p>
      </div>
    </button>
  );
}

function ArticleCard({ pubkey, title, summary, createdAt }: {
  pubkey: string;
  title: string;
  summary?: string;
  createdAt?: number;
}) {
  const profile = useProfile(pubkey);
  const authorName = profile?.displayName ?? profile?.name ?? truncateNpub(encodePubkey(pubkey));
  const dateStr = createdAt ? new Date(createdAt * 1000).toLocaleDateString() : '';

  return (
    <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
      <p className="text-sm font-semibold leading-snug">{title || 'Untitled'}</p>
      {summary && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{summary}</p>}
      <p className="text-xs text-zinc-400 mt-1.5">{authorName}{dateStr ? ` - ${dateStr}` : ''}</p>
    </div>
  );
}

export function SearchScreen({ initialQuery = '' }: { initialQuery?: string }) {
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [kind, setKind] = useState<SearchKind>('notes');
  const [author, setAuthor] = useState('');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const hasFilters = author.trim() !== '' || since !== '' || until !== '' || kind !== 'notes';

  const filter = useMemo(
    () => buildFilter(query, kind, author, since, until),
    [query, kind, author, since, until],
  );

  const enabled = query.length > 0 || author.trim().length > 0;
  const { events, eose } = useFeed(filter, enabled);

  const handleSearch = useCallback(() => {
    const trimmed = input.trim();
    setQuery(trimmed);
  }, [input]);

  const handleClear = useCallback(() => {
    setInput('');
    setQuery('');
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  const isEmpty = !enabled || (eose && events.length === 0);
  const loading = enabled && !eose && events.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <IconSearch size={15} className="text-zinc-400 shrink-0" />
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={kind === 'profiles' ? 'Search profiles...' : kind === 'articles' ? 'Search articles...' : 'Search notes or #hashtag...'}
              className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-zinc-400"
            />
            {input && (
              <button onClick={handleClear} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" aria-label="Clear">
                <IconX size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`p-1.5 rounded-lg transition-colors ${showFilters || hasFilters ? 'bg-accent text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
            aria-label="Filters"
          >
            <IconAdjustments size={16} />
          </button>
        </div>

        {showFilters && (
          <div className="space-y-2 pt-1">
            <div className="flex gap-1">
              {KIND_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setKind(value)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    kind === value
                      ? 'bg-accent text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <Icon size={11} /> {label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="Author pubkey (hex)"
              className="w-full px-2 py-1.5 text-xs font-mono rounded border border-zinc-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-1 focus:ring-accent"
            />

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-zinc-400 mb-0.5">From</label>
                <input
                  type="date"
                  value={since}
                  onChange={e => setSince(e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-zinc-400 mb-0.5">To</label>
                <input
                  type="date"
                  value={until}
                  onChange={e => setUntil(e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            {hasFilters && (
              <button
                onClick={() => { setKind('notes'); setAuthor(''); setSince(''); setUntil(''); }}
                className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!enabled && (
          <div className="flex flex-col items-center justify-center h-full gap-1 text-zinc-400">
            <IconSearch size={28} strokeWidth={1.5} />
            <p className="text-sm">Search Nostr</p>
            <p className="text-xs">Try a keyword, #hashtag, or filter by author</p>
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        )}
        {enabled && eose && events.length === 0 && (
          <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
            No results{query ? ` for "${query}"` : ''}
          </div>
        )}
        {kind === 'profiles' && events.map(ev => (
          <ProfileCard key={ev.pubkey} pubkey={ev.pubkey} />
        ))}
        {kind === 'articles' && events.map(ev => {
          const title = ev.tags.find(t => t[0] === 'title')?.[1] ?? '';
          const summary = ev.tags.find(t => t[0] === 'summary')?.[1];
          return <ArticleCard key={ev.id} pubkey={ev.pubkey} title={title} summary={summary} createdAt={ev.created_at} />;
        })}
        {kind === 'notes' && events.map(ev => <NoteCard key={ev.id} event={ev} />)}
      </div>
    </div>
  );
}
