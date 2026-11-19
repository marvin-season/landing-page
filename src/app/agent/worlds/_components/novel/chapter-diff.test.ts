import assert from "node:assert/strict";
import { test } from "node:test";
import { buildChapterDiff } from "./chapter-diff";

test("aligns unchanged, removed, added and changed chapter lines", () => {
  assert.deepEqual(buildChapterDiff("一\n二\n四", "一\n三\n四\n五"), [
    {
      left: "一",
      right: "一",
      leftNumber: 1,
      rightNumber: 1,
      kind: "equal",
    },
    {
      left: "二",
      right: "三",
      leftNumber: 2,
      rightNumber: 2,
      kind: "changed",
    },
    {
      left: "四",
      right: "四",
      leftNumber: 3,
      rightNumber: 3,
      kind: "equal",
    },
    {
      left: null,
      right: "五",
      leftNumber: null,
      rightNumber: 4,
      kind: "added",
    },
  ]);
});

test("keeps empty chapters visible and falls back for very large comparisons", () => {
  assert.deepEqual(buildChapterDiff("", ""), [
    {
      left: "",
      right: "",
      leftNumber: 1,
      rightNumber: 1,
      kind: "equal",
    },
  ]);
  const left = Array.from({ length: 1500 }, (_, index) => String(index)).join(
    "\n",
  );
  const right = Array.from({ length: 1500 }, (_, index) => `new-${index}`).join(
    "\n",
  );
  const rows = buildChapterDiff(left, right);
  assert.equal(rows[0].kind, "changed");
  assert.equal(rows.length, 1500);
});
