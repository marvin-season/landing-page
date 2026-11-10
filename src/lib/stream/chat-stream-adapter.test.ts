import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ChatStreamAdapter,
  chatStreamText,
  createObservableEvents,
  createObservableState,
  flushChatStreamState,
} from "@landing-page/utils/stream";
import type { UIMessageChunk } from "ai";
import { lastValueFrom, Observable, of, take, toArray } from "rxjs";
import { submitMessageStreamAdapter } from "./chat-stream-adapter";

test("通用事件流原样输出自定义事件，不解释 type 或归约状态", async () => {
  type CustomEvent = { type: string; value: number };
  const events: CustomEvent[] = [
    { type: "progress", value: 1 },
    { type: "error", value: 2 },
    { type: "progress", value: 3 },
  ];
  const adapter: ChatStreamAdapter<{ id: number }, CustomEvent> = (input) => {
    assert.equal(input.id, 7);
    return events;
  };
  const received = await lastValueFrom(
    createObservableEvents({ id: 7 }, adapter).pipe(toArray()),
  );

  assert.deepEqual(received, events);
  assert.ok(received.every((event, index) => event === events[index]));
});

test("通用事件流支持异步字符串，并为每次订阅创建独立取消信号", async () => {
  const signals: AbortSignal[] = [];
  const events = createObservableEvents(
    "hello",
    async function* (input, context) {
      signals.push(context.signal);
      yield input;
      yield " world";
    },
  );

  assert.deepEqual(await lastValueFrom(events.pipe(toArray())), [
    "hello",
    " world",
  ]);
  assert.deepEqual(await lastValueFrom(events.pipe(toArray())), [
    "hello",
    " world",
  ]);
  assert.notEqual(signals[0], signals[1]);
  assert.ok(signals.every((signal) => signal.aborted));
});

test("同步事件消费结束时立即取消源并释放资源", async () => {
  let produced = 0;
  let cleanupCount = 0;
  let signal: AbortSignal | undefined;
  const received = await lastValueFrom(
    createObservableEvents(undefined, (_, context) => {
      signal = context.signal;
      return new Observable<number>((subscriber) => {
        for (let value = 0; value < 3 && !subscriber.closed; value++) {
          produced++;
          subscriber.next(value);
        }
        return () => cleanupCount++;
      });
    }).pipe(take(1), toArray()),
  );

  assert.deepEqual(received, [0]);
  assert.equal(produced, 1);
  assert.equal(signal?.aborted, true);
  assert.equal(cleanupCount, 1);
});

test("项目适配器保留请求格式，并处理跨网络块的 SSE 数据", async (t) => {
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
      submitMessageStreamAdapter,
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

test("项目适配器在 fetch 尚未响应时也能取消请求", async (t) => {
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
    submitMessageStreamAdapter,
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
