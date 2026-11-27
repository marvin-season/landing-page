import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@libsql/client";
import { Mastra } from "@mastra/core/mastra";
import {
  novelRequest,
  rewriteInstructions,
  summaryInstructions,
  writerInstructions,
} from "@/app/agent/worlds/_components/novel/model";
import { worldAgents } from "~/mastra-server/agents/world-agents";
import { WorldError, type WorldRoom } from "./model";
import { createNovelHandlers } from "./novel";
import { createNovelRunStore, novelRunTimeoutMs } from "./novel-run-store";
import { exampleWorld } from "./world-templates";

process.env.DEEPSEEK_API_KEY ||= "test-deepseek-key";

function room(): WorldRoom {
  const config = structuredClone(exampleWorld);
  config.characters[0].enabled = false;
  config.characters[0].model = "disabled/model";
  config.characters[1].enabled = true;
  config.characters[1].model = "deepseek/deepseek-chat";
  return {
    id: "novel-room",
    kind: "novel",
    ownerId: "alice",
    config,
    status: "active",
    version: 1,
    snapshots: [],
    messages: [],
    summary: null,
    run: null,
    runs: [],
    paused: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
type TestRun = ReturnType<typeof novelRequest> & {
  runId: string;
  version: number;
};
function runRequest(
  roomId: string,
  prompt: string,
  task?: TestRun["task"],
): TestRun {
  return {
    ...novelRequest(roomId, prompt, task),
    runId: crypto.randomUUID(),
    version: 1,
  };
}

function request(
  body: unknown,
  origin = "http://localhost",
  signal?: AbortSignal,
) {
  return new Request("http://localhost/api/novel", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
}
function statusRequest({ roomId, runId }: TestRun, method = "GET") {
  return new Request(
    `http://localhost/api/novel?${new URLSearchParams({ roomId, runId })}`,
    {
      method,
      headers: { origin: "http://localhost" },
    },
  );
}

function fixture(t: import("node:test").TestContext, now?: () => number) {
  const db = createClient({ url: ":memory:" });
  t.after(() => db.close());
  const runs = createNovelRunStore(() => db, now);
  const jobs: Array<() => Promise<void>> = [];
  return {
    runs,
    jobs,
    schedule: (work: () => Promise<void>) => jobs.push(work),
  };
}

const mastra = new Mastra({ agents: { writer: worldAgents.writer } });

test("novel writing, summaries and rewrites stream through DeepSeek with server-owned instructions and tool policy", async (t) => {
  const saved = room();
  const ctx = fixture(t);
  const bodies: Array<{
    messages: Array<{ content: string }>;
    tool_choice?: unknown;
    tools?: unknown;
  }> = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      assert.match(
        String(url),
        /^https:\/\/api\.deepseek\.com\/.*chat\/completions/,
      );
      const headers = new Headers(init?.headers);
      assert.match(headers.get("authorization") ?? "", /^Bearer\s+/);
      assert.equal(headers.get("X-Magpie-Session"), null);
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "deepseek-chat");
      bodies.push(body);
      const chunk = (delta: unknown, finish_reason: string | null = null) =>
        `data: ${JSON.stringify({ id: "test", created: 1, model: body.model, choices: [{ index: 0, delta, finish_reason }] })}\n\n`;
      return new Response(
        `${chunk({ content: "小说正文" })}${chunk({}, "stop")}data: [DONE]\n\n`,
        {
          headers: { "Content-Type": "text/event-stream" },
        },
      );
    },
  );
  const handle = createNovelHandlers({
    getUser: async () => "alice",
    store: {
      get: async (ownerId, id) => {
        assert.equal(ownerId, saved.ownerId);
        assert.equal(id, saved.id);
        return saved;
      },
    },
    mastra,
    ...ctx,
  });
  const cases = [
    ["chapter", writerInstructions],
    ["summary", summaryInstructions],
    ["rewrite", rewriteInstructions],
  ] as const;
  for (const [task, instructions] of cases) {
    const run = runRequest(saved.id, "完整小说上下文", task);
    const page = new AbortController();
    const response = await handle(
      request(
        {
          ...run,
          instructions: "untrusted override",
          model: "deepseek/deepseek-chat",
          activeTools: ["weatherTool"],
        },
        undefined,
        page.signal,
      ),
    );
    assert.equal(response.status, 202);
    page.abort();
    assert.deepEqual(await (await handle(statusRequest(run))).json(), {
      status: "running",
      text: "",
      incomplete: false,
      error: null,
      phase: "preparing",
    });
    assert.equal((await handle(request(run))).status, 202);
    assert.equal(ctx.jobs.length, 1);
    const job = ctx.jobs.shift();
    assert.ok(job);
    await job();
    assert.deepEqual(await (await handle(statusRequest(run))).json(), {
      status: "completed",
      text: "小说正文",
      incomplete: false,
      error: null,
    });
    const body = bodies.at(-1);
    const messages = body?.messages;
    assert.deepEqual(
      messages?.map((message) => message.content),
      [instructions, "完整小说上下文"],
    );
    if (task === "summary") {
      // DeepSeek 直连时无工具可不带 tool_choice；有工具时才显式 auto。
      assert.ok(
        body?.tool_choice === undefined || body?.tool_choice === "none",
      );
      assert.equal(body?.tools, undefined);
    } else {
      assert.ok(Array.isArray(body?.tools) && body.tools.length > 0);
    }
  }
});

test("novel endpoint rejects anonymous, cross-origin, invalid and inaccessible room requests before calling a model", async (t) => {
  const ctx = fixture(t);
  let reads = 0;
  const store = {
    get: async () => {
      reads++;
      throw new WorldError("not_found", "房间不存在或无权访问", 404);
    },
  };
  const anonymous = createNovelHandlers({
    getUser: async () => null,
    store,
    mastra,
    ...ctx,
  });
  const handle = createNovelHandlers({
    getUser: async () => "bob",
    store,
    mastra,
    ...ctx,
  });
  const body = runRequest("novel-room", "上下文");
  assert.equal((await anonymous(request(body))).status, 401);
  assert.equal(
    (await handle(request(body, "https://other.example"))).status,
    403,
  );
  assert.equal(
    (await handle(request({ ...body, prompt: "x".repeat(150001) }))).status,
    400,
  );
  assert.equal((await handle(request({ ...body, task: "tools" }))).status, 400);
  assert.equal(reads, 0);
  assert.equal((await handle(request(body))).status, 404);
  assert.equal(reads, 1);
});

test("novel endpoint accepts only novel rooms that have not ended", async (t) => {
  const ctx = fixture(t);
  const saved = room();
  const body = runRequest(saved.id, "上下文");
  const handle = createNovelHandlers({
    getUser: async () => "alice",
    store: { get: async () => saved },
    mastra,
    ...ctx,
  });
  saved.kind = "script";
  const script = await handle(request(body));
  assert.equal(script.status, 409);
  assert.match((await script.json()).error, /小说存档/);
  saved.kind = "novel";
  saved.status = "ended";
  const ended = await handle(request(body));
  assert.equal(ended.status, 409);
  assert.match((await ended.json()).error, /已结束/);
});

test("another request can resume a live run and cancellation keeps its last published text", async (t) => {
  const ctx = fixture(t);
  const saved = room();
  const run = runRequest(saved.id, "续写");
  const started = Promise.withResolvers<AbortSignal>();
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      assert.ok(init.signal);
      started.resolve(init.signal);
      const data = {
        id: "writer",
        choices: [
          { index: 0, delta: { content: "首段" }, finish_reason: null },
        ],
      };
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`),
            );
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    },
  );
  const makeHandler = (ownerId: string) =>
    createNovelHandlers({
      getUser: async () => ownerId,
      store: {
        get: async (owner) => {
          if (owner !== saved.ownerId)
            throw new WorldError("not_found", "不存在", 404);
          return saved;
        },
      },
      mastra,
      ...ctx,
    });
  const initial = makeHandler("alice");
  const resumed = makeHandler("alice");
  const otherUser = makeHandler("bob");
  const tab = new AbortController();
  assert.equal(
    (await initial(request(run, undefined, tab.signal))).status,
    202,
  );
  const job = ctx.jobs[0]();
  const upstream = await started.promise;
  tab.abort();
  assert.equal(upstream.aborted, false);
  await t.waitFor(async () => {
    const progress = await (await resumed(statusRequest(run))).json();
    assert.equal(progress.status, "running");
    assert.equal(progress.text, "首段");
  });
  assert.equal((await otherUser(statusRequest(run))).status, 404);
  assert.equal((await otherUser(statusRequest(run, "DELETE"))).status, 404);
  const cancelled = await (await resumed(statusRequest(run, "DELETE"))).json();
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.text, "首段");
  await job;
  assert.equal(upstream.aborted, true);
  assert.deepEqual(await (await resumed(statusRequest(run))).json(), cancelled);
});

test("stop before acceptance prevents a late POST from starting the model and expired workers retain partial output", async (t) => {
  let time = 10;
  const ctx = fixture(t, () => time);
  const saved = room();
  const handle = createNovelHandlers({
    getUser: async () => "alice",
    store: { get: async () => saved },
    mastra,
    ...ctx,
  });
  const run = runRequest(saved.id, "继续");
  await handle(statusRequest(run, "DELETE"));
  assert.equal((await handle(request(run))).status, 202);
  assert.equal(ctx.jobs.length, 0);
  const slow = runRequest(saved.id, "继续");
  await handle(request(slow));
  const key = [saved.ownerId, saved.id, slow.runId] as [string, string, string];
  await ctx.runs.write(key, {
    status: "running",
    text: "可保留的正文",
    incomplete: false,
    error: null,
  });
  time += novelRunTimeoutMs + 10_001;
  const status = await (await handle(statusRequest(slow))).json();
  assert.equal(status.status, "failed");
  assert.equal(status.text, "可保留的正文");
});
