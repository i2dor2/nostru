import { useEffect, useState } from 'react';
import { IconShieldCheck, IconShieldX } from '@tabler/icons-react';
import { setPermission } from '../../core/store/permissions';
import type { PendingApproval } from '../../core/nip07/types';

const METHOD_LABEL: Record<string, string> = {
  getPublicKey: 'Read your public key',
  signEvent: 'Sign a Nostr event on your behalf',
  getRelays: 'Read your relay list',
  'nip04.encrypt': 'Encrypt a message (NIP-04)',
  'nip04.decrypt': 'Decrypt a message (NIP-04)',
  'nip44.encrypt': 'Encrypt a message (NIP-44)',
  'nip44.decrypt': 'Decrypt a message (NIP-44)',
};

export function ApprovalScreen() {
  const [pending, setPending] = useState<PendingApproval | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const requestId = new URLSearchParams(location.search).get('requestId');
    if (!requestId) { setLoading(false); return; }
    chrome.storage.session
      .get(`nip07-pending-${requestId}`)
      .then(data => {
        const req = data[`nip07-pending-${requestId}`] as PendingApproval | undefined;
        if (req) setPending(req);
        setLoading(false);
      });
  }, []);

  async function respond(approved: boolean, remember: boolean) {
    if (!pending) return;
    if (remember) await setPermission(pending.origin, approved ? 'allow' : 'deny');
    await chrome.runtime.sendMessage({
      type: 'nip07-approval-result',
      requestId: pending.requestId,
      approved,
    });
    window.close();
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!pending) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950 text-zinc-400 text-sm">
        Invalid or expired request
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-5 gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <IconShieldCheck size={20} className="text-accent" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm">Permission request</p>
          <p className="text-xs text-zinc-400 truncate">{pending.origin}</p>
        </div>
      </div>

      <div className="flex-1 bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4">
        <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium mb-1">Requested action</p>
        <p className="text-sm text-zinc-800 dark:text-zinc-200">
          {METHOD_LABEL[pending.method] ?? pending.method}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => respond(false, true)}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <IconShieldX size={15} />
          Deny
        </button>
        <button
          onClick={() => respond(true, true)}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <IconShieldCheck size={15} />
          Allow
        </button>
      </div>

      <button
        onClick={() => respond(true, false)}
        className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-center transition-colors"
      >
        Allow once (don't remember)
      </button>
    </div>
  );
}
