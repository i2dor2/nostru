import { IconMail } from '@tabler/icons-react';
import { useConversations } from '../messages/hooks';
import { useNav } from '../context/NavContext';
import { useProfile } from '../feed/hooks';
import { encodePubkey, truncateNpub } from '../../core/keys';

function relativeTime(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function ConversationRow({ peerPubkey, preview, timestamp }: { peerPubkey: string; preview: string; timestamp: number }) {
  const { push } = useNav();
  const profile = useProfile(peerPubkey);
  const display = profile?.displayName ?? profile?.name ?? truncateNpub(encodePubkey(peerPubkey));
  const hue = parseInt(peerPubkey.slice(0, 4), 16) % 360;

  return (
    <button
      onClick={() => push({ view: 'conversation', peerPubkey })}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors border-b border-zinc-100 dark:border-zinc-800 text-left"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
        style={{ backgroundColor: `hsl(${hue} 60% 45%)` }}
      >
        {display.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{display}</span>
          <span className="text-xs text-zinc-400 shrink-0">{relativeTime(timestamp)}</span>
        </div>
        <p className="text-xs text-zinc-400 truncate mt-0.5">{preview}</p>
      </div>
    </button>
  );
}

export function MessagesScreen() {
  const conversations = useConversations();

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-400">
        <IconMail size={32} strokeWidth={1.5} />
        <p className="text-sm">No messages yet</p>
        <p className="text-xs">Private DMs will appear here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {conversations.map(conv => (
        <ConversationRow
          key={conv.peerPubkey}
          peerPubkey={conv.peerPubkey}
          preview={conv.lastMessage?.content ?? ''}
          timestamp={conv.lastMessage?.timestamp ?? 0}
        />
      ))}
    </div>
  );
}
