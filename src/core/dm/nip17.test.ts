import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSecretKey, getPublicKey, nip59, type NostrEvent } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils.js';
import { sendNip17, decryptNip17GiftWrap } from './nip17';

// mocks for sendNip17

const mockPublish = vi.fn().mockResolvedValue(undefined);

vi.mock('@nostr-dev-kit/ndk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nostr-dev-kit/ndk')>();
  return {
    ...actual,
    NDKEvent: vi.fn().mockImplementation((_ndk: unknown, raw: unknown) => ({
      ...(raw as object),
      publish: mockPublish,
    })),
    NDKRelaySet: { fromRelayUrls: vi.fn().mockReturnValue({}) },
  };
});

vi.mock('@noble/hashes/utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@noble/hashes/utils.js')>();
  return actual; // use real hexToBytes - needed for real nip59 crypto
});

// --- real keypairs for round-trip tests ---

const senderPrivkey = generateSecretKey();
const senderPrivkeyHex = bytesToHex(senderPrivkey);
const senderPubkey = getPublicKey(senderPrivkey);

const recipientPrivkey = generateSecretKey();
const recipientPubkey = getPublicKey(recipientPrivkey);

const fakeNdk = {} as Parameters<typeof sendNip17>[0];

// -------------------- sendNip17 --------------------

describe('sendNip17', () => {
  beforeEach(() => vi.clearAllMocks());

  it('publishes exactly two gift wraps', async () => {
    await sendNip17(fakeNdk, senderPrivkeyHex, recipientPubkey, 'hello');
    expect(mockPublish).toHaveBeenCalledTimes(2);
  });

  it('creates kind-1059 events', async () => {
    await sendNip17(fakeNdk, senderPrivkeyHex, recipientPubkey, 'hello');
    const { NDKEvent } = await import('@nostr-dev-kit/ndk');
    const calls = vi.mocked(NDKEvent).mock.calls as unknown as [unknown, { kind: number }][];
    expect(calls.every(([, ev]) => ev.kind === 1059)).toBe(true);
  });
});

// -------------------- decryptNip17GiftWrap --------------------

describe('decryptNip17GiftWrap', () => {
  it('round-trips: decrypt what we wrapped for recipient', () => {
    const wrap = nip59.wrapEvent(
      { kind: 14, content: 'secret msg', tags: [['p', recipientPubkey]] },
      senderPrivkey,
      recipientPubkey,
    ) as NostrEvent;

    const msg = decryptNip17GiftWrap(wrap, bytesToHex(recipientPrivkey), recipientPubkey);
    expect(msg).not.toBeNull();
    expect(msg!.content).toBe('secret msg');
    expect(msg!.from).toBe(senderPubkey);
    expect(msg!.to).toBe(recipientPubkey);
    expect(msg!.protocol).toBe('nip17');
    expect(msg!.timestamp).toBeGreaterThan(0);
  });

  it('round-trips: decrypt self-copy wrapped to sender', () => {
    const wrap = nip59.wrapEvent(
      { kind: 14, content: 'my sent msg', tags: [['p', recipientPubkey]] },
      senderPrivkey,
      senderPubkey,
    ) as NostrEvent;

    const msg = decryptNip17GiftWrap(wrap, senderPrivkeyHex, senderPubkey);
    expect(msg).not.toBeNull();
    expect(msg!.content).toBe('my sent msg');
    expect(msg!.from).toBe(senderPubkey);
    expect(msg!.to).toBe(recipientPubkey);
  });

  it('returns null for non-kind-14 rumor', () => {
    // Wrap a kind-1 event - should be rejected
    const wrap = nip59.wrapEvent(
      { kind: 1, content: 'public note', tags: [] },
      senderPrivkey,
      recipientPubkey,
    ) as NostrEvent;

    const msg = decryptNip17GiftWrap(wrap, bytesToHex(recipientPrivkey), recipientPubkey);
    expect(msg).toBeNull();
  });

  it('returns null when decryption fails (wrong key)', () => {
    const wrap = nip59.wrapEvent(
      { kind: 14, content: 'hi', tags: [['p', recipientPubkey]] },
      senderPrivkey,
      recipientPubkey,
    ) as NostrEvent;

    const wrongKey = bytesToHex(generateSecretKey());
    const msg = decryptNip17GiftWrap(wrap, wrongKey, recipientPubkey);
    expect(msg).toBeNull();
  });
});
