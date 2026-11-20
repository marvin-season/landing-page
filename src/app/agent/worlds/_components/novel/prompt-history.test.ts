import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { readNovelPrompts, recordNovelPrompt } from "./prompt-history";

test("prompt history preserves submitted text, newest first, within one account and room", async () => {
  await recordNovelPrompt("owner-a:novel-a", "chapter", "first\nline");
  await recordNovelPrompt("owner-b:novel-a", "rewrite", "other account");
  await recordNovelPrompt("owner-a:novel-b", "insert", "other novel");
  await recordNovelPrompt("owner-a:novel-a", "merge", " \n ");
  await recordNovelPrompt("owner-a:novel-a", "selection", "latest");

  const prompts = await readNovelPrompts("owner-a:novel-a");
  assert.deepEqual(
    prompts.map(({ kind, text }) => [kind, text]),
    [
      ["selection", "latest"],
      ["chapter", "first\nline"],
    ],
  );
});
