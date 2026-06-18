export default defineContentScript({
  matches: ['<all_urls>'],
  world: 'MAIN',
  runAt: 'document_start',

  main() {
    const pending = new Map<
      string,
      { resolve: (v: unknown) => void; reject: (e: Error) => void }
    >();

    window.addEventListener('message', (e: MessageEvent) => {
      if (e.source !== window) return;
      const d = e.data as { ext?: string; type?: string; id?: string; result?: unknown; error?: string } | null;
      if (d?.ext !== 'nostru' || d?.type !== 'nip07-response' || !d.id) return;
      const p = pending.get(d.id);
      if (!p) return;
      pending.delete(d.id);
      if (d.error) p.reject(new Error(d.error));
      else p.resolve(d.result);
    });

    function request(method: string, params?: unknown): Promise<unknown> {
      const id = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        window.postMessage({ ext: 'nostru', type: 'nip07-request', id, method, params }, '*');
        setTimeout(() => {
          if (pending.has(id)) {
            pending.delete(id);
            reject(new Error('Nostru: request timed out'));
          }
        }, 60_000);
      });
    }

    Object.defineProperty(window, 'nostr', {
      value: Object.freeze({
        getPublicKey: () => request('getPublicKey'),
        signEvent: (event: unknown) => request('signEvent', { event }),
        getRelays: () => request('getRelays'),
        nip04: Object.freeze({
          encrypt: (pubkey: string, plaintext: string) =>
            request('nip04.encrypt', { pubkey, plaintext }),
          decrypt: (pubkey: string, ciphertext: string) =>
            request('nip04.decrypt', { pubkey, ciphertext }),
        }),
        nip44: Object.freeze({
          encrypt: (pubkey: string, plaintext: string) =>
            request('nip44.encrypt', { pubkey, plaintext }),
          decrypt: (pubkey: string, ciphertext: string) =>
            request('nip44.decrypt', { pubkey, ciphertext }),
        }),
      }),
      writable: false,
      configurable: false,
    });
  },
});
