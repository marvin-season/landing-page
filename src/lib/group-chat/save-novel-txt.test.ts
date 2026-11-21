import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { novelTxtRelativePath, saveNovelTxt } from "./save-novel-txt";

test("saveNovelTxt writes the same text the export would download", async () => {
  const root = await mkdtemp(join(tmpdir(), "novel-txt-"));
  const text = "旧港/夜\n\n第一章\n\n灯。\n";
  try {
    const file = await saveNovelTxt("旧港/夜", text, root);
    assert.equal(file, join(root, "dev", "旧港_夜.txt"));
    assert.equal(
      novelTxtRelativePath("旧港/夜"),
      join("data", "novels", "dev", "旧港_夜.txt"),
    );
    assert.equal(await readFile(file, "utf8"), text);
    await saveNovelTxt("旧港/夜", "覆盖\n", root);
    assert.equal(await readFile(file, "utf8"), "覆盖\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
