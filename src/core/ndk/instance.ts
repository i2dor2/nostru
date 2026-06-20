import NDK, { NDKPrivateKeySigner, NDKRelayAuthPolicies } from '@nostr-dev-kit/ndk';
import { DEFAULT_RELAYS } from './config';

export function createNDK(privkeyHex: string, relayUrls: string[] = [...DEFAULT_RELAYS]): NDK {
  const signer = new NDKPrivateKeySigner(privkeyHex);
  const ndk = new NDK({
    explicitRelayUrls: relayUrls,
    signer,
    enableOutboxModel: true,
  });
  ndk.relayAuthDefaultPolicy = NDKRelayAuthPolicies.signIn({ ndk });
  return ndk;
}
