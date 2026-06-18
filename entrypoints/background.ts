import { executeNip07 } from '../src/core/nip07/execute';
import { getPermission } from '../src/core/store/permissions';
import type { NIP07Method, ApprovalResult, PendingApproval, BridgeNip07Request } from '../src/core/nip07/types';

type IncomingMessage = BridgeNip07Request | ApprovalResult;

const pendingApprovals = new Map<string, {
  resolve: (approved: boolean) => void;
  reject: (e: Error) => void;
}>();

export default defineBackground(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  chrome.runtime.onMessage.addListener(
    (msg: IncomingMessage, _sender, sendResponse) => {
      if (msg.type === 'nip07-request') {
        handleNip07(msg as BridgeNip07Request)
          .then(result => sendResponse({ result }))
          .catch((err: unknown) =>
            sendResponse({ error: err instanceof Error ? err.message : 'Unknown error' }),
          );
        return true;
      }

      if (msg.type === 'nip07-approval-result') {
        const approval = msg as ApprovalResult;
        const p = pendingApprovals.get(approval.requestId);
        if (p) {
          pendingApprovals.delete(approval.requestId);
          if (approval.approved) p.resolve(true);
          else p.reject(new Error('User denied'));
        }
      }
    },
  );
});

async function handleNip07(msg: BridgeNip07Request): Promise<unknown> {
  const { activeKey } = await chrome.storage.session.get('activeKey');
  if (!activeKey) throw new Error('Wallet locked - unlock Nostru first');

  const perm = await getPermission(msg.origin);
  if (perm === 'deny') throw new Error('Permission denied for this site');
  if (perm !== 'allow') {
    const approved = await promptApproval(msg.id, msg.origin, msg.method);
    if (!approved) throw new Error('User denied');
  }

  return executeNip07(msg.method, msg.params, activeKey as string);
}

async function promptApproval(
  requestId: string,
  origin: string,
  method: NIP07Method,
): Promise<boolean> {
  const pending: PendingApproval = { requestId, origin, method };
  await chrome.storage.session.set({ [`nip07-pending-${requestId}`]: pending });

  const url = `${chrome.runtime.getURL('approval.html')}?requestId=${encodeURIComponent(requestId)}`;
  await chrome.windows.create({ url, type: 'popup', width: 420, height: 320, focused: true });

  return new Promise((resolve, reject) => {
    pendingApprovals.set(requestId, { resolve, reject });
    setTimeout(() => {
      if (pendingApprovals.has(requestId)) {
        pendingApprovals.delete(requestId);
        reject(new Error('Permission request timed out'));
      }
    }, 120_000);
  });
}
