import Dexie, { type Table } from "dexie";
import { z } from "zod";

const draftSchema = z.object({
  mode: z.literal("chapter"),
  chapter: z.object({
    id: z.string().min(1),
    title: z.string(),
    text: z.string(),
    brief: z.string().optional(),
    targetWords: z.string().optional(),
  }),
  text: z.string(),
  version: z.number().int(),
  afterChapterId: z.string().min(1).nullable().optional(),
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
  let draft: ChapterDraftBackup | null = null;
  let replacement: ChapterDraftBackup | null = null;
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
        const value = draftSchema.safeParse(stored);
        draft = value.success && value.data.text.trim() ? value.data : null;
        return draft;
      } catch {
        return null;
      }
    },
    start(next: Omit<ChapterDraftBackup, "text" | "mode">) {
      replacement = { ...next, mode: "chapter", text: "" };
    },
    current() {
      return draft;
    },
    cancelEmptyReplacement() {
      if (!replacement) return null;
      replacement = null;
      return draft;
    },
    write(text: string) {
      if (replacement) {
        if (!text.trim()) return;
        draft = replacement;
        replacement = null;
      }
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
      replacement = null;
      draft = null;
      pending = true;
      await flush();
      if (pending) draft = previous;
      return !pending;
    },
  };
}
