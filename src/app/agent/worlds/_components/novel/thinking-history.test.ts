import assert from "node:assert/strict";
import test from "node:test";
import {
  createThinkingHistoryStore,
  sanitizeThinkingTools,
  thinkingHistoryAnswer,
  thinkingHistoryLabel,
} from "./thinking-history";

test("sanitizeThinkingTools drops long skill instructions", () => {
  const tools = sanitizeThinkingTools([
    {
      id: "1",
      name: "apply_writing_skill",
      state: "done",
      input: { skillId: "chapter-hook" },
      output: {
        id: "chapter-hook",
        name: "章末钩子",
        instructions: "很长的技法正文".repeat(20),
      },
    },
  ]);
  assert.deepEqual(tools[0]?.output, {
    id: "chapter-hook",
    name: "章末钩子",
  });
});

test("thinking history store keeps newest entries per novel key", () => {
  const memory = new Map<string, string>();
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  };
  const store = createThinkingHistoryStore("owner:room", () => storage);
  const first = store.append({
    id: "a",
    createdAt: 1,
    task: "chapter",
    label: "第1章",
    status: "completed",
    tools: [],
  });
  assert.equal(first.length, 1);
  const second = store.append({
    id: "b",
    createdAt: 2,
    task: "rewrite",
    label: "第1章 · 整章润色",
    status: "completed",
    tools: [
      {
        id: "t",
        name: "apply_writing_skill",
        state: "done",
        output: { id: "scene-driven", name: "场景驱动" },
      },
    ],
  });
  assert.deepEqual(
    second.map((item) => item.id),
    ["b", "a"],
  );
  assert.equal(
    thinkingHistoryLabel({ task: "chapter", chapterTitle: "夜雨" }),
    "夜雨",
  );
  assert.equal(
    thinkingHistoryLabel({
      task: "rewrite",
      chapterTitle: "夜雨",
      isPassage: true,
    }),
    "夜雨 · 段落润色",
  );
});

test("thinkingHistoryAnswer summarizes skills without prose", () => {
  assert.equal(
    thinkingHistoryAnswer({ tools: [], status: "completed" }),
    "未挂载技法；撰写完成",
  );
  assert.equal(
    thinkingHistoryAnswer({
      tools: [
        {
          id: "1",
          name: "apply_writing_skill",
          state: "done",
          output: { id: "chapter-hook", name: "章末钩子" },
        },
      ],
      status: "completed",
    }),
    "已挂载技法：章末钩子；撰写完成",
  );
});
