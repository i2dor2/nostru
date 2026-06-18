import type NDK from '@nostr-dev-kit/ndk';
import { NDKEvent, NDKRelaySet } from '@nostr-dev-kit/ndk';
import { nip59, getPublicKey, type NostrEvent } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils.js';
import { DEFAULT_RELAYS } from '../ndk/config';
import type { DecryptedMessage } from './types';

export async function sendNip17(
  ndk: NDK,
  privkeyHex: string,
  recipientPubkey: string,
  content: string,
): Promise<void> {
  const privkey = hexToBytes(privkeyHex);
  const myPubkey = getPublicKey(privkey);
  const template = { kind: 14, content, tags: [['p', recipientPubkey]] };

  const wrapForRecipient = nip59.wrapEvent(template, privkey, recipientPubkey);
  const wrapForSelf = nip59.wrapEvent(template, privkey, myPubkey);

  // Bypass outbox model: gift wraps use ephemeral keys with no NIP-65, so
  // NDK would route to zero relays without an explicit set.
  const relaySet = NDKRelaySet.fromRelayUrls([...DEFAULT_RELAYS], ndk);
  await Promise.all([
    new NDKEvent(ndk, wrapForRecipient as NostrEvent).publish(relaySet),
    new NDKEvent(ndk, wrapForSelf as NostrEvent).publish(relaySet),
  ]);
}

export function decryptNip17GiftWrap(
  wrap: NostrEvent,
  privkeyHex: string,
  myPubkey: string,
): DecryptedMessage | null {
  try {
    const privkey = hexToBytes(privkeyHex);
    const rumor = nip59.unwrapEvent(wrap, privkey) as NostrEvent & { id: string; pubkey: string };
    if (rumor.kind !== 14) return null;
    const to = rumor.tags.find(t => t[0] === 'p')?.[1] ?? myPubkey;
    return {
      id: rumor.id,
      from: rumor.pubkey,
      to,
      content: rumor.content,
      timestamp: rumor.created_at,
      protocol: 'nip17',
    };
  } catch {
    return null;
  }
}
