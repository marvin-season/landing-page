import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createChapterDraftBackup } from "./chapter-draft-backup";

const source = {
  chapter: { id: "new", title: "Chapter 2", text: "", brief: "Next step" },
  version: 2,
  afterChapterId: "selected",
};

function open(roomKey: string) {
  return createChapterDraftBackup(roomKey, () => {});
}

test("recovers continuation text, requirements and insertion position from IndexedDB", async () => {
  const draft = open("author:first-room");
  draft.start(source);
  draft.write("First streamed text.");
  draft.write("Last streamed text.");
  await draft.flush();

  assert.deepEqual(await open("author:first-room").read(), {
    ...source,
    mode: "chapter",
    text: "Last streamed text.",
  });
  assert.equal(await open("another-author:first-room").read(), null);
  assert.equal(await open("author:other-room").read(), null);
});

test("clearing an applied continuation cancels pending writes", async () => {
  const draft = open("author:second-room");
  draft.start(source);
  draft.write("First streamed text.");
  draft.write("Pending text.");
  await draft.clear();
  await draft.flush();
  assert.equal(await open("author:second-room").read(), null);
});

test("manual new chapters survive returning to reading and can be resumed after reload", async () => {
  const key = "author:manual-draft";
  const draft = open(key);
  const manual = {
    ...source,
    chapter: { ...source.chapter, brief: undefined },
    manual: true,
  };
  draft.start(manual);
  assert.equal(await draft.checkpoint(), null);
  draft.write("First edit.");
  draft.write("Latest edit.");
  assert.deepEqual(await draft.checkpoint(), {
    ...manual,
    mode: "chapter",
    text: "Latest edit.",
  });

  const restored = open(key);
  assert.equal((await restored.read())?.manual, true);
  restored.write("Edited after returning to the draft.");
  assert.equal(
    (await restored.checkpoint())?.text,
    "Edited after returning to the draft.",
  );
  assert.equal(await restored.clear(), true);
  assert.equal(await open(key).read(), null);
});

test("returning to reading flushes the final AI continuation edit", async () => {
  const key = "author:ai-draft";
  const draft = open(key);
  draft.start(source);
  draft.write("AI output.");
  draft.write("With a final edit.");
  assert.equal((await draft.checkpoint())?.text, "With a final edit.");
  assert.equal((await open(key).read())?.afterChapterId, "selected");
});
