import assert from "node:assert/strict";
import { test } from "node:test";
import type { WorldConfig } from "@/lib/group-chat/model";
import { createNovel } from "./model";
import { createPendingResultBackup } from "./pending-result-backup";
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

test("a pending AI split restores only if both parts still match the original chapter", () => {
  const novel = createNovel(config);
  novel.chapters = [{ id: "c1", title: "原章", text: "上半章。\n\n下半章。" }];
  const pending = {
    kind: "plot" as const,
    mode: "split" as const,
    ids: ["c1"],
    requirements: "",
    version: 1,
    draft: {
      mode: "split" as const,
      chapters: [
        { id: "c1", title: "原章", text: "上半章。\n\n" },
        { id: "new", title: "第2章", text: "下半章。" },
      ],
    },
  };
  const storage = new Map<string, string>();
  const backup = createPendingResultBackup(
    "split-room",
    () => ({
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    }),
    () => {},
  );
  backup.write(pending);
  const recovered = backup.read();
  assert.deepEqual(recovered, pending);
  assert.ok(recovered);
  assert.deepEqual(
    restorePendingResult(recovered, novel, config)?.plotDraft,
    pending.draft,
  );
  novel.chapters[0].text = "已修改的原章。";
  assert.equal(restorePendingResult(recovered, novel, config), null);
});

test("a pending merge cannot restore after another tab saves the manuscript", () => {
  const novel = createNovel(config);
  novel.chapters = [
    { id: "a", title: "第1章", text: "第一章正文" },
    { id: "b", title: "第2章", text: "第二章正文" },
  ];
  const pending = {
    kind: "plot" as const,
    mode: "merge" as const,
    ids: ["a", "b"],
    requirements: "",
    version: 1,
    storageVersion: "before-edit",
    draft: {
      mode: "merge" as const,
      chapters: [{ id: "merged", title: "第1章", text: "合并草稿" }],
    },
  };
  assert.ok(restorePendingResult(pending, novel, config, "before-edit", 1));
  assert.equal(
    restorePendingResult(pending, novel, config, "after-edit", 1),
    null,
  );
  assert.equal(
    restorePendingResult(pending, novel, config, "before-edit", 2),
    null,
  );
});
