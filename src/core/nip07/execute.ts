import { getPublicKey, finalizeEvent, nip04, nip44 } from 'nostr-tools';
import { hexToBytes } from '../keys/crypto';
import type { NIP07Method } from './types';

type NostrEventTemplate = {
  kind: number;
  content: string;
  tags: string[][];
  created_at?: number;
};

export async function executeNip07(
  method: NIP07Method,
  params: unknown,
  privkeyHex: string,
): Promise<unknown> {
  const privkey = hexToBytes(privkeyHex);

  switch (method) {
    case 'getPublicKey':
      return getPublicKey(privkey);

    case 'signEvent': {
      const { event } = params as { event: NostrEventTemplate };
      return finalizeEvent({
        kind: event.kind,
        content: event.content,
        tags: event.tags ?? [],
        created_at: event.created_at ?? Math.floor(Date.now() / 1000),
      }, privkey);
    }

    case 'getRelays': {
      const data = await chrome.storage.local.get('relays');
      return (data.relays as Record<string, { read: boolean; write: boolean }>) ?? {};
    }

    case 'nip04.encrypt': {
      const { pubkey, plaintext } = params as { pubkey: string; plaintext: string };
      return nip04.encrypt(privkey, pubkey, plaintext);
    }

    case 'nip04.decrypt': {
      const { pubkey, ciphertext } = params as { pubkey: string; ciphertext: string };
      return nip04.decrypt(privkey, pubkey, ciphertext);
    }

    case 'nip44.encrypt': {
      const { pubkey, plaintext } = params as { pubkey: string; plaintext: string };
      return nip44.encrypt(plaintext, nip44.getConversationKey(privkey, pubkey));
    }

    case 'nip44.decrypt': {
      const { pubkey, ciphertext } = params as { pubkey: string; ciphertext: string };
      return nip44.decrypt(ciphertext, nip44.getConversationKey(privkey, pubkey));
    }

    default:
      throw new Error(`Unknown NIP-07 method: ${method as string}`);
  }
}
