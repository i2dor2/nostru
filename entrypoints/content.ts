const ALLOWED_METHODS = new Set([
  'getPublicKey',
  'signEvent',
  'getRelays',
  'nip04.encrypt',
  'nip04.decrypt',
  'nip44.encrypt',
  'nip44.decrypt',
]);

export default defineContentScript({
  matches: ['<all_urls>'],

  main() {
    window.addEventListener('message', (e: MessageEvent) => {
      if (e.source !== window) return;
      const d = e.data as { ext?: string; type?: string; id?: string; method?: string; params?: unknown } | null;
      if (d?.ext !== 'nostru' || d?.type !== 'nip07-request' || !d.id) return;

      const { id, method, params } = d;
      const origin = e.origin;

      if (!method || !ALLOWED_METHODS.has(method)) {
        window.postMessage(
          { ext: 'nostru', type: 'nip07-response', id, error: 'Unknown method' },
          origin,
        );
        return;
      }

      chrome.runtime
        .sendMessage({ type: 'nip07-request', id, origin: window.location.origin, method, params })
        .then((resp: unknown) => {
          const r = resp as { result?: unknown; error?: string } | null;
          window.postMessage(
            { ext: 'nostru', type: 'nip07-response', id, result: r?.result, error: r?.error },
            origin,
          );
        })
        .catch((err: unknown) => {
          window.postMessage(
            {
              ext: 'nostru',
              type: 'nip07-response',
              id,
              error: err instanceof Error ? err.message : 'Extension error',
            },
            origin,
          );
        });
    });
  },
});
