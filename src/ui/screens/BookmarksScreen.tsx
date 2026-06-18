import { useEffect, useState } from 'react';
import { IconBookmark } from '@tabler/icons-react';
import type { NDKEvent } from '@nostr-dev-kit/ndk';
import { useNDK } from '../../core/ndk';
import { useBookmarks } from '../feed/hooks';
import { NoteCard } from '../components/NoteCard';

function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  );
}

export function BookmarksScreen() {
  const { ndk } = useNDK();
  const bookmarks = useBookmarks();
  const [events, setEvents] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ndk || bookmarks.size === 0) { setEvents([]); return; }
    setLoading(true);
    ndk.fetchEvents({ ids: [...bookmarks] }).then(evSet => {
      const sorted = Array.from(evSet).sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
      setEvents(sorted);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [ndk, bookmarks]);

  if (loading) return <Spinner />;

  if (bookmarks.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-400">
        <IconBookmark size={32} strokeWidth={1.5} />
        <p className="text-sm">No bookmarks yet</p>
        <p className="text-xs text-center px-8">Tap the bookmark icon on any note to save it here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {events.map(ev => <NoteCard key={ev.id} event={ev} />)}
    </div>
  );
}
