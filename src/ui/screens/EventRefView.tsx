import { useEffect, useState } from 'react';
import type { NDKEvent } from '@nostr-dev-kit/ndk';
import { useNDK } from '../../core/ndk';
import { ThreadView } from './ThreadView';

export function EventRefView({ eventId }: { eventId: string }) {
  const { ndk } = useNDK();
  const [event, setEvent] = useState<NDKEvent | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ndk) return;
    let cancelled = false;
    ndk.fetchEvent(eventId).then(ev => {
      if (cancelled) return;
      if (ev) setEvent(ev);
      else setError(true);
    }).catch(() => {
      if (!cancelled) setError(true);
    });
    return () => { cancelled = true; };
  }, [ndk, eventId]);

  if (error) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-sm text-zinc-400">Note not found.</p>
    </div>
  );

  if (!event) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  );

  return <ThreadView event={event} />;
}
