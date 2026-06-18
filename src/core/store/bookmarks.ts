const KEY = 'bookmarks';

export async function getBookmarks(): Promise<string[]> {
  const result = await chrome.storage.local.get(KEY);
  return (result[KEY] as string[] | undefined) ?? [];
}

export async function addBookmark(eventId: string): Promise<void> {
  const list = await getBookmarks();
  if (!list.includes(eventId)) {
    await chrome.storage.local.set({ [KEY]: [...list, eventId] });
  }
}

export async function removeBookmark(eventId: string): Promise<void> {
  const list = await getBookmarks();
  await chrome.storage.local.set({ [KEY]: list.filter(id => id !== eventId) });
}
