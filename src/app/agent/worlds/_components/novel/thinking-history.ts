import { z } from "zod";
import {
  type NovelRunPhase,
  type NovelRunToolCall,
  novelRunPhase,
  novelRunToolCall,
} from "@/lib/group-chat/novel-run-contract";

const historyToolCall = novelRunToolCall.extend({
  // 历史只保留技法元数据，去掉长 instructions，避免撑爆 localStorage。
  output: z.unknown().optional(),
});

export const thinkingHistoryEntrySchema = z.object({
  id: z.string().min(1),
  createdAt: z.number().int().positive(),
  task: z.enum(["chapter", "rewrite"]),
  label: z.string().min(1),
  status: z.enum(["completed", "failed", "cancelled"]),
  phase: novelRunPhase.optional(),
  tools: z.array(historyToolCall),
  requirements: z.string().optional(),
  error: z.string().nullable().optional(),
});

export type ThinkingHistoryEntry = z.infer<typeof thinkingHistoryEntrySchema>;

const historySchema = z.object({
  entries: z.array(thinkingHistoryEntrySchema),
});

const maxEntries = 40;

function trimToolOutput(output: unknown): unknown {
  if (!output || typeof output !== "object") return output;
  const record = output as Record<string, unknown>;
  if (!("instructions" in record)) return output;
  const { instructions: _instructions, ...rest } = record;
  return rest;
}

export function sanitizeThinkingTools(tools: NovelRunToolCall[]) {
  return tools.map((tool) => ({
    ...tool,
    output: trimToolOutput(tool.output),
  }));
}

export function createThinkingHistoryStore(
  roomKey: string,
  storage: () => Pick<Storage, "getItem" | "setItem" | "removeItem"> = () =>
    window.localStorage,
) {
  const key = `novel-thinking-history:v1:${roomKey}`;

  function read(): ThinkingHistoryEntry[] {
    try {
      const raw = storage().getItem(key);
      if (!raw) return [];
      const parsed = historySchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data.entries : [];
    } catch {
      return [];
    }
  }

  function write(entries: ThinkingHistoryEntry[]) {
    try {
      if (!entries.length) storage().removeItem(key);
      else
        storage().setItem(
          key,
          JSON.stringify({
            entries: entries.slice(0, maxEntries),
          } satisfies z.infer<typeof historySchema>),
        );
      return true;
    } catch {
      return false;
    }
  }

  return {
    list: read,
    append(entry: ThinkingHistoryEntry) {
      const next = [
        entry,
        ...read().filter((item) => item.id !== entry.id),
      ].slice(0, maxEntries);
      return write(next) ? next : read();
    },
    clear() {
      write([]);
      return [] as ThinkingHistoryEntry[];
    },
  };
}

export function thinkingHistoryLabel({
  task,
  chapterTitle,
  isPassage,
}: {
  task: "chapter" | "rewrite";
  chapterTitle?: string;
  isPassage?: boolean;
}) {
  if (task === "chapter") return chapterTitle?.trim() || "续写章节";
  if (isPassage)
    return chapterTitle ? `${chapterTitle} · 段落润色` : "段落润色";
  return chapterTitle ? `${chapterTitle} · 整章润色` : "整章润色";
}

export function thinkingHistoryPhase(
  entry: Pick<ThinkingHistoryEntry, "phase" | "tools" | "status">,
): NovelRunPhase {
  if (entry.phase) return entry.phase;
  if (entry.tools.length) return "writing";
  return entry.status === "completed" ? "writing" : "preparing";
}
