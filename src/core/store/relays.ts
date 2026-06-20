import { DEFAULT_RELAYS } from '../ndk/config';

const KEY = 'relays';

export interface RelayConfig {
  url: string;
  read: boolean;
  write: boolean;
}

const DEFAULT_CONFIGS: RelayConfig[] = DEFAULT_RELAYS.map(url => ({ url, read: true, write: true }));

function toRelayConfigs(raw: unknown): RelayConfig[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  // Backward compat: old format was string[]
  if (typeof raw[0] === 'string') {
    return (raw as string[]).map(url => ({ url, read: true, write: true }));
  }
  return raw as RelayConfig[];
}

export async function getSavedRelays(): Promise<RelayConfig[]> {
  const result = await chrome.storage.local.get(KEY);
  const configs = toRelayConfigs(result[KEY]);
  return configs.length ? configs : [...DEFAULT_CONFIGS];
}

export async function saveRelays(relays: RelayConfig[]): Promise<void> {
  await chrome.storage.local.set({ [KEY]: relays });
}
