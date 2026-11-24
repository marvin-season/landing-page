import assert from "node:assert/strict";
import { test } from "node:test";
import { readReadingChapterId, writeReadingChapterId } from "./reading-chapter";

function memoryStorage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
  };
}

test("reading chapter is remembered per room and ignored when missing or corrupt", () => {
  const storage = memoryStorage();
  writeReadingChapterId("owner:room-a", "chapter-3", storage);
  assert.equal(readReadingChapterId("owner:room-a", storage), "chapter-3");
  assert.equal(readReadingChapterId("owner:room-b", storage), null);

  storage.setItem("novel-reading:v1:owner:room-a", "{");
  assert.equal(readReadingChapterId("owner:room-a", storage), null);

  storage.setItem(
    "novel-reading:v1:owner:room-a",
    JSON.stringify({ chapterId: "" }),
  );
  assert.equal(readReadingChapterId("owner:room-a", storage), null);
});
