import assert from "node:assert/strict";
import { test } from "node:test";
import { loadWorldTemplates } from "@/lib/group-chat/world-templates";
import { type Chapter, createNovel } from "./model";
import {
  mergeHistoryText,
  plotLineage,
  prepareHistoryPlan,
} from "./novel-history-apply";
import type { HistoryContent } from "./novel-history-store";

const config = loadWorldTemplates()[0].config;
const chapter = (id: string, text: string): Chapter => ({
  id,
  title: id,
  text,
});
const novel = (...chapters: Chapter[]) => ({
  ...createNovel(config),
  chapters,
});

test("applying a historical rewrite preserves later edits and rejects overlap", () => {
  const original = "门开了。\n旧钟还在走。\n他独自离开。";
  assert.equal(
    mergeHistoryText(
      original,
      original.replace("独自离开", "跟着大家离开"),
      original.replace("旧钟", "怀表"),
    ),
    "门开了。\n怀表还在走。\n他跟着大家离开。",
  );
  assert.equal(
    mergeHistoryText(
      original,
      original.replace("旧钟", "石英钟"),
      original.replace("旧钟", "怀表"),
    ),
    undefined,
  );
});

test("a unique historical selection follows split and merge, without reusing its old offset", () => {
  const head = "原章前半段。".repeat(12);
  const prefix = "直至灯火灭尽的长廊。".repeat(5);
  const suffix = "远处钟声继续回荡。".repeat(5);
  const selected = "门口停了一辆旧车。";
  const body = prefix + selected + suffix;
  const source = chapter("original", head + body);
  const currentHead = chapter("original", head);
  const tail = chapter("tail", body);
  const combined = chapter("merged", `另一章的结尾。\n${body}`);
  const content: HistoryContent = {
    operation: {
      kind: "rewrite",
      range: {
        start: head.length + prefix.length,
        end: head.length + prefix.length + selected.length,
      },
    },
    sources: [source],
    raw: "门口停了一辆亮红色的车。",
  };
  const split = plotLineage([source], {
    mode: "split",
    chapters: [currentHead, tail],
  });
  const merge = plotLineage([chapter("other", "另一章的结尾。"), tail], {
    mode: "merge",
    chapters: [combined],
  });
  assert.equal(split[0].splitOffset, head.length);
  const migrated = prepareHistoryPlan(novel(currentHead, combined), content, [
    ...split,
    ...merge,
  ]);
  assert.equal(migrated?.after[0].id, "merged");
  assert.equal(
    migrated?.after[0].text,
    combined.text.replace(selected, content.raw),
  );

  assert.equal(
    prepareHistoryPlan(
      novel(currentHead, { ...combined, text: body + body }),
      content,
      [...split, ...merge],
    ),
    undefined,
  );
  assert.equal(
    prepareHistoryPlan(
      novel(currentHead, combined),
      { ...content, operation: { kind: "rewrite" } },
      [...split, ...merge],
    ),
    undefined,
  );
});

test("structural history only replays against continuous unchanged source chapters in order", () => {
  const first = chapter("a", "开头。");
  const second = chapter("b", "结尾。");
  const merged = chapter("c", "开头和结尾。");
  const content: HistoryContent = {
    operation: { kind: "merge" },
    sources: [first, second],
    raw: merged.text,
    results: [merged],
  };
  assert.deepEqual(
    prepareHistoryPlan(novel(first, second), content, [])?.after,
    [merged],
  );
  assert.equal(
    prepareHistoryPlan(novel(second, first), content, []),
    undefined,
  );
  assert.equal(
    prepareHistoryPlan(
      novel(first, chapter("x", "其他。"), second),
      content,
      [],
    ),
    undefined,
  );
  assert.equal(
    prepareHistoryPlan(
      novel(first, { ...second, text: "后来改过了。" }),
      content,
      [],
    ),
    undefined,
  );
  assert.equal(prepareHistoryPlan(novel(merged), content, []), undefined);
});
