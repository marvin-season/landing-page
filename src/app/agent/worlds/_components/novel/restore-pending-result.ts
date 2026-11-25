import type { WorldConfig } from "@/lib/group-chat/model";
import type { ChapterTextRange } from "./chapter-text";
import type { Novel, NovelTask } from "./model";
import type { PendingResultBackup } from "./pending-result-backup";
import {
  type PlotDraft,
  type PlotSelection,
  preparePlotEdit,
} from "./plot-edit";

export const incompleteNovelDraftNotice =
  "输出未写完，已保留在可编辑草稿中。可继续编辑后应用，或缩减要求后重新生成。";

export type RestoredPendingRun =
  | {
      task: "rewrite";
      chapterId: string;
      novel: Novel;
      version: number;
      range: ChapterTextRange;
    }
  | {
      task: "rewrite" | "chapter";
      plot: ReturnType<typeof preparePlotEdit>;
      plotIds: PlotSelection;
      plotRequirements: string;
      novel: Novel;
      version: number;
    };

export type RestoredPendingState = {
  run: RestoredPendingRun;
  task: NovelTask;
  preview: string;
  plotDraft: PlotDraft | null;
  incomplete: boolean;
  notice: string;
};

export function restorePendingResult(
  pending: PendingResultBackup,
  novel: Novel,
  config: WorldConfig,
): RestoredPendingState | null {
  if (pending.kind === "selection") {
    const chapter = novel.chapters.find(({ id }) => id === pending.chapterId);
    if (
      !chapter ||
      chapter.text !== pending.baseText ||
      pending.range.end > chapter.text.length ||
      pending.range.start >= pending.range.end ||
      !chapter.text.slice(pending.range.start, pending.range.end).trim()
    )
      return null;
    return {
      run: {
        task: "rewrite",
        chapterId: pending.chapterId,
        novel,
        version: pending.version,
        range: pending.range,
      },
      task: "rewrite",
      preview: pending.preview,
      plotDraft: null,
      incomplete: Boolean(pending.incomplete),
      notice: pending.incomplete ? incompleteNovelDraftNotice : "",
    };
  }
  try {
    const plot = preparePlotEdit(
      config,
      novel,
      pending.ids,
      pending.mode,
      pending.requirements,
    );
    if (plot.mode === "split") {
      const original = plot.range.chapters[0];
      const [first, second] = pending.draft.chapters;
      if (
        pending.draft.mode !== "split" ||
        first?.id !== original.id ||
        !first.text.trim() ||
        !second?.text.trim() ||
        first.text + second.text !== original.text
      )
        return null;
    }
    return {
      run: {
        task: pending.mode === "insert" ? "chapter" : "rewrite",
        plot,
        plotIds: pending.ids,
        plotRequirements: pending.requirements,
        novel,
        version: pending.version,
      },
      task: pending.mode === "insert" ? "chapter" : "rewrite",
      preview: "",
      plotDraft: pending.draft,
      incomplete: Boolean(pending.incomplete),
      notice: pending.incomplete ? incompleteNovelDraftNotice : "",
    };
  } catch {
    return null;
  }
}
