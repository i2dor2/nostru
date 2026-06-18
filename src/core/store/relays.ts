import { DEFAULT_RELAYS } from '../ndk/config';

const KEY = 'relays';

export async function getSavedRelays(): Promise<string[]> {
  const result = await chrome.storage.local.get(KEY);
  return (result[KEY] as string[] | undefined) ?? [...DEFAULT_RELAYS];
}

export async function saveRelays(relays: string[]): Promise<void> {
  await chrome.storage.local.set({ [KEY]: relays });
}
