import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  readChapterEditorDraft,
  readChapterEditorDraftRecord,
  stageChapterHistoryDraft,
  writeChapterEditorDraft,
} from "./chapter-editor-drafts";

test("chapter drafts are independent across chapters, books and accounts", async () => {
  const room = "author:book";
  await writeChapterEditorDraft(room, "one", "An edited chapter.");
  await writeChapterEditorDraft(room, "two", "");

  assert.equal(await readChapterEditorDraft(room, "one"), "An edited chapter.");
  assert.equal(await readChapterEditorDraft(room, "two"), "");
  assert.equal(await readChapterEditorDraft("other:book", "one"), undefined);
  assert.equal(await readChapterEditorDraft("author:fork", "one"), undefined);

  await writeChapterEditorDraft(room, "one", undefined);
  assert.equal(await readChapterEditorDraft(room, "one"), undefined);
  assert.equal(await readChapterEditorDraft(room, "two"), "");
});

test("successive autosaves keep the latest text", async () => {
  const room = "author:autosave";
  await Promise.all([
    writeChapterEditorDraft(room, "one", "Initial edit"),
    writeChapterEditorDraft(room, "one", "Latest edit"),
  ]);
  assert.equal(await readChapterEditorDraft(room, "one"), "Latest edit");
});

test("staging historical changes respects existing drafts and records the source for later confirmation", async () => {
  const key = "author:history";
  await writeChapterEditorDraft(key, "one", "Writer's draft", "Current prose");
  assert.equal(
    await stageChapterHistoryDraft(key, "one", "Current prose", "Old result"),
    false,
  );
  assert.equal(await readChapterEditorDraft(key, "one"), "Writer's draft");
  await writeChapterEditorDraft(key, "one", undefined);
  assert.equal(
    await stageChapterHistoryDraft(key, "one", "Current prose", "Old result"),
    true,
  );
  await writeChapterEditorDraft(
    key,
    "one",
    "Edited old result",
    "Current prose",
  );
  const draft = await readChapterEditorDraftRecord(key, "one");
  assert.equal(draft?.history, true);
  assert.equal(draft?.baseText, "Current prose");
});
