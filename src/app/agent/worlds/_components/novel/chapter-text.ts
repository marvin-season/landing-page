export type ChapterTextRange = { start: number; end: number };

export type ChapterTextSelection = ChapterTextRange & {
  direction: "forward" | "backward";
};

export function normalizeChapterText(text: string) {
  return text.replace(/\r\n?/g, "\n");
}

/**
 * Textareas expose offsets in their displayed value, where CRLF is one
 * position. Domain text keeps the original source line endings instead.
 */
export function textareaSourceOffset(text: string, position: number) {
  let offset = position;
  for (const match of text.matchAll(/\r\n/g)) {
    if (match.index >= offset) break;
    offset++;
  }
  return offset;
}

export function textareaSelectionRange(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  direction: "forward" | "backward" | "none",
): ChapterTextSelection | null {
  if (selectionStart === selectionEnd) return null;

  const start = textareaSourceOffset(text, selectionStart);
  const end = textareaSourceOffset(text, selectionEnd);
  if (start >= end) return null;

  return {
    start,
    end,
    direction: direction === "backward" ? "backward" : "forward",
  };
}

export function splitChapterText(text: string, range: ChapterTextRange) {
  if (
    !Number.isInteger(range.start) ||
    !Number.isInteger(range.end) ||
    range.start < 0 ||
    range.start >= range.end ||
    range.end > text.length ||
    !text.slice(range.start, range.end).trim()
  )
    throw new Error("选段已失效，请重新选择正文。");

  return {
    before: text.slice(0, range.start),
    text: text.slice(range.start, range.end),
    after: text.slice(range.end),
  };
}

export function replaceTextRange(
  text: string,
  replacement: string,
  range?: ChapterTextRange,
) {
  if (!range) return replacement;
  const { before, after } = splitChapterText(text, range);
  return before + replacement + after;
}
