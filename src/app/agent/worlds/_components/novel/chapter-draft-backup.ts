import { z } from "zod";

const draftSchema = z.object({
  mode: z.enum(["chapter", "rewrite"]),
  chapter: z.object({
    id: z.string().min(1),
    title: z.string(),
    text: z.string(),
  }),
  text: z.string(),
  version: z.number().int(),
  requirements: z.string().optional(),
  compactContext: z.boolean().optional(),
});

export type ChapterDraftBackup = z.infer<typeof draftSchema>;

export function createChapterDraftBackup(
  roomKey: string,
  storage: () => Pick<Storage, "getItem" | "setItem" | "removeItem">,
  onError: (failed: boolean) => void,
) {
  const key = `novel-draft:v1:${roomKey}`;
  let draft: ChapterDraftBackup | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = false;

  function persist() {
    if (!pending) return;
    try {
      if (draft?.text) storage().setItem(key, JSON.stringify(draft));
      else storage().removeItem(key);
      pending = false;
      onError(false);
    } catch {
      onError(true);
    }
  }

  function flush() {
    clearTimeout(timer);
    timer = undefined;
    persist();
  }

  return {
    read() {
      try {
        const raw = storage().getItem(key);
        const value = raw ? draftSchema.safeParse(JSON.parse(raw)) : null;
        draft = value?.success && value.data.text.trim() ? value.data : null;
        return draft;
      } catch {
        return null;
      }
    },
    start(next: Omit<ChapterDraftBackup, "text">) {
      draft = { ...next, text: "" };
      pending = true;
      flush();
    },
    write(text: string) {
      if (!draft || draft.text === text) return;
      draft = { ...draft, text };
      pending = true;
      if (timer !== undefined) return;
      persist();
      timer = setTimeout(flush, 400);
    },
    flush,
    clear() {
      draft = null;
      pending = true;
      flush();
    },
  };
}
