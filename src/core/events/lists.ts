import { NDKEvent } from '@nostr-dev-kit/ndk';
import type NDK from '@nostr-dev-kit/ndk';
import type { RelayConfig } from '../store/relays';

export async function publishMuteList(ndk: NDK, pubkeys: string[]): Promise<void> {
  const ev = new NDKEvent(ndk);
  ev.kind = 10000;
  ev.content = '';
  ev.tags = pubkeys.map(p => ['p', p]);
  await ev.publish();
}

export async function publishPinList(ndk: NDK, eventIds: string[]): Promise<void> {
  const ev = new NDKEvent(ndk);
  ev.kind = 10001;
  ev.content = '';
  ev.tags = eventIds.map(id => ['e', id]);
  await ev.publish();
}

export async function publishBookmarkList(ndk: NDK, eventIds: string[]): Promise<void> {
  const ev = new NDKEvent(ndk);
  ev.kind = 10003;
  ev.content = '';
  ev.tags = eventIds.map(id => ['e', id]);
  await ev.publish();
}

export async function fetchNip51List(
  ndk: NDK,
  pubkey: string,
  kind: number,
): Promise<string[]> {
  const ev = await ndk.fetchEvent({ kinds: [kind], authors: [pubkey] });
  if (!ev) return [];
  const tag = kind === 10000 ? 'p' : 'e';
  return ev.tags.filter(t => t[0] === tag && t[1]).map(t => t[1]);
}

export async function publishRelayList(ndk: NDK, relays: RelayConfig[]): Promise<void> {
  const ev = new NDKEvent(ndk);
  ev.kind = 10002;
  ev.content = '';
  ev.tags = relays.map(({ url, read, write }) => {
    if (read && write) return ['r', url];
    if (read) return ['r', url, 'read'];
    return ['r', url, 'write'];
  });
  await ev.publish();
}
