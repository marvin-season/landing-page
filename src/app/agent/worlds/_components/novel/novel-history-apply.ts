import { diffChars } from "diff";
import { type ChapterTextRange, replaceTextRange } from "./chapter-text";
import {
  type Chapter,
  continuationIndex,
  maxChapterLength,
  type Novel,
} from "./model";
import type { HistoryContent } from "./novel-history-store";
import { type PlotDraft, resolveChapterRange } from "./plot-edit";

export type ChapterLineage = {
  from: string[];
  to: string[];
  splitOffset?: number;
};

export function plotLineage(
  sources: Chapter[],
  draft: PlotDraft,
): ChapterLineage[] {
  if (draft.mode !== "split" && draft.mode !== "merge") return [];
  return [
    {
      from: sources.map(({ id }) => id),
      to: draft.chapters.map(({ id }) => id),
      splitOffset:
        draft.mode === "split" ? draft.chapters[0].text.length : undefined,
    },
  ];
}

type Edit = ChapterTextRange & { text: string };

function edits(base: string, next: string): Edit[] | undefined {
  const pieces = diffChars(base, next, { maxEditLength: 2048, timeout: 100 });
  if (!pieces) return undefined;
  const result: Edit[] = [];
  let offset = 0;
  let edit: Edit | undefined;
  for (const piece of pieces) {
    if (!piece.added && !piece.removed) {
      if (edit) result.push(edit);
      edit = undefined;
      offset += piece.value.length;
      continue;
    }
    edit ??= { start: offset, end: offset, text: "" };
    if (piece.added) edit.text += piece.value;
    else {
      offset += piece.value.length;
      edit.end = offset;
    }
  }
  if (edit) result.push(edit);
  return result;
}

export function mergeHistoryText(
  base: string,
  current: string,
  result: string,
) {
  if (base === current) return result;
  if (current === result || base === result) return current;
  const later = edits(base, current);
  const historical = edits(base, result);
  if (!later || !historical) return undefined;
  const combined = [...later];
  for (const change of historical) {
    if (
      later.some(
        ({ start, end, text }) =>
          start === change.start && end === change.end && text === change.text,
      )
    )
      continue;
    // Two replacements may touch. An insertion at the same boundary is ambiguous.
    if (
      later.some((other) =>
        change.start === change.end || other.start === other.end
          ? change.start <= other.end && other.start <= change.end
          : change.start < other.end && other.start < change.end,
      )
    )
      return undefined;
    combined.push(change);
  }
  let cursor = 0;
  const pieces: string[] = [];
  for (const change of combined.sort((a, b) => a.start - b.start)) {
    pieces.push(base.slice(cursor, change.start), change.text);
    cursor = change.end;
  }
  pieces.push(base.slice(cursor));
  return pieces.join("");
}

function descendants(id: string, lineage: readonly ChapterLineage[]) {
  const ids = new Set([id]);
  for (const edge of lineage) {
    if (edge.from.some((source) => ids.has(source)))
      for (const target of edge.to) ids.add(target);
  }
  return ids;
}

function locatePassage(
  source: Chapter,
  range: ChapterTextRange,
  chapters: Chapter[],
) {
  const original = source.text.slice(range.start, range.end);
  if (!original) return undefined;
  const before = source.text.slice(Math.max(0, range.start - 24), range.start);
  const after = source.text.slice(range.end, range.end + 24);
  const anchor = before + original + after;
  const matches = chapters.flatMap((chapter) => {
    if (chapter.id === source.id && chapter.text === source.text)
      return [{ chapter, range }];
    const offset = chapter.text.indexOf(anchor);
    if (offset < 0) return [];
    if (chapter.text.lastIndexOf(anchor) !== offset) return [null, null];
    const start = offset + before.length;
    return [{ chapter, range: { start, end: start + original.length } }];
  });
  return matches.length === 1 ? (matches[0] ?? undefined) : undefined;
}

export type HistoryPlan = {
  before: Chapter[];
  after: Chapter[];
  index: number;
  plotMode?: "merge" | "split" | "stitch";
};

export function historyDraftPlan(
  chapter: Chapter,
  index: number,
  text: string,
  range?: ChapterTextRange,
): HistoryPlan {
  return {
    before: [chapter],
    after: [{ ...chapter, text: replaceTextRange(chapter.text, text, range) }],
    index,
  };
}

export function historyInsertPlan(
  chapter: Chapter,
  index: number,
): HistoryPlan {
  return { before: [], after: [chapter], index };
}

function prepareChapterRevision(
  chapters: Chapter[],
  lineage: readonly ChapterLineage[],
  source: Chapter,
  result: string,
) {
  const index = chapters.findIndex(({ id }) => id === source.id);
  const target = chapters[index];
  if (
    !target ||
    (descendants(source.id, lineage).size > 1 && target.text !== source.text)
  )
    return undefined;
  const text = mergeHistoryText(source.text, target.text, result);
  return text === undefined ? undefined : historyDraftPlan(target, index, text);
}

export function prepareHistoryPlan(
  book: Novel,
  content: HistoryContent,
  lineage: readonly ChapterLineage[],
  savedVersion: "before" | "after" = "after",
): HistoryPlan | undefined {
  const { operation, sources, raw, results } = content;
  const { chapters } = book;
  if (operation.kind === "chapter-save") {
    const before = sources[0];
    const after = results?.[0];
    if (!after) return undefined;
    if (before) {
      return savedVersion === "before"
        ? prepareChapterRevision(chapters, lineage, after, before.text)
        : prepareChapterRevision(chapters, lineage, before, after.text);
    }
    if (savedVersion === "before") return undefined;
    const existing = chapters.findIndex(({ id }) => id === after.id);
    if (existing >= 0) {
      return chapters[existing].text === after.text
        ? historyDraftPlan(chapters[existing], existing, after.text)
        : undefined;
    }
    if (lineage.some(({ from }) => from.includes(after.id))) return undefined;
    const index = continuationIndex(book, operation.afterId);
    return index === null ? undefined : historyInsertPlan(after, index);
  }
  if (operation.kind === "summary" || !raw.trim()) return undefined;
  if (operation.kind === "continuation" || operation.kind === "insert") {
    const result =
      operation.kind === "continuation"
        ? { ...operation.chapter, text: raw.trim() }
        : results?.[0];
    if (!result) return undefined;
    const existing = chapters.findIndex(({ id }) => id === result.id);
    if (existing >= 0) {
      const chapter = chapters[existing];
      // The generated chapter has no common base for merging a later rewrite.
      return chapter.text === result.text
        ? historyDraftPlan(chapter, existing, result.text)
        : undefined;
    }
    if (lineage.some(({ from }) => from.includes(result.id))) return undefined;
    const index =
      operation.kind === "continuation"
        ? continuationIndex(book, operation.afterId)
        : chapters.findIndex(({ id }) => id === operation.beforeId);
    return index === null || index < 0
      ? undefined
      : historyInsertPlan(result, index);
  }
  if (operation.kind === "rewrite") {
    const source = sources[0];
    if (!source) return undefined;
    const related = descendants(source.id, lineage);
    if (operation.range) {
      const match = locatePassage(
        source,
        operation.range,
        chapters.filter(({ id }) => related.has(id)),
      );
      if (!match) return undefined;
      return historyDraftPlan(
        match.chapter,
        chapters.indexOf(match.chapter),
        raw.trim(),
        match.range,
      );
    }
    return prepareChapterRevision(chapters, lineage, source, raw.trim());
  }
  if (!results?.length) return undefined;
  const range = resolveChapterRange(
    chapters,
    sources.map(({ id }) => id),
  );
  if (
    !range ||
    range.chapters.some(
      (chapter, i) =>
        chapter.id !== sources[i].id || chapter.text !== sources[i].text,
    )
  )
    return undefined;
  if (
    results.some(({ id }) =>
      chapters.some(
        (chapter) =>
          chapter.id === id && !sources.some((source) => source.id === id),
      ),
    )
  )
    return undefined;
  const after = results.map((result) => ({
    ...range.chapters.find(({ id }) => id === result.id),
    ...result,
    title:
      range.chapters.find(({ id }) => id === result.id)?.title ?? result.title,
  }));
  return {
    before: range.chapters,
    after,
    index: range.index,
    plotMode: operation.kind,
  };
}

export function canStageHistoryPlan(book: Novel, plan: HistoryPlan) {
  const { chapters } = book;
  const { before, after, index } = plan;
  if (
    index < 0 ||
    index + before.length > chapters.length ||
    before.some((chapter, i) => chapter !== chapters[index + i]) ||
    !after.length ||
    after.some(
      ({ text }) =>
        ((!before.length || plan.plotMode) && !text.trim()) ||
        (text.length > maxChapterLength && plan.plotMode !== "split"),
    )
  )
    return false;

  const ids = new Set(after.map(({ id }) => id));
  if (ids.size !== after.length) return false;
  return !chapters.some(
    ({ id }, i) => ids.has(id) && (i < index || i >= index + before.length),
  );
}
