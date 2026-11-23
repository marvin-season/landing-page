import remarkParse from "remark-parse";
import { unified } from "unified";
import type { WorldConfig } from "@/lib/group-chat/model";
import {
  type Chapter,
  chapterTitle,
  createNovel,
  invalidateEditedCheckpoint,
  isTxtChapterHeading,
  maxChapterLength,
  type Novel,
  unescapeTxtChapterLine,
} from "./model";

export const maxNovelFileBytes = 2 * 1024 * 1024;
const chapterHeading =
  /^(?:第[〇零一二三四五六七八九十百千两\d]+[章节回集]|chapter[ \t]+\d+\b).{0,100}$/i;
const markdown = unified().use(remarkParse);

export type ImportedNovel = {
  title: string;
  chapters: Omit<Chapter, "id">[];
};

export function parseNovelFile(
  source: string,
  fileName: string,
): ImportedNovel {
  const extension = fileName.match(/\.(txt|md)$/i)?.[1].toLowerCase();
  if (!extension) throw new Error("请选择 TXT 或 Markdown（.md）文件。");
  const text = source
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim();
  if (!text) throw new Error("小说文件为空。");
  if (text.includes("\0")) throw new Error("小说文件不是有效的纯文本。");
  if (/(?:^|\n)<!-- novel-background\b/.test(text))
    throw new Error("这是背景总结，请选择包含小说正文的文件。");

  const fileTitle = fileName.replace(/\.[^.]+$/, "").trim();
  let title = fileTitle;
  let bodyStart = 0;
  const headings: { start: number; end: number; title: string }[] = [];
  if (extension === "md") {
    for (const node of markdown.parse(text).children) {
      if (node.type !== "heading") continue;
      const { start, end } = node.position ?? {};
      if (start?.offset === undefined || end?.offset === undefined) continue;
      const name = text
        .slice(start.offset, end.offset)
        .split("\n")[0]
        .replace(/^#{1,6}\s+/, "")
        .replace(/\s+#+$/, "")
        .trim();
      if (!name) continue;
      if (
        node.depth === 1 &&
        start.offset === 0 &&
        !chapterHeading.test(name)
      ) {
        title = name;
        bodyStart = end.offset;
      } else if (node.depth === 2 || chapterHeading.test(name)) {
        headings.push({ start: start.offset, end: end.offset, title: name });
      }
    }
  } else {
    for (const match of text.matchAll(/^[^\n]+/gm)) {
      const name = match[0].trim();
      if (isTxtChapterHeading(name)) {
        headings.push({
          start: match.index,
          end: match.index + match[0].length,
          title: name,
        });
      }
    }
    const firstLineEnd = text.indexOf("\n");
    const firstLine = text
      .slice(0, firstLineEnd < 0 ? text.length : firstLineEnd)
      .trim();
    const firstHeading = headings[0];
    if (
      !isTxtChapterHeading(firstLine) &&
      (firstLine.replace(/[\\/:*?"<>|]/g, "_") === fileTitle ||
        /^《[^》]+》$/.test(firstLine) ||
        (firstHeading &&
          firstLineEnd >= 0 &&
          !text.slice(firstLineEnd, firstHeading.start).trim()))
    ) {
      title = unescapeTxtChapterLine(firstLine);
      bodyStart = firstLineEnd < 0 ? text.length : firstLineEnd + 1;
    }
  }

  const chapters: ImportedNovel["chapters"] = [];
  let chapterName = "";
  for (const heading of headings) {
    addSection(heading.start);
    chapterName = heading.title;
    bodyStart = heading.end;
  }
  addSection(text.length);
  if (!chapters.some(({ text }) => text)) throw new Error("小说文件没有正文。");
  return { title: title.slice(0, 100), chapters };

  function addSection(end: number) {
    const body = text.slice(bodyStart, end).trim();
    const prose =
      extension === "txt"
        ? body.split("\n").map(unescapeTxtChapterLine).join("\n")
        : body;
    if (extension === "txt" && chapterName) {
      chapters.push({ title: chapterName, text: prose });
    } else {
      addChapter(chapters, chapterName, prose);
    }
  }
}

function addChapter(
  chapters: ImportedNovel["chapters"],
  title: string,
  text: string,
) {
  if (!title && !text) return;
  let offset = 0;
  let part = 1;
  while (text.length - offset > maxChapterLength) {
    const hardEnd = offset + maxChapterLength;
    const floor = offset + maxChapterLength * 0.75;
    const paragraph = text.lastIndexOf("\n\n", hardEnd - 2);
    const line = text.lastIndexOf("\n", hardEnd - 1);
    let end =
      paragraph >= floor ? paragraph + 2 : line >= floor ? line + 1 : hardEnd;
    if (/[\uDC00-\uDFFF]/.test(text[end])) end--;
    chapters.push({ title: partTitle(), text: text.slice(offset, end) });
    part++;
    offset = end;
  }
  chapters.push({ title: partTitle(), text: text.slice(offset) });

  function partTitle() {
    return title && part > 1 ? `${title}（续 ${part}）` : title;
  }
}

export function applyServerExport(
  current: Novel,
  source: string,
  fileName: string,
): Novel {
  const imported = parseNovelFile(source, fileName);
  const chapters = imported.chapters.map(({ title, text }, index) => {
    const name = title || chapterTitle(index);
    const existing = current.chapters[index];
    if (existing?.title === name && existing.text === text) return existing;
    return {
      id: crypto.randomUUID(),
      title: name,
      text,
    };
  });
  return invalidateEditedCheckpoint(current, {
    ...current,
    title: imported.title || current.title,
    chapters,
  });
}

export function createImportedNovel(
  config: WorldConfig,
  imported: ImportedNovel,
): Novel {
  const defaults = createNovel(config);
  return {
    ...defaults,
    title: imported.title || defaults.title,
    chapters: imported.chapters.map(({ title, text }, index) => ({
      id: crypto.randomUUID(),
      title: title || chapterTitle(index),
      text,
    })),
  };
}
