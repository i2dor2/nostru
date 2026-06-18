import NDK, { NDKSubscriptionCacheUsage, type NDKEvent, type NDKFilter, type NDKUserProfile } from '@nostr-dev-kit/ndk';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNDK } from '../../core/ndk';
import { verifyNip05 } from '../../core/events/nip05';
import { getBlocks } from '../../core/store/blocks';

export function useFeed(
  filter: NDKFilter,
  enabled: boolean,
  opts?: { cacheUsage?: NDKSubscriptionCacheUsage },
): { events: NDKEvent[]; eose: boolean } {
  const { ndk } = useNDK();
  const [map, setMap] = useState<Map<string, NDKEvent>>(new Map());
  const [eose, setEose] = useState(false);
  const filterRef = useRef(filter);
  filterRef.current = filter; // always current before effect runs
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const filterKey = JSON.stringify(filter);

  useEffect(() => {
    if (!ndk || !enabled) return;
    setMap(new Map());
    setEose(false);

    const sub = ndk.subscribe(filterRef.current, {
      closeOnEose: false,
      cacheUsage: optsRef.current?.cacheUsage,
    });

    sub.on('event', (ev: NDKEvent) => {
      setMap(prev => {
        const next = new Map(prev);
        next.set(ev.id, ev);
        return next;
      });
    });

    sub.on('eose', () => setEose(true));

    return () => sub.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ndk, enabled, filterKey]);

  const events = Array.from(map.values()).sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
  return { events, eose };
}

export function useFollows(pubkey: string | null): string[] | null {
  const { ndk } = useNDK();
  const [follows, setFollows] = useState<string[] | null>(null);

  useEffect(() => {
    if (!ndk || !pubkey) return;
    let cancelled = false;

    ndk.fetchEvent({ kinds: [3], authors: [pubkey] }).then(ev => {
      if (cancelled) return;
      if (!ev) { setFollows([]); return; }
      const pubkeys = ev.tags.filter(t => t[0] === 'p' && t[1]).map(t => t[1]);
      setFollows(pubkeys);
    });

    return () => { cancelled = true; };
  }, [ndk, pubkey]);

  return follows;
}

export function useProfile(pubkey: string): NDKUserProfile | null {
  const { ndk } = useNDK();
  const [profile, setProfile] = useState<NDKUserProfile | null>(null);

  useEffect(() => {
    if (!ndk) return;
    let cancelled = false;
    const user = ndk.getUser({ pubkey });
    user.fetchProfile().then(p => {
      if (!cancelled) setProfile(p ?? null);
    });
    return () => { cancelled = true; };
  }, [ndk, pubkey]);

  return profile;
}

export function useGlobalFeed(ndk: NDK | null): { events: NDKEvent[]; eose: boolean } {
  const [map, setMap] = useState<Map<string, NDKEvent>>(new Map());
  const [eose, setEose] = useState(false);

  useEffect(() => {
    if (!ndk) return;
    setMap(new Map());
    setEose(false);

    const sub = ndk.subscribe(
      { kinds: [1], limit: 50 },
      { closeOnEose: true, cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY },
    );

    sub.on('event', (ev: NDKEvent) => {
      setMap(prev => {
        const next = new Map(prev);
        next.set(ev.id, ev);
        return next;
      });
    });

    sub.on('eose', () => setEose(true));

    return () => sub.stop();
  }, [ndk]);

  return {
    events: Array.from(map.values()).sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)).slice(0, 100),
    eose,
  };
}

export function useNip05(identifier: string | undefined, pubkey: string): boolean | null {
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (!identifier) { setVerified(false); return; }
    let cancelled = false;
    verifyNip05(identifier, pubkey).then(result => {
      if (!cancelled) setVerified(result);
    });
    return () => { cancelled = true; };
  }, [identifier, pubkey]);

  return verified;
}

export function useNoteStats(eventId: string): { likes: number; reposts: number; zaps: number } {
  const { events } = useFeed(
    { kinds: [6, 7, 9735] as number[], '#e': [eventId] },
    !!eventId,
  );
  return useMemo(() => ({
    likes: events.filter(e => e.kind === 7).length,
    reposts: events.filter(e => e.kind === 6).length,
    zaps: events.filter(e => e.kind === 9735).length,
  }), [events]);
}

export function useBlocks(): Set<string> {
  const [blocks, setBlocks] = useState<Set<string>>(new Set());

  useEffect(() => {
    getBlocks().then(list => setBlocks(new Set(list)));

    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if ('blocks' in changes) {
        setBlocks(new Set((changes['blocks'].newValue as string[] | undefined) ?? []));
      }
    };
    chrome.storage.local.onChanged.addListener(listener);
    return () => chrome.storage.local.onChanged.removeListener(listener);
  }, []);

  return blocks;
}
