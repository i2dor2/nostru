import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSecretKey, getPublicKey, nip04 } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils.js';
import { sendNip04, decryptNip04 } from './nip04';

// mocks for sendNip04

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
  return actual; // use real hexToBytes - needed for real nip04 crypto
});

const senderPrivkey = generateSecretKey();
const senderPrivkeyHex = bytesToHex(senderPrivkey);
const senderPubkey = getPublicKey(senderPrivkey);

const recipientPrivkey = generateSecretKey();
const recipientPrivkeyHex = bytesToHex(recipientPrivkey);
const recipientPubkey = getPublicKey(recipientPrivkey);

const fakeNdk = {} as Parameters<typeof sendNip04>[0];

// -------------------- sendNip04 --------------------

describe('sendNip04', () => {
  beforeEach(() => vi.clearAllMocks());

  it('publishes exactly one event', async () => {
    await sendNip04(fakeNdk, senderPrivkeyHex, recipientPubkey, 'hi');
    expect(mockPublish).toHaveBeenCalledTimes(1);
  });

  it('publishes a kind-4 event', async () => {
    await sendNip04(fakeNdk, senderPrivkeyHex, recipientPubkey, 'hi');
    const { NDKEvent } = await import('@nostr-dev-kit/ndk');
    const [, ev] = vi.mocked(NDKEvent).mock.calls.at(-1) as unknown as [unknown, { kind: number }];
    expect(ev.kind).toBe(4);
  });

  it('includes p-tag for recipient', async () => {
    await sendNip04(fakeNdk, senderPrivkeyHex, recipientPubkey, 'hi');
    const { NDKEvent } = await import('@nostr-dev-kit/ndk');
    const [, ev] = vi.mocked(NDKEvent).mock.calls.at(-1) as unknown as [unknown, { tags: string[][] }];
    expect(ev.tags.find((t: string[]) => t[0] === 'p')?.[1]).toBe(recipientPubkey);
  });
});

// -------------------- decryptNip04 --------------------

describe('decryptNip04', () => {
  async function makeEncryptedEvent(from: string, fromHex: string, to: string, plaintext: string) {
    const encrypted = await nip04.encrypt(fromHex, to, plaintext);
    return {
      id: 'evt1',
      pubkey: from,
      content: encrypted,
      created_at: 1700000000,
      tags: [['p', to]],
    };
  }

  it('decrypts received message (from sender)', async () => {
    const event = await makeEncryptedEvent(senderPubkey, senderPrivkeyHex, recipientPubkey, 'hello');
    const msg = await decryptNip04(event, recipientPubkey, recipientPrivkeyHex);
    expect(msg).not.toBeNull();
    expect(msg!.content).toBe('hello');
    expect(msg!.from).toBe(senderPubkey);
    expect(msg!.to).toBe(recipientPubkey);
    expect(msg!.protocol).toBe('nip04');
  });

  it('decrypts sent message (authored by self)', async () => {
    const event = await makeEncryptedEvent(senderPubkey, senderPrivkeyHex, recipientPubkey, 'sent by me');
    const msg = await decryptNip04(event, senderPubkey, senderPrivkeyHex);
    expect(msg).not.toBeNull();
    expect(msg!.content).toBe('sent by me');
    expect(msg!.from).toBe(senderPubkey);
    expect(msg!.to).toBe(recipientPubkey);
  });

  it('returns null on decryption failure', async () => {
    const event = {
      id: 'x',
      pubkey: senderPubkey,
      content: 'not-valid-ciphertext',
      created_at: 1700000000,
      tags: [['p', recipientPubkey]],
    };
    const msg = await decryptNip04(event, recipientPubkey, recipientPrivkeyHex);
    expect(msg).toBeNull();
  });
});
