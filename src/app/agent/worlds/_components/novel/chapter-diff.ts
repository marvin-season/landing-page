import { diffArrays } from "diff";
import { normalizeChapterText } from "./chapter-text";

type DiffPart = { text: string; changed: boolean; start: number };

export type ChapterDiffLine = {
  number: number;
  parts: DiffPart[];
  changedBreak?: boolean;
  wholeLine?: boolean;
};

type ChapterDiffRow = {
  left: ChapterDiffLine | null;
  right: ChapterDiffLine | null;
};

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function compare(left: string[], right: string[]) {
  const changes = diffArrays(left, right, { maxEditLength: 1024 });
  if (changes) return changes;

  // Keep common edges visible even when a large rewrite exceeds the edit budget.
  let start = 0;
  let leftEnd = left.length;
  let rightEnd = right.length;
  while (start < leftEnd && start < rightEnd && left[start] === right[start])
    start++;
  while (
    leftEnd > start &&
    rightEnd > start &&
    left[leftEnd - 1] === right[rightEnd - 1]
  ) {
    leftEnd--;
    rightEnd--;
  }
  return [
    { value: left.slice(0, start), removed: false, added: false },
    { value: left.slice(start, leftEnd), removed: true, added: false },
    { value: right.slice(start, rightEnd), removed: false, added: true },
    { value: left.slice(leftEnd), removed: false, added: false },
  ].filter(({ value }) => value.length > 0);
}

function diffLine(text: string, number: number, wholeLine = false) {
  return { number, parts: [{ text, changed: false, start: 0 }], wholeLine };
}

function graphemes(lines: string[]) {
  return Array.from(
    segmenter.segment(lines.join("\n")),
    ({ segment }) => segment,
  );
}

function appendPart(line: ChapterDiffLine, text: string, changed: boolean) {
  if (!text) return;
  const last = line.parts.at(-1);
  if (last?.changed === changed) {
    last.text += text;
  } else {
    line.parts.push({
      text,
      changed,
      start: last ? last.start + last.text.length : 0,
    });
  }
}

function compareHunk(
  before: string[],
  after: string[],
  leftStart: number,
  rightStart: number,
): ChapterDiffRow[] {
  if (!before.length)
    return after.map((line, index) => ({
      left: null,
      right: diffLine(line, rightStart + index, true),
    }));
  if (!after.length)
    return before.map((line, index) => ({
      left: diffLine(line, leftStart + index, true),
      right: null,
    }));

  const left = before.map<ChapterDiffLine>((_, index) => ({
    number: leftStart + index,
    parts: [],
  }));
  const right = after.map<ChapterDiffLine>((_, index) => ({
    number: rightStart + index,
    parts: [],
  }));
  const matches: { left: number; right: number; weight: number }[] = [];
  let l = 0;
  let r = 0;
  for (const change of compare(graphemes(before), graphemes(after))) {
    const pieces = change.value.join("").split("\n");
    for (const [index, piece] of pieces.entries()) {
      if (!change.added) appendPart(left[l], piece, Boolean(change.removed));
      if (!change.removed) appendPart(right[r], piece, Boolean(change.added));
      if (!change.added && !change.removed && piece.trim()) {
        const last = matches.at(-1);
        if (last?.left === l && last.right === r) last.weight += piece.length;
        else matches.push({ left: l, right: r, weight: piece.length });
      }
      if (index === pieces.length - 1) break;
      if (!change.added) {
        if (change.removed) left[l].changedBreak = true;
        l++;
      }
      if (!change.removed) {
        if (change.added) right[r].changedBreak = true;
        r++;
      }
    }
  }

  // When a line splits or merges, align it with the side sharing the most text.
  const bestLeft = new Map<number, (typeof matches)[number]>();
  const bestRight = new Map<number, (typeof matches)[number]>();
  for (const match of matches) {
    if (match.weight > (bestLeft.get(match.left)?.weight ?? 0))
      bestLeft.set(match.left, match);
    if (match.weight > (bestRight.get(match.right)?.weight ?? 0))
      bestRight.set(match.right, match);
  }

  const rows: ChapterDiffRow[] = [];
  l = 0;
  r = 0;
  function appendUntil(leftEnd: number, rightEnd: number) {
    while (l < leftEnd || r < rightEnd) {
      rows.push({
        left: l < leftEnd ? left[l++] : null,
        right: r < rightEnd ? right[r++] : null,
      });
    }
  }
  for (const match of matches) {
    if (
      bestLeft.get(match.left) !== match ||
      bestRight.get(match.right) !== match
    )
      continue;
    appendUntil(match.left, match.right);
    appendUntil(match.left + 1, match.right + 1);
  }
  appendUntil(left.length, right.length);
  return rows;
}

export function buildChapterDiff(leftText: string, rightText: string) {
  const left = normalizeChapterText(leftText).split("\n");
  const right = normalizeChapterText(rightText).split("\n");
  const rows: ChapterDiffRow[] = [];
  const changes = compare(left, right);
  let leftNumber = 1;
  let rightNumber = 1;
  let index = 0;

  while (index < changes.length) {
    const change = changes[index];
    if (!change.added && !change.removed) {
      for (const line of change.value) {
        rows.push({
          left: diffLine(line, leftNumber++),
          right: diffLine(line, rightNumber++),
        });
      }
      index++;
      continue;
    }

    const before: string[] = [];
    const after: string[] = [];
    for (; index < changes.length; index++) {
      const part = changes[index];
      if (part.removed) before.push(...part.value);
      else if (part.added) after.push(...part.value);
      else break;
    }
    rows.push(...compareHunk(before, after, leftNumber, rightNumber));
    leftNumber += before.length;
    rightNumber += after.length;
  }
  return rows;
}
