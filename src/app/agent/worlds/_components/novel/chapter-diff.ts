import { normalizeChapterText } from "./chapter-text";

export type ChapterDiffRow = {
  left: string | null;
  right: string | null;
  leftNumber: number | null;
  rightNumber: number | null;
  kind: "equal" | "changed" | "removed" | "added";
};

type DiffOperation = { kind: "equal" | "removed" | "added"; line: string };

const maxMatrixCells = 2_000_000;

function chapterLines(text: string) {
  return normalizeChapterText(text).split("\n");
}

function operations(left: string[], right: string[]): DiffOperation[] {
  if ((left.length + 1) * (right.length + 1) > maxMatrixCells) {
    return [
      ...left.map((line) => ({ kind: "removed" as const, line })),
      ...right.map((line) => ({ kind: "added" as const, line })),
    ];
  }

  const matrix = Array.from(
    { length: left.length + 1 },
    () => new Uint32Array(right.length + 1),
  );
  for (let row = left.length - 1; row >= 0; row--) {
    for (let column = right.length - 1; column >= 0; column--) {
      matrix[row][column] =
        left[row] === right[column]
          ? matrix[row + 1][column + 1] + 1
          : Math.max(matrix[row + 1][column], matrix[row][column + 1]);
    }
  }

  const result: DiffOperation[] = [];
  let row = 0;
  let column = 0;
  while (row < left.length && column < right.length) {
    if (left[row] === right[column]) {
      result.push({ kind: "equal", line: left[row] });
      row++;
      column++;
    } else if (matrix[row + 1][column] >= matrix[row][column + 1]) {
      result.push({ kind: "removed", line: left[row++] });
    } else {
      result.push({ kind: "added", line: right[column++] });
    }
  }
  while (row < left.length) result.push({ kind: "removed", line: left[row++] });
  while (column < right.length)
    result.push({ kind: "added", line: right[column++] });
  return result;
}

export function buildChapterDiff(leftText: string, rightText: string) {
  const left = chapterLines(leftText);
  const right = chapterLines(rightText);
  const result: ChapterDiffRow[] = [];
  const diff = operations(left, right);
  let leftNumber = 0;
  let rightNumber = 0;
  let index = 0;

  while (index < diff.length) {
    const operation = diff[index];
    if (operation.kind === "equal") {
      leftNumber++;
      rightNumber++;
      result.push({
        left: operation.line,
        right: operation.line,
        leftNumber,
        rightNumber,
        kind: "equal",
      });
      index++;
      continue;
    }

    const removed: string[] = [];
    const added: string[] = [];
    while (index < diff.length && diff[index].kind !== "equal") {
      const current = diff[index++];
      if (current.kind === "removed") removed.push(current.line);
      if (current.kind === "added") added.push(current.line);
    }
    const count = Math.max(removed.length, added.length);
    for (let offset = 0; offset < count; offset++) {
      const leftLine = removed[offset] ?? null;
      const rightLine = added[offset] ?? null;
      const hasLeft = leftLine !== null;
      const hasRight = rightLine !== null;
      if (hasLeft) leftNumber++;
      if (hasRight) rightNumber++;
      result.push({
        left: leftLine,
        right: rightLine,
        leftNumber: hasLeft ? leftNumber : null,
        rightNumber: hasRight ? rightNumber : null,
        kind: hasLeft && hasRight ? "changed" : hasLeft ? "removed" : "added",
      });
    }
  }

  return result;
}
