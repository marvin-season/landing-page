import Dexie, { type Table } from "dexie";
import type { Chapter, Novel } from "./model";
import type { ChapterLineage } from "./novel-history-apply";
import type { HistoryCommit } from "./novel-history-commit";
import { manualSaveHistoryCommit } from "./novel-history-commit";
import { startNovelHistory } from "./novel-history-store";

type NovelRecord = {
  key: string;
  novel: Novel;
  previous?: Novel;
  lineage?: ChapterLineage[];
  version?: string;
};

type SavedChapter = {
  id: string;
  key: string;
  createdAt: number;
  before?: Chapter;
  after: Chapter;
  afterId: string | null;
  commit?: HistoryCommit;
};

const db = new Dexie("world-novels");
db.version(1).stores({ novels: "key" });
db.version(2).stores({ savedChapters: "id, key" });
export const novels: Table<NovelRecord, string> = db.table("novels");
const savedChapters: Table<SavedChapter, string> = db.table("savedChapters");
export const changedInAnotherTab =
  "另一个标签页已保存此作品。请保留手头修改，刷新后核对最新正文。";

export function persistNovelRecord(
  record: NovelRecord & { version: string },
  {
    expectedVersion,
    chapterLineage,
    archiveChapterId,
    historyCommit,
    isCurrent,
  }: {
    expectedVersion?: string;
    chapterLineage?: ChapterLineage[];
    archiveChapterId?: string;
    historyCommit?: HistoryCommit;
    isCurrent: () => boolean;
  },
) {
  return db.transaction("rw", [novels, savedChapters], async () => {
    const { key, novel, version } = record;
    const stored = await novels.get(key);
    if (!isCurrent() || stored?.version !== expectedVersion)
      throw new Error(changedInAnotherTab);
    const lineage = chapterLineage?.length
      ? [...(stored?.lineage ?? []), ...chapterLineage]
      : stored?.lineage;
    await novels.put({ ...record, lineage });

    if (archiveChapterId) {
      const index = novel.chapters.findIndex(
        ({ id }) => id === archiveChapterId,
      );
      const after = novel.chapters[index];
      const before = stored?.novel.chapters.find(
        ({ id }) => id === archiveChapterId,
      );
      if (after && before?.text !== after.text) {
        const afterId = novel.chapters[index - 1]?.id ?? null;
        // Keep the version with the successful save until it reaches the history database.
        await savedChapters.put({
          key,
          id: version,
          createdAt: Date.now(),
          before,
          after,
          afterId,
          commit:
            historyCommit ??
            manualSaveHistoryCommit({ before, after, afterId }),
        });
      }
    }
    return lineage;
  });
}

export async function flushSavedChapterHistory(key: string) {
  const queued = savedChapters.where("key").equals(key);
  for (let item = await queued.first(); item; item = await queued.first()) {
    const { id, createdAt, before, after, afterId, commit } = item;
    const payload =
      commit ?? manualSaveHistoryCommit({ before, after, afterId });
    await startNovelHistory(
      {
        key,
        id,
        createdAt,
        label: payload.label,
        question: payload.question,
        answer: payload.answer,
        status: "completed",
        hasResult: true,
        tools: payload.tools,
        incomplete: payload.incomplete,
        kind:
          payload.operation.kind === "chapter-save"
            ? "chapter-save"
            : undefined,
      },
      payload.operation,
      payload.sources,
      { raw: payload.raw, results: payload.results },
    );
    await savedChapters.delete(id);
  }
}
