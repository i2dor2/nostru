const KEY = 'blocks';

export async function getBlocks(): Promise<string[]> {
  const result = await chrome.storage.local.get(KEY);
  return (result[KEY] as string[] | undefined) ?? [];
}

export async function addBlock(pubkey: string): Promise<void> {
  const list = await getBlocks();
  if (!list.includes(pubkey)) {
    await chrome.storage.local.set({ [KEY]: [...list, pubkey] });
  }
}

export async function removeBlock(pubkey: string): Promise<void> {
  const list = await getBlocks();
  await chrome.storage.local.set({ [KEY]: list.filter(p => p !== pubkey) });
}
