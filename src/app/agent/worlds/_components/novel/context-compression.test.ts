import assert from "node:assert/strict";
import { test } from "node:test";
import { loadWorldTemplates } from "@/lib/group-chat/world-templates";
import {
  compressedChapterPrompt,
  fitsNovelRequest,
  initialCompressionCursor,
  isNovelRequestTooLarge,
  novelRequestBudget,
  novelRequestBytes,
  novelWithCompression,
  planCompressionBatch,
  smallerNovelBudget,
} from "./context-compression";
import {
  chapterPrompt,
  createBackground,
  createNovel,
  exportNovel,
  invalidateEditedCheckpoint,
  replaceChapterText,
  rewritePrompt,
} from "./model";

const config = loadWorldTemplates()[0].config;
const roomId = "novel-room";

test("compression options set the target for the entire rolling summary and forward author priorities", () => {
  const novel = createNovel(config);
  novel.chapters = [
    { id: "1", title: "第一章", text: "旧".repeat(900) },
    { id: "2", title: "第二章", text: "新".repeat(600) },
  ];
  const cursor = { index: 1, offset: 100, summary: "旧摘要" };
  const batch = planCompressionBatch(
    roomId,
    config,
    novel,
    cursor,
    2,
    novelRequestBudget,
    {
      rate: 80,
      instructions: "  优先保留伏笔和人物约定。  ",
    },
  );
  assert.ok(batch);
  const { task, completedChapters } = JSON.parse(batch.prompt);
  assert.equal(task.targetCharacters, 450);
  assert.equal(task.requirements, "优先保留伏笔和人物约定。");
  assert.equal(completedChapters[0].text.length, 500);
  const automatic = planCompressionBatch(
    roomId,
    config,
    novel,
    cursor,
    2,
    novelRequestBudget,
  );
  assert.ok(automatic);
  assert.equal(JSON.parse(automatic.prompt).task.targetCharacters, 750);
  const leastCompressed = planCompressionBatch(
    roomId,
    config,
    novel,
    cursor,
    2,
    novelRequestBudget,
    { rate: 10, instructions: "" },
  );
  assert.ok(leastCompressed);
  assert.equal(JSON.parse(leastCompressed.prompt).task.targetCharacters, 1050);
});

test("budgets serialized request bytes separately from prompt characters", () => {
  const prompt = JSON.stringify({ text: "汉".repeat(140_000) });
  assert.ok(prompt.length < novelRequestBudget.characters);
  assert.ok(
    novelRequestBytes(roomId, prompt, "chapter") > novelRequestBudget.bytes,
  );
  assert.equal(fitsNovelRequest(roomId, prompt, "chapter"), false);
  assert.equal(isNovelRequestTooLarge("HTTP 413"), true);
  assert.equal(isNovelRequestTooLarge("context_length_exceeded"), true);
  assert.equal(isNovelRequestTooLarge("HTTP 502"), false);
  assert.equal(isNovelRequestTooLarge("HTTP 429"), false);
  const reduced = smallerNovelBudget(
    roomId,
    prompt,
    "chapter",
    novelRequestBudget,
  );
  assert.ok(reduced.bytes < novelRequestBudget.bytes);
  assert.ok(reduced.characters < novelRequestBudget.characters);
});

test("rolling compression covers a multi-request manuscript in order and retains recent prose", () => {
  const novel = createNovel(config);
  novel.chapters = Array.from({ length: 50 }, (_, index) => ({
    id: String(index),
    title: `第${index + 1}章`,
    text: "正文".repeat(4000),
  }));
  novel.background = createBackground(config, novel, "之前有个约定。");
  const through = novel.chapters.length;
  let cursor = initialCompressionCursor(novel);
  let batches = 0;
  assert.equal(
    fitsNovelRequest(roomId, chapterPrompt(config, novel), "chapter"),
    false,
  );
  while (cursor.index < through - 1) {
    const batch = planCompressionBatch(
      roomId,
      config,
      novel,
      cursor,
      through - 1,
      novelRequestBudget,
    );
    assert.ok(batch);
    assert.ok(batch.index > cursor.index);
    const input = JSON.parse(batch.prompt);
    assert.deepEqual(
      input.completedChapters,
      novel.chapters
        .slice(cursor.index, batch.index)
        .map(({ title, text }) => ({ title, text })),
    );
    if (batches) assert.equal(input.archivedChapters.summary, cursor.summary);
    else assert.equal(input.importedBackground.summary, "之前有个约定。");
    cursor = {
      index: batch.index,
      offset: batch.offset,
      summary: "完整的剧情档案",
    };
    batches++;
  }
  assert.ok(batches > 1);
  const prompt = compressedChapterPrompt(config, novel, through, cursor);
  assert.ok(fitsNovelRequest(roomId, prompt, "chapter"));
  const payload = JSON.parse(prompt);
  assert.equal(payload.task.chapter, 51);
  assert.equal(payload.archivedChapters.throughChapter, 49);
  assert.deepEqual(payload.completedChapters, [
    { title: "第50章", text: novel.chapters[49].text },
  ]);
  const compressed = novelWithCompression(novel, cursor);
  const { checkpoint, ...manuscript } = compressed;
  assert.ok(checkpoint);
  assert.deepEqual(manuscript, novel);
  assert.equal(compressed.chapters, novel.chapters);
  assert.equal(exportNovel(compressed, "md"), exportNovel(novel, "md"));
  assert.equal(novel.checkpoint, undefined);
  const resume = initialCompressionCursor(compressed, 48);
  assert.equal(resume.index, 0);
  const earlierPayload = JSON.parse(
    compressedChapterPrompt(config, compressed, 48, resume),
  );
  assert.equal(earlierPayload.archivedChapters, undefined);
  assert.equal(earlierPayload.completedChapters.length, 48);
  assert.equal(earlierPayload.task.chapter, 49);
  assert.ok(
    planCompressionBatch(
      roomId,
      config,
      compressed,
      resume,
      48,
      novelRequestBudget,
    ),
  );
  assert.equal(
    invalidateEditedCheckpoint(
      compressed,
      replaceChapterText(compressed, "0", "改写开篇"),
    ).checkpoint,
    undefined,
  );
  assert.equal(
    invalidateEditedCheckpoint(
      compressed,
      replaceChapterText(compressed, "49", "改写最新一章"),
    ).checkpoint,
    compressed.checkpoint,
  );
  assert.equal(
    JSON.parse(rewritePrompt(config, compressed, "0", "")).archivedChapters,
    undefined,
  );
});

test("an oversized imported chapter is summarized without splitting a code point or saving a partial checkpoint", () => {
  const novel = createNovel(config);
  const text = "🌊「正文」".repeat(40_000);
  novel.chapters = [{ id: "one", title: "第1章", text }];
  let cursor = initialCompressionCursor(novel);
  const fragments: string[] = [];
  while (cursor.index < 1) {
    const batch = planCompressionBatch(
      roomId,
      config,
      novel,
      cursor,
      1,
      novelRequestBudget,
    );
    assert.ok(batch);
    assert.ok(batch.index > cursor.index || batch.offset > cursor.offset);
    const fragment = JSON.parse(batch.prompt).completedChapters[0]
      .text as string;
    assert.doesNotMatch(fragment, /[\uD800-\uDFFF]/u);
    fragments.push(fragment);
    cursor = {
      index: batch.index,
      offset: batch.offset,
      summary: "整理后的剧情",
    };
    if (cursor.offset) assert.equal(novelWithCompression(novel, cursor), novel);
  }
  assert.ok(fragments.length > 1);
  assert.equal(fragments.join(""), text);
  assert.equal(
    novelWithCompression(novel, cursor).checkpoint?.throughChapterId,
    "one",
  );
});
