import type { NovelRunToolCall } from "@/lib/group-chat/novel-run-contract";
import type { ChapterTextRange } from "./chapter-text";
import type { Chapter } from "./model";
import type { HistoryOperation } from "./novel-history-store";
import {
  sanitizeThinkingTools,
  thinkingHistoryAnswer,
  thinkingHistoryLabel,
} from "./thinking-history";

/** 确认保存正文时写入创作历史的提交快照（对应 git commit 元数据）。 */
export type HistoryCommit = {
  question?: string;
  tools: ReturnType<typeof sanitizeThinkingTools>;
  answer?: string;
  label: string;
  operation: HistoryOperation;
  sources: Chapter[];
  raw: string;
  results: Chapter[];
  incomplete?: boolean;
};

export function continuationHistoryCommit({
  chapter,
  afterId,
  before,
  question,
  tools = [],
  raw,
  incomplete,
}: {
  chapter: Chapter;
  afterId: string | null;
  before?: Chapter;
  question?: string;
  tools?: NovelRunToolCall[];
  raw?: string;
  incomplete?: boolean;
}): HistoryCommit {
  const cleaned = sanitizeThinkingTools(tools);
  return {
    question: question?.trim() || undefined,
    tools: cleaned,
    answer: thinkingHistoryAnswer({
      tools: cleaned,
      status: incomplete ? "cancelled" : "completed",
    }),
    label: thinkingHistoryLabel({
      task: "chapter",
      chapterTitle: chapter.title,
    }),
    operation: { kind: "continuation", chapter, afterId },
    sources: before ? [before] : [],
    raw: raw ?? chapter.text,
    results: [chapter],
    incomplete,
  };
}

export function rewriteHistoryCommit({
  before,
  after,
  question,
  range,
  tools = [],
  raw,
  incomplete,
}: {
  before: Chapter;
  after: Chapter;
  question?: string;
  range?: ChapterTextRange;
  tools?: NovelRunToolCall[];
  raw?: string;
  incomplete?: boolean;
}): HistoryCommit {
  const cleaned = sanitizeThinkingTools(tools);
  return {
    question: question?.trim() || undefined,
    tools: cleaned,
    answer: thinkingHistoryAnswer({
      tools: cleaned,
      status: incomplete ? "cancelled" : "completed",
    }),
    label: thinkingHistoryLabel({
      task: "rewrite",
      chapterTitle: after.title,
      isPassage: Boolean(range),
    }),
    operation: { kind: "rewrite", range },
    sources: [before],
    raw: raw ?? after.text,
    results: [after],
    incomplete,
  };
}

export function manualSaveHistoryCommit({
  before,
  after,
  afterId,
}: {
  before?: Chapter;
  after: Chapter;
  afterId: string | null;
}): HistoryCommit {
  return {
    question: after.brief?.trim() || undefined,
    tools: [],
    label: `${before ? "保存章节" : "保存新章"} · ${after.title}`,
    operation: { kind: "chapter-save", afterId },
    sources: before ? [before] : [],
    raw: "",
    results: [after],
  };
}
