import assert from "node:assert/strict";
import { test } from "node:test";
import { loadWorldTemplates } from "@/lib/group-chat/world-templates";
import { chapterPrompt, createNovel, exportNovel, novelRequest } from "./model";

test("writer receives world secrets and edited chapters in order, with the next chapter requirements", () => {
  const config = structuredClone(loadWorldTemplates()[0].config);
  config.characters[0].privateInfo = "尚未揭晓的身份";
  const novel = createNovel(config);
  novel.chapters = [
    { id: "one", title: "第1章 初见", text: "已编辑的第一章。" },
    { id: "two", title: "第2章 风起", text: "第二章正文。" },
  ];
  novel.chapterGoal = "揭示线索，但保留身份秘密";
  const prompt = JSON.parse(chapterPrompt(config, novel));
  assert.equal(prompt.world.characters[0].privateInfo, "尚未揭晓的身份");
  assert.deepEqual(
    prompt.completedChapters,
    novel.chapters.map(({ title, text }) => ({ title, text })),
  );
  assert.equal(prompt.task.chapter, 3);
  assert.equal(prompt.task.requirements, novel.chapterGoal);
  assert.equal(prompt.task.targetWords, 2000);
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

test("chapter requests use one isolated writer session with tools and historical recall disabled", () => {
  const request = novelRequest("room-one", "设定与完整正文");
  const other = novelRequest("room-two", "另一部小说");
  assert.notEqual(request.threadId, other.threadId);
  assert.equal(request.threadId, novelRequest("room-one", "重试").threadId);
  assert.deepEqual(request.activeTools, []);
  assert.equal(request.toolChoice, "none");
  assert.equal(request.maxSteps, 1);
  assert.equal(request.memory.options.lastMessages, 0);
});
