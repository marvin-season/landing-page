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
  writerPreset,
} from "./model";

export const plotModes = ["stitch", "merge", "insert", "split"] as const;
export type PlotMode = (typeof plotModes)[number];
export type PlotSelection = readonly string[];

const transitionLength = 1200;
const contextLength = 600;
const stitchResult = z.object({
  ending: z.string().trim().min(1),
  opening: z.string().trim().min(1),
});
const splitResult = z.object({ secondOpening: z.string().regex(/^\S/u) });

export function canSplitChapter(text: string) {
  return /\S\s*\S/u.test(text);
}

function parsePlotJson(text: string): unknown {
  const json = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1] ?? text;
  return JSON.parse(json);
}

export function resolveChapterRange(
  chapters: readonly Chapter[],
  ids: PlotSelection,
) {
  if (ids.length === 0) return null;
  const selected = new Set(ids);
  if (selected.size !== ids.length) return null;
  const index = chapters.findIndex(({ id }) => selected.has(id));
  if (index < 0) return null;
  const end = index + ids.length;
  const range = chapters.slice(index, end);
  if (range.length !== ids.length || !range.every(({ id }) => selected.has(id)))
    return null;
  return { index, end, chapters: range };
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
  ids: PlotSelection,
  mode: PlotMode,
  requirements: string,
  localSplit = false,
) {
  const request = requirements.trim();
  const range = resolveChapterRange(novel.chapters, ids);
  if (mode === "split") {
    if (!range || range.chapters.length !== 1)
      throw new Error("请选择一章需要拆分的正文。");
    const {
      index,
      chapters: [chapter],
    } = range;
    if (!canSplitChapter(chapter.text))
      throw new Error("所选章节没有足够正文可供拆分。");

    const prompt = JSON.stringify({
      ...writerPreset(config, novel, "plot"),
      targetChapter: {
        chapter: index + 1,
        title: chapter.title,
        text: chapter.text,
      },
      task: {
        mode,
        instructions:
          '将本章分为前后两章，优先选在完整段落或场景转换处，并保证拆分后两章都有正文。不要改写正文。只输出 JSON 对象 {"secondOpening":"..."}，逐字摘录拆分后第二章开头一小段原文，不含开头空白，确保这段文字在原章中只出现一次。不要输出代码围栏或说明。',
        requirements: request || undefined,
      },
    });
    if (!localSplit && prompt.length > maxNovelPromptLength)
      throw new Error("本次章节拆分的上下文过长，请缩短正文或精简设定。");
    return { mode, range, prompt };
  }
  if (mode === "merge") {
    if (!range || ids.length < 2) throw new Error("请选择至少两个相邻的章节。");
    if (range.chapters.some(({ text }) => !text.trim()))
      throw new Error("请先为所选章节填写正文。");

    const { index, end } = range;
    const previous = novel.chapters[index - 1];
    const following = novel.chapters[end];
    const prompt = JSON.stringify({
      ...writerPreset(config, novel, "plot"),
      previousChapters: previous
        ? [{ title: previous.title, text: previous.text.slice(-contextLength) }]
        : [],
      followingChapters: following
        ? [
            {
              title: following.title,
              text: following.text.slice(0, contextLength),
            },
          ]
        : [],
      targetChapter: {
        text: JSON.stringify(
          range.chapters.map(({ title, text }) => ({ title, text })),
        ),
      },
      task: {
        mode,
        maxCharacters: maxChapterLength,
        instructions:
          "把所选章节压缩重写为一章完整正文，保留关键事件的因果、伏笔与人物变化，删去重复铺垫、过渡套话、章名与分节符。承接前文并衔接后文，不复述或改写两侧正文。只输出合并后的纯正文，严格不超过 task.maxCharacters 字符，不输出章名、JSON、说明或代码围栏。",
        requirements: request || undefined,
      },
    });
    if (prompt.length > maxNovelPromptLength)
      throw new Error("本次剧情合并的上下文过长，请减少所选章节或精简设定。");
    return { mode, range, prompt };
  }

  const pair =
    range && ids.length === 2
      ? {
          index: range.index,
          first: range.chapters[0],
          second: range.chapters[1],
        }
      : null;
  if (pair && (!pair.first.text.trim() || !pair.second.text.trim()))
    throw new Error("请先为两个章节填写正文。");
  if (mode === "insert") {
    if (!pair && (ids.length !== 1 || novel.chapters[0]?.id !== ids[0]))
      throw new Error("请选择第一章之前或两个相邻的章节。");
    if (!request) throw new Error("请填写剧情要求。");
    if (!isChapterTargetValid(novel.words))
      throw new Error("请先在小说页设置有效的目标字数。");
    const beforeId = pair?.second.id ?? ids[0];
    return {
      mode,
      beforeId,
      index: pair ? pair.index + 1 : 0,
      prompt: insertChapterPrompt(config, novel, beforeId, request),
    };
  }
  if (!pair) throw new Error("请选择两个相邻的章节。");
  if (!request) throw new Error("请填写剧情要求。");
  const { first, second } = pair;

  const endingStart = transitionBoundary(first.text, true);
  const openingEnd = transitionBoundary(second.text, false);
  const before = first.text.slice(0, endingStart);
  const after = second.text.slice(openingEnd);
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
  if (endingLimit < 1 || openingLimit < 1)
    throw new Error("章节原文过长，请先缩短正文再粘合。");

  const prompt = JSON.stringify({
    ...writerPreset(config, novel, "plot"),
    targetChapter: {
      title: `${first.title} / ${second.title}`,
      text: JSON.stringify({ ending, opening }),
    },
    unchangedBefore: before.slice(-contextLength),
    unchangedAfter: after.slice(0, contextLength),
    task: {
      mode,
      endingMaxCharacters: endingLimit,
      openingMaxCharacters: openingLimit,
      instructions:
        '只改写前章结尾 ending 和后章开头 opening，消除生硬跳切、重复叙述或时间断层，保留两章分界和关键事件。ending 接在 unchangedBefore 末尾，opening 接到 unchangedAfter 开头；固定原文不可改写或复述。只输出一个无代码围栏的合法 JSON 对象 {"ending":"...","opening":"..."}，两段分别不超过 task.endingMaxCharacters 和 task.openingMaxCharacters 字符。',
      requirements: request,
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

export function splitPlotAtOffset(
  edit: Extract<PlotEdit, { mode: "split" }>,
  offset: number,
  newChapterId = crypto.randomUUID(),
): PlotDraft {
  const chapter = edit.range.chapters[0];
  const first = chapter.text.slice(0, offset);
  const second = chapter.text.slice(offset);
  if (
    !Number.isInteger(offset) ||
    !first.trim() ||
    !second.trim() ||
    /^[\uDC00-\uDFFF]/.test(second)
  )
    throw new Error("拆分位置两侧都需要有正文。");
  return {
    mode: edit.mode,
    chapters: [
      { ...chapter, text: first },
      {
        id: newChapterId,
        title: chapterTitle(edit.range.index + 1),
        text: second,
      },
    ],
  };
}

export function plotDraftEditableText(edit: PlotEdit, draft: PlotDraft) {
  if (edit.mode === "split") return [];
  if (edit.mode !== "stitch") return [draft.chapters[0].text];
  return [
    draft.chapters[0].text.slice(
      edit.before.length + edit.endingPrefix.length,
      draft.chapters[0].text.length - edit.endingGap.length,
    ),
    draft.chapters[1].text.slice(
      edit.openingGap.length,
      draft.chapters[1].text.length -
        edit.openingSuffix.length -
        edit.after.length,
    ),
  ];
}

export function replacePlotDraftText(
  edit: PlotEdit,
  draft: PlotDraft,
  index: number,
  text: string,
): PlotDraft {
  if (edit.mode === "split") return draft;
  const chapter = draft.chapters[index];
  if (!chapter) return draft;
  const next =
    edit.mode !== "stitch"
      ? text
      : index === 0
        ? edit.before + edit.endingPrefix + text + edit.endingGap
        : edit.openingGap + text + edit.openingSuffix + edit.after;
  return {
    ...draft,
    chapters: draft.chapters.map((chapter, i) =>
      i === index ? { ...chapter, text: next } : chapter,
    ),
  };
}

export function readPlotDraft(
  edit: PlotEdit,
  output: string,
  generatedChapterId?: string,
): PlotDraft {
  const text = output.trim();
  if (!text) throw new Error("没有生成正文，请重试。");
  if (edit.mode === "split") {
    const chapter = edit.range.chapters[0];
    let opening: string;
    try {
      opening = splitResult.parse(parsePlotJson(text)).secondOpening;
    } catch {
      throw new Error("未能识别拆分位置，请重新生成。");
    }
    const offset = chapter.text.indexOf(opening);
    if (offset <= 0 || chapter.text.lastIndexOf(opening) !== offset)
      throw new Error("拆分位置无法在原文中唯一定位，请重新生成。");
    return splitPlotAtOffset(edit, offset, generatedChapterId);
  }
  if (edit.mode !== "stitch") {
    if (text.length > maxChapterLength)
      throw new Error(`草稿超过 ${maxChapterLength} 字，请重新生成。`);
    return {
      mode: edit.mode,
      chapters: [
        {
          id: generatedChapterId ?? crypto.randomUUID(),
          title:
            edit.mode === "insert"
              ? chapterTitle(edit.index)
              : edit.range.chapters[0].title || chapterTitle(edit.range.index),
          text,
        },
      ],
    };
  }
  const { first, second } = edit.pair;
  let result: z.infer<typeof stitchResult>;
  try {
    result = stitchResult.parse(parsePlotJson(text));
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
  if (edit.mode === "insert")
    return insertChapterBefore(novel, edit.beforeId, draft.chapters[0]);
  const { index } = edit.mode === "stitch" ? edit.pair : edit.range;
  const replacement =
    edit.mode === "merge" ? [draft.chapters[0]] : draft.chapters;
  const following = novel.chapters.slice(
    edit.mode === "stitch" ? index + 2 : edit.range.end,
  );
  return {
    ...novel,
    chapters: [
      ...novel.chapters.slice(0, index),
      ...replacement,
      ...(edit.mode !== "stitch"
        ? following.map((chapter, offset) => {
            const title = numberedTitle(
              chapter.title,
              index + replacement.length + offset,
            );
            return title === chapter.title ? chapter : { ...chapter, title };
          })
        : following),
    ],
  };
}
