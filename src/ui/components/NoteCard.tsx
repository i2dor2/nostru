import { useState, useCallback } from 'react';
import type { NDKEvent } from '@nostr-dev-kit/ndk';
import { nip19 } from 'nostr-tools';
import { IconArrowForwardUp, IconRepeat, IconHeart, IconBolt, IconRosetteDiscountCheckFilled } from '@tabler/icons-react';
import { encodePubkey, truncateNpub } from '../../core/keys';
import { useProfile, useNip05 } from '../feed/hooks';
import { useNDK } from '../../core/ndk';
import { publishLike, publishRepost } from '../../core/events/reactions';
import { useNav } from '../context/NavContext';
import { ZapModal } from './ZapModal';

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|avif)(\?[^)\s]*)?$/i;

type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'image'; url: string }
  | { kind: 'url'; url: string }
  | { kind: 'hashtag'; tag: string }
  | { kind: 'nostr-profile'; pubkey: string; raw: string }
  | { kind: 'nostr-event'; eventId: string; raw: string };

const TOKEN_RE = /(https?:\/\/\S+)|(#[\w-￿]+)|(nostr:[a-z0-9]+)/gi;

function parseSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = TOKEN_RE.exec(content)) !== null) {
    if (m.index > last) segments.push({ kind: 'text', value: content.slice(last, m.index) });
    const token = m[0];

    if (token.startsWith('nostr:')) {
      try {
        const decoded = nip19.decode(token.slice(6));
        if (decoded.type === 'npub') {
          segments.push({ kind: 'nostr-profile', pubkey: decoded.data as string, raw: token });
        } else if (decoded.type === 'nprofile') {
          segments.push({ kind: 'nostr-profile', pubkey: (decoded.data as { pubkey: string }).pubkey, raw: token });
        } else if (decoded.type === 'note') {
          segments.push({ kind: 'nostr-event', eventId: decoded.data as string, raw: token });
        } else if (decoded.type === 'nevent') {
          segments.push({ kind: 'nostr-event', eventId: (decoded.data as { id: string }).id, raw: token });
        } else {
          segments.push({ kind: 'text', value: token });
        }
      } catch {
        segments.push({ kind: 'text', value: token });
      }
    } else if (token.startsWith('#')) {
      segments.push({ kind: 'hashtag', tag: token.slice(1) });
    } else if (IMAGE_EXT.test(token)) {
      segments.push({ kind: 'image', url: token });
    } else {
      segments.push({ kind: 'url', url: token });
    }

    last = m.index + token.length;
  }

  if (last < content.length) segments.push({ kind: 'text', value: content.slice(last) });
  return segments;
}

function relativeTime(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function Avatar({
  pubkey,
  name,
  picture,
  size = 9,
  onClick,
}: {
  pubkey: string;
  name?: string;
  picture?: string;
  size?: number;
  onClick?: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = (name ?? pubkey).slice(0, 2).toUpperCase();
  const hue = parseInt(pubkey.slice(0, 4), 16) % 360;
  const cls = `w-${size} h-${size} rounded-full shrink-0 focus:outline-none overflow-hidden`;

  if (picture && !imgFailed) {
    return (
      <button onClick={onClick} className={cls} aria-label="View profile">
        <img
          src={picture}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
          loading="lazy"
        />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${cls} flex items-center justify-center text-xs font-medium text-white`}
      style={{ backgroundColor: `hsl(${hue} 60% 45%)` }}
      aria-label="View profile"
    >
      {initials}
    </button>
  );
}

function NostrProfileMention({ pubkey, raw }: { pubkey: string; raw: string }) {
  const profile = useProfile(pubkey);
  const { push } = useNav();
  const display = profile?.displayName ?? profile?.name ?? truncateNpub(encodePubkey(pubkey));
  return (
    <button
      onClick={() => push({ view: 'profile', pubkey })}
      className="text-accent hover:underline font-medium"
    >
      @{display}
    </button>
  );
}

function NostrEventMention({ eventId, raw }: { eventId: string; raw: string }) {
  const { push } = useNav();
  return (
    <button
      onClick={() => push({ view: 'event-ref', eventId })}
      className="text-accent hover:underline font-mono text-xs"
    >
      {raw.slice(0, 16)}...
    </button>
  );
}

function ContentRenderer({ content }: { content: string }) {
  const { push } = useNav();
  const segments = parseSegments(content);

  const inlineSegs = segments.filter(s => s.kind !== 'image');
  const imageSegs = segments.filter(s => s.kind === 'image') as Extract<Segment, { kind: 'image' }>[];

  const hasText = inlineSegs.length > 0;

  return (
    <div className="space-y-2">
      {hasText && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">
          {inlineSegs.map((seg, i) => {
            if (seg.kind === 'text') return <span key={i}>{seg.value}</span>;
            if (seg.kind === 'hashtag') return (
              <button
                key={i}
                onClick={() => push({ view: 'search', query: `#${seg.tag}` })}
                className="text-accent hover:underline"
              >
                #{seg.tag}
              </button>
            );
            if (seg.kind === 'url') return (
              <a
                key={i}
                href={seg.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline break-all"
                onClick={e => e.stopPropagation()}
              >
                {seg.url}
              </a>
            );
            if (seg.kind === 'nostr-profile') return <NostrProfileMention key={i} pubkey={seg.pubkey} raw={seg.raw} />;
            if (seg.kind === 'nostr-event') return <NostrEventMention key={i} eventId={seg.eventId} raw={seg.raw} />;
            return null;
          })}
        </p>
      )}
      {imageSegs.map((seg, i) => (
        <a
          key={i}
          href={seg.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
        >
          <img
            src={seg.url}
            alt=""
            loading="lazy"
            className="rounded-lg max-h-[32rem] max-w-full object-contain cursor-zoom-in"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </a>
      ))}
    </div>
  );
}

export function NoteCard({ event }: { event: NDKEvent }) {
  const ts = event.created_at ?? 0;
  const { ndk } = useNDK();
  const { push } = useNav();
  const profile = useProfile(event.pubkey);
  const verified = useNip05(profile?.nip05 ?? undefined, event.pubkey);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [zapOpen, setZapOpen] = useState(false);

  const name = profile?.displayName ?? profile?.name;
  const picture = profile?.picture ?? undefined;
  const display = name ?? truncateNpub(encodePubkey(event.pubkey));

  const goProfile = useCallback(() => {
    push({ view: 'profile', pubkey: event.pubkey });
  }, [push, event.pubkey]);

  const goThread = useCallback(() => {
    push({ view: 'thread', event });
  }, [push, event]);

  const handleLike = useCallback(async () => {
    if (!ndk || liked || liking) return;
    setLiking(true);
    setLiked(true);
    try {
      await publishLike(ndk, event);
    } catch {
      setLiked(false);
    } finally {
      setLiking(false);
    }
  }, [ndk, liked, liking, event]);

  const handleRepost = useCallback(async () => {
    if (!ndk || reposted) return;
    setReposted(true);
    try {
      await publishRepost(ndk, event);
    } catch {
      setReposted(false);
    }
  }, [ndk, reposted, event]);

  return (
    <article className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
      <div className="flex gap-3">
        <Avatar pubkey={event.pubkey} name={name} picture={picture} onClick={goProfile} />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <button onClick={goProfile} className="text-sm font-medium truncate hover:underline text-left focus:outline-none">
              {display}
            </button>
            {verified && (
              <IconRosetteDiscountCheckFilled size={14} className="text-accent shrink-0" aria-label="NIP-05 verified" />
            )}
            <span className="text-xs text-zinc-400 shrink-0 ml-auto">{relativeTime(ts)}</span>
          </div>
          <ContentRenderer content={event.content} />
          <div className="flex gap-5 pt-1">
            <button
              onClick={goThread}
              className="flex items-center gap-1 text-zinc-400 hover:text-accent transition-colors"
              aria-label="Reply"
            >
              <IconArrowForwardUp size={15} />
            </button>
            <button
              onClick={handleRepost}
              className={`flex items-center gap-1 transition-colors ${reposted ? 'text-green-500' : 'text-zinc-400 hover:text-green-500'}`}
              aria-label="Repost"
            >
              <IconRepeat size={15} />
            </button>
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 transition-colors ${liked ? 'text-red-500' : 'text-zinc-400 hover:text-red-500'}`}
              aria-label="Like"
            >
              <IconHeart size={15} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => setZapOpen(true)}
              className="flex items-center gap-1 text-zinc-400 hover:text-zap transition-colors"
              aria-label="Zap"
            >
              <IconBolt size={15} />
            </button>
          </div>
        </div>
      </div>
      {zapOpen && <ZapModal event={event} onClose={() => setZapOpen(false)} />}
    </article>
  );
}
