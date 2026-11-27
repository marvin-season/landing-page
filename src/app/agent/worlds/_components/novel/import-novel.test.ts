import assert from "node:assert/strict";
import { test } from "node:test";
import { loadWorldTemplates } from "@/lib/group-chat/world-templates";
import {
  applyServerExport,
  createImportedNovel,
  parseNovelFile,
} from "./import-novel";
import { chapterPrompt, createNovel, exportNovel } from "./model";

test("legacy Markdown exports keep headings inside the same chapter on import", () => {
  const longSection = "中".repeat(8100);
  const chapters = [
    {
      title: "序",
      text: [
        "开头。",
        "## 章内小节",
        "<!-- novel-chapter -->",
        longSection,
        "```",
      ].join("\n\n"),
    },
    { title: "后记", text: "结尾。" },
  ];
  const legacyFile = [
    "<!-- novel-manuscript -->",
    "# 旧港",
    "## 序",
    "<!-- novel-chapter -->",
    chapters[0].text.replace(
      "<!-- novel-chapter -->",
      "\\<!-- novel-chapter -->",
    ),
    "## 后记",
    "<!-- novel-chapter -->",
    "结尾。",
  ].join("\n\n");
  assert.deepEqual(parseNovelFile(legacyFile, "小说.md").chapters, chapters);
});

test("server sync retains local chapter identity and brief after an inserted chapter", () => {
  const novel = createNovel(loadWorldTemplates()[0].config);
  novel.title = "旧港";
  novel.chapters = [
    { id: "existing", title: "港口", text: "原有正文。", brief: "原要求" },
  ];
  const next = applyServerExport(
    novel,
    "旧港\n\n第1章\n\n新开篇。\n\n第2章 港口\n\n原有正文。",
    "旧港.txt",
  );
  assert.deepEqual(next.chapters[1], novel.chapters[0]);
});

test("TXT exports import as editable chapters", () => {
  const novel = createNovel(loadWorldTemplates()[0].config);
  novel.title = "旧港";
  novel.chapters = [
    { id: "a", title: "第一章 港口", text: "她来到旧港。\n\n灯塔熄灭了。" },
    { id: "b", title: "第二章 提灯", text: "晚归的人提着灯。" },
  ];
  const source = `\uFEFF${exportNovel(novel).replaceAll("\n", "\r\n")}`;
  const imported = parseNovelFile(source, "旧港.txt");
  assert.equal(imported.title, novel.title);
  assert.deepEqual(
    imported.chapters,
    novel.chapters.map(({ title, text }) => ({ title, text })),
  );
});

test("Markdown headings in code blocks do not start new chapters", () => {
  const prose = "她读起了笔记。\n\n~~~md\n## 不是章节\n~~~";
  const imported = parseNovelFile(
    `# 旧港\n\n## 序章\n\n${prose}\n\n## 新港\n\n正文`,
    "novel.md",
  );
  assert.deepEqual(imported.chapters, [
    { title: "序章", text: prose },
    { title: "新港", text: "正文" },
  ]);
});

test("TXT splits on standalone numbered headings and keeps mentions in prose", () => {
  const imported = parseNovelFile(
    "第1章\n这里提到了第2章。\n第2章里也写过这件事。\n　第 二 章：夜雨\n第二段。\n第３章\n第三段。",
    "旧港.txt",
  );
  assert.deepEqual(imported.chapters, [
    { title: "第1章", text: "这里提到了第2章。\n第2章里也写过这件事。" },
    { title: "第 二 章：夜雨", text: "第二段。" },
    { title: "第３章", text: "第三段。" },
  ]);
});

test("TXT export numbers custom titles so the same chapter boundaries survive re-import", () => {
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  novel.title = "旧港";
  novel.chapters = [
    { id: "a", title: "序章", text: "灯塔熄灭了。" },
    { id: "b", title: "第二章：夜雨", text: "雨下了一夜。" },
  ];
  const source = exportNovel(novel);
  const imported = parseNovelFile(source, "旧港.txt");
  assert.deepEqual(imported.chapters, [
    { title: "第1章 序章", text: "灯塔熄灭了。" },
    { title: "第二章：夜雨", text: "雨下了一夜。" },
  ]);
  assert.equal(exportNovel(createImportedNovel(config, imported)), source);
});

test("TXT keeps the book title out of the chapters when the filename differs", () => {
  const imported = parseNovelFile(
    "书内标题\n\n第1章\n第一段。\n\n第2章\n第二段。",
    "下载文件 (1).txt",
  );
  assert.deepEqual(imported, {
    title: "书内标题",
    chapters: [
      { title: "第1章", text: "第一段。" },
      { title: "第2章", text: "第二段。" },
    ],
  });
});

test("TXT round-trips long numbered chapters and heading-shaped prose even after renaming", () => {
  const novel = createNovel(loadWorldTemplates()[0].config);
  novel.title = "第8章";
  novel.chapters = [
    {
      id: "a",
      title: "第1章",
      text: `档案开头。\n\n第9章：抄录的标题\n\n\\第10章\n\n${"正文。".repeat(3000)}`,
    },
    { id: "b", title: "第2章", text: "第二段。" },
  ];
  assert.deepEqual(parseNovelFile(exportNovel(novel), "副本.txt"), {
    title: novel.title,
    chapters: novel.chapters.map(({ title, text }) => ({ title, text })),
  });
});

test("long unheaded text is split without losing prose or splitting a surrogate pair", () => {
  const prose = `${"字".repeat(7999)}𠮷${"字".repeat(8000)}`;
  const imported = parseNovelFile(prose, "旧港.txt");
  assert.deepEqual(
    imported.chapters.map(({ text }) => text.length),
    [7999, 8000, 2],
  );
  assert.equal(imported.chapters.map(({ text }) => text).join(""), prose);
});

test("the imported book starts fresh and continuation contains only its chapters", () => {
  const config = loadWorldTemplates()[0].config;
  const imported = parseNovelFile("新的一段正文。", "旧港.txt");
  const next = createImportedNovel(config, imported);
  assert.equal(next.title, "旧港");
  assert.equal(next.outline, config.storyGoal);
  assert.equal(next.chapterGoal, "");
  assert.equal(next.words, "1000");
  const prompt = JSON.parse(chapterPrompt(config, next));
  assert.deepEqual(prompt.completedChapters, [
    { title: "第1章", text: "新的一段正文。" },
  ]);
  assert.equal(prompt.task.chapter, 2);
  assert.equal(prompt.archivedChapters, undefined);
  assert.equal(prompt.importedBackground, undefined);
});

test("server export replaces chapters and keeps writing settings", () => {
  const novel = createNovel(loadWorldTemplates()[0].config);
  novel.title = "旧港";
  novel.style = "第一人称";
  novel.chapters = [{ id: "a", title: "第1章", text: "灯。" }];
  const same = applyServerExport(novel, exportNovel(novel), "旧港.txt");
  assert.equal(same.chapters[0], novel.chapters[0]);
  assert.equal(same.style, "第一人称");
  const changed = applyServerExport(
    novel,
    "旧港\n\n第1章\n\n另一盏灯。\n",
    "旧港.txt",
  );
  assert.notEqual(changed.chapters[0].id, "a");
  assert.equal(changed.chapters[0].text, "另一盏灯。");
  assert.equal(changed.style, "第一人称");
  assert.equal(changed.outline, novel.outline);
});

test("rejects empty manuscripts and exported background summaries", () => {
  assert.throws(() => parseNovelFile(" \n", "空.txt"), /为空/);
  assert.throws(
    () => parseNovelFile("# 书名\n\n## 第一章", "空.md"),
    /没有正文/,
  );
  assert.throws(
    () =>
      parseNovelFile(
        "# 背景\n\n正文\n\n<!-- novel-background\n{}\n-->",
        "总结.md",
      ),
    /背景总结/,
  );
});
