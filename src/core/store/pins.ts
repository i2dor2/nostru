const KEY = 'pins';

export async function getPins(): Promise<string[]> {
  const result = await chrome.storage.local.get(KEY);
  return (result[KEY] as string[] | undefined) ?? [];
}

export async function addPin(eventId: string): Promise<void> {
  const list = await getPins();
  if (!list.includes(eventId)) {
    await chrome.storage.local.set({ [KEY]: [...list, eventId] });
  }
}

export async function removePin(eventId: string): Promise<void> {
  const list = await getPins();
  await chrome.storage.local.set({ [KEY]: list.filter(id => id !== eventId) });
}
