import { deriveScanPriv, deriveSpendPriv, deriveSpendPub, derivePaymentPriv, privToXonlyPubHex } from '../nsp';
import { loadPaymentKey } from '../store/paymentKey';

export type PaymentMode = 'social' | 'deterministic' | 'independent';

export interface ScanKeys {
  scanPriv: string;
  spendPub: string;
  spendPriv: string;
}

export async function resolveScanKeys(
  mode: PaymentMode | undefined,
  socialPrivHex: string,
  socialPubkeyHex: string,
  index = 1,
): Promise<ScanKeys> {
  if (mode === 'deterministic') {
    const payPriv = derivePaymentPriv(socialPrivHex, index);
    return {
      scanPriv:  deriveScanPriv(payPriv),
      spendPub:  deriveSpendPub(privToXonlyPubHex(payPriv)),
      spendPriv: deriveSpendPriv(payPriv),
    };
  }

  if (mode === 'independent') {
    const payPriv = await loadPaymentKey(socialPubkeyHex, socialPrivHex);
    if (!payPriv) throw new Error('No independent payment key - generate one in the Wallet tab');
    return {
      scanPriv:  deriveScanPriv(payPriv),
      spendPub:  deriveSpendPub(privToXonlyPubHex(payPriv)),
      spendPriv: deriveSpendPriv(payPriv),
    };
  }

  return {
    scanPriv:  deriveScanPriv(socialPrivHex),
    spendPub:  deriveSpendPub(socialPubkeyHex),
    spendPriv: deriveSpendPriv(socialPrivHex),
  };
}
