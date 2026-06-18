export type Permission = 'allow' | 'deny';
export type PermissionsMap = Record<string, Permission>;

const KEY = 'nip07Permissions';

export async function getPermission(origin: string): Promise<Permission | null> {
  const data = await chrome.storage.local.get(KEY);
  return (data[KEY] as PermissionsMap)?.[origin] ?? null;
}

export async function setPermission(origin: string, permission: Permission): Promise<void> {
  const data = await chrome.storage.local.get(KEY);
  const perms: PermissionsMap = (data[KEY] as PermissionsMap) ?? {};
  perms[origin] = permission;
  await chrome.storage.local.set({ [KEY]: perms });
}

export async function revokePermission(origin: string): Promise<void> {
  const data = await chrome.storage.local.get(KEY);
  const perms: PermissionsMap = (data[KEY] as PermissionsMap) ?? {};
  delete perms[origin];
  await chrome.storage.local.set({ [KEY]: perms });
}

export async function getAllPermissions(): Promise<PermissionsMap> {
  const data = await chrome.storage.local.get(KEY);
  return (data[KEY] as PermissionsMap) ?? {};
}
