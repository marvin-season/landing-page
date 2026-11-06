import assert from "node:assert/strict";
import { test } from "node:test";
import { lastValueFrom, toArray } from "rxjs";
import { POST } from "../../app/api/knowledge/chatv2/route";
import { createObservableState } from "./chat-stream-adapter";
import { chatStreamText, flushChatStreamState } from "./chat-stream-state";
import { mockChatStreamAdapter } from "./mock-chat-stream-adapter";

test("mock 接口通过适配器逐段输出完整回复，并保留中文、换行和 emoji", async (t) => {
  let wireResponse: Response | undefined;
  t.mock.method(
    globalThis,
    "fetch",
    async (url: RequestInfo | URL, init?: RequestInit) => {
      assert.equal(url, "/api/knowledge/chatv2");
      assert.equal(init?.method, "POST");
      const response = await POST(new Request(`http://localhost${url}`, init));
      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get("Content-Type"),
        "text/event-stream; charset=utf-8",
      );
      wireResponse = response.clone();
      return response;
    },
  );

  const text = "你好\n介绍一下自己🙂";
  const expected = `hello,i am your assiastant,${text}`;
  const states = await lastValueFrom(
    createObservableState({ text }, mockChatStreamAdapter).pipe(toArray()),
  );
  const replies = states.map(chatStreamText);
  assert.ok(new Set(replies).size > 3);
  assert.ok(
    replies.some((reply) => reply.length > 0 && reply.length < expected.length),
  );
  assert.ok(replies.every((reply) => expected.startsWith(reply)));
  const final = flushChatStreamState(states[states.length - 1]);
  assert.equal(chatStreamText(final), expected);
  assert.equal(final.streamingText, "");
  assert.equal(final.blocks.length, 1);

  assert.ok(wireResponse);
  const wireText = await wireResponse.text();
  assert.ok(wireText.endsWith("\n\n"));
  const frames = wireText.trimEnd().split("\n\n");
  assert.equal(frames.pop(), "data: [DONE]");
  const deltas = frames.map((frame) => {
    assert.ok(frame.startsWith("data: "));
    return JSON.parse(frame.slice(6)).delta;
  });
  assert.equal(deltas.join(""), expected);
});

test("mock 接口拒绝无效请求，适配器将 HTTP 错误传递给调用方", async (t) => {
  for (const body of [
    "invalid JSON",
    "null",
    "{}",
    '{"text":1}',
    '{"text":" "}',
  ]) {
    const response = await POST(
      new Request("http://localhost/api/knowledge/chatv2", {
        method: "POST",
        body,
      }),
    );
    assert.equal(response.status, 400);
  }

  t.mock.method(
    globalThis,
    "fetch",
    (url: RequestInfo | URL, init?: RequestInit) =>
      POST(new Request(`http://localhost${url}`, init)),
  );
  await assert.rejects(
    lastValueFrom(createObservableState({ text: "" }, mockChatStreamAdapter)),
    /HTTP 400/,
  );
});
