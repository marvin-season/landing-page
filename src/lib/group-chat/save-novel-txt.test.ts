import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  novelTxtRelativePath,
  readNovelTxt,
  saveNovelTxt,
} from "./save-novel-txt";

test("saveNovelTxt keeps each work in its own folder", async () => {
  const root = await mkdtemp(join(tmpdir(), "novel-txt-"));
  const text = "旧港/夜\n\n第一章\n\n灯。\n";
  try {
    const first = await saveNovelTxt("room-a", "旧港/夜", text, root);
    const second = await saveNovelTxt("room-b", "旧港/夜", "另一本\n", root);
    assert.equal(first.file, join(root, "room-a", "旧港_夜.txt"));
    assert.equal(second.file, join(root, "room-b", "旧港_夜.txt"));
    assert.equal(
      novelTxtRelativePath("room-a", "旧港/夜"),
      join("data", "novels", "room-a", "旧港_夜.txt"),
    );
    assert.equal(await readFile(first.file, "utf8"), text);
    assert.equal(await readFile(second.file, "utf8"), "另一本\n");
    assert.equal(await readNovelTxt("missing", root), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("saveNovelTxt keeps only the previous copy and deletes the oldest", async () => {
  const root = await mkdtemp(join(tmpdir(), "novel-txt-"));
  const dir = join(root, "room-a");
  try {
    const first = await saveNovelTxt("room-a", "旧港", "第一版\n", root);
    assert.equal(await readFile(first.file, "utf8"), "第一版\n");
    assert.equal(
      (await readdir(dir)).some((name) => name.endsWith(".bak")),
      false,
    );

    const second = await saveNovelTxt("room-a", "旧港", "第二版\n", root);
    assert.equal(await readFile(second.file, "utf8"), "第二版\n");
    assert.equal(await readFile(`${first.file}.bak`, "utf8"), "第一版\n");

    const third = await saveNovelTxt("room-a", "新书", "第三版\n", root);
    assert.equal(third.file, join(dir, "新书.txt"));
    assert.equal(await readFile(third.file, "utf8"), "第三版\n");
    assert.equal(await readFile(join(dir, "旧港.txt.bak"), "utf8"), "第二版\n");
    assert.deepEqual((await readdir(dir)).sort(), ["新书.txt", "旧港.txt.bak"]);
    const current = await readNovelTxt("room-a", root);
    assert.equal(current?.fileName, "新书.txt");
    assert.equal(current?.text, "第三版\n");
    assert.equal(typeof current?.updatedAt, "number");

    await saveNovelTxt("room-a", "新书", "第三版\n", root);
    assert.equal(await readFile(join(dir, "旧港.txt.bak"), "utf8"), "第二版\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("readNovelTxt uses the newest manuscript and skips backups", async () => {
  const root = await mkdtemp(join(tmpdir(), "novel-txt-"));
  const dir = join(root, "room-a");
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "旧.txt"), "旧\n");
    await writeFile(join(dir, "新.txt"), "新\n");
    await writeFile(join(dir, "新.txt.bak"), "备份\n");
    const old = new Date(1_000);
    const newer = new Date(10_000);
    await utimes(join(dir, "旧.txt"), old, old);
    await utimes(join(dir, "新.txt"), newer, newer);
    const novel = await readNovelTxt("room-a", root);
    assert.equal(novel?.fileName, "新.txt");
    assert.equal(novel?.text, "新\n");
    assert.ok(novel && novel.updatedAt >= newer.getTime());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
