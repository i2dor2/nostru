export type NIP07Method =
  | 'getPublicKey'
  | 'signEvent'
  | 'getRelays'
  | 'nip04.encrypt'
  | 'nip04.decrypt'
  | 'nip44.encrypt'
  | 'nip44.decrypt';

export interface WindowNip07Request {
  ext: 'nostru';
  type: 'nip07-request';
  id: string;
  method: NIP07Method;
  params?: unknown;
}

export interface WindowNip07Response {
  ext: 'nostru';
  type: 'nip07-response';
  id: string;
  result?: unknown;
  error?: string;
}

export interface BridgeNip07Request {
  type: 'nip07-request';
  id: string;
  origin: string;
  method: NIP07Method;
  params?: unknown;
}

export interface ApprovalResult {
  type: 'nip07-approval-result';
  requestId: string;
  approved: boolean;
}

export interface PendingApproval {
  requestId: string;
  origin: string;
  method: NIP07Method;
}
