import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderChapterMarkdown, sourceOffsets } from "./chapter-markdown";

test("rewrite marks only the requested occurrence without losing Markdown formatting", () => {
  const phrase = "门开了";
  const chapter = `她说：**${phrase}**。\r\n\r\n后来，**再次${phrase}**。`;
  const start = chapter.lastIndexOf(phrase);
  const end = start + phrase.length;
  const markup = renderToStaticMarkup(
    renderChapterMarkdown(chapter, { start, end }),
  );
  assert.match(markup, /<strong[^>]*><span[^>]*>门开了<\/span><\/strong>/);
  assert.match(
    markup,
    new RegExp(
      `<mark data-source-start="${start}" data-source-end="${end}" data-rewrite-mark="">门开了</mark></strong>`,
    ),
  );
  assert.equal(markup.match(/<mark/g)?.length, 1);
});

test("a rendered selection maps across entities, escapes, and Windows line endings", () => {
  const raw = "甲 &amp; \\*\r\n门开了 &lt;";
  const visible = "甲 & *\n门开了 <";
  const offsets = sourceOffsets(raw, visible);
  assert.ok(offsets);
  assert.equal(
    raw.slice(offsets[visible.indexOf("&")], offsets[visible.indexOf("*") + 1]),
    "&amp; \\*",
  );
  assert.equal(offsets[visible.indexOf("门")], raw.indexOf("门"));
  assert.equal(offsets[visible.length], raw.length);
});
