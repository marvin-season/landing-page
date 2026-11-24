import assert from "node:assert/strict";
import { test } from "node:test";
import { buildChapterDiff, type ChapterDiffLine } from "./chapter-diff";

function changedText(line: ChapterDiffLine | null) {
  return line?.parts
    .filter((part) => line.wholeLine || part.changed)
    .map((part) => part.text)
    .join("");
}

test("highlights only edited characters, spaces, and punctuation", () => {
  const [row] = buildChapterDiff("小明 缓缓推开门。", "小明轻轻推开门！");
  assert.equal(changedText(row.left), " 缓缓。");
  assert.equal(changedText(row.right), "轻轻！");
});

test("aligns a changed line after an adjacent insertion or deletion", () => {
  const base = "他走进森林。";
  const draft = "一阵风吹过。\n他走进树林。";
  const [inserted, modified] = buildChapterDiff(base, draft);
  assert.equal(inserted.left, null);
  assert.equal(changedText(inserted.right), "一阵风吹过。");
  assert.equal(modified.left?.number, 1);
  assert.equal(modified.right?.number, 2);
  assert.equal(changedText(modified.left), "森");
  assert.equal(changedText(modified.right), "树");

  const [edited, removed] = buildChapterDiff(
    "他走进森林。\n灯火摇曳。",
    "他走进树林。",
  );
  assert.equal(changedText(edited.left), "森");
  assert.equal(changedText(edited.right), "树");
  assert.equal(changedText(removed.left), "灯火摇曳。");
  assert.equal(removed.right, null);
});

test("marks the line break when a paragraph splits or merges", () => {
  const before = "他走到窗前。夜已深。";
  const after = "他走到窗前。\n夜已深。";
  const split = buildChapterDiff(before, after);
  assert.deepEqual(
    split.map(({ right }) => changedText(right)),
    ["", ""],
  );
  assert.equal(split[0].right?.changedBreak, true);
  const merged = buildChapterDiff(after, before);
  assert.deepEqual(
    merged.map(({ left }) => changedText(left)),
    ["", ""],
  );
  assert.equal(merged[0].left?.changedBreak, true);
});

test("keeps a combined emoji together and keeps empty lines visible", () => {
  const [row] = buildChapterDiff("她看见👩‍🚒走来。", "她看见👩‍🔬走来。");
  assert.equal(changedText(row.left), "👩‍🚒");
  assert.equal(changedText(row.right), "👩‍🔬");
  const [empty] = buildChapterDiff("", "");
  assert.equal(empty.left?.number, 1);
  assert.equal(empty.right?.number, 1);
  const [, blank] = buildChapterDiff("开头\n结尾", "开头\n\n结尾");
  assert.equal(blank.left, null);
  assert.equal(blank.right?.wholeLine, true);
});

test("retains common text for long chapters and large rewrites", () => {
  const text = "山".repeat(4000);
  const [smallEdit] = buildChapterDiff(`${text}甲${text}`, `${text}乙${text}`);
  assert.equal(changedText(smallEdit.left), "甲");
  assert.equal(changedText(smallEdit.right), "乙");

  const oldText = "甲".repeat(2000);
  const newText = "乙".repeat(2000);
  const [largeEdit] = buildChapterDiff(
    `开头${oldText}结尾`,
    `开头${newText}结尾`,
  );
  assert.equal(changedText(largeEdit.left), oldText);
  assert.equal(changedText(largeEdit.right), newText);
});
