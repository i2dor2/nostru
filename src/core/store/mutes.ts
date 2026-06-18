const KEY = 'mutes';

export async function getMutes(): Promise<string[]> {
  const result = await chrome.storage.local.get(KEY);
  return (result[KEY] as string[] | undefined) ?? [];
}

export async function addMute(pubkey: string): Promise<void> {
  const list = await getMutes();
  if (!list.includes(pubkey)) {
    await chrome.storage.local.set({ [KEY]: [...list, pubkey] });
  }
}

export async function removeMute(pubkey: string): Promise<void> {
  const list = await getMutes();
  await chrome.storage.local.set({ [KEY]: list.filter(p => p !== pubkey) });
}
