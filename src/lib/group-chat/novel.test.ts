import assert from "node:assert/strict";
import { test } from "node:test";
import { Mastra } from "@mastra/core/mastra";
import {
  novelRequest,
  summaryInstructions,
  writerInstructions,
} from "@/app/agent/worlds/_components/novel/model";
import { worldAgents } from "~/mastra-server/agents/world-agents";
import { WorldError, type WorldRoom } from "./model";
import { createNovelHandler } from "./novel";
import { worldSessionId } from "./session";
import { exampleWorld } from "./world-templates";

function room(): WorldRoom {
  const config = structuredClone(exampleWorld);
  config.characters[0].enabled = false;
  config.characters[0].model = "disabled/model";
  config.characters[1].enabled = true;
  config.characters[1].model = "kiro/auto";
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
function request(body: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/novel", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
}
const mastra = new Mastra({ agents: { writer: worldAgents.writer } });

test("novel chapters and summaries stream through the world proxy with server-owned model, instructions and tool policy", async (t) => {
  const saved = room();
  const bodies: Array<{ messages: Array<{ content: string }> }> = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init?: RequestInit) => {
      assert.equal(
        String(url),
        `${process.env.GROUP_CHAT_BASE_URL || "http://127.0.0.1:3425/v1"}/chat/completions`,
      );
      const headers = new Headers(init?.headers);
      assert.equal(
        headers.get("authorization"),
        `Bearer ${process.env.GROUP_CHAT_API_KEY || "magpie"}`,
      );
      assert.equal(
        headers.get("X-Magpie-Session"),
        worldSessionId(saved, "writer", "kiro/auto"),
      );
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "kiro/auto");
      assert.equal(body.tool_choice, "none");
      assert.equal(body.tools, undefined);
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
  const handle = createNovelHandler({
    getUser: async () => "alice",
    store: {
      get: async (ownerId, id) => {
        assert.equal(ownerId, saved.ownerId);
        assert.equal(id, saved.id);
        return saved;
      },
    },
    mastra,
  });
  for (const task of ["chapter", "summary"] as const) {
    const response = await handle(
      request({
        ...novelRequest(saved.id, "完整小说上下文", task),
        instructions: "untrusted override",
        model: "deepseek/deepseek-chat",
        activeTools: ["weatherTool"],
      }),
    );
    assert.equal(response.status, 200);
    const stream = await response.text();
    assert.match(stream, /"type":"text-delta"/);
    assert.match(stream, /小说正文/);
    assert.match(stream, /"type":"finish"/);
    const messages = bodies.at(-1)?.messages;
    assert.deepEqual(
      messages?.map((message) => message.content),
      [
        task === "summary" ? summaryInstructions : writerInstructions,
        "完整小说上下文",
      ],
    );
  }
});

test("novel endpoint rejects anonymous, cross-origin, invalid and inaccessible room requests before calling a model", async () => {
  let reads = 0;
  const store = {
    get: async () => {
      reads++;
      throw new WorldError("not_found", "房间不存在或无权访问", 404);
    },
  };
  const anonymous = createNovelHandler({
    getUser: async () => null,
    store,
    mastra,
  });
  const handle = createNovelHandler({
    getUser: async () => "bob",
    store,
    mastra,
  });
  const body = novelRequest("novel-room", "上下文");
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

test("novel endpoint accepts only novel rooms that have not ended", async () => {
  const saved = room();
  const body = novelRequest(saved.id, "上下文");
  const handle = createNovelHandler({
    getUser: async () => "alice",
    store: { get: async () => saved },
    mastra,
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
