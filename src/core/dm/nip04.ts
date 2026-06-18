import type NDK from '@nostr-dev-kit/ndk';
import { NDKEvent, NDKRelaySet } from '@nostr-dev-kit/ndk';
import { nip04, finalizeEvent, type NostrEvent } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils.js';
import { DEFAULT_RELAYS } from '../ndk/config';
import type { DecryptedMessage } from './types';

export async function sendNip04(
  ndk: NDK,
  privkeyHex: string,
  recipientPubkey: string,
  content: string,
): Promise<void> {
  const privkey = hexToBytes(privkeyHex);
  const encrypted = await nip04.encrypt(privkeyHex, recipientPubkey, content);
  const template = {
    kind: 4,
    content: encrypted,
    tags: [['p', recipientPubkey]],
    created_at: Math.floor(Date.now() / 1000),
  };
  const event = finalizeEvent(template, privkey);
  const relaySet = NDKRelaySet.fromRelayUrls([...DEFAULT_RELAYS], ndk);
  await new NDKEvent(ndk, event as NostrEvent).publish(relaySet);
}

export async function decryptNip04(
  event: { id: string; pubkey: string; content: string; created_at: number; tags: string[][] },
  myPubkey: string,
  privkeyHex: string,
): Promise<DecryptedMessage | null> {
  try {
    const isSent = event.pubkey === myPubkey;
    const otherPubkey = isSent
      ? (event.tags.find(t => t[0] === 'p')?.[1] ?? '')
      : event.pubkey;
    const decrypted = await nip04.decrypt(privkeyHex, otherPubkey, event.content);
    const to = isSent ? otherPubkey : myPubkey;
    return {
      id: event.id,
      from: event.pubkey,
      to,
      content: decrypted,
      timestamp: event.created_at,
      protocol: 'nip04',
    };
  } catch {
    return null;
  }
}
