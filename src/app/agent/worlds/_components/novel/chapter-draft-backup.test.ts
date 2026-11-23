import assert from "node:assert/strict";
import { test } from "node:test";
import { createChapterDraftBackup } from "./chapter-draft-backup";

const source = {
  mode: "rewrite",
  chapter: { id: "chapter-1", title: "Chapter 1", text: "Original." },
  version: 2,
  requirements: "Shorten the opening.",
  compactContext: true,
} as const;

function memoryStorage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  };
}

test("a reload recovers the latest draft text and rewrite source", () => {
  const storage = memoryStorage();
  const open = (key = "author:room") =>
    createChapterDraftBackup(
      key,
      () => storage,
      () => {},
    );
  const draft = open();
  draft.start(source);
  draft.write("First streamed text.");
  draft.write("Last streamed text.");
  draft.flush();

  const restored = open();
  assert.deepEqual(restored.read(), { ...source, text: "Last streamed text." });
  assert.equal(open("another-author:room").read(), null);
  assert.equal(open("author:another-room").read(), null);
  restored.write("Edited after recovery.");
  restored.flush();
  assert.equal(open().read()?.text, "Edited after recovery.");
});

test("clearing an applied or discarded draft cancels a pending write", () => {
  const storage = memoryStorage();
  const open = () =>
    createChapterDraftBackup(
      "author:room",
      () => storage,
      () => {},
    );
  const draft = open();
  draft.start(source);
  draft.write("First streamed text.");
  draft.write("Pending text.");
  draft.clear();
  draft.flush();
  assert.equal(open().read(), null);
});

test("a restored continuation draft keeps its selected chapter as the save position", () => {
  const storage = memoryStorage();
  const open = () =>
    createChapterDraftBackup(
      "author:room",
      () => storage,
      () => {},
    );
  const draft = open();
  draft.start({
    mode: "chapter",
    chapter: {
      id: "new",
      title: "第2章",
      text: "",
      brief: "推进感情线",
    },
    version: 2,
    afterChapterId: "selected",
  });
  draft.write("续写正文。");
  draft.flush();
  const restored = open().read();
  assert.equal(restored?.afterChapterId, "selected");
  assert.equal(restored?.chapter.brief, "推进感情线");
});

test("a failed backup can retry the latest text when storage is available", () => {
  const storage = memoryStorage();
  let blocked = false;
  let failed = false;
  const draft = createChapterDraftBackup(
    "author:room",
    () => {
      if (blocked) throw new Error("Storage blocked");
      return storage;
    },
    (value) => {
      failed = value;
    },
  );
  draft.start(source);
  blocked = true;
  draft.write("Still in memory.");
  assert.equal(failed, true);
  blocked = false;
  draft.flush();
  assert.equal(failed, false);
  assert.equal(draft.read()?.text, "Still in memory.");
});
