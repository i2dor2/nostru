const ACTIVE_PREFIX = 'nostru:identityIndex:';
const MAX_PREFIX = 'nostru:identityMax:';

export async function getIdentityIndex(pubkey: string): Promise<number> {
  const result = await chrome.storage.local.get(ACTIVE_PREFIX + pubkey);
  return (result[ACTIVE_PREFIX + pubkey] as number | undefined) ?? 1;
}

export async function getMaxIdentityIndex(pubkey: string): Promise<number> {
  const result = await chrome.storage.local.get(MAX_PREFIX + pubkey);
  return (result[MAX_PREFIX + pubkey] as number | undefined) ?? 1;
}

export async function setIdentityIndex(pubkey: string, n: number): Promise<void> {
  const clamped = Math.max(1, Math.floor(n));
  const currentMax = await getMaxIdentityIndex(pubkey);
  const updates: Record<string, number> = { [ACTIVE_PREFIX + pubkey]: clamped };
  if (clamped > currentMax) updates[MAX_PREFIX + pubkey] = clamped;
  await chrome.storage.local.set(updates);
}
