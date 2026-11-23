import assert from "node:assert/strict";
import { test } from "node:test";
import { createPendingResultBackup } from "./pending-result-backup";

function memoryStorage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  };
}

test("selection and plot pending results survive a reload per room", () => {
  const storage = memoryStorage();
  const open = (key = "author:room") =>
    createPendingResultBackup(
      key,
      () => storage,
      () => {},
    );

  const selection = open();
  selection.write({
    kind: "selection",
    chapterId: "c1",
    chapterTitle: "第1章",
    range: { start: 2, end: 8 },
    baseText: "abcdefgh",
    preview: "替换",
    version: 3,
    incomplete: true,
  });
  assert.deepEqual(open().read(), {
    kind: "selection",
    chapterId: "c1",
    chapterTitle: "第1章",
    range: { start: 2, end: 8 },
    baseText: "abcdefgh",
    preview: "替换",
    version: 3,
    incomplete: true,
  });
  assert.equal(open("author:other").read(), null);

  const plot = open();
  plot.write({
    kind: "plot",
    mode: "merge",
    ids: ["a", "b", "c"],
    requirements: "去重",
    draft: {
      mode: "merge",
      chapters: [{ id: "n", title: "第1章", text: "合并正文" }],
    },
    version: 4,
  });
  const restored = open().read();
  assert.ok(restored?.kind === "plot");
  assert.deepEqual(restored.ids, ["a", "b", "c"]);
  plot.clear();
  assert.equal(open().read(), null);
});
