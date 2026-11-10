import assert from "node:assert/strict";
import { test } from "node:test";
import { type WorldClientEvent, worldStoryStream } from "./client";
import { exampleWorld } from "./example";
import { runInputSchema, type WorldEvent, type WorldRoom } from "./model";

function snapshot(id: string, paused = false): WorldRoom {
  return {
    id: "room",
    ownerId: "alice",
    status: "active",
    config: exampleWorld,
    version: 1,
    snapshots: [],
    messages: [],
    summary: null,
    run: {
      id,
      status: paused ? "paused" : "completed",
      phase: "",
      reason: paused ? "等待你的决定" : "本轮对话已完成",
      startedAt: 0,
      leaseUntil: 0,
      deadline: 0,
      calls: 6,
      turns: 3,
      limit: 3,
      mentions: [],
      configVersion: 1,
      mode: "auto",
      usage: { input: 0, output: 0, reportedCalls: 0 },
    },
    runs: [],
    paused,
    createdAt: "2026-11-10T00:00:00.000Z",
    updatedAt: "2026-11-10T00:00:00.000Z",
  };
}

function input(extra = {}) {
  return {
    roomId: "room",
    command: runInputSchema.parse({
      clientRequestId: crypto.randomUUID(),
      expectedVersion: 1,
      mode: "auto",
      text: "开始吧",
      mentions: ["engineer"],
      resume: true,
      ...extra,
    }),
  };
}

function response(room: WorldRoom, error = false, done = true) {
  const runId = room.run!.id;
  const events: WorldEvent[] = [{ type: "room", room, runId, eventSeq: 1 }];
  if (error)
    events.push({
      type: "error",
      code: "failed",
      message: "失败",
      runId,
      eventSeq: 2,
    });
  if (done) events.push({ type: "done", runId, eventSeq: 3 });
  return new Response(
    events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
    {
      headers: { "Content-Type": "text/event-stream" },
    },
  );
}

test("automatic story continues bounded batches without repeating user text or mentions", async (t) => {
  const commands: ReturnType<typeof input>["command"][] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      commands.push(JSON.parse(init.body as string));
      return response(
        snapshot(`run-${commands.length}`, commands.length === 3),
      );
    },
  );
  const events: WorldClientEvent[] = [];
  for await (const event of worldStoryStream(input(), {
    signal: new AbortController().signal,
  }))
    events.push(event);
  assert.equal(commands.length, 3);
  assert.equal(commands[0].text, "开始吧");
  assert.deepEqual(commands[0].mentions, ["engineer"]);
  for (const [index, command] of commands.slice(1).entries()) {
    assert.equal(command.text, "");
    assert.deepEqual(command.mentions, []);
    assert.equal(command.continueRunId, `run-${index + 1}`);
    assert.equal(command.resume, false);
  }
  assert.equal(new Set(commands.map((c) => c.clientRequestId)).size, 3);
  assert.deepEqual(
    events.filter((e) => e.type === "request").map((e) => e.clientRequestId),
    commands.map((c) => c.clientRequestId),
  );
  assert.ok(
    events.every(
      (event, i) => i === 0 || event.eventSeq > events[i - 1].eventSeq,
    ),
  );
});

test("aborting during handoff prevents the next run request", async (t) => {
  let calls = 0;
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return response(snapshot("first"));
  });
  await assert.rejects(
    async () => {
      for await (const event of worldStoryStream(input(), {
        signal: controller.signal,
      })) {
        if (event.type === "request" && calls === 1) controller.abort();
      }
    },
    { name: "AbortError" },
  );
  assert.equal(calls, 1);
});

test("step, retry, save and failed runs never automatically continue", async (t) => {
  let calls = 0;
  let fail = false;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return response(snapshot("first"), fail);
  });
  for (const mode of ["step", "retry", "save", "auto"]) {
    fail = mode === "auto";
    for await (const _event of worldStoryStream(input({ mode }), {
      signal: new AbortController().signal,
    })) {
      // Consume the stream to exercise completion and continuation decisions.
    }
  }
  assert.equal(calls, 4);
});

test("a disconnected stream fails instead of launching another batch", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return response(snapshot("first"), false, false);
  });
  await assert.rejects(async () => {
    for await (const _event of worldStoryStream(input(), {
      signal: new AbortController().signal,
    })) {
      // Missing done must reject before scheduling another request.
    }
  }, /连接已断开/);
  assert.equal(calls, 1);
});
