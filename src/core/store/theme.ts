export type Theme = 'light' | 'dark';

const KEY = 'theme';

export async function getTheme(): Promise<Theme> {
  const result = await chrome.storage.local.get(KEY);
  return (result[KEY] as Theme | undefined) ?? 'dark';
}

export async function setTheme(theme: Theme): Promise<void> {
  await chrome.storage.local.set({ [KEY]: theme });
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
