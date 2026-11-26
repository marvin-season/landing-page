import assert from "node:assert/strict";
import { test } from "node:test";
import type { NovelRunStatus } from "@/lib/group-chat/novel-run-contract";
import { followNovelRun, type NovelRunRequest } from "./novel-run-client";

const request: NovelRunRequest = {
  roomId: "novel-room",
  runId: "a42f50e9-93e1-4d5b-bd24-a0de24a0c726",
  version: 1,
  task: "chapter",
  prompt: "续写",
};

const status = (value: NovelRunStatus["status"], text: string) =>
  Response.json({ status: value, text, incomplete: false, error: null });

test("returning to a known generation recovers its complete text without submitting another request", async () => {
  const received: string[] = [];
  const connection: boolean[] = [];
  let reads = 0;
  await followNovelRun(
    { request, createdAt: Date.now() },
    {
      resumed: true,
      signal: new AbortController().signal,
      onUpdate: (snapshot) => received.push(snapshot.text),
      onConnection: (retrying) => connection.push(retrying),
      delay: async () => {},
      fetcher: async (_url, init) => {
        assert.equal(init?.method, "GET");
        reads++;
        if (reads === 1) return status("running", "首段");
        if (reads === 2) throw new TypeError("Network error");
        return status("completed", "首段。尾段。");
      },
    },
  );
  assert.deepEqual(received, ["首段", "首段。尾段。"]);
  assert.deepEqual(connection, [false, true, false]);
});

test("lost submission responses are retried using the same run ID", async () => {
  const methods: Array<string | undefined> = [];
  let posts = 0;
  await followNovelRun(
    { request, createdAt: Date.now() },
    {
      resumed: true,
      signal: new AbortController().signal,
      onUpdate: (snapshot) => assert.equal(snapshot.text, "完成的正文"),
      onConnection: () => {},
      delay: async () => {},
      fetcher: async (_url, init) => {
        methods.push(init?.method);
        if (init?.method === "POST") {
          assert.deepEqual(JSON.parse(String(init.body)), request);
          if (++posts === 1) throw new TypeError("Lost acknowledgement");
          return new Response(null, { status: 202 });
        }
        return posts > 0
          ? status("completed", "完成的正文")
          : Response.json({ error: "任务不存在" }, { status: 404 });
      },
    },
  );
  assert.deepEqual(methods, ["GET", "POST", "POST", "GET"]);
});

test("an expired task never starts a new model request on recovery", async () => {
  await assert.rejects(
    followNovelRun(
      { request, createdAt: Date.now() - 24 * 60 * 60 * 1000 },
      {
        resumed: true,
        signal: new AbortController().signal,
        onUpdate: () => assert.fail("No task to restore"),
        onConnection: () => assert.fail("Expired task must not be retried"),
        fetcher: async (_url, init) => {
          assert.equal(init?.method, "GET");
          return Response.json({ error: "已过期" }, { status: 404 });
        },
      },
    ),
    /已过期/,
  );
});
