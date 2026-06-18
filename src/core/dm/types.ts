export interface DecryptedMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  protocol: 'nip17' | 'nip04';
}

export interface Conversation {
  peerPubkey: string;
  messages: DecryptedMessage[];
  lastMessage: DecryptedMessage | null;
}
