import { secp256k1 } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, concatBytes } from '@noble/hashes/utils.js';

const STORAGE_KEY_PREFIX = 'nostru:paykey:';

// AES-GCM key derived deterministically from social privkey - no extra password needed.
// The social privkey is already a strong 256-bit secret, so SHA-256 is sufficient as KDF.
function deriveAesBits(socialPrivHex: string): Uint8Array {
  const label = new TextEncoder().encode('nostru:payment-key-v1');
  const priv = new Uint8Array(socialPrivHex.match(/../g)!.map(h => parseInt(h, 16)));
  return sha256(concatBytes(priv, label));
}

async function importAesKey(bits: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', bits as Uint8Array<ArrayBuffer>, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function aesEncrypt(plain: string, socialPrivHex: string): Promise<string> {
  const key = await importAesKey(deriveAesBits(socialPrivHex));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
  return bytesToHex(iv) + bytesToHex(new Uint8Array(ct));
}

async function aesDecrypt(encHex: string, socialPrivHex: string): Promise<string> {
  const key = await importAesKey(deriveAesBits(socialPrivHex));
  const bytes = new Uint8Array(encHex.match(/../g)!.map(h => parseInt(h, 16)));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  return new TextDecoder().decode(pt);
}

export function generatePaymentPriv(): string {
  const n = secp256k1.Point.Fn.ORDER;
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const d = BigInt('0x' + bytesToHex(bytes)) % (n - 1n) + 1n;
  return d.toString(16).padStart(64, '0');
}

export function paymentPubHex(paymentPrivHex: string): string {
  const d = BigInt('0x' + paymentPrivHex);
  return bytesToHex(secp256k1.Point.BASE.multiply(d).toBytes(true).slice(1));
}

export async function savePaymentKey(
  socialPubkey: string,
  paymentPrivHex: string,
  socialPrivHex: string,
): Promise<void> {
  const encrypted = await aesEncrypt(paymentPrivHex, socialPrivHex);
  await chrome.storage.local.set({ [STORAGE_KEY_PREFIX + socialPubkey]: encrypted });
}

export async function loadPaymentKey(
  socialPubkey: string,
  socialPrivHex: string,
): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY_PREFIX + socialPubkey);
  const enc = result[STORAGE_KEY_PREFIX + socialPubkey] as string | undefined;
  if (!enc) return null;
  try {
    return await aesDecrypt(enc, socialPrivHex);
  } catch { return null; }
}

export async function clearPaymentKey(socialPubkey: string): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY_PREFIX + socialPubkey);
}
