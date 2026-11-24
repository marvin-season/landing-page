"use client";

import { Pagination } from "@landing-page/design-system";

export type ChapterIndexEntry = {
  id: string;
  title: string;
  pending?: boolean;
  hasDraft?: boolean;
};

export function ChapterIndex({
  chapters,
  value,
  disabled,
  onSelect,
}: {
  chapters: ChapterIndexEntry[];
  value: string;
  disabled?: boolean;
  onSelect: (id: string) => void;
}) {
  if (chapters.length === 0) return null;
  const selected = Math.max(
    0,
    chapters.findIndex((chapter) => chapter.id === value),
  );

  function chapterAt(page: number) {
    return chapters[page - 1];
  }

  return (
    <Pagination
      className="shrink-0"
      aria-label="章节切换"
      count={chapters.length}
      page={selected + 1}
      disabled={disabled}
      previousLabel="上一章"
      nextLabel="下一章"
      previousTitle="上一章（←）"
      nextTitle="下一章（→）"
      onPageChange={(page) => {
        const chapter = chapterAt(page);
        if (chapter && chapter.id !== value) onSelect(chapter.id);
      }}
      getPageLabel={(page) =>
        chapterAt(page)?.hasDraft ? (
          <span className="font-semibold text-destructive">{page}</span>
        ) : (
          page
        )
      }
      getPageTitle={(page) => {
        const chapter = chapterAt(page);
        return chapter?.hasDraft ? `${chapter.title} · 有草稿` : chapter?.title;
      }}
      getPageClassName={(page) =>
        chapterAt(page)?.pending
          ? "border border-dashed border-primary/50"
          : page === selected + 1 && chapterAt(page)?.hasDraft
            ? "bg-destructive/10 hover:bg-destructive/15"
            : undefined
      }
      getPageAriaLabel={(page) => {
        const chapter = chapterAt(page);
        if (!chapter) return undefined;
        return chapter.pending
          ? `第${page}章 ${chapter.title}，正在构思`
          : `第${page}章 ${chapter.title}${chapter.hasDraft ? "，有草稿" : ""}`;
      }}
    />
  );
}
