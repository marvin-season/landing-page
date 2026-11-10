import assert from "node:assert/strict";
import { test } from "node:test";
import OpenAI from "openai";
import { WorldError } from "./model";
import { createTextCompletion } from "./provider";

function completion(events: unknown[]) {
  const data =
    events.map((event) => `data: ${JSON.stringify(event)}\r\n\r\n`).join("") +
    "data: [DONE]\r\n\r\n";
  const bytes = new TextEncoder().encode(data);
  return createTextCompletion(
    () =>
      new OpenAI({
        apiKey: "test",
        maxRetries: 0,
        fetch: async (_url, init) => {
          assert.equal(JSON.parse(String(init?.body)).tool_choice, "none");
          return new Response(
            new ReadableStream({
              start(controller) {
                // Split UTF-8 text and JSON/SSE boundaries, as a real network can do.
                for (let i = 0; i < bytes.length; i += 7)
                  controller.enqueue(bytes.slice(i, i + 7));
                controller.close();
              },
            }),
            { headers: { "Content-Type": "text/event-stream" } },
          );
        },
      }),
  );
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
  return { choices: [{ index: 0, delta, finish_reason }] };
}
test("SDK adapter handles UTF-8, empty deltas and usage-only frames without exposing reasoning", async () => {
  let streamed = "";
  const complete = completion([
    chunk({ role: "assistant", content: "" }),
    chunk({ reasoning_content: "private reasoning" }),
    chunk({ content: "你好，" }),
    chunk({ content: "世界" }),
    chunk({}, "stop"),
    { choices: [], usage: { prompt_tokens: 20, completion_tokens: 9 } },
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
test("SDK adapter rejects tool execution and incomplete/empty output", async () => {
  for (const events of [
    [chunk({ tool_calls: [{ index: 0, function: { name: "execute" } }] })],
    [chunk({ content: "partial" })],
    [chunk({}, "stop")],
    [chunk({ content: "cut" }, "length")],
  ]) {
    await assert.rejects(
      completion(events)(input()),
      (error: unknown) =>
        error instanceof WorldError &&
        ["tools_disabled", "incomplete"].includes(error.code),
    );
  }
});
test("SDK adapter bounds visible text and never treats a truncated reply as complete", async () => {
  let streamed = "";
  await assert.rejects(
    completion([chunk({ content: "123456789" }), chunk({}, "stop")])({
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

test("a short selection deadline aborts the provider without cancelling the room", async () => {
  let aborted = false;
  const complete = createTextCompletion(
    () =>
      new OpenAI({
        apiKey: "test",
        maxRetries: 0,
        fetch: async (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            const abort = () => {
              aborted = true;
              reject(init?.signal?.reason);
            };
            if (init?.signal?.aborted) abort();
            else init?.signal?.addEventListener("abort", abort, { once: true });
          }),
      }),
  );
  const request = { ...input(), timeoutMs: 25 };
  await assert.rejects(
    complete(request),
    (error: unknown) => error instanceof WorldError && error.code === "timeout",
  );
  assert.equal(aborted, true);
  assert.equal(request.signal.aborted, false);
});
