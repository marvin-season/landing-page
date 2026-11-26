import type { NovelRunStatus } from "@/lib/group-chat/novel-run-contract";
import type { Chapter } from "./model";
import {
  type HistoryOperation,
  saveNovelHistoryResult,
  startNovelHistory,
} from "./novel-history-store";
import type { NovelRun } from "./novel-run";
import type { NovelRunRecord } from "./novel-run-client";
import { readPlotDraft } from "./plot-edit";
import {
  sanitizeThinkingTools,
  thinkingHistoryAnswer,
  thinkingHistoryLabel,
} from "./thinking-history";

type RunRecord = NovelRunRecord<NovelRun>;

function describeRun(run: NovelRun) {
  let operation: HistoryOperation;
  let sources: Chapter[] = [];
  let label: string;
  let question: string | undefined;
  if ("plot" in run) {
    const { plot } = run;
    const labels = {
      stitch: "剧情粘合",
      merge: "合并章节",
      insert: "剧情插入",
      split: "拆分章节",
    };
    operation = {
      kind: plot.mode,
      beforeId: plot.mode === "insert" ? plot.beforeId : undefined,
    };
    sources =
      plot.mode === "stitch"
        ? [plot.pair.first, plot.pair.second]
        : plot.mode === "insert"
          ? []
          : plot.range.chapters;
    label = labels[plot.mode];
    question = run.plotRequirements;
  } else if (run.task === "chapter") {
    operation = {
      kind: "continuation",
      chapter: run.draft.chapter,
      afterId: run.draft.afterChapterId,
    };
    label = thinkingHistoryLabel({
      task: "chapter",
      chapterTitle: run.draft.chapter.title,
    });
    question = run.draft.chapter.brief;
  } else if (run.task === "rewrite") {
    const chapter = run.novel.chapters.find(({ id }) => id === run.chapterId);
    if (chapter) sources = [chapter];
    operation = { kind: "rewrite", range: run.range };
    label = thinkingHistoryLabel({
      task: "rewrite",
      chapterTitle: chapter?.title,
      isPassage: Boolean(run.range),
    });
    question = run.requirements;
  } else {
    if ("batch" in run && run.continuation) return undefined;
    operation = { kind: "summary" };
    label =
      !("batch" in run) || run.exportBackground ? "背景总结" : "压缩剧情上下文";
  }
  return { operation, sources, label, question };
}

export async function archiveNovelRunStart(entry: RunRecord) {
  const info = describeRun(entry.run);
  if (!info) return;
  await startNovelHistory(
    {
      key: entry.key,
      id: entry.request.runId,
      createdAt: entry.createdAt,
      label: info.label,
      question: info.question,
      status: "running",
      tools: [],
      hasResult: false,
    },
    info.operation,
    info.sources,
  );
}

export async function archiveNovelRunOutput(
  entry: RunRecord,
  snapshot: NovelRunStatus,
) {
  const { run } = entry;
  if (!describeRun(run)) return;
  const status = snapshot.status;
  const tools = sanitizeThinkingTools(snapshot.tools ?? []);
  let results: Chapter[] | undefined;
  if (status !== "running" && snapshot.text.trim() && "plot" in run) {
    try {
      results = readPlotDraft(
        run.plot,
        snapshot.text,
        entry.request.runId,
      ).chapters;
    } catch {
      // Keep the raw result even when a partial structured response cannot be parsed.
    }
  }
  const metadata = {
    phase:
      snapshot.phase ??
      (snapshot.text.trim() ? ("writing" as const) : undefined),
    tools,
    answer:
      status === "running"
        ? undefined
        : thinkingHistoryAnswer({ tools, status }),
    incomplete: snapshot.incomplete,
    error: snapshot.error,
    results,
  };
  const save = () =>
    saveNovelHistoryResult(
      entry.key,
      entry.request.runId,
      status,
      snapshot.text,
      metadata,
    );
  try {
    await save();
  } catch (err) {
    if (status === "running") throw err;
    await archiveNovelRunStart(entry);
    await save();
  }
}
