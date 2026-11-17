import assert from "node:assert/strict";
import { test } from "node:test";
import { worldAgents } from "~/mastra-server/agents/world-agents";
import { actorContext, narratorContext, summaryContext } from "./context";
import type { WorldRoom } from "./model";
import { createTextCompletion, type ModelMessage } from "./provider";
import { worldSessionId } from "./session";
import { appendMessage } from "./store";
import { exampleWorld } from "./world-templates";

function room(): WorldRoom {
  return {
    id: "test-room",
    ownerId: "alice",
    config: structuredClone(exampleWorld),
    status: "active",
    version: 1,
    snapshots: [],
    messages: [],
    summary: null,
    run: null,
    runs: [],
    paused: true,
    createdAt: "2026-11-17T00:00:00.000Z",
    updatedAt: "2026-11-17T00:00:00.000Z",
  };
}

test("cache sessions survive turns and summaries but isolate owners, rooms, roles, models and configuration", () => {
  const saved = room();
  const character = saved.config.characters[0];
  character.privateInfo = "PRIVATE_SESSION_TOKEN";
  const id = worldSessionId(saved, "actor", character.model, character.id);
  assert.doesNotMatch(id, /PRIVATE_SESSION_TOKEN|alice|test-room/);
  assert.ok(id.length <= 128);
  const progressed = structuredClone(saved);
  progressed.version++;
  progressed.summary = {
    text: "公开剧情已推进",
    throughSeq: 3,
    configVersion: 1,
  };
  assert.equal(
    worldSessionId(progressed, "actor", character.model, character.id),
    id,
  );
  for (const other of [
    { ...saved, id: "other-room" },
    { ...saved, ownerId: "bob" },
    { ...saved, config: { ...saved.config, rules: "新的世界规则" } },
  ])
    assert.notEqual(
      worldSessionId(other, "actor", character.model, character.id),
      id,
    );
  assert.notEqual(
    worldSessionId(saved, "actor", "another-model", character.id),
    id,
  );
  assert.notEqual(
    worldSessionId(
      saved,
      "actor",
      character.model,
      saved.config.characters[1].id,
    ),
    id,
  );
  const narrator = worldSessionId(saved, "narrator", character.model);
  const summary = worldSessionId(saved, "summary", character.model);
  assert.equal(new Set([id, narrator, summary]).size, 3);
});

test("all three agents send stable first user messages and fresh complete state through Mastra", async (t) => {
  const requests: Array<{ session: string | null; messages: ModelMessage[] }> =
    [];
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      requests.push({
        session: new Headers(init?.headers).get("X-Magpie-Session"),
        messages: body.messages,
      });
      const event = (delta: unknown, finish_reason: string | null = null) =>
        JSON.stringify({
          id: "test",
          created: 1,
          model: body.model,
          choices: [{ index: 0, delta, finish_reason }],
        });
      return new Response(
        `data: ${event({ content: "ok" })}\n\ndata: ${event({}, "stop")}\n\ndata: [DONE]\n\n`,
        {
          headers: { "Content-Type": "text/event-stream" },
        },
      );
    },
  );
  const complete = createTextCompletion((purpose) => worldAgents[purpose]);
  for (const purpose of ["actor", "narrator", "summary"] as const) {
    const saved = room();
    const character = saved.config.characters[0];
    for (let turn = 0; turn < 2; turn++) {
      await complete({
        purpose,
        sessionId: worldSessionId(
          saved,
          purpose,
          character.model,
          purpose === "actor" ? character.id : undefined,
        ),
        model: character.model,
        messages:
          purpose === "actor"
            ? actorContext(saved, character, `本轮任务${turn}`)
            : purpose === "narrator"
              ? narratorContext(saved, `本轮任务${turn}`)
              : summaryContext(saved, saved.messages),
        signal: new AbortController().signal,
        maxCharacters: 100,
      });
      saved.version++;
      appendMessage(saved, {
        kind: "intervention",
        speakerId: "system",
        name: "系统",
        text: "NEW_PUBLIC_EVENT",
        status: "complete",
        runId: null,
        mentions: [],
      });
      saved.summary = {
        text: "UPDATED_SUMMARY",
        throughSeq: 0,
        configVersion: 1,
      };
    }
    const [before, after] = requests.slice(-2);
    assert.ok(before.session);
    assert.equal(before.session, after.session);
    const initial = (request: typeof before) =>
      request.messages.find((message) => message.role === "user");
    assert.deepEqual(
      initial(before),
      initial(after),
      "Magpie hashes the first user message into the conversation ID",
    );
    assert.deepEqual(before.messages[0], after.messages[0]);
    assert.doesNotMatch(
      initial(after)!.content,
      /NEW_PUBLIC_EVENT|UPDATED_SUMMARY|本轮任务/,
    );
    const latest = after.messages.at(-1)!.content;
    assert.match(latest, /NEW_PUBLIC_EVENT/);
    assert.match(latest, /UPDATED_SUMMARY/);
    if (purpose !== "summary") assert.match(latest, /本轮任务1/);
    if (purpose !== "actor")
      assert.doesNotMatch(JSON.stringify(after.messages), /备用回路/);
  }
  assert.equal(new Set(requests.map((request) => request.session)).size, 3);
});
