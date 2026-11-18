import assert from "node:assert/strict";
import { test } from "node:test";
import { loadWorldTemplates } from "@/lib/group-chat/world-templates";
import {
  chapterPrompt,
  createBackground,
  createNovel,
  exportNovel,
  maxBackgroundFileBytes,
  novelRequest,
  parseBackgroundFile,
  serializeBackground,
  summaryPrompt,
} from "./model";

test("writer receives world secrets and edited chapters in order, with the next chapter requirements", () => {
  const config = structuredClone(loadWorldTemplates()[0].config);
  config.characters[0].privateInfo = "尚未揭晓的身份";
  config.priorContext = "此前众人在码头会合。";
  const novel = createNovel(config);
  novel.chapters = [
    { id: "one", title: "第1章 初见", text: "已编辑的第一章。" },
    { id: "two", title: "第2章 风起", text: "第二章正文。" },
  ];
  novel.chapterGoal = "揭示线索，但保留身份秘密";
  const prompt = JSON.parse(chapterPrompt(config, novel));
  assert.equal(prompt.world.characters[0].privateInfo, "尚未揭晓的身份");
  assert.equal(prompt.world.priorContext, config.priorContext);
  assert.deepEqual(
    prompt.completedChapters,
    novel.chapters.map(({ title, text }) => ({ title, text })),
  );
  assert.equal(prompt.task.chapter, 3);
  assert.equal(prompt.task.requirements, novel.chapterGoal);
  assert.equal(prompt.task.targetWords, 2000);
});

test("summary export imports into a different novel as background without replacing its chapters or settings", () => {
  const config = loadWorldTemplates()[0].config;
  const source = createNovel(config);
  source.title = "原小说";
  source.chapters = [
    {
      id: "chapter-one",
      title: "第一章",
      text: "林舟抵达旧港，答应帮助苏晚。",
    },
  ];
  const background = createBackground(
    config,
    source,
    "## 人物状态\n林舟在旧港，已答应帮助苏晚。\n## 未解伏笔\n灯塔的来信尚未拆开。",
  );
  const markdown = serializeBackground(background);
  assert.ok(markdown.startsWith("# 原小说 · 背景总结"));
  assert.ok(markdown.includes(background.summary));
  const imported = parseBackgroundFile(markdown);
  const next = createNovel(config);
  next.title = "新小说";
  next.outline = "调查灯塔";
  next.background = imported;
  const prompt = JSON.parse(chapterPrompt(config, next));
  assert.equal(prompt.importedBackground.source.title, "原小说");
  assert.equal(prompt.importedBackground.summary, background.summary);
  assert.deepEqual(prompt.importedBackground.world, config);
  assert.equal(prompt.task.chapter, 1);
  assert.deepEqual(prompt.completedChapters, []);
  assert.equal(prompt.novel.title, "新小说");
  assert.equal(prompt.novel.outline, "调查灯塔");
  assert.equal(imported.source.throughChapterId, "chapter-one");
  assert.equal(imported.source.chapterCount, 1);
  assert.equal(exportNovel(next, "txt").includes(background.summary), false);
});

test("summary requests merge inherited background with completed chapters, without including future chapter requirements as events", () => {
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  novel.chapters = [{ id: "one", title: "第一章", text: "已经发生的正文" }];
  novel.background = createBackground(config, novel, "此前的剧情与人物状态");
  novel.chapterGoal = "还未发生的下一章安排";
  novel.outline = "未来大纲";
  const prompt = JSON.parse(summaryPrompt(config, novel));
  assert.equal(prompt.importedBackground.summary, novel.background.summary);
  assert.deepEqual(prompt.completedChapters, [
    { title: "第一章", text: "已经发生的正文" },
  ]);
  assert.equal(JSON.stringify(prompt).includes(novel.chapterGoal), false);
  assert.equal(JSON.stringify(prompt).includes(novel.outline), false);
  const request = novelRequest("room-one", JSON.stringify(prompt), "summary");
  assert.equal(request.task, "summary");
  assert.equal(request.roomId, "room-one");
  assert.equal(request.prompt, JSON.stringify(prompt));
});

test("background import rejects malformed, oversized and incompatible files", () => {
  assert.throws(() => parseBackgroundFile("普通小说正文"), /Markdown/);
  assert.throws(
    () => parseBackgroundFile(" ".repeat(maxBackgroundFileBytes + 1)),
    /2 MB/,
  );
  assert.throws(
    () =>
      parseBackgroundFile(
        JSON.stringify({ format: "world-chat", schemaVersion: 1 }),
      ),
    /Markdown/,
  );
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  assert.throws(() => createBackground(config, novel, "没有完成章节不能导出"));
  novel.chapters = [{ id: "one", title: "第一章", text: "正文" }];
  const background = createBackground(config, novel, "完整总结");
  for (const invalid of [
    { ...background, schemaVersion: 2 },
    { ...background, summary: "" },
    { ...background, world: {} },
  ])
    assert.throws(
      () =>
        parseBackgroundFile(serializeBackground(invalid as typeof background)),
      /格式或版本/,
    );
});

test("edited Markdown body imports with Windows line endings while metadata and source secrets round-trip intact", () => {
  const config = structuredClone(loadWorldTemplates()[0].config);
  config.characters[0].privateInfo = "秘密包含 --> 和 <tag>";
  const novel = createNovel(config);
  novel.chapters = [{ id: "one", title: "第一章", text: "正文" }];
  const background = createBackground(config, novel, "## 人物状态\n原总结");
  const text = serializeBackground(background).replace(
    "原总结",
    "手工修订后的总结",
  );
  assert.equal(text.match(/-->/g)?.length, 1);
  const imported = parseBackgroundFile(
    `\uFEFF${text.replaceAll("\n", "\r\n")}`,
  );
  assert.equal(imported.summary, "## 人物状态\n手工修订后的总结");
  assert.equal(
    imported.world.characters[0].privateInfo,
    config.characters[0].privateInfo,
  );
  assert.deepEqual(imported.source, background.source);
  assert.throws(
    () =>
      parseBackgroundFile(
        text.replace('"schemaVersion": 1', '"schemaVersion": 2'),
      ),
    /格式或版本/,
  );
  assert.throws(
    () =>
      parseBackgroundFile(
        text.replace('"schemaVersion": 1', '"schemaVersion": invalid'),
      ),
    /来源信息损坏/,
  );
});

test("whole novel exports preserve chapter order and exclude author settings and secrets", () => {
  const novel = createNovel(loadWorldTemplates()[0].config);
  novel.title = "书名";
  novel.outline = "不可出现在正文中的创作要求";
  novel.chapters = [
    { id: "one", title: "第1章", text: "正文一" },
    { id: "two", title: "第2章", text: "正文二" },
  ];
  assert.equal(
    exportNovel(novel, "txt"),
    "书名\n\n第1章\n\n正文一\n\n第2章\n\n正文二\n",
  );
  assert.equal(
    exportNovel(novel, "md"),
    "# 书名\n\n## 第1章\n\n正文一\n\n## 第2章\n\n正文二\n",
  );
});

test("chapter requests identify the room and task without sending model credentials or runtime overrides", () => {
  assert.deepEqual(novelRequest("room-one", "设定与完整正文"), {
    roomId: "room-one",
    prompt: "设定与完整正文",
    task: "chapter",
  });
});
