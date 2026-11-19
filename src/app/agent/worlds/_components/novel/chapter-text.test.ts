import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeChapterText,
  replaceTextRange,
  splitChapterText,
  textareaSelectionRange,
  textareaSourceOffset,
} from "./chapter-text";

test("normalizes display line endings without changing source text", () => {
  assert.equal(normalizeChapterText("一\r\n二\r三\n"), "一\n二\n三\n");
});

test("maps textarea selection offsets back to CRLF source offsets", () => {
  const source = "一\r\n二\r\n三";
  const displayed = normalizeChapterText(source);
  const start = displayed.indexOf("二");
  const selection = textareaSelectionRange(
    source,
    start,
    start + 1,
    "backward",
  );

  assert.deepEqual(selection, { start: 3, end: 4, direction: "backward" });
  assert.equal(textareaSourceOffset(source, start), 3);
  assert.equal(textareaSelectionRange(source, 0, 0, "none"), null);
});

test("splits and replaces validated source ranges", () => {
  const source = "开头\r\n目标\r\n结尾";
  const range = { start: 4, end: 6 };

  assert.deepEqual(splitChapterText(source, range), {
    before: "开头\r\n",
    text: "目标",
    after: "\r\n结尾",
  });
  assert.equal(
    replaceTextRange(source, "新目标", range),
    "开头\r\n新目标\r\n结尾",
  );
  assert.throws(
    () => splitChapterText(source, { start: 0, end: source.length + 1 }),
    /选段已失效/,
  );
});
