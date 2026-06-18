const cache = new Map<string, boolean>();

export async function verifyNip05(identifier: string, pubkey: string): Promise<boolean> {
  const key = `${identifier}:${pubkey}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const [name, domain] = identifier.split('@');
    if (!name || !domain) { cache.set(key, false); return false; }
    const url = `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`;
    const res = await fetch(url);
    if (!res.ok) { cache.set(key, false); return false; }
    const json = await res.json() as { names?: Record<string, string> };
    const verified = json.names?.[name] === pubkey;
    cache.set(key, verified);
    return verified;
  } catch {
    cache.set(key, false);
    return false;
  }
}
