import assert from "node:assert/strict";
import { test } from "node:test";
import type { UIMessageChunk } from "ai";
import { lastValueFrom, Observable, of } from "rxjs";
import {
  type ChatStreamAdapter,
  createObservableState,
  defaultChatStreamAdapter,
} from "./chat-stream-adapter";
import { chatStreamText, flushChatStreamState } from "./chat-stream-state";

test("默认适配器保留请求格式，并处理跨网络块的 SSE 数据", async (t) => {
  let request: RequestInit | undefined;
  const encoder = new TextEncoder();
  const events: UIMessageChunk[] = [
    { type: "start", messageId: "reply-1" },
    { type: "text-start", id: "text-1" },
    { type: "text-delta", id: "text-1", delta: "你好" },
    { type: "text-end", id: "text-1" },
  ];
  const bytes = encoder.encode(
    `${events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("")}data: [DONE]\n\n`,
  );
  t.mock.method(
    globalThis,
    "fetch",
    async (url: RequestInfo | URL, init?: RequestInit) => {
      assert.equal(url, "/api/chat");
      request = init;
      return new Response(
        new ReadableStream({
          start(controller) {
            for (let index = 0; index < bytes.length; index += 5) {
              controller.enqueue(bytes.slice(index, index + 5));
            }
            controller.close();
          },
        }),
      );
    },
  );

  const state = await lastValueFrom(
    createObservableState(
      { url: "/api/chat", threadId: "thread-1", text: "hello" },
      defaultChatStreamAdapter,
    ),
  );

  assert.equal(request?.method, "POST");
  const body = JSON.parse(String(request?.body));
  assert.equal(body.threadId, "thread-1");
  assert.equal(body.trigger, "submit-message");
  assert.deepEqual(body.messages[0].parts, [{ type: "text", text: "hello" }]);
  assert.equal(state.messageId, "reply-1");
  assert.equal(chatStreamText(state), "你好");
  assert.equal(state.streamingText, "");
});

test("自定义入参和异步事件流复用同一状态归约与完成收尾", async () => {
  const adapter: ChatStreamAdapter<{ prompt: string; model: string }> =
    async function* (input, { signal }) {
      assert.equal(input.model, "example-model");
      assert.equal(signal.aborted, false);
      yield { type: "text-start", id: "custom-text" };
      yield { type: "text-delta", id: "custom-text", delta: input.prompt };
    };

  const state = await lastValueFrom(
    createObservableState(
      { prompt: "custom reply", model: "example-model" },
      adapter,
    ),
  );
  const flushed = flushChatStreamState(state);
  assert.deepEqual(flushed.blocks, [
    { kind: "text", id: "custom-text", content: "custom reply" },
  ]);
  assert.equal(flushed.streamingText, "");
});

test("同步抛错和流内错误事件进入 Observable 错误通道", async () => {
  await assert.rejects(
    lastValueFrom(
      createObservableState({}, () => {
        throw new Error("adapter failed");
      }),
    ),
    /adapter failed/,
  );
  await assert.rejects(
    lastValueFrom(
      createObservableState({}, () =>
        of<UIMessageChunk>({ type: "error", errorText: "provider failed" }),
      ),
    ),
    /provider failed/,
  );
});

test("取消订阅会中断适配器、执行清理且不触发完成或错误", () => {
  let signal: AbortSignal | undefined;
  let cleanupCount = 0;
  let completeCount = 0;
  let errorCount = 0;
  const adapter: ChatStreamAdapter<string> = (_, context) => {
    signal = context.signal;
    return new Observable(() => () => cleanupCount++);
  };
  const subscription = createObservableState("prompt", adapter).subscribe({
    complete: () => completeCount++,
    error: () => errorCount++,
  });

  assert.equal(signal?.aborted, false);
  subscription.unsubscribe();
  assert.equal(signal?.aborted, true);
  assert.equal(cleanupCount, 1);
  assert.equal(completeCount, 0);
  assert.equal(errorCount, 0);
});

test("默认适配器在 fetch 尚未响应时也能取消请求", async (t) => {
  let signal: AbortSignal | undefined;
  t.mock.method(
    globalThis,
    "fetch",
    (_url: RequestInfo | URL, init?: RequestInit) => {
      assert.ok(init?.signal);
      signal = init.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(signal?.reason), {
          once: true,
        });
      });
    },
  );
  let errorCount = 0;
  const subscription = createObservableState(
    { url: "/api/chat", threadId: "thread-1", text: "hello" },
    defaultChatStreamAdapter,
  ).subscribe({ error: () => errorCount++ });

  subscription.unsubscribe();
  assert.equal(signal?.aborted, true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(errorCount, 0);
});

test("同步事件流可以正常完成并释放适配器资源", async () => {
  let signal: AbortSignal | undefined;
  const state = await lastValueFrom(
    createObservableState("reply-sync", (messageId, context) => {
      signal = context.signal;
      return of<UIMessageChunk>({ type: "start", messageId });
    }),
  );
  assert.equal(state.messageId, "reply-sync");
  assert.equal(signal?.aborted, true);
});
