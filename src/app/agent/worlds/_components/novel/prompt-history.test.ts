import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { readNovelPrompts, recordNovelPrompt } from "./prompt-history";

test("prompt history preserves submitted text, newest first, within one account and room", async () => {
  await recordNovelPrompt("owner-a:novel-a", "first\nline");
  await recordNovelPrompt("owner-b:novel-a", "other account");
  await recordNovelPrompt("owner-a:novel-b", "other novel");
  await recordNovelPrompt("owner-a:novel-a", " \n ");
  await recordNovelPrompt("owner-a:novel-a", "latest");

  const prompts = await readNovelPrompts("owner-a:novel-a");
  assert.deepEqual(
    prompts.map(({ text }) => text),
    ["latest", "first\nline"],
  );
});
