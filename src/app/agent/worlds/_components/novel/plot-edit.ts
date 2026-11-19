import { z } from "zod";
import type { WorldConfig } from "@/lib/group-chat/model";
import {
  type Chapter,
  chapterTitle,
  insertChapterBefore,
  insertChapterPrompt,
  isChapterTargetValid,
  maxChapterLength,
  maxNovelPromptLength,
  type Novel,
  numberedTitle,
} from "./model";

export type PlotMode = "stitch" | "merge" | "insert";
export type ChapterPair = readonly [string, string];

const transitionLength = 1200;
const contextLength = 600;
const stitchResult = z.object({
  ending: z.string().trim().min(1),
  opening: z.string().trim().min(1),
});

export function resolveChapterPair(
  chapters: readonly Chapter[],
  ids: ChapterPair,
) {
  const first = chapters.findIndex(({ id }) => id === ids[0]);
  const second = chapters.findIndex(({ id }) => id === ids[1]);
  if (first < 0 || second < 0 || Math.abs(first - second) !== 1) return null;
  const index = Math.min(first, second);
  return { index, first: chapters[index], second: chapters[index + 1] };
}

function transitionBoundary(text: string, fromEnd: boolean) {
  if (text.length <= transitionLength) return fromEnd ? 0 : text.length;
  let boundary = fromEnd ? text.length - transitionLength : transitionLength;
  const paragraph = fromEnd
    ? text.indexOf("\n\n", boundary)
    : text.lastIndexOf("\n\n", boundary - 2);
  if (paragraph >= 0 && Math.abs(paragraph - boundary) <= transitionLength / 2)
    boundary = paragraph + 2;
  else {
    const start = Math.max(0, boundary - transitionLength / 2);
    const nearby = text.slice(start, boundary + transitionLength / 2);
    let best = boundary;
    let distance = Infinity;
    for (const match of nearby.matchAll(/[。！？!?；;]+[”’」』"]*/g)) {
      const end = start + match.index + match[0].length;
      if (end === text.length) continue;
      if (Math.abs(end - boundary) < distance) {
        best = end;
        distance = Math.abs(end - boundary);
      }
    }
    boundary = best;
  }
  if (/[\uDC00-\uDFFF]/.test(text[boundary])) boundary++;
  return boundary;
}

export function preparePlotEdit(
  config: WorldConfig,
  novel: Novel,
  ids: ChapterPair,
  mode: PlotMode,
  requirements: string,
) {
  const pair = resolveChapterPair(novel.chapters, ids);
  if (!pair) throw new Error("请选择两个相邻的章节。");
  const { index, first, second } = pair;
  if (!first.text.trim() || !second.text.trim())
    throw new Error("请先为两个章节填写正文。");
  const request = requirements.trim();
  if (mode !== "merge" && !request) throw new Error("请填写剧情要求。");
  if (mode === "insert" && !isChapterTargetValid(novel.words))
    throw new Error("请先在小说页设置有效的目标字数。");

  const endingStart = transitionBoundary(first.text, true);
  const openingEnd = transitionBoundary(second.text, false);
  const before = mode === "stitch" ? first.text.slice(0, endingStart) : "";
  const after = mode === "stitch" ? second.text.slice(openingEnd) : "";
  const ending = first.text.slice(endingStart);
  const opening = second.text.slice(0, openingEnd);
  // Include the untouched whitespace when calculating the replacement budget.
  const endingGap = ending.match(/\s*$/)?.[0] ?? "";
  const openingGap = opening.match(/^\s*/)?.[0] ?? "";
  const endingPrefix = ending.match(/^\s*/)?.[0] ?? "";
  const openingSuffix = opening.match(/\s*$/)?.[0] ?? "";
  const endingLimit =
    maxChapterLength - before.length - endingPrefix.length - endingGap.length;
  const openingLimit =
    maxChapterLength - after.length - openingGap.length - openingSuffix.length;
  if (mode === "stitch" && (endingLimit < 1 || openingLimit < 1))
    throw new Error("章节原文过长，请先缩短正文再粘合。");

  const neighbor = (chapter: Chapter | undefined, fromEnd: boolean) =>
    chapter && {
      title: chapter.title,
      text: fromEnd
        ? chapter.text.slice(-contextLength)
        : chapter.text.slice(0, contextLength),
    };
  const prompt =
    mode === "insert"
      ? insertChapterPrompt(config, novel, second.id, request)
      : JSON.stringify({
          world: config,
          novel: {
            title: novel.title,
            style: novel.style,
            outline: novel.outline,
          },
          previousChapters: [neighbor(novel.chapters[index - 1], true)].filter(
            Boolean,
          ),
          followingChapters: [
            neighbor(novel.chapters[index + 2], false),
          ].filter(Boolean),
          targetChapter: {
            title: `${first.title} / ${second.title}`,
            text: JSON.stringify(
              mode === "stitch"
                ? { ending, opening }
                : { first: first.text, second: second.text },
            ),
          },
          ...(mode === "stitch"
            ? {
                unchangedBefore: before.slice(-contextLength),
                unchangedAfter: after.slice(0, contextLength),
              }
            : {}),
          task: {
            requirements:
              mode === "stitch"
                ? `改写前一章结尾和后一章开头，让两章之间的情节过渡自然。保留两章边界和关键事件，与未改写的前后文衔接，不复述未改写正文。作者要求：${request}。只输出一个合法 JSON 对象，保留 ending 和 opening 两个字符串字段，无代码围栏。ending 最多 ${endingLimit} 字符，opening 最多 ${openingLimit} 字符。`
                : `按原顺序将两章重写成一章，删去重复叙述和拖沓段落，保留关键事件、伏笔和人物变化，与前后章节衔接。${request ? `作者要求：${request}。` : ""}只输出一章小说正文，不输出章名、JSON 或说明，最多 ${maxChapterLength} 字符。`,
          },
        });
  if (prompt.length > maxNovelPromptLength)
    throw new Error("本次剧情整理的上下文过长，请先精简设定或正文。");
  return {
    pair,
    mode,
    before,
    after,
    endingPrefix,
    endingGap,
    openingGap,
    openingSuffix,
    prompt,
  };
}

type PlotEdit = ReturnType<typeof preparePlotEdit>;
export type PlotDraft = { mode: PlotMode; chapters: Chapter[] };

export function readPlotDraft(edit: PlotEdit, output: string): PlotDraft {
  const text = output.trim();
  const { first, second, index } = edit.pair;
  if (!text) throw new Error("没有生成正文，请重试。");
  if (edit.mode !== "stitch") {
    if (text.length > maxChapterLength)
      throw new Error(`草稿超过 ${maxChapterLength} 字，请重新生成。`);
    return {
      mode: edit.mode,
      chapters: [
        {
          id: crypto.randomUUID(),
          title:
            edit.mode === "insert"
              ? chapterTitle(index + 1)
              : first.title || chapterTitle(index),
          text,
        },
      ],
    };
  }
  let result: z.infer<typeof stitchResult>;
  try {
    const json = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1] ?? text;
    result = stitchResult.parse(JSON.parse(json));
  } catch {
    throw new Error("未能识别两个过渡片段，请重新生成。");
  }
  const firstText =
    edit.before + edit.endingPrefix + result.ending + edit.endingGap;
  const secondText =
    edit.openingGap + result.opening + edit.openingSuffix + edit.after;
  if (
    firstText.length > maxChapterLength ||
    secondText.length > maxChapterLength
  )
    throw new Error(
      `粘合后有章节超过 ${maxChapterLength} 字，请要求缩短过渡再试。`,
    );
  return {
    mode: "stitch",
    chapters: [
      { ...first, text: firstText },
      { ...second, text: secondText },
    ],
  };
}

export function applyPlotDraft(
  novel: Novel,
  edit: PlotEdit,
  draft: PlotDraft,
): Novel {
  if (draft.mode === "insert")
    return insertChapterBefore(novel, edit.pair.second.id, draft.chapters[0]);
  const { index } = edit.pair;
  const following = novel.chapters.slice(index + 2);
  return {
    ...novel,
    chapters: [
      ...novel.chapters.slice(0, index),
      ...draft.chapters,
      ...(draft.mode === "merge"
        ? following.map((chapter, offset) => {
            const title = numberedTitle(chapter.title, index + 1 + offset);
            return title === chapter.title ? chapter : { ...chapter, title };
          })
        : following),
    ],
  };
}
