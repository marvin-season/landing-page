import Dexie, { type Table } from "dexie";
import { z } from "zod";

const draftSchema = z.object({
  mode: z.enum(["chapter", "rewrite"]),
  chapter: z.object({
    id: z.string().min(1),
    title: z.string(),
    text: z.string(),
    brief: z.string().optional(),
  }),
  text: z.string(),
  version: z.number().int(),
  afterChapterId: z.string().min(1).nullable().optional(),
  requirements: z.string().optional(),
  compactContext: z.boolean().optional(),
  manual: z.boolean().optional(),
});

export type ChapterDraftBackup = z.infer<typeof draftSchema>;

const db = new Dexie("world-novel-continuation-drafts");
db.version(1).stores({ continuations: "roomKey" });
const continuations: Table<ChapterDraftBackup & { roomKey: string }, string> =
  db.table("continuations");

export function createChapterDraftBackup(
  roomKey: string,
  onError: (failed: boolean) => void,
) {
  const legacyKey = `novel-draft:v1:${roomKey}`;
  let draft: ChapterDraftBackup | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = false;
  let latestWrite: Promise<void> | undefined;

  function persist() {
    if (!pending) return latestWrite;
    pending = false;
    const transaction = draft?.text.trim()
      ? continuations.put({ ...draft, roomKey })
      : continuations.delete(roomKey);
    const write = transaction.then(
      () => {
        if (latestWrite !== write) return;
        try {
          window.localStorage.removeItem(legacyKey);
        } catch {
          // The IndexedDB transaction already completed.
        }
        onError(false);
      },
      () => {
        if (latestWrite !== write) return;
        pending = true;
        onError(true);
      },
    );
    latestWrite = write;
    return write;
  }

  function flush() {
    clearTimeout(timer);
    timer = undefined;
    return persist();
  }

  return {
    async read() {
      try {
        const stored = await continuations.get(roomKey);
        const raw =
          !stored && typeof window !== "undefined"
            ? window.localStorage.getItem(legacyKey)
            : null;
        const value = draftSchema.safeParse(
          stored ?? (raw ? JSON.parse(raw) : null),
        );
        draft = value?.success && value.data.text.trim() ? value.data : null;
        if (draft?.mode === "chapter" && raw) {
          pending = true;
          await flush();
        }
        return draft;
      } catch {
        return null;
      }
    },
    start(next: Omit<ChapterDraftBackup, "text" | "mode">) {
      draft = { ...next, mode: "chapter", text: "" };
      pending = true;
      flush();
    },
    write(text: string) {
      if (!draft || draft.text === text) return;
      draft = { ...draft, text };
      pending = true;
      if (draft.manual) {
        persist();
        return;
      }
      if (timer !== undefined) return;
      persist();
      timer = setTimeout(flush, 400);
    },
    flush,
    async checkpoint() {
      await flush();
      if (pending) return undefined;
      return draft?.text.trim() ? draft : null;
    },
    async clear() {
      const previous = draft;
      draft = null;
      pending = true;
      await flush();
      if (pending) draft = previous;
      return !pending;
    },
  };
}
