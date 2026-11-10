import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { type Client, createClient } from "@libsql/client";
import {
  actorContext,
  directorContext,
  eligibleCharacters,
  fallbackSpeaker,
  narratorContext,
  parseSelection,
  pendingUserQuestions,
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
        speakerId: (
          data.candidates.find(
            (c: { id: string }) =>
              c.id !== data.publicConversation.at(-1)?.speakerId,
          ) || data.candidates[0]
        ).id,
      }),
    };
  }
  const text = messages[0].content.includes("可见的系统主持人")
    ? "控制室的备用灯闪烁了一下，对讲机传出短促的呼叫声。"
    : "我先检查一下控制台，请大家留意对讲机。";
  onText?.(text);
  return { text, usage: { input: 20, output: 10 } };
};

async function conversationWithQuestion() {
  const store = setup();
  const room = await store.create("alice", exampleWorld);
  await store.change("alice", room.id, (r) => {
    appendMessage(r, {
      speakerId: "system",
      name: "系统",
      kind: "narrator",
      text: "大家正在检查设备。",
      status: "complete",
      runId: null,
      mentions: [],
    });
    appendMessage(r, {
      speakerId: "engineer",
      name: "许岚",
      kind: "agent",
      text: "林舟，你能把手电筒给我吗？",
      status: "complete",
      runId: null,
      mentions: [],
    });
  });
  return { store, room };
}

test("an ordinary named request and an answer to an NPC skip a separate selection call", async () => {
  for (const [text, expected] of [
    ["周渡，帮我联络船员。", "dispatcher"],
    ["好，我拿给你。", "engineer"],
  ]) {
    const { store, room } = await conversationWithQuestion();
    const started = await store.begin(
      "alice",
      room.id,
      command({ mode: "step", text, resume: true }),
    );
    await createWorldEngine(store, async (input) => {
      assert.doesNotMatch(input.messages[0].content, /调度器/);
      assert.equal(
        JSON.parse(input.messages[1].content).yourCharacter.id,
        expected,
      );
      return fakeComplete(input);
    })("alice", started.room, new AbortController().signal, () => {});
    const saved = await store.get("alice", room.id);
    assert.equal(saved.run?.calls, 1);
    assert.equal(saved.messages.at(-1)?.speakerId, expected);
  }
});

test("waiting for an answer does not add a duplicate system question", async () => {
  const { store, room } = await conversationWithQuestion();
  const started = await store.begin(
    "alice",
    room.id,
    command({ mode: "step" }),
  );
  await createWorldEngine(store, async () => ({ text: '{"action":"wait"}' }))(
    "alice",
    started.room,
    new AbortController().signal,
    () => {},
  );
  const saved = await store.get("alice", room.id);
  assert.equal(saved.run?.status, "paused");
  assert.equal(saved.messages.length, 2);
  assert.equal(saved.messages.at(-1)?.speakerId, "engineer");
});

test("waiting NPCs may follow up once while other interested speakers can participate", async () => {
  const { store, room } = await conversationWithQuestion();
  for (const followUp of [false, true, true]) {
    const started = await store.begin(
      "alice",
      room.id,
      command({ mode: "step" }),
    );
    await createWorldEngine(store, async (input) => {
      if (input.messages[0].content.includes("调度器"))
        return {
          text: JSON.stringify({
            action: "speak",
            speakerId: "engineer",
            followUp,
          }),
        };
      return {
        text:
          JSON.parse(input.messages[1].content).yourCharacter.id === "engineer"
            ? "你找得到手电筒吗？"
            : "我先确认其他设备的情况。",
      };
    })("alice", started.room, new AbortController().signal, () => {});
  }
  const saved = await store.get("alice", room.id);
  const messages = saved.messages.slice(2);
  assert.notEqual(messages[0].speakerId, "engineer");
  assert.equal(messages[1].speakerId, "engineer");
  assert.equal(messages[1].followUpTo, saved.messages[1].id);
  assert.notEqual(messages[2].speakerId, "engineer");
  assert.equal(pendingUserQuestions(saved)[0].followedUp, true);
  const imported = await store.import("alice", exportBackup(saved));
  assert.equal(imported.messages[3].followUpTo, imported.messages[1].id);
  assert.equal(pendingUserQuestions(imported)[0].followedUp, true);
});

test("ready narration uses one model call and a slow director yields to a nonwaiting NPC", async () => {
  for (const slow of [false, true]) {
    const { store, room } = await conversationWithQuestion();
    const started = await store.begin(
      "alice",
      room.id,
      command({ mode: "step" }),
    );
    await createWorldEngine(store, async (input) => {
      if (input.messages[0].content.includes("调度器")) {
        assert.equal(input.timeoutMs, 8000);
        if (slow) throw new WorldError("timeout", "选人超时");
        return { text: '{"action":"narrate","text":"对讲机传出新的呼叫声。"}' };
      }
      assert.equal(
        slow,
        true,
        "ready narration must not trigger another generation call",
      );
      assert.notEqual(
        JSON.parse(input.messages[1].content).yourCharacter.id,
        "engineer",
      );
      return fakeComplete(input);
    })("alice", started.room, new AbortController().signal, () => {});
    const saved = await store.get("alice", room.id);
    assert.equal(saved.run?.calls, slow ? 2 : 1);
    assert.equal(saved.messages.at(-1)?.status, "complete");
    assert.equal(saved.messages.at(-1)?.kind, slow ? "agent" : "narrator");
  }
});

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
    narratorContext(room, "继续剧情"),
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
  assert.equal(actors.length, 2);
  assert.equal(saved.messages[1].kind, "narrator");
  assert.ok(actors.every((m) => m.status === "complete"));
  assert.notEqual(actors[0].speakerId, actors[1].speakerId);
  assert.match(seen[1], /备用灯闪烁/);
  assert.match(seen[2], /我先检查一下控制台/);
  assert.equal(saved.run?.status, "completed");
  assert.equal(saved.run?.turns, 3);
  assert.equal(events.at(-1)?.type, "done");
  assert.deepEqual(
    saved.messages.map((m) => m.seq),
    [1, 2, 3, 4],
  );
});

test("mentions get ordered priority, then autonomous actors continue", async () => {
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
  const speakers = saved.messages
    .filter((m) => m.kind === "agent")
    .map((m) => m.speakerId);
  assert.deepEqual(speakers.slice(0, 2), ["reporter", "engineer"]);
  assert.equal(speakers.length, 2);
  assert.equal(saved.messages.at(-1)?.kind, "narrator");
});

test("a genuine user decision pauses instead of automatically scheduling again", async () => {
  const store = setup();
  const room = await store.create("alice", { ...exampleWorld, maxTurns: 4 });
  const started = await store.begin("alice", room.id, command());
  await createWorldEngine(store, async (input) =>
    input.messages[0].content.includes("调度器")
      ? {
          text: '{"action":"wait","question":"你是否愿意亲自进入断电的机房？"}',
        }
      : fakeComplete(input),
  )("alice", started.room, new AbortController().signal, () => {});
  const saved = await store.get("alice", room.id);
  assert.equal(saved.run?.status, "paused");
  assert.equal(saved.run?.reason, "等待你的决定");
  assert.equal(saved.paused, true);
  assert.equal(saved.messages.length, 3);
  assert.equal(saved.messages.at(-1)?.kind, "narrator");
  assert.match(saved.messages.at(-1)!.text, /是否愿意/);
});

test("pausing between replies preserves the completed reply and cancels the next actor", async () => {
  const store = setup();
  const room = await store.create("alice", exampleWorld);
  const started = await store.begin(
    "alice",
    room.id,
    command({ mentions: ["engineer", "reporter"] }),
  );
  let stop: Promise<unknown> | undefined;
  const done = createWorldEngine(store, fakeComplete)(
    "alice",
    started.room,
    new AbortController().signal,
    (event) => {
      if (event.type === "message" && event.message.status === "complete") {
        stop = store.stop("alice", room.id, event.runId).then(() => {
          abortRun(event.runId);
        });
      }
    },
  );
  await done;
  await stop;
  const saved = await store.get("alice", room.id);
  assert.equal(saved.run?.status, "paused");
  assert.equal(saved.run?.turns, 1);
  assert.equal(saved.messages.filter((m) => m.kind === "agent").length, 1);
  assert.equal(saved.messages.at(-1)?.status, "complete");
});

test("a two-character world still consults the director before the next actor", async () => {
  const store = setup();
  const room = await store.create("alice", {
    ...exampleWorld,
    characters: exampleWorld.characters.slice(0, 2),
  });
  await store.change("alice", room.id, (r) => {
    appendMessage(r, {
      speakerId: "system",
      name: "系统",
      kind: "narrator",
      text: "你们进入控制室。",
      status: "complete",
      runId: null,
      mentions: [],
    });
  });
  const started = await store.begin(
    "alice",
    room.id,
    command({ mentions: ["engineer"] }),
  );
  await createWorldEngine(store, async (input) =>
    input.messages[0].content.includes("调度器")
      ? { text: '{"action":"wait","question":"你是否愿意亲自进入机房？"}' }
      : fakeComplete(input),
  )("alice", started.room, new AbortController().signal, () => {});
  const saved = await store.get("alice", room.id);
  assert.equal(saved.run?.turns, 2);
  assert.equal(saved.messages.filter((m) => m.kind === "agent").length, 1);
  assert.equal(saved.run?.reason, "等待你的决定");
  assert.equal(saved.paused, true);
});

test("stop fences a pending request even when it reaches the server before begin", async () => {
  const store = setup();
  const room = await store.create("alice", exampleWorld);
  const input = command({ text: "开始吧", resume: true });
  await store.stop("alice", room.id, undefined, input.clientRequestId);
  await assert.rejects(store.begin("alice", room.id, input), /暂停/);
  const saved = await store.get("alice", room.id);
  assert.equal(saved.run, null);
  assert.equal(saved.messages.length, 0);
  assert.equal(saved.paused, true);
});

test("continuations need the completed run and cannot undo a pause or replace another run", async () => {
  const store = setup();
  const room = await store.create("alice", exampleWorld);
  const started = await store.begin("alice", room.id, command());
  // Simulate a committed batch without spending time generating its replies.
  await store.change("alice", room.id, (r) => {
    r.run!.status = "completed";
    r.run!.turns = r.run!.limit;
  });
  const continuation = command({ continueRunId: started.room.run!.id });
  const next = await store.begin("alice", room.id, continuation);
  assert.equal(next.value.started, true);
  assert.equal(next.room.messages.length, 0);
  await assert.rejects(
    store.begin(
      "alice",
      room.id,
      command({ continueRunId: started.room.run!.id }),
    ),
    /暂停或更新/,
  );
  await store.change("alice", room.id, (r) => {
    r.run!.status = "completed";
  });
  await store.stop("alice", room.id, next.room.run!.id);
  await assert.rejects(
    store.begin(
      "alice",
      room.id,
      command({ continueRunId: next.room.run!.id }),
    ),
    /暂停或更新/,
  );
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
  await store.change("alice", room.id, (r) => {
    appendMessage(r, {
      speakerId: "system",
      name: "系统",
      kind: "narrator",
      text: "控制室传来杂音。",
      status: "complete",
      runId: null,
      mentions: [],
    });
  });
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

test("ordinary unmentioned messages receive a selected actor response even when the director asks to wait", async () => {
  const store = setup();
  const room = await store.create("alice", exampleWorld);
  await store.change("alice", room.id, (r) => {
    appendMessage(r, {
      speakerId: "system",
      name: "系统",
      kind: "narrator",
      text: "你们来到控制室。",
      status: "complete",
      runId: null,
      mentions: [],
    });
  });
  for (const decision of [
    { action: "wait", question: "你要怎么做？" },
    {
      action: "speak",
      speakerId: "reporter",
      direction: "回应用户对停电原因的追问，提出一条可验证的线索。",
    },
  ]) {
    const started = await store.begin(
      "alice",
      room.id,
      command({ mode: "step", text: "停电前发生过什么？", resume: true }),
    );
    let actorInput = "";
    await createWorldEngine(store, async (input) => {
      if (input.messages[0].content.includes("调度器"))
        return { text: JSON.stringify(decision) };
      actorInput = input.messages[1].content;
      return fakeComplete(input);
    })("alice", started.room, new AbortController().signal, () => {});
    const saved = await store.get("alice", room.id);
    assert.equal(saved.messages.at(-1)?.kind, "agent");
    assert.equal(saved.run?.turns, 1);
    if (decision.action === "speak") {
      assert.equal(saved.messages.at(-1)?.speakerId, "reporter");
      assert.match(actorInput, /可验证的线索/);
    }
  }
});

test("system narration can be interrupted, retried and exported without becoming an NPC", async () => {
  const store = setup();
  const room = await store.create("alice", exampleWorld);
  const started = await store.begin(
    "alice",
    room.id,
    command({ mode: "step" }),
  );
  const controller = new AbortController();
  await createWorldEngine(store, async ({ onText }) => {
    onText?.("灯光开始闪烁");
    controller.abort();
    return { text: "不应提交" };
  })("alice", started.room, controller.signal, () => {});
  const interrupted = await store.get("alice", room.id);
  assert.equal(interrupted.messages.at(-1)?.kind, "narrator");
  assert.equal(interrupted.messages.at(-1)?.status, "interrupted");
  const retry = await store.begin(
    "alice",
    room.id,
    command({
      mode: "retry",
      retryMessageId: interrupted.messages.at(-1)!.id,
      resume: true,
    }),
  );
  await createWorldEngine(store, fakeComplete)(
    "alice",
    retry.room,
    new AbortController().signal,
    () => {},
  );
  const saved = await store.get("alice", room.id);
  assert.equal(saved.messages.at(-1)?.speakerId, "system");
  assert.equal(saved.messages.at(-1)?.status, "complete");
  const imported = await store.import("alice", exportBackup(saved));
  assert.equal(imported.messages.at(-1)?.kind, "narrator");
  assert.match(
    JSON.stringify(actorContext(imported, imported.config.characters[0])),
    /备用灯闪烁/,
  );
  assert.doesNotMatch(
    JSON.stringify(actorContext(imported, imported.config.characters[0])),
    /灯光开始闪烁/,
  );
});

test("the host can advance a scene, but repeated narration gives an actor the next turn", async () => {
  const store = setup();
  const room = await store.create("alice", exampleWorld);
  await store.change("alice", room.id, (r) => {
    appendMessage(r, {
      speakerId: "system",
      name: "系统",
      kind: "narrator",
      text: "你们进入控制室。",
      status: "complete",
      runId: null,
      mentions: [],
    });
    appendMessage(r, {
      speakerId: "engineer",
      name: "许岚",
      kind: "agent",
      text: "我检查一下。",
      status: "complete",
      runId: null,
      mentions: [],
    });
  });
  const complete: Complete = (input) =>
    input.messages[0].content.includes("调度器")
      ? Promise.resolve({
          text: '{"action":"narrate","direction":"对讲机出现新的公开信号"}',
        })
      : fakeComplete(input);
  for (const expected of ["narrator", "agent"]) {
    const started = await store.begin(
      "alice",
      room.id,
      command({ mode: "step" }),
    );
    await createWorldEngine(store, complete)(
      "alice",
      started.room,
      new AbortController().signal,
      () => {},
    );
    assert.equal(
      (await store.get("alice", room.id)).messages.at(-1)?.kind,
      expected,
    );
  }
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
  const bob = await store.create("bob", { ...exampleWorld, maxTurns: 1 });
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
