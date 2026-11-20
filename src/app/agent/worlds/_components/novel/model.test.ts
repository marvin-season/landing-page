import assert from "node:assert/strict";
import { test } from "node:test";
import { loadWorldTemplates } from "@/lib/group-chat/world-templates";
import { textareaSourceOffset } from "./chapter-text";
import {
  applyChapterContinuation,
  chapterPrompt,
  continuationIndex,
  createBackground,
  createNovel,
  exportNovel,
  insertChapterBefore,
  insertChapterPrompt,
  invalidateEditedCheckpoint,
  maxBackgroundFileBytes,
  maxNovelPromptLength,
  novelRequest,
  parseBackgroundFile,
  replaceChapter,
  replaceChapterText,
  rewritePrompt,
  serializeBackground,
  splitChapterAt,
  summaryPrompt,
} from "./model";

test("continuation sends chapters only through the selected one and never sends an archive covering later chapters", () => {
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  novel.chapters = [
    { id: "first", title: "第1章", text: "开篇。" },
    { id: "selected", title: "第2章", text: "从这里继续。" },
    { id: "later", title: "第3章", text: "已有后文。" },
  ];
  novel.checkpoint = { throughChapterId: "later", summary: "包含后文的摘要。" };
  const through = continuationIndex(novel, "selected");
  assert.equal(through, 2);
  const prompt = JSON.parse(chapterPrompt(config, novel, through));
  assert.equal(prompt.task.chapter, 3);
  assert.deepEqual(prompt.completedChapters, [
    { title: "第1章", text: "开篇。" },
    { title: "第2章", text: "从这里继续。" },
  ]);
  assert.equal(prompt.archivedChapters, undefined);
  novel.checkpoint = { throughChapterId: "first", summary: "开篇摘要。" };
  const summarized = JSON.parse(chapterPrompt(config, novel, through));
  assert.equal(summarized.archivedChapters.summary, "开篇摘要。");
  assert.deepEqual(summarized.completedChapters, [prompt.completedChapters[1]]);
});

test("saving a continuation inserts it after its anchor and preserves existing downstream prose", () => {
  const novel = createNovel(loadWorldTemplates()[0].config);
  novel.chapters = [
    { id: "selected", title: "前奏", text: "前文。" },
    { id: "later", title: "第2章", text: "后文。" },
    { id: "end", title: "尾声", text: "结尾。" },
  ];
  const draft = { id: "new", title: "第2章", text: "续写正文。" };
  assert.deepEqual(
    applyChapterContinuation(novel, draft, "selected")?.chapters,
    [
      novel.chapters[0],
      draft,
      { ...novel.chapters[1], title: "第3章" },
      novel.chapters[2],
    ],
  );
  assert.equal(applyChapterContinuation(novel, draft, "missing"), null);
  assert.deepEqual(
    applyChapterContinuation({ ...novel, chapters: [] }, draft, null)?.chapters,
    [{ ...draft, title: "第1章" }],
  );
});

test("splitting preserves source text and puts the new chapter before the renumbered following chapters", () => {
  const novel = createNovel(loadWorldTemplates()[0].config);
  const before = "**上半段**\r\n\r\n";
  const after = "下半段。\r\n";
  novel.chapters = [
    { id: "target", title: "旅途", text: before + after },
    { id: "next", title: "第2章", text: "后来。" },
    { id: "custom", title: "尾声", text: "再后来。" },
  ];
  novel.checkpoint = { throughChapterId: "next", summary: "旧摘要" };

  const caret = before.replaceAll("\r\n", "\n").length;
  const updated = splitChapterAt(novel, "target", caret, "new");
  assert.ok(updated);
  assert.deepEqual(updated.chapters, [
    { id: "target", title: "旅途", text: before },
    { id: "new", title: "第2章", text: after },
    { id: "next", title: "第3章", text: "后来。" },
    novel.chapters[2],
  ]);
  assert.equal(novel.chapters[0].text, before + after);
  assert.equal(
    invalidateEditedCheckpoint(novel, updated).checkpoint,
    undefined,
  );
  assert.match(exportNovel(updated, "md"), /## 第2章\n\n下半段。/);

  assert.equal(splitChapterAt(novel, "target", 0, "new"), null);
  assert.equal(splitChapterAt(novel, "target", caret + 5, "new"), null);
  assert.equal(splitChapterAt(novel, "missing", caret, "new"), null);
});

test("inserting before chapter five preserves the original sequence, IDs, prose, and custom titles", () => {
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  novel.chapterGoal = "只用于书末续写";
  novel.chapters = Array.from({ length: 6 }, (_, index) => ({
    id: String(index + 1),
    title: index === 5 ? "雨中的重逢" : `第${index + 1}章`,
    text: `原文 ${index + 1}`,
  }));

  const prompt = JSON.parse(
    insertChapterPrompt(
      { ...config, priorContext: "世界前置剧情。" },
      {
        ...novel,
        background: { format: "text", summary: "导入的前情。" },
        checkpoint: { throughChapterId: "2", summary: "旧章摘要。" },
      },
      "5",
      "  补上旅途  ",
    ),
  );
  assert.deepEqual(prompt.previousChapters, [
    { chapter: 4, title: "第4章", text: "原文 4" },
  ]);
  assert.deepEqual(prompt.followingChapters, [
    { chapter: 6, title: "第6章", text: "原文 5" },
  ]);
  assert.equal(prompt.world.priorContext, "世界前置剧情。");
  assert.equal(prompt.importedBackground.summary, "导入的前情。");
  assert.equal(prompt.archivedChapters, undefined);
  assert.deepEqual(prompt.task, {
    mode: "insert",
    chapter: 5,
    targetWords: 4000,
    maxCharacters: 8000,
    requirements: "补上旅途",
  });

  const updated = insertChapterBefore(novel, "5", { id: "new", text: "旅途" });
  assert.deepEqual(updated.chapters.slice(4), [
    { id: "new", title: "第5章", text: "旅途" },
    { id: "5", title: "第6章", text: "原文 5" },
    novel.chapters[5],
  ]);
  assert.equal(novel.chapters[4].title, "第5章");
  assert.equal(updated.chapterGoal, novel.chapterGoal);
  assert.match(
    exportNovel(updated, "md"),
    /## 第5章\n\n旅途\n\n## 第6章\n\n原文 5/,
  );
  assert.deepEqual(
    JSON.parse(chapterPrompt(config, updated))
      .completedChapters.slice(4)
      .map((item: { text: string }) => item.text),
    ["旅途", "原文 5", "原文 6"],
  );
  assert.throws(
    () => insertChapterBefore(novel, "missing", { id: "new", text: "旅途" }),
    /找不到插入位置/,
  );
});

test("interchapter insertion counts only the selected chapters toward the context limit", () => {
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  novel.chapters = [
    { id: "early", title: "旧事", text: "早".repeat(maxNovelPromptLength) },
    { id: "previous", title: "前一章", text: "门打开了。" },
    { id: "following", title: "后一章", text: "她走到街上。" },
    { id: "late", title: "后来", text: "晚".repeat(maxNovelPromptLength) },
  ];
  const prompt = JSON.parse(
    insertChapterPrompt(config, novel, "following", ""),
  );
  assert.deepEqual(prompt.previousChapters, [
    { chapter: 2, title: "前一章", text: "门打开了。" },
  ]);
  assert.deepEqual(prompt.followingChapters, [
    { chapter: 4, title: "后一章", text: "她走到街上。" },
  ]);
  assert.throws(
    () => insertChapterPrompt(config, novel, "previous", ""),
    /插入点两侧的章节上下文过长/,
  );
});

test("opening insertion sends only basic settings and the author's request, even with long existing prose", () => {
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  novel.chapters = [
    { id: "first", title: "旧开篇", text: "早".repeat(maxNovelPromptLength) },
  ];
  novel.checkpoint = { throughChapterId: "first", summary: "旧稿摘要" };
  novel.background = { format: "text", summary: "导入背景" };
  novel.chapterGoal = "只用于书末续写";
  const opening = JSON.parse(
    insertChapterPrompt(
      { ...config, priorContext: "世界前置剧情" },
      novel,
      "first",
      "  从下雨的早晨写起  ",
    ),
  );
  assert.deepEqual(opening, {
    world: {
      title: config.title,
      background: config.background,
      scene: config.scene,
      rules: config.rules,
      facts: config.facts,
      storyGoal: config.storyGoal,
      characters: config.characters,
    },
    novel: { title: novel.title, style: novel.style, outline: novel.outline },
    task: {
      mode: "insert",
      chapter: 1,
      targetWords: 4000,
      maxCharacters: 8000,
      requirements: "从下雨的早晨写起",
    },
  });
});

test("a passage rewrite sends the unselected text and replaces only the selected occurrence", () => {
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  const text = "她推开了门。\r\n\r\n后来，她推开了门。\r\n\r\n灯亮了。";
  novel.chapters = [
    { id: "before", title: "上章", text: "门外很安静。" },
    { id: "target", title: "本章", text },
    { id: "after", title: "下章", text: "灯还亮着。" },
  ];
  const start = text.lastIndexOf("她推开了门。");
  const range = { start, end: start + "她推开了门。".length };
  const prompt = JSON.parse(
    rewritePrompt(config, novel, "target", "补足动作细节", range),
  );
  assert.deepEqual(prompt.targetChapter.selection, {
    before: "她推开了门。\r\n\r\n后来，",
    text: "她推开了门。",
    after: "\r\n\r\n灯亮了。",
  });
  assert.equal(prompt.targetChapter.text, undefined);
  assert.deepEqual(Object.keys(prompt), ["world", "targetChapter", "task"]);
  assert.deepEqual(prompt.world.characters, config.characters);
  assert.equal(prompt.task.requirements, "补足动作细节");
  const updated = replaceChapterText(
    novel,
    "target",
    "她用肩膀顶开了门。",
    range,
  );
  assert.equal(
    updated.chapters[1].text,
    "她推开了门。\r\n\r\n后来，她用肩膀顶开了门。\r\n\r\n灯亮了。",
  );
  assert.deepEqual(
    [updated.chapters[0], updated.chapters[2]],
    [novel.chapters[0], novel.chapters[2]],
  );
  assert.throws(
    () =>
      rewritePrompt(config, novel, "target", "", {
        start: 0,
        end: text.length + 1,
      }),
    /选段已失效/,
  );
});

test("whole chapter rewrite sends all preceding chapters and only the immediate next chapter", () => {
  const config = {
    ...loadWorldTemplates()[0].config,
    priorContext: "旧城来信",
  };
  const novel = createNovel(config);
  novel.chapterGoal = "这是下一章的新要求";
  novel.chapters = [
    { id: "start", title: "序章", text: "她来到旧城。" },
    { id: "a", title: "初遇", text: "她在门前停下。" },
    { id: "b", title: "交锋", text: "她把钥匙交给他。" },
    { id: "c", title: "开门", text: "他掏出钥匙。" },
    { id: "end", title: "尾声", text: "她离开了旧城。" },
  ];
  novel.background = createBackground(config, novel, "导入的背景摘要");
  novel.checkpoint = { throughChapterId: "start", summary: "归档剧情摘要" };
  const prompt = JSON.parse(rewritePrompt(config, novel, "b", "  缩短对白  "));
  assert.deepEqual(prompt.previousChapters, [
    { chapter: 1, title: "序章", text: "她来到旧城。" },
    { chapter: 2, title: "初遇", text: "她在门前停下。" },
  ]);
  assert.deepEqual(prompt.targetChapter, {
    chapter: 3,
    title: "交锋",
    text: "她把钥匙交给他。",
  });
  assert.deepEqual(prompt.followingChapters, [
    { chapter: 4, title: "开门", text: "他掏出钥匙。" },
  ]);
  assert.equal(prompt.task.requirements, "缩短对白");
  assert.equal(prompt.world.priorContext, undefined);
  assert.deepEqual(prompt.world.characters, config.characters);
  assert.equal(prompt.archivedChapters, undefined);
  assert.equal(prompt.importedBackground, undefined);
  assert.equal(JSON.stringify(prompt).includes(novel.chapterGoal), false);
  assert.deepEqual(
    JSON.parse(rewritePrompt(config, novel, "start", "")).previousChapters,
    [],
  );
  assert.deepEqual(
    JSON.parse(rewritePrompt(config, novel, "end", "")).followingChapters,
    [],
  );
});

test("compact rewrite sends world settings and requirements with only the selected text or target chapter prose", () => {
  const config = {
    ...loadWorldTemplates()[0].config,
    priorContext: "世界前情不发送",
  };
  const novel = createNovel(config);
  const selected = "她收起钥匙。";
  const before = "本章未选中的开头。";
  novel.chapters = [
    { id: "a", title: "更早", text: "更早的正文" },
    { id: "b", title: "上一章", text: "她推开了门。" },
    { id: "c", title: "本章", text: `${before}${selected}未选中的结尾。` },
    { id: "d", title: "下一章", text: "后续的正文" },
  ];
  novel.background = createBackground(config, novel, "导入的背景摘要");
  novel.checkpoint = { throughChapterId: "a", summary: "归档剧情摘要" };
  novel.outline = "单独编辑的小说大纲";

  const prompt = JSON.parse(
    rewritePrompt(
      config,
      novel,
      "c",
      "  收紧节奏  ",
      { start: before.length, end: before.length + selected.length },
      true,
    ),
  );
  assert.deepEqual(prompt, {
    world: {
      title: config.title,
      background: config.background,
      scene: config.scene,
      rules: config.rules,
      facts: config.facts,
      storyGoal: config.storyGoal,
      characters: config.characters,
    },
    targetChapter: { selection: { text: selected } },
    task: {
      maxCharacters: 8000 - (novel.chapters[2].text.length - selected.length),
      requirements: "收紧节奏",
    },
  });

  novel.chapters[1].text = "长".repeat(maxNovelPromptLength);
  const compactChapter = JSON.parse(
    rewritePrompt(config, novel, "c", "收紧节奏", undefined, true),
  );
  assert.deepEqual(compactChapter, {
    ...prompt,
    targetChapter: { text: novel.chapters[2].text },
    task: { ...prompt.task, maxCharacters: 8000 },
  });

  novel.chapters[2].text = "长".repeat(maxNovelPromptLength);
  assert.throws(
    () => rewritePrompt(config, novel, "c", "", undefined, true),
    /精简上下文仍然过长/,
  );
});

test("whole chapter rewrite asks for compact mode when preceding chapters exceed the request limit", () => {
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  novel.chapters = [
    { id: "a", title: "较早章节", text: "早".repeat(maxNovelPromptLength) },
    { id: "b", title: "前一章", text: "门打开了。" },
    { id: "c", title: "本章", text: "她离开了。" },
    { id: "d", title: "后一章", text: "她回到家。" },
    { id: "e", title: "较晚章节", text: "晚".repeat(maxNovelPromptLength) },
  ];
  assert.throws(
    () => rewritePrompt(config, novel, "c", ""),
    /开启「精简上下文」/,
  );
  novel.chapters[0].text = "旧事。";
  const prompt = JSON.parse(rewritePrompt(config, novel, "c", ""));
  assert.equal(prompt.previousChapters.length, 2);
  assert.deepEqual(prompt.followingChapters, [
    { chapter: 4, title: "后一章", text: "她回到家。" },
  ]);
});

test("a draft passage rewrite uses the edited snapshot and leaves the saved chapter intact", () => {
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  const stable = { id: "a", title: "原题", text: "原文。" };
  novel.chapters = [stable];
  const draft = {
    ...stable,
    title: "新标题",
    text: "手动改的开头。\r\n\r\n她敲门。\r\n门开了。\r\n保留的结尾。",
  };
  const workingNovel = replaceChapter(novel, draft);
  const displayed = draft.text.replaceAll("\r\n", "\n");
  const range = {
    start: textareaSourceOffset(draft.text, displayed.indexOf("她敲门")),
    end: textareaSourceOffset(
      draft.text,
      displayed.indexOf("门开了。") + "门开了。".length,
    ),
  };
  const prompt = JSON.parse(
    rewritePrompt(config, workingNovel, draft.id, "缩短", range),
  );
  assert.deepEqual(prompt.targetChapter, {
    chapter: 1,
    title: "新标题",
    selection: {
      before: "手动改的开头。\r\n\r\n",
      text: "她敲门。\r\n门开了。",
      after: "\r\n保留的结尾。",
    },
  });
  const updated = replaceChapterText(workingNovel, draft.id, "她推门。", range);
  assert.equal(
    updated.chapters[0].text,
    "手动改的开头。\r\n\r\n她推门。\r\n保留的结尾。",
  );
  assert.deepEqual(novel.chapters[0], {
    id: "a",
    title: "原题",
    text: "原文。",
  });
});

test("adopting a rewrite changes only its chapter body and future context and export use it", () => {
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  novel.chapters = [
    { id: "one", title: "第一章", text: "旧稿" },
    { id: "two", title: "第二章", text: "后文" },
  ];
  const updated = replaceChapterText(novel, "one", "新稿");
  assert.deepEqual(updated.chapters, [
    { id: "one", title: "第一章", text: "新稿" },
    novel.chapters[1],
  ]);
  assert.equal(novel.chapters[0].text, "旧稿");
  assert.equal(
    JSON.parse(chapterPrompt(config, updated)).completedChapters[0].text,
    "新稿",
  );
  assert.equal(exportNovel(updated, "md").includes("旧稿"), false);
});

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
  novel.words = "1000";
  const prompt = JSON.parse(chapterPrompt(config, novel));
  assert.equal(prompt.world.characters[0].privateInfo, "尚未揭晓的身份");
  assert.equal(prompt.world.priorContext, config.priorContext);
  assert.deepEqual(
    prompt.completedChapters,
    novel.chapters.map(({ title, text }) => ({ title, text })),
  );
  assert.equal(prompt.task.chapter, 3);
  assert.equal(prompt.task.requirements, novel.chapterGoal);
  assert.equal(prompt.task.targetWords, 1000);
  assert.equal(prompt.task.maxCharacters, 8000);
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
