import type { WorldConfig } from "@/lib/group-chat/model";
import {
  chapterPrompt,
  maxNovelPromptLength,
  maxNovelSummaryLength,
  type Novel,
  summaryPrompt,
} from "./model";

export function forkChapterCount(novel: Novel) {
  return Math.max(1, novel.chapters.length - 1);
}

export function forkSummaryPrompt(config: WorldConfig, novel: Novel) {
  return summaryPrompt(config, {
    ...novel,
    chapters: novel.chapters.slice(0, forkChapterCount(novel)),
  });
}

export function prepareNovelFork(
  config: WorldConfig,
  novel: Novel,
  draft: string,
) {
  const summary = draft.trim();
  const through = novel.chapters[forkChapterCount(novel) - 1];
  if (!through || !summary || summary.length > maxNovelSummaryLength)
    return null;
  const suffix = " · Fork";
  const nextConfig = {
    ...config,
    title: config.title.slice(0, 60 - suffix.length).trimEnd() + suffix,
  };
  const next = {
    ...novel,
    checkpoint: { throughChapterId: through.id, summary },
  };
  const length = chapterPrompt(nextConfig, next).length;
  return { config: nextConfig, novel: next, length };
}

export function forkFitsBudget(length: number, currentLength: number) {
  return length < currentLength && length <= maxNovelPromptLength;
}
