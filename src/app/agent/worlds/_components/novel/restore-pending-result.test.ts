import assert from "node:assert/strict";
import { test } from "node:test";
import type { WorldConfig } from "@/lib/group-chat/model";
import { createNovel } from "./model";
import { restorePendingResult } from "./restore-pending-result";

const config = {
  title: "测试世界",
  background: "背景",
  scene: "场景",
  rules: "规则",
  facts: "事实",
  storyGoal: "目标",
  narration: false,
  maxTurns: 3,
  characters: [
    {
      id: "a",
      name: "甲",
      identity: "身份",
      personality: "性格",
      goal: "目标",
      publicInfo: "公开",
      privateInfo: "私有",
      style: "风格",
      model: "cursor/auto",
      enabled: true,
    },
    {
      id: "b",
      name: "乙",
      identity: "身份",
      personality: "性格",
      goal: "目标",
      publicInfo: "公开",
      privateInfo: "私有",
      style: "风格",
      model: "cursor/auto",
      enabled: true,
    },
  ],
} as WorldConfig;

test("selection pending restores only when the chapter text still matches", () => {
  const novel = createNovel(config);
  novel.chapters = [
    { id: "c1", title: "第1章", text: "abcdefgh" },
    { id: "c2", title: "第2章", text: "后面" },
  ];
  const pending = {
    kind: "selection" as const,
    chapterId: "c1",
    chapterTitle: "第1章",
    range: { start: 2, end: 8 },
    baseText: "abcdefgh",
    preview: "替换",
    version: 1,
  };
  const restored = restorePendingResult(pending, novel, config);
  assert.equal(restored?.preview, "替换");
  assert.equal(restored?.run.task, "rewrite");
  assert.equal(
    restorePendingResult({ ...pending, baseText: "changed" }, novel, config),
    null,
  );
});
