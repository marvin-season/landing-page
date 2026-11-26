import type { WorldConfig } from "@/lib/group-chat/model";
import type { ChapterDraftBackup } from "./chapter-draft-backup";
import type { ChapterTextRange } from "./chapter-text";
import type {
  CompressionCursor,
  CompressionOptions,
  novelRequestBudget,
  planCompressionBatch,
} from "./context-compression";
import type { Chapter, Novel } from "./model";
import type { PlotMode, PlotSelection, preparePlotEdit } from "./plot-edit";

export type Compression = {
  novel: Novel;
  config: WorldConfig;
  through: number;
  cursor: CompressionCursor;
  budget: typeof novelRequestBudget;
  retries: number;
  options?: CompressionOptions;
};
export type ChapterRun = {
  task: "chapter";
  compression: Compression;
  draft: Omit<ChapterDraftBackup, "text" | "mode">;
  onFirstText?: () => void;
};
type CompressionRun = {
  task: "summary";
  compression: Compression;
  batch: NonNullable<ReturnType<typeof planCompressionBatch>>;
  continuation?: ChapterRun;
  exportBackground?: boolean;
};
export type NovelRun =
  | ChapterRun
  | { task: "summary"; config: WorldConfig; novel: Novel }
  | CompressionRun
  | {
      task: "rewrite" | "chapter";
      plot: ReturnType<typeof preparePlotEdit>;
      plotIds: PlotSelection;
      plotRequirements: string;
      novel: Novel;
      version: number;
      storageVersion?: string;
    }
  | {
      task: "rewrite";
      chapterId: string;
      novel: Novel;
      version: number;
      range?: ChapterTextRange;
      /** 本次润色要求，供构思历史「问」侧回显。 */
      requirements?: string;
    };

export type RestoredNovelRun =
  | { kind: "chapter"; draft: ChapterRun["draft"] }
  | { kind: "rewrite"; chapter: Chapter; range?: ChapterTextRange }
  | { kind: "plot"; mode: PlotMode; ids: PlotSelection; requirements: string };

function storedChapterRun({ onFirstText: _onFirstText, ...run }: ChapterRun) {
  return run;
}

export function storedNovelRun(run: NovelRun): NovelRun {
  if ("plot" in run || !("compression" in run)) return run;
  if (run.task === "chapter") return storedChapterRun(run);
  return {
    ...run,
    continuation: run.continuation && storedChapterRun(run.continuation),
  };
}

export function sourceNovel(run: NovelRun) {
  return "compression" in run ? run.compression.novel : run.novel;
}

export function rebindNovelRun(run: NovelRun, novel: Novel): NovelRun {
  if (!("compression" in run)) return { ...run, novel };
  const compression = { ...run.compression, novel };
  if (run.task === "chapter") return { ...run, compression };
  return {
    ...run,
    compression,
    continuation: run.continuation && { ...run.continuation, compression },
  };
}

export function editableNovelState({
  updatedAt: _updatedAt,
  syncedAt: _syncedAt,
  ...novel
}: Novel) {
  return JSON.stringify(novel);
}
