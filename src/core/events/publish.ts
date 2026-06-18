import type NDK from '@nostr-dev-kit/ndk';
import { NDKEvent } from '@nostr-dev-kit/ndk';

export async function publishNote(ndk: NDK, content: string, tags: string[][] = []): Promise<NDKEvent> {
  const event = new NDKEvent(ndk, {
    kind: 1,
    content: content.trim(),
    tags,
  });
  await event.sign();
  await event.publish();
  return event;
}

export async function publishProfile(
  ndk: NDK,
  metadata: Record<string, string>,
): Promise<NDKEvent> {
  const event = new NDKEvent(ndk, {
    kind: 0,
    content: JSON.stringify(metadata),
    tags: [],
  });
  await event.sign();
  await event.publish();
  return event;
}
