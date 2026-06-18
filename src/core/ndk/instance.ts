import NDK, { NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import { DEFAULT_RELAYS } from './config';

export function createNDK(privkeyHex: string, relayUrls: string[] = [...DEFAULT_RELAYS]): NDK {
  const signer = new NDKPrivateKeySigner(privkeyHex);
  return new NDK({
    explicitRelayUrls: relayUrls,
    signer,
    enableOutboxModel: true,
  });
}
