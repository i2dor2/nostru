export default defineContentScript({
  matches: ['<all_urls>'],

  main() {
    window.addEventListener('message', (e: MessageEvent) => {
      if (e.source !== window) return;
      const d = e.data as { ext?: string; type?: string; id?: string; method?: string; params?: unknown } | null;
      if (d?.ext !== 'nostru' || d?.type !== 'nip07-request' || !d.id) return;

      const { id, method, params } = d;

      chrome.runtime
        .sendMessage({ type: 'nip07-request', id, origin: window.location.origin, method, params })
        .then((resp: unknown) => {
          const r = resp as { result?: unknown; error?: string } | null;
          window.postMessage(
            { ext: 'nostru', type: 'nip07-response', id, result: r?.result, error: r?.error },
            '*',
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
            '*',
          );
        });
    });
  },
});
