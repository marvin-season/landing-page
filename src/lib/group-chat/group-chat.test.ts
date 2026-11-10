import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { type Client, createClient } from "@libsql/client";
import {
  actorContext,
  directorContext,
  eligibleCharacters,
  fallbackSpeaker,
  parseSelection,
  summaryContext,
} from "./context";
import { abortRun, createWorldEngine } from "./engine";
import { exampleWorld } from "./example";
import { createWorldHandlers } from "./http";
import {
  exportBackup,
  runInputSchema,
  WorldError,
  type WorldEvent,
} from "./model";
import type { Complete } from "./provider";
import { appendMessage, createWorldStore } from "./store";

const clients: Client[] = [];
afterEach(() => {
  for (const client of clients.splice(0)) client.close();
});
function setup() {
  const client = createClient({ url: ":memory:" });
  clients.push(client);
  return createWorldStore(() => client);
}
function command(extra = {}) {
  return runInputSchema.parse({
    clientRequestId: crypto.randomUUID(),
    expectedVersion: 1,
    mode: "auto",
    ...extra,
  });
}
const fakeComplete: Complete = async ({ messages, onText }) => {
  if (messages[0].content.includes("调度器")) {
    const data = JSON.parse(messages[1].content);
    return {
      text: JSON.stringify({
        action: "speak",
        speakerId: data.candidates[0].id,
      }),
    };
  }
  const text = "我先检查一下控制台，请大家留意对讲机。";
  onText?.(text);
  return { text, usage: { input: 20, output: 10 } };
};

test("room ownership, configuration snapshots and template independence", async () => {
  const store = setup();
  const preset = await store.savePreset("alice", {
    kind: "world",
    name: "样例",
    content: exampleWorld,
  });
  const room = await store.create("alice", exampleWorld);
  await assert.rejects(
    store.get("bob", room.id),
    (error: unknown) => error instanceof WorldError && error.status === 404,
  );
  await store.removePreset("alice", preset.id);
  const updated = await store.update(
    "alice",
    room.id,
    { ...exampleWorld, rules: "新规则" },
    1,
  );
  assert.equal(updated.version, 2);
  assert.equal(updated.snapshots[0].config.rules, exampleWorld.rules);
  assert.equal(updated.config.rules, "新规则");
  await assert.rejects(store.update("alice", room.id, exampleWorld, 1), /刷新/);
});

test("private goals and knowledge never enter other actors, director or summary inputs", async () => {
  const room = await setup().create("alice", exampleWorld);
  room.config.characters[0].privateInfo = "PRIVATE_A_39487";
  room.config.characters[0].goal = "SECRET_GOAL_992";
  const actorA = JSON.stringify(actorContext(room, room.config.characters[0]));
  assert.match(actorA, /PRIVATE_A_39487/);
  for (const context of [
    actorContext(room, room.config.characters[1]),
    directorContext(room, eligibleCharacters(room)),
    summaryContext(room, []),
  ]) {
    assert.doesNotMatch(
      JSON.stringify(context),
      /PRIVATE_A_39487|SECRET_GOAL_992/,
    );
  }
});

test("automatic run commits three ordered messages, uses previous speakers, and stops", async () => {
  const store = setup();
  const room = await store.create("alice", exampleWorld);
  const started = await store.begin(
    "alice",
    room.id,
    command({ text: "先检查什么？" }),
  );
  const seen: string[] = [];
  const complete: Complete = async (input) => {
    if (!input.messages[0].content.includes("调度器"))
      seen.push(input.messages[1].content);
    return fakeComplete(input);
  };
  const events: WorldEvent[] = [];
  await createWorldEngine(store, complete)(
    "alice",
    started.room,
    new AbortController().signal,
    (e) => events.push(e),
  );
  const saved = await store.get("alice", room.id);
  const actors = saved.messages.filter((m) => m.kind === "agent");
  assert.equal(actors.length, 3);
  assert.ok(actors.every((m) => m.status === "complete"));
  assert.notEqual(actors[0].speakerId, actors[1].speakerId);
  assert.match(seen[1], /我先检查一下控制台/);
  assert.equal(saved.run?.status, "completed");
  assert.equal(saved.run?.turns, 3);
  assert.equal(events.at(-1)?.type, "done");
  assert.deepEqual(
    saved.messages.map((m) => m.seq),
    [1, 2, 3, 4],
  );
});

test("mentions are deduplicated and only requested actors reply in order", async () => {
  const store = setup();
  const room = await store.create("alice", exampleWorld);
  const started = await store.begin(
    "alice",
    room.id,
    command({ mentions: ["reporter", "engineer", "reporter"] }),
  );
  await createWorldEngine(store, fakeComplete)(
    "alice",
    started.room,
    new AbortController().signal,
    () => {},
  );
  const saved = await store.get("alice", room.id);
  assert.deepEqual(
    saved.messages.filter((m) => m.kind === "agent").map((m) => m.speakerId),
    ["reporter", "engineer"],
  );
  assert.equal(saved.run?.calls, 2);
});

test("idempotency prevents duplicate user messages and stale versions are rejected", async () => {
  const store = setup();
  const room = await store.create("alice", exampleWorld);
  const input = command({ text: "hello", mode: "save" });
  await Promise.all([
    store.begin("alice", room.id, input),
    store.begin("alice", room.id, input),
  ]);
  assert.equal((await store.get("alice", room.id)).messages.length, 1);
  await assert.rejects(
    store.begin("alice", room.id, { ...input, text: "changed" }),
    /重复请求/,
  );
  await assert.rejects(
    store.begin("alice", room.id, command({ expectedVersion: 2 })),
    /刷新/,
  );
});

test("only one run can acquire the room and a paused send cannot resume it", async () => {
  const store = setup();
  const room = await store.create("alice", exampleWorld);
  const results = await Promise.allSettled([
    store.begin("alice", room.id, command()),
    store.begin("alice", room.id, command()),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  await store.stop("alice", room.id);
  const saved = await store.begin(
    "alice",
    room.id,
    command({ text: "请等等" }),
  );
  assert.equal(saved.value.started, false);
  assert.equal(saved.room.paused, true);
  const resumed = await store.begin(
    "alice",
    room.id,
    command({ text: "继续吧", resume: true }),
  );
  assert.equal(resumed.value.started, true);
});

test("interruption fences late model output and preserves the new user message", async () => {
  const store = setup();
  const room = await store.create("alice", exampleWorld);
  let release!: () => void;
  let actorStarted!: () => void;
  const waiting = new Promise<void>((resolve) => {
    actorStarted = resolve;
  });
  const complete: Complete = async ({ onText }) => {
    onText?.("尚未说完");
    actorStarted();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    onText?.("不该出现的迟到片段");
    return { text: "不该提交的完整输出" };
  };
  const started = await store.begin(
    "alice",
    room.id,
    command({ mentions: ["engineer"] }),
  );
  const done = createWorldEngine(store, complete)(
    "alice",
    started.room,
    new AbortController().signal,
    () => {},
  );
  await waiting;
  await store.begin(
    "alice",
    room.id,
    command({ text: "暂停，我想问另一个问题", mode: "save" }),
  );
  abortRun(started.room.run?.id);
  release();
  await done;
  const saved = await store.get("alice", room.id);
  assert.equal(saved.messages.at(-1)?.kind, "user");
  const agent = saved.messages.find((m) => m.kind === "agent")!;
  assert.equal(agent.status, "interrupted");
  assert.equal(agent.text, "尚未说完");
  assert.doesNotMatch(
    JSON.stringify(actorContext(saved, saved.config.characters[1])),
    /尚未说完|不该出现/,
  );
});

test("one-step run pauses, retry rejects changed context, and expired leases recover", async () => {
  const store = setup();
  const room = await store.create("alice", exampleWorld);
  const started = await store.begin(
    "alice",
    room.id,
    command({ mode: "step", mentions: ["engineer"] }),
  );
  await createWorldEngine(store, fakeComplete)(
    "alice",
    started.room,
    new AbortController().signal,
    () => {},
  );
  let saved = await store.get("alice", room.id);
  assert.equal(saved.run?.turns, 1);
  assert.equal(saved.paused, true);
  await assert.rejects(
    store.begin(
      "alice",
      room.id,
      command({ mode: "retry", retryMessageId: saved.messages.at(-1)?.id }),
    ),
    /上下文/,
  );
  await store.begin("alice", room.id, command());
  await store.change("alice", room.id, (r) => {
    r.run!.leaseUntil = 1;
  });
  saved = await store.get("alice", room.id);
  assert.equal(saved.run?.status, "interrupted");
  assert.equal(saved.paused, true);
});

test("director invalid output falls back and unknown/private candidates cannot be selected", async () => {
  const store = setup();
  const room = await store.create("alice", exampleWorld);
  assert.throws(() =>
    parseSelection(
      '{"action":"speak","speakerId":"outsider"}',
      room.config.characters,
    ),
  );
  assert.ok(fallbackSpeaker(room));
  const started = await store.begin(
    "alice",
    room.id,
    command({ mode: "step" }),
  );
  await createWorldEngine(store, async (input) =>
    input.messages[0].content.includes("调度器")
      ? { text: "invalid JSON" }
      : fakeComplete(input),
  )("alice", started.room, new AbortController().signal, () => {});
  const saved = await store.get("alice", room.id);
  assert.equal(saved.run?.turns, 1);
  assert.equal(saved.run?.calls, 2);
});

test("backup import allocates fresh identities and rejects inconsistent references", async () => {
  const store = setup();
  const room = await store.create("alice", exampleWorld);
  const saved = (
    await store.begin(
      "alice",
      room.id,
      command({ text: "hello", mode: "save" }),
    )
  ).room;
  const backup = exportBackup(saved);
  const imported = await store.import("bob", backup);
  assert.notEqual(imported.id, room.id);
  assert.equal(imported.ownerId, "bob");
  assert.notEqual(imported.messages[0].id, saved.messages[0].id);
  assert.equal(imported.run, null);
  assert.equal(imported.messages[0].runId, null);
  await assert.rejects(
    store.import("bob", {
      ...backup,
      messages: [{ ...backup.messages[0], configVersion: 999 }],
    }),
    /引用/,
  );
});

test("HTTP handlers enforce authentication, origin and ownership and stream a real room lifecycle", async () => {
  const store = setup();
  let user: string | null = null;
  const handle = createWorldHandlers({
    store,
    complete: fakeComplete,
    getUser: async () => user,
    models: async () => ["cursor/auto"],
  });
  const request = (
    path: string[],
    method = "GET",
    data?: unknown,
    origin = "http://localhost:3001",
  ) =>
    handle(
      new Request(`http://localhost:3001/api/group-chat/${path.join("/")}`, {
        method,
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: data === undefined ? undefined : JSON.stringify(data),
      }),
      path,
    );
  assert.equal((await request(["rooms"])).status, 401);
  user = "alice";
  assert.equal(
    (
      await request(
        ["rooms"],
        "POST",
        exampleWorld,
        "https://elsewhere.example",
      )
    ).status,
    403,
  );
  const response = await request(["rooms"], "POST", exampleWorld);
  assert.equal(response.status, 201);
  const { room } = await response.json();
  user = "bob";
  for (const method of ["GET", "DELETE"])
    assert.equal((await request(["rooms", room.id], method)).status, 404);
  user = "alice";
  const result = await request(
    ["rooms", room.id, "runs"],
    "POST",
    command({ mode: "step", mentions: ["engineer"] }),
  );
  assert.match(result.headers.get("Content-Type")!, /event-stream/);
  assert.match(await result.text(), /"type":"done"/);
  assert.equal((await store.get("alice", room.id)).run?.turns, 1);
});

test("errors during actor generation save the partial attempt and stop scheduling", async () => {
  const store = setup();
  const room = await store.create("alice", exampleWorld);
  const started = await store.begin(
    "alice",
    room.id,
    command({ mentions: ["engineer", "reporter"] }),
  );
  let calls = 0;
  await createWorldEngine(store, async ({ onText }) => {
    calls++;
    onText?.("一段片段");
    throw new WorldError("timeout", "超时");
  })("alice", started.room, new AbortController().signal, () => {});
  const saved = await store.get("alice", room.id);
  assert.equal(calls, 1);
  assert.equal(saved.run?.status, "failed");
  assert.equal(saved.messages.at(-1)?.status, "failed");
  assert.equal(saved.messages.at(-1)?.text, "一段片段");
});

test("long conversations summarize public history and keep original messages", async () => {
  const store = setup();
  const room = await store.create("alice", exampleWorld);
  await store.change("alice", room.id, (r) => {
    for (let i = 0; i < 100; i++)
      appendMessage(r, {
        speakerId: "user",
        name: r.config.userName,
        kind: "user",
        text: `公共事件${i}。`,
        status: "complete",
        runId: null,
        mentions: [],
      });
    appendMessage(r, {
      speakerId: "engineer",
      name: "许岚",
      kind: "agent",
      text: "UNFINISHED_PRIVATE_TOKEN",
      status: "interrupted",
      runId: null,
      mentions: [],
    });
  });
  let summaries = 0;
  const started = await store.begin(
    "alice",
    room.id,
    command({ mode: "step", mentions: ["engineer"] }),
  );
  await createWorldEngine(store, async (input) => {
    if (input.messages[0].content.includes("压缩")) {
      summaries++;
      assert.doesNotMatch(
        input.messages[1].content,
        /UNFINISHED_PRIVATE_TOKEN|备用回路/,
      );
      return { text: "大家讨论了多个公开事件，尚未确认任何行动结果。" };
    }
    assert.doesNotMatch(input.messages[1].content, /UNFINISHED_PRIVATE_TOKEN/);
    return fakeComplete(input);
  })("alice", started.room, new AbortController().signal, () => {});
  const saved = await store.get("alice", room.id);
  assert.ok(summaries > 0);
  assert.ok(saved.summary && saved.summary.throughSeq > 0);
  assert.equal(saved.messages.length, 103);
  assert.equal(saved.run?.turns, 1);
});

test("a room owner cannot cancel another owner's run by supplying its run ID", async () => {
  const store = setup();
  const alice = await store.create("alice", exampleWorld);
  const bob = await store.create("bob", exampleWorld);
  const started = await store.begin(
    "bob",
    bob.id,
    command({ mentions: ["engineer"] }),
  );
  let release!: () => void;
  let startedActor!: () => void;
  const waiting = new Promise<void>((resolve) => {
    startedActor = resolve;
  });
  let aborted = false;
  const done = createWorldEngine(store, async ({ signal }) => {
    signal.addEventListener(
      "abort",
      () => {
        aborted = true;
      },
      { once: true },
    );
    startedActor();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    assert.equal(aborted, false);
    return { text: "仍在正常运行" };
  })("bob", started.room, new AbortController().signal, () => {});
  await waiting;
  const handle = createWorldHandlers({
    store,
    complete: fakeComplete,
    getUser: async () => "alice",
    models: async () => [],
  });
  await handle(
    new Request(`http://localhost/api/group-chat/rooms/${alice.id}/stop`, {
      method: "POST",
      headers: {
        Origin: "http://localhost",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ runId: started.room.run!.id }),
    }),
    ["rooms", alice.id, "stop"],
  );
  release();
  await done;
  assert.equal((await store.get("bob", bob.id)).run?.status, "completed");
});
