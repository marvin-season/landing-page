import assert from "node:assert/strict";
import { test } from "node:test";
import { loadWorldTemplates } from "@/lib/group-chat/world-templates";
import {
  forkFitsBudget,
  forkSummaryPrompt,
  prepareNovelFork,
} from "./fork-model";
import {
  chapterPrompt,
  createBackground,
  createNovel,
  exportNovel,
  invalidateEditedCheckpoint,
  maxNovelPromptLength,
  replaceChapterText,
  rewritePrompt,
} from "./model";

test("a fork retains the manuscript but sends the summary and only the last chapter for continuation", () => {
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  novel.chapters = [
    { id: "one", title: "第1章", text: "早期相遇".repeat(900) },
    { id: "two", title: "第2章", text: "最新一幕" },
  ];
  novel.background = createBackground(config, novel, "之前有个约定。");
  const summaryInput = JSON.parse(forkSummaryPrompt(config, novel));
  assert.deepEqual(summaryInput.completedChapters, [
    { title: "第1章", text: novel.chapters[0].text },
  ]);
  assert.equal(summaryInput.importedBackground.summary, "之前有个约定。");
  const fork = prepareNovelFork(config, novel, "  他们带着旧约在车站相遇。  ");
  assert.ok(fork);
  assert.ok(forkFitsBudget(fork.length, chapterPrompt(config, novel).length));
  const prompt = JSON.parse(chapterPrompt(fork.config, fork.novel));
  assert.equal(prompt.importedBackground, undefined);
  assert.deepEqual(prompt.archivedChapters, {
    throughChapter: 1,
    summary: "他们带着旧约在车站相遇。",
  });
  assert.deepEqual(prompt.completedChapters, [
    { title: "第2章", text: "最新一幕" },
  ]);
  assert.equal(prompt.task.chapter, 3);
  assert.equal(exportNovel(fork.novel, "md"), exportNovel(novel, "md"));
  assert.equal(novel.checkpoint, undefined);
  assert.equal(
    forkFitsBudget(maxNovelPromptLength + 1, maxNovelPromptLength + 10),
    false,
  );
  assert.equal(forkFitsBudget(fork.length, fork.length), false);
});

test("editing archived prose restores full context while recent edits and a subsequent fork keep the checkpoint", () => {
  const config = loadWorldTemplates()[0].config;
  const novel = createNovel(config);
  novel.chapters = [
    { id: "a", title: "开篇", text: "她来到城里。" },
    { id: "b", title: "续篇", text: "她找到了旧钥匙。" },
  ];
  const fork = prepareNovelFork(config, novel, "她来到城里。");
  assert.ok(fork);
  const continuation = {
    ...fork.novel,
    chapters: [
      ...fork.novel.chapters,
      { id: "c", title: "后来", text: "她打开旧门。" },
    ],
  };
  const renew = JSON.parse(forkSummaryPrompt(config, continuation));
  assert.equal(renew.archivedChapters.summary, "她来到城里。");
  assert.equal(renew.completedChapters[0].text, "她找到了旧钥匙。");
  assert.equal(renew.completedChapters.length, 1);
  const laterEdit = JSON.parse(rewritePrompt(config, continuation, "c", ""));
  assert.equal(laterEdit.archivedChapters, undefined);
  assert.deepEqual(
    laterEdit.previousChapters.map(({ text }: { text: string }) => text),
    ["她来到城里。", "她找到了旧钥匙。"],
  );
  const earlyEdit = JSON.parse(rewritePrompt(config, continuation, "b", ""));
  assert.equal(earlyEdit.archivedChapters, undefined);
  assert.equal(earlyEdit.previousChapters[0].text, "她来到城里。");
  const recent = invalidateEditedCheckpoint(
    continuation,
    replaceChapterText(continuation, "c", "她关上旧门。"),
  );
  assert.deepEqual(recent.checkpoint, continuation.checkpoint);
  const stale = invalidateEditedCheckpoint(
    continuation,
    replaceChapterText(continuation, "a", "她离开城里。"),
  );
  const current = JSON.parse(chapterPrompt(config, stale));
  assert.equal(current.archivedChapters, undefined);
  assert.equal(current.completedChapters[0].text, "她离开城里。");
});
