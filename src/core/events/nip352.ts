import type NDK from '@nostr-dev-kit/ndk';
import type { NDKEvent } from '@nostr-dev-kit/ndk';

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
