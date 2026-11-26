import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  exportNovelHistory,
  type HistoryCursor,
  type HistorySummary,
  observeNovelHistory,
  readNovelHistory,
  saveNovelHistoryResult,
  startNovelHistory,
} from "./novel-history-store";

const source = { id: "chapter", title: "第一章", text: "原来这是一座空房子。" };

function start(key: string, id: string) {
  return startNovelHistory(
    {
      key,
      id,
      createdAt: 10,
      label: "润色本章",
      question: "调整语气",
      status: "running",
      tools: [],
      hasResult: false,
    },
    { kind: "rewrite" },
    [source],
  );
}

function page(key: string, cursor?: HistoryCursor) {
  return new Promise<{ entries: HistorySummary[]; next?: HistoryCursor }>(
    (resolve, reject) => {
      const subscription = observeNovelHistory(key, cursor).subscribe({
        next(value) {
          subscription.unsubscribe();
          resolve(value);
        },
        error: reject,
      });
    },
  );
}

test("history pages stay separate from prose, deduplicate sources, and do not skip tied timestamps", async () => {
  const key = "author:paging";
  await Promise.all(
    Array.from({ length: 22 }, (_, i) =>
      start(key, String(i).padStart(2, "0")),
    ),
  );
  const first = await page(key);
  assert.equal(first.entries.length, 20);
  assert.equal(first.entries[0]?.id, "21");
  assert.equal(Object.hasOwn(first.entries[0], "raw"), false);
  assert.ok(first.next);
  assert.deepEqual(
    (await page(key, first.next)).entries.map(({ id }) => id),
    ["01", "00"],
  );
  assert.deepEqual((await readNovelHistory(key, "00"))?.sources, [source]);
  assert.equal(await readNovelHistory("different:paging", "00"), undefined);
  const archive = JSON.parse(await (await exportNovelHistory(key)).text());
  assert.equal(archive.snapshots.length, 1);
  assert.equal(archive.details.length, 22);
});

test("recovered runs keep one entry and a late checkpoint cannot replace a final partial result", async () => {
  const key = "author:recovery";
  await start(key, "run");
  await saveNovelHistoryResult(key, "run", "running", "已收到的正文", {
    tools: [],
  });
  await start(key, "run");
  await saveNovelHistoryResult(key, "run", "cancelled", "", { tools: [] });
  await saveNovelHistoryResult(key, "run", "running", "过时的轮询结果", {
    tools: [],
  });
  const history = await page(key);
  assert.equal(history.entries.length, 1);
  assert.equal(history.entries[0].status, "cancelled");
  assert.equal(history.entries[0].incomplete, true);
  assert.equal((await readNovelHistory(key, "run"))?.raw, "已收到的正文");
});
