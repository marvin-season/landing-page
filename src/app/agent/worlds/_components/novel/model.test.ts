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
  formatChapterLength,
  insertChapterBefore,
  insertChapterPrompt,
  maxBackgroundFileBytes,
  maxChapterLength,
  maxNovelPromptLength,
  novelRequest,
  parseBackgroundFile,
  rememberChapterBrief,
  renameChapter,
  replaceChapter,
  replaceChapterText,
  rewriteInstructions,
  rewritePrompt,
  summaryPrompt,
  writerInstructions,
} from "./model";

function legacyBackgroundFixture({
  summary,
  ...metadata
}: ReturnType<typeof createBackground>) {
  const source = JSON.stringify(metadata, null, 2)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e");
  return `# ${metadata.source.title} · 背景总结\n\n${summary}\n\n<!-- novel-background\n${source}\n-->\n`;
}

test("continuation sends only saved prose through the selected chapter when there is no archive", () => {
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  novel.chapters = [
    { id: "first", title: "第1章", text: "开篇。" },
    { id: "selected", title: "第2章", text: "从这里继续。" },
    { id: "later", title: "第3章", text: "已有后文。" },
  ];
  const through = continuationIndex(novel, "selected");
  assert.equal(through, 2);
  const prompt = JSON.parse(chapterPrompt(config, novel, through));
  assert.equal(prompt.task.chapter, 3);
  assert.deepEqual(prompt.completedChapters, [
    { title: "第1章", text: "开篇。" },
    { title: "第2章", text: "从这里继续。" },
  ]);
  assert.equal(prompt.archivedChapters, undefined);
});

test("continuation uses only an archive that ends at or before the selected chapter", () => {
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  novel.chapters = [
    { id: "first", title: "第1章", text: "归档的开篇。" },
    { id: "archived", title: "第2章", text: "归档的结尾。" },
    { id: "new", title: "第3章", text: "压缩后写的正文。" },
    { id: "selected", title: "第4章", text: "从这里继续。" },
    { id: "later", title: "第5章", text: "未选中的后文。" },
  ];
  novel.checkpoint = { throughChapterId: "archived", summary: "既有摘要。" };
  for (const through of [0, 1, 2, 4]) {
    const prompt = JSON.parse(chapterPrompt(config, novel, through));
    assert.equal(prompt.task.chapter, through + 1);
    assert.deepEqual(
      prompt.archivedChapters,
      through < 2 ? undefined : { throughChapter: 2, summary: "既有摘要。" },
    );
    assert.deepEqual(
      prompt.completedChapters,
      novel.chapters
        .slice(through < 2 ? 0 : 2, through)
        .map(({ title, text }) => ({ title, text })),
    );
    assert.deepEqual(prompt.followingChapter, {
      title: novel.chapters[through].title,
      opening: novel.chapters[through].text,
    });
  }
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

test("a saved continuation keeps the requirement sent for that draft, and later prompts omit it", () => {
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  novel.chapters = [{ id: "a", title: "第1章", text: "前文。" }];
  const draft = rememberChapterBrief(
    { id: "b", title: "第2章", text: "后文。" },
    "  推进感情线  ",
  );
  const saved = applyChapterContinuation(novel, draft, "a");
  assert.equal(saved?.chapters[1].brief, "推进感情线");
  assert.equal(
    JSON.parse(chapterPrompt(config, saved ?? novel)).completedChapters[1]
      .brief,
    undefined,
  );
  assert.equal(rememberChapterBrief(draft, "  ").brief, undefined);
  assert.equal(exportNovel(saved ?? novel).includes("推进感情线"), false);
});

test("renaming a chapter from the reading page keeps custom titles and restores the default number", () => {
  const novel = createNovel(loadWorldTemplates()[0].config);
  novel.words = "4000";
  novel.chapters = [
    { id: "a", title: "第1章", text: "甲" },
    { id: "b", title: "第2章", text: "乙" },
  ];
  assert.equal(
    formatChapterLength(4128, novel.words),
    "本章 4,128 / 目标 4,000 字",
  );
  assert.equal(
    formatChapterLength(2000, novel.words),
    "本章 2,000 / 目标 4,000 字 · 偏短",
  );
  assert.equal(formatChapterLength(12, "很多"), "本章 12 字");

  const named = renameChapter(novel, "b", "  花园夜谈 \n");
  assert.ok(named);
  assert.notEqual(named, novel);
  assert.equal(named.chapters[1].title, "花园夜谈");
  assert.equal(named.chapters[1].text, "乙");
  assert.equal(named.chapters[0].title, "第1章");
  assert.equal(renameChapter(named, "b", "   ")?.chapters[1].title, "第2章");
  assert.equal(renameChapter(novel, "a", "第1章"), novel);
  assert.equal(renameChapter(novel, "missing", "名字"), null);
  assert.equal(
    renameChapter(novel, "b", "名".repeat(90))?.chapters[1].title.length,
    80,
  );
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
  const { instructions, ...task } = prompt.task;
  assert.match(instructions, /在所选两章之间补写一章/);
  assert.doesNotMatch(instructions, /completedChapters/);
  assert.deepEqual(task, {
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
  assert.match(exportNovel(updated), /第5章\n\n旅途\n\n第6章\n\n原文 5/);
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

test("opening insertion sends prior context and only the original opening excerpt", () => {
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
  const { instructions, ...task } = opening.task;
  assert.match(instructions, /创作新的开篇/);
  assert.doesNotMatch(
    instructions,
    /previousChapters|followingChapters|completedChapters/,
  );
  assert.deepEqual(
    { ...opening, task },
    {
      world: { ...config, priorContext: "世界前置剧情" },
      importedBackground: novel.background,
      followingChapters: [{ title: "旧开篇", text: "早".repeat(1200) }],
      novel: { title: novel.title, style: novel.style, outline: novel.outline },
      task: {
        mode: "insert",
        chapter: 1,
        targetWords: 4000,
        maxCharacters: 8000,
        requirements: "从下雨的早晨写起",
      },
    },
  );
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
  assert.deepEqual(prompt.completedChapters, [
    { title: "上章", text: "门外很安静。" },
  ]);
  assert.equal(prompt.followingChapters, undefined);
  assert.deepEqual(prompt.world.characters, config.characters);
  assert.equal(prompt.novel.style, novel.style);
  assert.match(prompt.task.instructions, /selection\.text 的完整替换正文/);
  assert.match(prompt.task.instructions, /与两侧未选正文自然衔接/);
  assert.doesNotMatch(
    prompt.task.instructions,
    /followingChapters|targetChapter\.text|endingMaxCharacters|JSON/,
  );
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

test("whole chapter rewrite sends the archive, uncovered preceding prose and the complete target", () => {
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
  assert.deepEqual(prompt.completedChapters, [
    { title: "初遇", text: "她在门前停下。" },
  ]);
  assert.deepEqual(prompt.targetChapter, {
    chapter: 3,
    title: "交锋",
    text: "她把钥匙交给他。",
  });
  assert.equal(prompt.followingChapters, undefined);
  assert.equal(prompt.task.requirements, "缩短对白");
  assert.equal(prompt.task.maxCharacters, maxChapterLength);
  assert.match(prompt.task.instructions, /targetChapter\.text 的完整替换正文/);
  assert.doesNotMatch(
    prompt.task.instructions,
    /selection\.|endingMaxCharacters|JSON/,
  );
  assert.deepEqual(prompt.world, config);
  assert.deepEqual(prompt.novel, {
    title: novel.title,
    style: novel.style,
    outline: novel.outline,
  });
  assert.deepEqual(prompt.archivedChapters, {
    throughChapter: 1,
    summary: "归档剧情摘要",
  });
  assert.equal(prompt.importedBackground, undefined);
  assert.equal(JSON.stringify(prompt).includes(novel.chapterGoal), false);
  const earlier = JSON.parse(rewritePrompt(config, novel, "start", ""));
  assert.deepEqual(earlier.completedChapters, []);
  assert.equal(earlier.archivedChapters, undefined);
  assert.equal(earlier.task.instructions, prompt.task.instructions);
  const updated = replaceChapterText(novel, "b", "她递出钥匙。");
  assert.deepEqual(updated.chapters, [
    ...novel.chapters.slice(0, 2),
    { ...novel.chapters[2], text: "她递出钥匙。" },
    ...novel.chapters.slice(3),
  ]);
});

test("compact passage rewrite skips all other chapters and retains the target chapter", () => {
  const config = {
    ...loadWorldTemplates()[0].config,
    priorContext: "世界预设前情",
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

  const range = { start: before.length, end: before.length + selected.length };
  const normal = JSON.parse(
    rewritePrompt(config, novel, "c", "收紧节奏", range),
  );
  const prompt = JSON.parse(
    rewritePrompt(config, novel, "c", "  收紧节奏  ", range, true),
  );
  assert.deepEqual(normal.archivedChapters, {
    throughChapter: 1,
    summary: "归档剧情摘要",
  });
  assert.equal(prompt.archivedChapters, undefined);
  assert.equal(prompt.importedBackground, undefined);
  assert.equal(prompt.completedChapters, undefined);
  assert.deepEqual(normal.completedChapters, [
    { title: "上一章", text: "她推开了门。" },
  ]);
  assert.deepEqual(prompt.targetChapter, {
    chapter: 3,
    title: "本章",
    selection: { before, text: selected, after: "未选中的结尾。" },
  });
  assert.deepEqual(prompt.targetChapter, normal.targetChapter);
  assert.equal(prompt.task.instructions, normal.task.instructions);
  assert.match(prompt.task.instructions, /人称、时态、叙述视角和起止边界/);
  assert.equal(prompt.task.requirements, "收紧节奏");
  assert.equal(
    prompt.task.maxCharacters,
    8000 - (novel.chapters[2].text.length - selected.length),
  );
  assert.deepEqual(prompt.world, config);
  assert.deepEqual(prompt.novel, {
    title: novel.title,
    style: novel.style,
    outline: novel.outline,
  });

  const uncompressed = JSON.parse(
    rewritePrompt(
      config,
      { ...novel, checkpoint: undefined },
      "c",
      "",
      range,
      true,
    ),
  );
  assert.equal(uncompressed.completedChapters, undefined);
  assert.equal(uncompressed.importedBackground, undefined);
  assert.deepEqual(uncompressed.targetChapter, prompt.targetChapter);
});

test("compact whole chapter rewrite keeps only the target and presets", () => {
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  novel.chapters = [
    { id: "a", title: "更早", text: "旧事。" },
    { id: "b", title: "上一章", text: "长".repeat(maxNovelPromptLength) },
    { id: "c", title: "本章", text: "她收起钥匙。" },
  ];
  novel.checkpoint = { throughChapterId: "a", summary: "归档剧情摘要" };
  const compactChapter = JSON.parse(
    rewritePrompt(config, novel, "c", "收紧节奏", undefined, true),
  );
  assert.match(compactChapter.task.instructions, /targetChapter\.text/);
  assert.equal(compactChapter.archivedChapters, undefined);
  assert.equal(compactChapter.completedChapters, undefined);
  assert.deepEqual(compactChapter.targetChapter, {
    chapter: 3,
    title: "本章",
    text: "她收起钥匙。",
  });

  novel.chapters[2].text = "长".repeat(maxNovelPromptLength);
  assert.throws(
    () => rewritePrompt(config, novel, "c", "", undefined, true),
    /精简上下文仍然过长/,
  );
});

test("passage rewrites at either chapter boundary use only preceding chapters as prose context", () => {
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  const target = "第一句。最后一句。";
  novel.chapters = [
    { id: "prev", title: "上章", text: `${"旧".repeat(1000)}上一章结尾。` },
    { id: "target", title: "本章", text: target },
    { id: "next", title: "下章", text: `下一章开头。${"后".repeat(1000)}` },
  ];
  const fromStart = { start: 0, end: "第一句。".length };
  const fromEnd = { start: fromStart.end, end: target.length };
  const opening = JSON.parse(
    rewritePrompt(config, novel, "target", "", fromStart),
  );
  const ending = JSON.parse(
    rewritePrompt(config, novel, "target", "", fromEnd),
  );
  assert.deepEqual(opening.completedChapters, [
    { title: "上章", text: novel.chapters[0].text },
  ]);
  assert.equal(opening.followingChapters, undefined);
  assert.deepEqual(ending.completedChapters, opening.completedChapters);
  assert.equal(ending.followingChapters, undefined);
  const compact = JSON.parse(
    rewritePrompt(config, novel, "target", "", fromStart, true),
  );
  assert.equal(compact.completedChapters, undefined);
  assert.equal(compact.task.instructions, opening.task.instructions);
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
  assert.equal(prompt.completedChapters.length, 2);
  assert.equal(prompt.followingChapters, undefined);
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
  assert.equal(exportNovel(updated).includes("旧稿"), false);
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
  assert.match(prompt.task.instructions, /承接目标章之前的剧情/);
  assert.doesNotMatch(
    prompt.task.instructions,
    /archivedChapters|completedChapters|previousChapters|followingChapters|selection|JSON/,
  );
  assert.match(writerInstructions, /task\.instructions/);
  assert.doesNotMatch(
    rewriteInstructions,
    /selection|ending|opening|stitch|merge|只输出/,
  );
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
  const markdown = legacyBackgroundFixture(background);
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
  assert.equal(exportNovel(next).includes(background.summary), false);
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
        parseBackgroundFile(
          legacyBackgroundFixture(invalid as typeof background),
        ),
      /格式或版本/,
    );
});

test("edited legacy Markdown imports with Windows line endings and preserves metadata", () => {
  const config = structuredClone(loadWorldTemplates()[0].config);
  config.characters[0].privateInfo = "秘密包含 --> 和 <tag>";
  const novel = createNovel(config);
  novel.chapters = [{ id: "one", title: "第一章", text: "正文" }];
  const background = createBackground(config, novel, "## 人物状态\n原总结");
  const text = legacyBackgroundFixture(background).replace(
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
    exportNovel(novel),
    "书名\n\n第1章\n\n正文一\n\n第2章\n\n正文二\n",
  );
});

test("chapter requests identify the room and task without sending model credentials or runtime overrides", () => {
  assert.deepEqual(novelRequest("room-one", "设定与完整正文"), {
    roomId: "room-one",
    prompt: "设定与完整正文",
    task: "chapter",
  });
});

test("selected writing skills inject into chapter and rewrite prompts but not summaries", () => {
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  novel.skills = ["scene-driven", "chapter-hook", "missing", "dialogue-first"];
  novel.chapters = [{ id: "one", title: "第1章", text: "正文。" }];
  const chapter = JSON.parse(chapterPrompt(config, novel));
  assert.deepEqual(
    chapter.skills.map(({ id }: { id: string }) => id),
    ["scene-driven", "chapter-hook", "dialogue-first"],
  );
  assert.match(writerInstructions, /若提供 skills/);
  const rewrite = JSON.parse(rewritePrompt(config, novel, "one", "收紧节奏"));
  assert.deepEqual(
    rewrite.skills.map(({ id }: { id: string }) => id),
    ["scene-driven", "dialogue-first"],
  );
  const insert = JSON.parse(
    insertChapterPrompt(config, novel, "one", "补一段雨夜开场"),
  );
  assert.deepEqual(
    insert.skills.map(({ id }: { id: string }) => id),
    ["scene-driven", "chapter-hook", "dialogue-first"],
  );
  const summary = JSON.parse(summaryPrompt(config, novel));
  assert.equal(summary.skills, undefined);
  assert.equal(JSON.stringify(summary).includes("scene-driven"), false);
});
