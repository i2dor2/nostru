const PREFIX = 'nostru:customSp:';

export async function getCustomSpAddress(pubkey: string): Promise<string | null> {
  const result = await chrome.storage.local.get(PREFIX + pubkey);
  return (result[PREFIX + pubkey] as string | undefined) ?? null;
}

export async function setCustomSpAddress(pubkey: string, address: string | null): Promise<void> {
  if (address === null) {
    await chrome.storage.local.remove(PREFIX + pubkey);
  } else {
    await chrome.storage.local.set({ [PREFIX + pubkey]: address });
  }
}
