import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  migrateChapterEditorDraft,
  readChapterEditorDraft,
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

test("successive autosaves keep the latest text and beat a legacy backup", async () => {
  const room = "author:autosave";
  await readChapterEditorDraft(room, "one");
  await Promise.all([
    writeChapterEditorDraft(room, "one", "Initial edit"),
    writeChapterEditorDraft(room, "one", "Latest edit"),
  ]);
  await migrateChapterEditorDraft(room, "one", "Legacy edit");
  await migrateChapterEditorDraft(room, "two", "Legacy draft");
  assert.equal(await readChapterEditorDraft(room, "one"), "Latest edit");
  assert.equal(await readChapterEditorDraft(room, "two"), "Legacy draft");
});
