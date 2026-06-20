import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSignInPolicy, mockSignIn, MockNDK, MockSigner } = vi.hoisted(() => {
  const mockSignInPolicy = vi.fn();
  const mockSignIn = vi.fn(() => mockSignInPolicy);
  const MockNDK = vi.fn(function (this: Record<string, unknown>) {
    this.pool = { relays: new Map() };
    this.relayAuthDefaultPolicy = undefined;
  });
  const MockSigner = vi.fn(function (this: Record<string, unknown>, hex: string) {
    this.hex = hex;
  });
  return { mockSignInPolicy, mockSignIn, MockNDK, MockSigner };
});

vi.mock('@nostr-dev-kit/ndk', () => ({
  default: MockNDK,
  NDKPrivateKeySigner: MockSigner,
  NDKRelayAuthPolicies: { signIn: mockSignIn },
}));

vi.mock('./config', () => ({ DEFAULT_RELAYS: ['wss://relay.example.com'] }));

import { createNDK } from './instance';

const PRIV = '0000000000000000000000000000000000000000000000000000000000000001';

describe('createNDK', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets relayAuthDefaultPolicy via NDKRelayAuthPolicies.signIn', () => {
    mockSignIn.mockReturnValue(mockSignInPolicy);
    const ndk = createNDK(PRIV);
    expect(mockSignIn).toHaveBeenCalledWith({ ndk });
    expect(ndk.relayAuthDefaultPolicy).toBe(mockSignInPolicy);
  });

  it('passes provided relay URLs to NDK constructor', () => {
    const urls = ['wss://a.example.com', 'wss://b.example.com'];
    createNDK(PRIV, urls);
    expect(MockNDK).toHaveBeenCalledWith(
      expect.objectContaining({ explicitRelayUrls: urls }),
    );
  });

  it('falls back to DEFAULT_RELAYS when no URLs provided', () => {
    createNDK(PRIV);
    expect(MockNDK).toHaveBeenCalledWith(
      expect.objectContaining({ explicitRelayUrls: ['wss://relay.example.com'] }),
    );
  });

  it('enables outbox model', () => {
    createNDK(PRIV);
    expect(MockNDK).toHaveBeenCalledWith(
      expect.objectContaining({ enableOutboxModel: true }),
    );
  });
});
