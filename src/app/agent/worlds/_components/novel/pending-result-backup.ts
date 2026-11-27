import { z } from "zod";
import {
  novelRunPhase,
  novelRunToolCall,
} from "@/lib/group-chat/novel-run-contract";
import { plotModes } from "./plot-edit";

const chapterSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  text: z.string(),
  brief: z.string().optional(),
});

const historyCommitSchema = z.object({
  question: z.string().optional(),
  tools: z.array(
    novelRunToolCall.extend({
      output: z.unknown().optional(),
    }),
  ),
  answer: z.string().optional(),
  phase: novelRunPhase.optional(),
  incomplete: z.boolean().optional(),
});

const pendingSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("selection"),
    chapterId: z.string().min(1),
    chapterTitle: z.string(),
    range: z
      .object({
        start: z.number().int().nonnegative(),
        end: z.number().int().nonnegative(),
      })
      .optional(),
    baseText: z.string(),
    preview: z.string().min(1),
    version: z.number().int(),
    incomplete: z.boolean().optional(),
    /** 润色结果暂存的提交元数据；确认保存正文时才写入创作历史。 */
    historyCommit: historyCommitSchema.optional(),
  }),
  z.object({
    kind: z.literal("plot"),
    mode: z.enum(plotModes),
    ids: z.array(z.string().min(1)).min(1),
    requirements: z.string(),
    storageVersion: z.string().optional(),
    draft: z.object({
      mode: z.enum(plotModes),
      chapters: z.array(chapterSchema).min(1).max(2),
    }),
    version: z.number().int(),
    incomplete: z.boolean().optional(),
  }),
]);

export type PendingResultBackup = z.infer<typeof pendingSchema>;

export function createPendingResultBackup(
  roomKey: string,
  storage: () => Pick<Storage, "getItem" | "setItem" | "removeItem">,
  onError: (failed: boolean) => void,
) {
  const key = `novel-pending:v1:${roomKey}`;
  let pending: PendingResultBackup | null = null;
  let dirty = false;

  function persist() {
    if (!dirty) return;
    try {
      if (pending) storage().setItem(key, JSON.stringify(pending));
      else storage().removeItem(key);
      dirty = false;
      onError(false);
    } catch {
      onError(true);
    }
  }

  return {
    read() {
      try {
        const raw = storage().getItem(key);
        const value = raw ? pendingSchema.safeParse(JSON.parse(raw)) : null;
        pending = value?.success ? value.data : null;
        return pending;
      } catch {
        return null;
      }
    },
    write(next: PendingResultBackup) {
      pending = next;
      dirty = true;
      persist();
      return !dirty;
    },
    flush: persist,
    clear() {
      pending = null;
      dirty = true;
      persist();
    },
  };
}
