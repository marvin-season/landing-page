import { z } from "zod";

const schema = z.object({
  chapterId: z.string().min(1),
});

function storageKey(roomKey: string) {
  return `novel-reading:v1:${roomKey}`;
}

export function readReadingChapterId(
  roomKey: string,
  storage: Pick<Storage, "getItem"> = globalThis.localStorage,
): string | null {
  try {
    const raw = storage.getItem(storageKey(roomKey));
    if (!raw) return null;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.chapterId : null;
  } catch {
    return null;
  }
}

export function writeReadingChapterId(
  roomKey: string,
  chapterId: string,
  storage: Pick<Storage, "setItem"> = globalThis.localStorage,
): void {
  try {
    storage.setItem(storageKey(roomKey), JSON.stringify({ chapterId }));
  } catch {
    /* Quota or private mode — reading position is best-effort. */
  }
}
