import { useEffect, useState } from 'react';
import { IconShieldX, IconWorldWww } from '@tabler/icons-react';
import { getAllPermissions, revokePermission } from '../../core/store/permissions';
import type { PermissionsMap } from '../../core/store/permissions';

export function PermissionsScreen() {
  const [perms, setPerms] = useState<PermissionsMap>({});

  async function load() {
    setPerms(await getAllPermissions());
  }

  useEffect(() => { load(); }, []);

  async function revoke(origin: string) {
    await revokePermission(origin);
    load();
  }

  const entries = Object.entries(perms);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Sites approved as your Nostr signer via NIP-07.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-zinc-400">
          <IconWorldWww size={28} />
          <p className="text-sm">No sites have access yet</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
          {entries.map(([origin, perm]) => (
            <li key={origin} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="min-w-0">
                <p className="text-sm truncate">{origin}</p>
                <p className={`text-xs mt-0.5 ${perm === 'allow' ? 'text-green-500' : 'text-red-500'}`}>
                  {perm === 'allow' ? 'Allowed' : 'Denied'}
                </p>
              </div>
              <button
                onClick={() => revoke(origin)}
                title="Revoke"
                className="shrink-0 p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              >
                <IconShieldX size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
