import remarkParse from "remark-parse";
import { type Transformer, unified } from "unified";
import {
  createProcessor,
  type MarkdownTree,
} from "@/components/ui/unified-markdown/processor";
import type { ChapterTextRange } from "./chapter-text";

type MarkdownChild = MarkdownTree["children"][number];
type Element = Extract<MarkdownChild, { type: "element" }>;
const inlineFormatting = new Set(["a", "del", "em", "strong"]);
const inlineParser = unified().use(remarkParse);

// Convert rendered text boundaries back to source positions, including Markdown
// escapes and entities. Only the edges of a transformed token are selectable.
export function sourceOffsets(raw: string, visible: string) {
  const offsets = [0];
  const tokens =
    /\\[!-/:-@[-`{-~]|&(?:#[xX][\da-fA-F]+|#\d+|[a-zA-Z][\da-zA-Z]+);|\r\n?/g;
  let offset = 0;
  let cursor = 0;
  function copyLiteral(end: number) {
    while (offset < end) {
      if (raw[offset] !== visible[cursor]) return false;
      offsets[++cursor] = ++offset;
    }
    return true;
  }
  for (const match of raw.matchAll(tokens)) {
    const token = match[0];
    if (!copyLiteral(match.index)) return null;
    let decoded = token;
    if (token.startsWith("\\")) decoded = token.slice(1);
    if (token.startsWith("\r") && !visible.startsWith(token, cursor))
      decoded = "\n";
    if (token.startsWith("&")) {
      const paragraph = inlineParser.parse(`~${token}~`).children[0];
      const child = paragraph?.type === "paragraph" && paragraph.children[0];
      if (child && child.type === "text") decoded = child.value.slice(1, -1);
    }
    if (!visible.startsWith(decoded, cursor)) return null;
    for (let index = 1; index < decoded.length; index++)
      offsets[++cursor] = decoded === token ? offset + index : -1;
    offset += token.length;
    offsets[++cursor] = offset;
  }
  return copyLiteral(raw.length) && cursor === visible.length ? offsets : null;
}

function markText(
  source: string,
  node: MarkdownChild,
  range?: ChapterTextRange,
) {
  const start = node.position?.start.offset ?? -1;
  const end = node.position?.end.offset ?? -1;
  if (start < 0 || end < 0) return [node];

  if (node.type === "element") {
    if (inlineFormatting.has(node.tagName)) {
      node.properties.dataFormatStart = start;
      node.properties.dataFormatEnd = end;
    }
    // Syntax-highlighted code and images may not have positioned text children.
    if (["pre", "code", "img"].includes(node.tagName)) {
      node.properties.dataSourceStart = start;
      node.properties.dataSourceEnd = end;
      if (range && start < range.end && end > range.start)
        node.properties.dataRewriteMark = "";
      return [node];
    }
    node.children = node.children.flatMap((child) =>
      markText(source, child, range),
    ) as Element["children"];
    return [node];
  }

  if (node.type !== "text" || !node.value) return [node];

  const { value } = node;
  const raw = source.slice(start, end);
  const offsets = raw === value ? undefined : sourceOffsets(raw, value);
  function span(from: number, to: number, marked = false): Element {
    const left = offsets === null ? start : start + (offsets?.[from] ?? from);
    const right = offsets === null ? end : start + (offsets?.[to] ?? to);
    return {
      type: "element",
      tagName: marked ? "mark" : "span",
      properties: {
        dataSourceStart: left,
        dataSourceEnd: right,
        ...(marked ? { dataRewriteMark: "" } : {}),
      },
      children: [{ type: "text", value: value.slice(from, to) }],
    };
  }

  if (!range || start >= range.end || end <= range.start)
    return [span(0, node.value.length)];

  const from = offsets
    ? offsets.findLastIndex(
        (offset) => offset >= 0 && start + offset <= range.start,
      )
    : range.start - start;
  const to = offsets
    ? offsets.findIndex((offset) => offset >= 0 && start + offset >= range.end)
    : range.end - start;
  const left = offsets === null ? 0 : Math.max(0, from);
  const right =
    offsets === null || to < 0
      ? node.value.length
      : Math.min(to, node.value.length);
  return [
    ...(left > 0 ? [span(0, left)] : []),
    span(left, right, true),
    ...(right < node.value.length ? [span(right, node.value.length)] : []),
  ];
}

const chapterProcessor = createProcessor({
  transform: function chapterSourcePositions(): Transformer<
    MarkdownTree,
    MarkdownTree
  > {
    return (tree, file) => {
      const source = String(file);
      const range = file.data.rewriteRange as ChapterTextRange | undefined;
      tree.children = tree.children.flatMap((node) =>
        markText(source, node, range),
      );
    };
  },
});

export function renderChapterMarkdown(text: string, range?: ChapterTextRange) {
  return chapterProcessor.processSync({
    value: text,
    data: { rewriteRange: range },
  }).result;
}
