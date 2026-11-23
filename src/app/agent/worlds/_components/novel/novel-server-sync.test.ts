import assert from "node:assert/strict";
import { test } from "node:test";
import { loadWorldTemplates } from "@/lib/group-chat/world-templates";
import { createNovel, exportNovel, type Novel } from "./model";
import {
  type NovelServerSyncHost,
  type ServerNovel,
  syncNovelFromServer,
} from "./novel-server-sync";

function manuscript(text: string): Novel {
  const novel = createNovel(loadWorldTemplates()[0].config);
  novel.title = "旧港";
  novel.chapters = [{ id: text, title: "第1章", text }];
  novel.updatedAt = 1;
  novel.syncedAt = 1;
  return novel;
}

function host(initial: Novel, previous?: Novel) {
  let current = initial;
  let backup = previous;
  const server: { current: ServerNovel | null } = { current: null };
  const fake: NovelServerSyncHost = {
    busy: () => false,
    lock: { current: null },
    novel: () => current,
    roomId: () => "room",
    server,
    previous: {
      get current() {
        return backup;
      },
      set current(value) {
        backup = value;
      },
    },
    rememberBackup(novel) {
      backup = novel;
    },
    publish() {},
    async update(next) {
      current = next;
      return true;
    },
    clearDraft() {},
  };
  return {
    fake,
    read: () => ({
      text: current.chapters[0]?.text,
      backup: backup?.chapters[0]?.text,
    }),
  };
}

test("pulling the server keeps only the previous local manuscript", async () => {
  const first = manuscript("第一版");
  const second = manuscript("第二版");
  const third = manuscript("第三版");
  const local = host(first, manuscript("更早"));
  const copies = [second, third, third];
  const fetch = globalThis.fetch;
  globalThis.fetch = async () => {
    const novel = copies.shift();
    if (!novel) throw new Error("没有更多服务器版本。");
    return Response.json({
      text: exportNovel(novel, "txt"),
      fileName: "旧港.txt",
      updatedAt: novel.chapters[0]?.text === "第二版" ? 2 : 3,
    });
  };
  try {
    await syncNovelFromServer(local.fake);
    assert.deepEqual(local.read(), { text: "第二版", backup: "第一版" });
    await syncNovelFromServer(local.fake);
    assert.deepEqual(local.read(), { text: "第三版", backup: "第二版" });
    await syncNovelFromServer(local.fake);
    assert.deepEqual(local.read(), { text: "第三版", backup: "第二版" });
  } finally {
    globalThis.fetch = fetch;
  }
});
