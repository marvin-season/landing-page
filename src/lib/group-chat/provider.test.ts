import assert from "node:assert/strict";
import { type TestContext, test } from "node:test";
import { worldAgents } from "~/mastra-server/agents/world-agents";
import { WorldError } from "./model";
import { createTextCompletion } from "./provider";

function completion(t: TestContext, events: unknown[]) {
  const data =
    events.map((event) => `data: ${JSON.stringify(event)}\r\n\r\n`).join("") +
    "data: [DONE]\r\n\r\n";
  const bytes = new TextEncoder().encode(data);
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      assert.match(String(url), /\/chat\/completions$/);
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "cursor/auto");
      assert.equal(body.tool_choice, "none");
      assert.equal(body.tools, undefined);
      return new Response(
        new ReadableStream({
          start(controller) {
            for (let i = 0; i < bytes.length; i += 7)
              controller.enqueue(bytes.slice(i, i + 7));
            controller.close();
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    },
  );
  return createTextCompletion((purpose) => worldAgents[purpose]);
}
function input(onText?: (text: string) => void) {
  return {
    model: "cursor/auto",
    messages: [{ role: "user" as const, content: "test" }],
    signal: new AbortController().signal,
    maxCharacters: 100,
    onText,
  };
}
function chunk(delta: unknown, finish_reason: string | null = null) {
  return {
    id: "test",
    created: 1,
    model: "cursor/auto",
    choices: [{ index: 0, delta, finish_reason }],
  };
}
test("Mastra adapter handles UTF-8, empty deltas and usage-only frames without exposing reasoning", async (t) => {
  let streamed = "";
  const complete = completion(t, [
    chunk({ role: "assistant", content: "" }),
    chunk({ reasoning_content: "private reasoning" }),
    chunk({ content: "你好，" }),
    chunk({ content: "世界" }),
    chunk({}, "stop"),
    {
      id: "test",
      created: 1,
      model: "cursor/auto",
      choices: [],
      usage: { prompt_tokens: 20, completion_tokens: 9 },
    },
  ]);
  const result = await complete(
    input((text) => {
      streamed += text;
    }),
  );
  assert.equal(result.text, "你好，世界");
  assert.equal(streamed, result.text);
  assert.deepEqual(result.usage, { input: 20, output: 9 });
});
test("Mastra adapter rejects tool execution and incomplete/empty output", async (t) => {
  for (const events of [
    [
      chunk({
        tool_calls: [
          {
            index: 0,
            id: "tool-1",
            type: "function",
            function: { name: "execute", arguments: "{}" },
          },
        ],
      }),
      chunk({}, "tool_calls"),
    ],
    [chunk({ content: "partial" })],
    [chunk({}, "stop")],
    [chunk({ content: "cut" }, "length")],
  ]) {
    await assert.rejects(
      completion(t, events)(input()),
      (error: unknown) =>
        error instanceof WorldError &&
        ["tools_disabled", "incomplete"].includes(error.code),
    );
  }
});
test("Mastra adapter bounds visible text and never treats a truncated reply as complete", async (t) => {
  let streamed = "";
  await assert.rejects(
    completion(t, [chunk({ content: "123456789" }), chunk({}, "stop")])({
      ...input((text) => {
        streamed += text;
      }),
      maxCharacters: 5,
    }),
    (error: unknown) =>
      error instanceof WorldError && error.code === "truncated",
  );
  assert.equal(streamed, "12345");
});

test("a short selection deadline aborts the provider without cancelling the room", async (t) => {
  let aborted = false;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const abort = () => {
          aborted = true;
          reject(init?.signal?.reason);
        };
        if (init?.signal?.aborted) abort();
        else init?.signal?.addEventListener("abort", abort, { once: true });
      }),
  );
  const complete = createTextCompletion((purpose) => worldAgents[purpose]);
  const request = { ...input(), timeoutMs: 25 };
  await assert.rejects(
    complete(request),
    (error: unknown) => error instanceof WorldError && error.code === "timeout",
  );
  assert.equal(aborted, true);
  assert.equal(request.signal.aborted, false);
});

test("simultaneous NPC calls keep their model and instructions isolated", async (t) => {
  const requests: Array<{
    model: string;
    messages: Array<{ content: string }>;
  }> = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      requests.push(body);
      await new Promise((resolve) =>
        setTimeout(resolve, body.model === "npc/a" ? 10 : 1),
      );
      return new Response(
        `data: ${JSON.stringify(chunk({ content: body.model }))}\n\ndata: ${JSON.stringify(chunk({}, "stop"))}\n\ndata: [DONE]\n\n`,
        { headers: { "Content-Type": "text/event-stream" } },
      );
    },
  );
  const complete = createTextCompletion((purpose) => worldAgents[purpose]);
  const results = await Promise.all(
    ["a", "b"].map((name) =>
      complete({
        ...input(),
        model: `npc/${name}`,
        messages: [
          { role: "system", content: `private-${name}` },
          { role: "user", content: `context-${name}` },
        ],
      }),
    ),
  );
  assert.deepEqual(
    results.map((result) => result.text),
    ["npc/a", "npc/b"],
  );
  for (const request of requests) {
    const name = request.model.slice(-1);
    assert.deepEqual(
      request.messages.map((message) => message.content),
      [`private-${name}`, `context-${name}`],
    );
  }
});

test("Mastra HTTP errors preserve actionable proxy error codes", async (t) => {
  for (const [status, code] of [
    [401, "proxy_auth"],
    [429, "rate_limit"],
    [400, "incompatible"],
  ] as const) {
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => {
      calls += 1;
      return Response.json({ error: { message: "Rejected" } }, { status });
    });
    await assert.rejects(
      createTextCompletion((purpose) => worldAgents[purpose])(input()),
      (error: unknown) => error instanceof WorldError && error.code === code,
    );
    assert.equal(calls, 1, "one budgeted call must not silently retry");
  }
});

test("cancelling a Mastra stream keeps partial text out of successful results", async (t) => {
  const controller = new AbortController();
  let partial = "";
  const complete = completion(t, [
    chunk({ content: "第一段" }),
    chunk({ content: "迟到段" }),
    chunk({}, "stop"),
  ]);
  await assert.rejects(
    complete({
      ...input((delta) => {
        partial += delta;
        controller.abort();
      }),
      signal: controller.signal,
    }),
    (error: unknown) => error instanceof WorldError && error.code === "stopped",
  );
  assert.equal(partial, "第一段");
});
