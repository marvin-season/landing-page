import assert from "node:assert/strict";
import { test } from "node:test";
import { loadWorldTemplates } from "@/lib/group-chat/world-templates";
import { createNovel, invalidateEditedCheckpoint } from "./model";
import { applyPlotDraft, preparePlotEdit, readPlotDraft } from "./plot-edit";

const config = loadWorldTemplates()[0].config;

function book() {
  return {
    ...createNovel(config),
    chapters: [
      { id: "a", title: "序幕", text: "前情。" },
      { id: "b", title: "第2章", text: "一场争执。" },
      { id: "c", title: "第3章", text: "她到了车站。" },
      { id: "d", title: "第4章", text: "她找到失物。" },
      { id: "e", title: "尾声", text: "她搭车回家。" },
    ],
  };
}

test("plot edits require adjacent chapters and treat the selection in book order", () => {
  const novel = book();
  assert.throws(
    () => preparePlotEdit(config, novel, ["b", "d"], "merge", ""),
    /相邻/,
  );
  assert.throws(
    () => preparePlotEdit(config, novel, ["b", "b"], "merge", ""),
    /相邻/,
  );
  assert.throws(
    () => preparePlotEdit(config, novel, ["b", "c"], "stitch", " "),
    /剧情要求/,
  );
  assert.throws(
    () => preparePlotEdit(config, novel, ["b", "c"], "insert", ""),
    /剧情要求/,
  );
  const edit = preparePlotEdit(config, novel, ["c", "b"], "merge", "");
  assert.ok(edit.mode === "merge");
  assert.equal(edit.pair.first.id, "b");
  assert.equal(edit.pair.second.id, "c");
});

test("stitch changes only the transition and keeps both chapter IDs and titles", () => {
  const novel = book();
  const untouchedBefore = `${"甲".repeat(1450)}\n\n`;
  const untouchedAfter = "乙".repeat(1450);
  novel.chapters[1].text = `${untouchedBefore}${"旧".repeat(850)}`;
  novel.chapters[2].text = `${"旧".repeat(850)}\n\n${untouchedAfter}`;
  const edit = preparePlotEdit(
    config,
    novel,
    ["c", "b"],
    "stitch",
    "加一句道别",
  );
  const stitchTask = JSON.parse(edit.prompt).task;
  assert.equal(stitchTask.mode, "stitch");
  assert.ok(stitchTask.endingMaxCharacters > 0);
  assert.ok(stitchTask.openingMaxCharacters > 0);
  const draft = readPlotDraft(
    edit,
    '```json\n{"ending":"她挥手道别。","opening":"走到车站时，天已黑了。"}\n```',
  );
  const saved = applyPlotDraft(novel, edit, draft);
  assert.deepEqual(
    saved.chapters.map(({ id, title }) => ({ id, title })),
    novel.chapters.map(({ id, title }) => ({ id, title })),
  );
  assert.equal(saved.chapters[1].text, `${untouchedBefore}她挥手道别。`);
  assert.equal(
    saved.chapters[2].text,
    `走到车站时，天已黑了。\n\n${untouchedAfter}`,
  );
  assert.equal(saved.chapters[0], novel.chapters[0]);
  assert.equal(saved.chapters[3], novel.chapters[3]);
  assert.throws(
    () => readPlotDraft(edit, '{"ending":"没有开头。"}'),
    /两个过渡片段/,
  );
  assert.throws(
    () =>
      readPlotDraft(
        edit,
        JSON.stringify({ ending: "长".repeat(8001), opening: "开头" }),
      ),
    /8000/,
  );
});

test("merge replaces the pair with a new chapter and renumbers only default titles", () => {
  const novel = book();
  const withCheckpoint = {
    ...novel,
    checkpoint: { throughChapterId: "c", summary: "已归档的情节。" },
  };
  const edit = preparePlotEdit(
    config,
    withCheckpoint,
    ["b", "c"],
    "merge",
    "  保留争执的具体原因  ",
  );
  const mergeTask = JSON.parse(edit.prompt).task;
  assert.equal(mergeTask.mode, "merge");
  assert.equal(mergeTask.maxCharacters, 8000);
  assert.match(mergeTask.requirements, /作者要求：保留争执的具体原因。/);
  assert.throws(() => readPlotDraft(edit, "长".repeat(8001)), /8000/);
  const draft = readPlotDraft(edit, "争执过后，她独自去了车站。");
  const saved = applyPlotDraft(withCheckpoint, edit, draft);
  assert.deepEqual(
    saved.chapters.map(({ id }) => id),
    ["a", draft.chapters[0].id, "d", "e"],
  );
  assert.ok(!["b", "c"].includes(saved.chapters[1].id));
  assert.deepEqual(
    saved.chapters.map(({ title }) => title),
    ["序幕", "第2章", "第3章", "尾声"],
  );
  assert.equal(saved.chapters[2].text, novel.chapters[3].text);
  assert.equal(
    invalidateEditedCheckpoint(withCheckpoint, saved).checkpoint,
    undefined,
  );
});

test("insert drafts a chapter between the pair and preserves both neighbors", () => {
  const novel = book();
  const edit = preparePlotEdit(
    config,
    novel,
    ["c", "b"],
    "insert",
    "交代她为何离开",
  );
  const request = JSON.parse(edit.prompt);
  assert.equal(request.task.mode, "insert");
  assert.equal(request.task.chapter, 3);
  assert.equal(request.task.requirements, "交代她为何离开");
  const draft = readPlotDraft(edit, "她在门前读完来信，决定离开。");
  assert.equal(novel.chapters.length, 5);
  const saved = applyPlotDraft(novel, edit, draft);
  assert.deepEqual(
    saved.chapters.map(({ id }) => id),
    ["a", "b", draft.chapters[0].id, "c", "d", "e"],
  );
  assert.deepEqual(
    saved.chapters.map(({ title }) => title),
    ["序幕", "第2章", "第3章", "第4章", "第5章", "尾声"],
  );
  assert.equal(saved.chapters[1].text, novel.chapters[1].text);
  assert.equal(saved.chapters[3].text, novel.chapters[2].text);
});

test("insert before the only chapter works without existing prose", () => {
  const original = { id: "original", title: "第1章", text: "" };
  const novel = { ...book(), chapters: [original] };
  const edit = preparePlotEdit(
    config,
    novel,
    [original.id],
    "insert",
    "交代她为何出发",
  );
  const draft = readPlotDraft(edit, "她读完信，动身前往车站。");
  assert.equal(draft.chapters[0].title, "第1章");
  assert.deepEqual(novel.chapters, [original]);
  assert.deepEqual(applyPlotDraft(novel, edit, draft).chapters, [
    draft.chapters[0],
    { ...original, title: "第2章" },
  ]);
});
