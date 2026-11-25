import assert from "node:assert/strict";
import { test } from "node:test";
import { loadWorldTemplates } from "@/lib/group-chat/world-templates";
import { createNovel, invalidateEditedCheckpoint } from "./model";
import { applyPlotDraft, preparePlotEdit, readPlotDraft } from "./plot-edit";

const config = loadWorldTemplates()[0].config;

test("AI splitting preserves exact prose, the original chapter identity, and subsequent numbering", () => {
  const novel = book();
  const head = "**上半段**\r\n\r\n";
  const tail = "下半段。\r\n";
  novel.chapters[1].text = head + tail;
  const current = {
    ...novel,
    checkpoint: { throughChapterId: "c", summary: "旧摘要" },
  };
  const edit = preparePlotEdit(
    config,
    current,
    ["b"],
    "split",
    " 在场景转换处拆分 ",
  );
  const prompt = JSON.parse(edit.prompt);
  assert.deepEqual(prompt.targetChapter, {
    chapter: 2,
    title: "第2章",
    text: head + tail,
  });
  assert.equal(prompt.task.requirements, "在场景转换处拆分");
  const draft = readPlotDraft(
    edit,
    JSON.stringify({ secondOpening: "下半段。" }),
  );
  const saved = applyPlotDraft(current, edit, draft);
  assert.deepEqual(saved.chapters, [
    novel.chapters[0],
    { id: "b", title: "第2章", text: head },
    { id: draft.chapters[1].id, title: "第3章", text: tail },
    { ...novel.chapters[2], title: "第4章" },
    { ...novel.chapters[3], title: "第5章" },
    novel.chapters[4],
  ]);
  assert.equal(
    saved.chapters[1].text + saved.chapters[2].text,
    novel.chapters[1].text,
  );
  assert.equal(
    invalidateEditedCheckpoint(current, saved).checkpoint,
    undefined,
  );
});

test("AI splitting rejects ambiguous, altered, or empty-side openings", () => {
  const novel = book();
  novel.chapters[0].text = "开篇。重复。\n\n继续。重复。";
  const edit = preparePlotEdit(config, novel, ["a"], "split", "");
  for (const secondOpening of ["重复。", "改写的开头。", "开篇。"]) {
    assert.throws(
      () => readPlotDraft(edit, JSON.stringify({ secondOpening })),
      /无法在原文中唯一定位/,
    );
  }
  assert.throws(() => readPlotDraft(edit, "{}"), /未能识别拆分位置/);
  assert.throws(
    () => preparePlotEdit(config, novel, ["a", "b"], "split", ""),
    /请选择一章/,
  );
});

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
    () => preparePlotEdit(config, novel, ["b"], "merge", ""),
    /至少两个/,
  );
  assert.throws(
    () => preparePlotEdit(config, novel, ["a", "b", "d"], "merge", ""),
    /相邻/,
  );
  for (const mode of ["stitch", "insert"] as const) {
    assert.throws(
      () => preparePlotEdit(config, novel, ["b", "c", "d"], mode, "整理"),
      /两个相邻/,
    );
  }
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
  assert.deepEqual(
    edit.range.chapters.map(({ id }) => id),
    ["b", "c"],
  );
  novel.chapters[2].text = " ";
  assert.throws(
    () => preparePlotEdit(config, novel, ["b", "c", "d"], "merge", ""),
    /填写正文/,
  );
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
  const prompt = JSON.parse(edit.prompt);
  const stitchTask = prompt.task;
  assert.equal(prompt.previousChapters, undefined);
  assert.equal(prompt.followingChapters, undefined);
  assert.equal(prompt.unchangedBefore, untouchedBefore.slice(-600));
  assert.equal(prompt.unchangedAfter, untouchedAfter.slice(0, 600));
  assert.equal(stitchTask.mode, "stitch");
  assert.ok(stitchTask.endingMaxCharacters > 0);
  assert.ok(stitchTask.openingMaxCharacters > 0);
  assert.equal(stitchTask.requirements, "加一句道别");
  assert.match(
    stitchTask.instructions,
    /合法 JSON 对象 \{"ending":"\.\.\.","opening":"\.\.\."\}/,
  );
  assert.match(
    stitchTask.instructions,
    /task\.endingMaxCharacters 和 task\.openingMaxCharacters/,
  );
  assert.doesNotMatch(stitchTask.instructions, /selection|合并后的纯正文/);
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

test("merge rewrites a consecutive range into one chapter and renumbers only default titles", () => {
  const novel = book();
  novel.chapters.splice(4, 0, { id: "f", title: "第5章", text: "天亮了。" });
  const withCheckpoint = {
    ...novel,
    checkpoint: { throughChapterId: "c", summary: "已归档的情节。" },
  };
  const edit = preparePlotEdit(
    config,
    withCheckpoint,
    ["d", "b", "c"],
    "merge",
    "  保留争执的具体原因  ",
  );
  const prompt = JSON.parse(edit.prompt);
  const mergeTask = prompt.task;
  assert.deepEqual(
    JSON.parse(prompt.targetChapter.text),
    novel.chapters.slice(1, 4).map(({ title, text }) => ({ title, text })),
  );
  assert.equal(prompt.previousChapters[0].text, novel.chapters[0].text);
  assert.equal(prompt.followingChapters[0].text, novel.chapters[4].text);
  assert.equal(mergeTask.mode, "merge");
  assert.equal(mergeTask.maxCharacters, 8000);
  assert.equal(mergeTask.requirements, "保留争执的具体原因");
  assert.match(mergeTask.instructions, /只输出合并后的纯正文/);
  assert.doesNotMatch(
    mergeTask.instructions,
    /selection|unchangedBefore|endingMaxCharacters/,
  );
  assert.throws(() => readPlotDraft(edit, "长".repeat(8001)), /8000/);
  const draft = readPlotDraft(edit, "争执过后，她独自去了车站，找到了失物。");
  const saved = applyPlotDraft(withCheckpoint, edit, draft);
  assert.deepEqual(
    saved.chapters.map(({ id }) => id),
    ["a", draft.chapters[0].id, "f", "e"],
  );
  assert.ok(!["b", "c", "d"].includes(saved.chapters[1].id));
  assert.deepEqual(
    saved.chapters.map(({ title }) => title),
    ["序幕", "第2章", "第3章", "尾声"],
  );
  assert.equal(saved.chapters[2].text, novel.chapters[4].text);
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
