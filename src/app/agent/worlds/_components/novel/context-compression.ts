import type { WorldConfig } from "@/lib/group-chat/model";
import {
  type Chapter,
  chapterPrompt,
  maxNovelPromptLength,
  type Novel,
  type NovelTask,
  novelCheckpointCount,
  novelRequest,
} from "./model";

export const novelRequestBudget = {
  characters: maxNovelPromptLength,
  bytes: 384 * 1024,
};
export const defaultCompressionRate = 90;
export const maxCompressionTarget = 4000;
export const maxCompressionPromptLength = 2000;
export type CompressionOptions = { rate: number; instructions: string };

export function parseCompressionRate(input: string) {
  const rate = Number(input);
  return /^\d{1,2}$/.test(input) && rate >= 1 && rate <= 99 ? rate : null;
}

const encoder = new TextEncoder();

export function novelRequestBytes(
  roomId: string,
  prompt: string,
  task: NovelTask,
) {
  return encoder.encode(JSON.stringify(novelRequest(roomId, prompt, task)))
    .length;
}

export function fitsNovelRequest(
  roomId: string,
  prompt: string,
  task: NovelTask,
  budget = novelRequestBudget,
) {
  return (
    prompt.length <= budget.characters &&
    novelRequestBytes(roomId, prompt, task) <= budget.bytes
  );
}

export function smallerNovelBudget(
  roomId: string,
  prompt: string,
  task: NovelTask,
  budget: typeof novelRequestBudget,
) {
  return {
    characters: Math.min(budget.characters, Math.floor(prompt.length / 2)),
    bytes: Math.min(
      budget.bytes,
      Math.floor(novelRequestBytes(roomId, prompt, task) / 2),
    ),
  };
}

export function isNovelRequestTooLarge(message: string) {
  return /\b413\b|context[-_ ](?:length|window).{0,50}(?:exceed|too (?:long|large)|limit|maximum)|(?:exceed|maximum).{0,50}context[-_ ](?:length|window)|(?:request(?: body)?|payload|prompt|input).{0,25}too (?:large|long)|上下文.{0,10}(?:过长|超限|超过)/i.test(
    message,
  );
}

export type CompressionCursor = {
  index: number;
  offset: number;
  summary: string;
};

export function initialCompressionCursor(
  novel: Novel,
  through: number,
): CompressionCursor {
  const index = novelCheckpointCount(novel, through);
  return {
    index,
    offset: 0,
    summary: index ? (novel.checkpoint?.summary ?? "") : "",
  };
}

export function novelWithCompression(
  novel: Novel,
  cursor: CompressionCursor,
): Novel {
  if (!cursor.index || cursor.offset || !cursor.summary) return novel;
  return {
    ...novel,
    checkpoint: {
      throughChapterId: novel.chapters[cursor.index - 1].id,
      summary: cursor.summary,
    },
  };
}

export function compressedChapterPrompt(
  config: WorldConfig,
  novel: Novel,
  through: number,
  cursor: CompressionCursor,
) {
  return chapterPrompt(config, novelWithCompression(novel, cursor), through);
}

export function planCompressionBatch(
  roomId: string,
  config: WorldConfig,
  novel: Novel,
  cursor: CompressionCursor,
  through: number,
  budget: typeof novelRequestBudget,
  { rate, instructions }: CompressionOptions = {
    rate: defaultCompressionRate,
    instructions: "",
  },
) {
  if (cursor.index >= through) return null;
  let coveredCharacters = cursor.offset;
  for (let index = 0; index < cursor.index; index++)
    coveredCharacters += novel.chapters[index].text.length;
  const requirements = instructions.trim();
  const promptFor = (
    chapters: Pick<Chapter, "title" | "text">[],
    batchCharacters: number,
  ) =>
    JSON.stringify({
      world: config,
      sourceTitle: novel.title,
      ...(cursor.summary
        ? {
            archivedChapters: {
              throughChapter: cursor.index,
              summary: cursor.summary,
            },
          }
        : { importedBackground: novel.background }),
      completedChapters: chapters,
      task: {
        goal: "合并旧摘要和本批正文，按顺序更新剧情档案。首尾可能是同一章的部分正文。保留关键因果、伏笔、人物状态和知情范围。整份摘要尽量接近 targetCharacters 字符，无需凑字；requirements 是作者希望优先保留的内容。",
        targetCharacters: Math.min(
          maxCompressionTarget,
          Math.max(
            1,
            Math.round(
              ((coveredCharacters + batchCharacters) * (100 - rate)) / 100,
            ),
          ),
        ),
        requirements: requirements || undefined,
      },
    });

  const chapters: Pick<Chapter, "title" | "text">[] = [];
  let batchCharacters = 0;
  let best: { prompt: string; index: number; offset: number } | null = null;
  for (let index = cursor.index; index < through; index++) {
    const { title, text } = novel.chapters[index];
    const remaining = index === cursor.index ? text.slice(cursor.offset) : text;
    const body = { title, text: remaining };
    if (remaining.length <= budget.characters) {
      const prompt = promptFor(
        [...chapters, body],
        batchCharacters + remaining.length,
      );
      if (fitsNovelRequest(roomId, prompt, "summary", budget)) {
        chapters.push(body);
        batchCharacters += remaining.length;
        best = { prompt, index: index + 1, offset: 0 };
        continue;
      }
    }
    if (best) return best;
    // A numbered TXT chapter can exceed a whole request. Keep its partial summary in memory until the chapter is fully covered.
    let low = 1;
    let high = Math.min(remaining.length - 1, budget.characters);
    while (low <= high) {
      const size = Math.floor((low + high) / 2);
      const last = remaining.charCodeAt(size - 1);
      const end = last >= 0xd800 && last <= 0xdbff ? size - 1 : size;
      const prompt = promptFor([{ title, text: remaining.slice(0, end) }], end);
      if (fitsNovelRequest(roomId, prompt, "summary", budget)) {
        if (end) best = { prompt, index, offset: cursor.offset + end };
        low = size + 1;
      } else {
        high = size - 1;
      }
    }
    return best;
  }
  return best;
}
