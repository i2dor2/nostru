import { NDKEvent } from '@nostr-dev-kit/ndk';
import type NDK from '@nostr-dev-kit/ndk';

export async function publishNip352Address(
  ndk: NDK,
  sp1Address: string,
  network: 'mainnet' | 'signet' | 'testnet' = 'mainnet',
): Promise<void> {
  const event = new NDKEvent(ndk, {
    kind: 10352,
    content: '',
    tags: [
      ['d', network],
      ['sp1', sp1Address],
    ],
  });
  await event.sign();
  await event.publish();
}

export async function fetchNip352Address(
  ndk: NDK,
  pubkeyHex: string,
  network: 'mainnet' | 'signet' | 'testnet' = 'mainnet',
): Promise<string | null> {
  const events = await ndk.fetchEvents({
    kinds: [10352],
    authors: [pubkeyHex],
    '#d': [network],
    limit: 5,
  });

  let latest: NDKEvent | null = null;
  for (const ev of events) {
    if (!latest || (ev.created_at ?? 0) > (latest.created_at ?? 0)) latest = ev;
  }

  if (!latest) return null;
  return latest.tags.find(t => t[0] === 'sp1')?.[1] ?? null;
}
