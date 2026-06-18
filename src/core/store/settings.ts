const KEY = 'settings';

interface AppSettings {
  wideLayout: boolean;
}

const DEFAULTS: AppSettings = { wideLayout: false };

async function load(): Promise<AppSettings> {
  const result = await chrome.storage.local.get(KEY);
  return { ...DEFAULTS, ...(result[KEY] as Partial<AppSettings> | undefined) };
}

async function save(patch: Partial<AppSettings>): Promise<void> {
  const current = await load();
  await chrome.storage.local.set({ [KEY]: { ...current, ...patch } });
}

export async function getWideLayout(): Promise<boolean> {
  return (await load()).wideLayout;
}

export async function setWideLayout(value: boolean): Promise<void> {
  await save({ wideLayout: value });
}
