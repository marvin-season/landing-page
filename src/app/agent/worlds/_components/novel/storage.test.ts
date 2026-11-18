import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { test } from "node:test";
import { exampleWorld } from "@/lib/group-chat/world-templates";
import { createNovel } from "./model";
import { legacyNovelRoomIds, migrateLegacyNovel, novels } from "./storage";

test("legacy migration moves the book to a distinct novel room and keeps the script room", async (t) => {
  const source = {
    ownerId: "alice",
    id: "old-room",
    kind: "script",
    config: exampleWorld,
  };
  const book = createNovel(source.config);
  book.chapters.push({ id: "chapter-1", title: "第一章", text: "旧小说正文" });
  await novels.add({ key: "alice:old-room", novel: book });
  const requests: [string, string][] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init: { method: string; body?: string }) => {
      requests.push([url, init.method]);
      if (init.method === "GET") return Response.json({ room: source });
      assert.ok(init.body);
      assert.deepEqual(JSON.parse(init.body), {
        ...source.config,
        kind: "novel",
      });
      return Response.json({ room: { ownerId: "alice", id: "new-room" } });
    },
  );

  assert.ok((await legacyNovelRoomIds()).includes("old-room"));
  assert.equal(await migrateLegacyNovel("old-room"), "new-room");
  assert.deepEqual((await novels.get("alice:new-room"))?.novel, book);
  assert.equal(await novels.get("alice:old-room"), undefined);
  assert.deepEqual(requests, [
    ["/api/group-chat/rooms/old-room", "GET"],
    ["/api/group-chat/rooms", "POST"],
  ]);
});
