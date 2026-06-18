import type NDK from '@nostr-dev-kit/ndk';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { nip59, getPublicKey, type NostrEvent } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils.js';
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

  await Promise.all([
    new NDKEvent(ndk, wrapForRecipient as NostrEvent).publish(),
    new NDKEvent(ndk, wrapForSelf as NostrEvent).publish(),
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
