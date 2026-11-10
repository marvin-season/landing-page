import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createChatStateStream,
  flushChatStreamText,
  getChatStreamText,
} from "@landing-page/utils/stream";
import { lastValueFrom, toArray } from "rxjs";
import { POST } from "../../app/api/knowledge/chatv2/route";
import { mockChatStreamAdapter } from "./mock-chat-stream-adapter";

test("mock 接口通过适配器逐段输出完整回复，并保留中文、换行和 emoji", async (t) => {
  const input = {
    url: "/api/knowledge/chatv2?source=test",
    text: "你好\n介绍一下自己🙂",
  };
  let wireResponse: Response | undefined;
  t.mock.method(
    globalThis,
    "fetch",
    async (url: RequestInfo | URL, init?: RequestInit) => {
      assert.equal(url, input.url);
      assert.equal(init?.method, "POST");
      assert.deepEqual(JSON.parse(String(init?.body)), { text: input.text });
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

  const expected = `hello,i am your assiastant,${input.text}`;
  const states = await lastValueFrom(
    createChatStateStream(input, mockChatStreamAdapter).pipe(toArray()),
  );
  const replies = states.map(getChatStreamText);
  assert.ok(new Set(replies).size > 3);
  assert.ok(
    replies.some((reply) => reply.length > 0 && reply.length < expected.length),
  );
  assert.ok(replies.every((reply) => expected.startsWith(reply)));
  const final = flushChatStreamText(states[states.length - 1]);
  assert.equal(getChatStreamText(final), expected);
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
    lastValueFrom(
      createChatStateStream(
        { url: "/api/knowledge/chatv2", text: "" },
        mockChatStreamAdapter,
      ),
    ),
    /HTTP 400/,
  );
});
