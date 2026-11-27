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
    kind: "script",
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

test("all three agents send growing dialogue and fresh state through Mastra", async (t) => {
  process.env.DEEPSEEK_API_KEY ||= "test-deepseek-key";
  const requests: Array<{ messages: ModelMessage[]; sessionId: string }> = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const event = (delta: unknown, finish_reason: string | null = null) =>
        JSON.stringify({
          id: "test",
          created: 1,
          model: body.model,
          choices: [{ index: 0, delta, finish_reason }],
        });
      return new Response(
        `data: ${event({ content: `reply-${requests.length + 1}` })}\n\ndata: ${event({}, "stop")}\n\ndata: [DONE]\n\n`,
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
    for (let turn = 0; turn < 3; turn++) {
      const sessionId = worldSessionId(
        saved,
        purpose,
        character.model,
        purpose === "actor" ? character.id : undefined,
      );
      const messages =
        purpose === "actor"
          ? actorContext(saved, character, `本轮任务${turn}`)
          : purpose === "narrator"
            ? narratorContext(saved, `本轮任务${turn}`)
            : summaryContext(saved, saved.messages);
      requests.push({ messages, sessionId });
      const result = await complete({
        purpose,
        sessionId,
        model: character.model,
        messages,
        signal: new AbortController().signal,
        maxCharacters: 100,
      });
      saved.version++;
      appendMessage(saved, {
        kind: purpose === "narrator" ? "narrator" : "agent",
        speakerId: purpose === "narrator" ? "system" : character.id,
        name: purpose === "narrator" ? "旁白" : character.name,
        text: result.text,
        status: "complete",
        runId: null,
        mentions: [],
      });
      appendMessage(saved, {
        kind: "intervention",
        speakerId: "system",
        name: "系统",
        text: `NEW_PUBLIC_EVENT_${turn}`,
        status: "complete",
        runId: null,
        mentions: [],
      });
      appendMessage(saved, {
        kind: "agent",
        speakerId: saved.config.characters[1].id,
        name: saved.config.characters[1].name,
        text: `PEER_REPLY_${turn}`,
        status: "complete",
        runId: null,
        mentions: [character.id],
      });
      appendMessage(saved, {
        kind: "agent",
        speakerId: character.id,
        name: character.name,
        text: "UNFINISHED_REPLY",
        status: "interrupted",
        runId: null,
        mentions: [],
      });
      saved.summary = {
        text: "UPDATED_SUMMARY",
        throughSeq: 0,
        configVersion: 1,
      };
    }
    const [before, middle, after] = requests.slice(-3);
    assert.ok(before.sessionId);
    assert.equal(before.sessionId, after.sessionId);
    assert.equal(before.sessionId, middle.sessionId);
    const initial = (request: typeof before) =>
      request.messages.find((message) => message.role === "user");
    assert.deepEqual(
      initial(before),
      initial(after),
      "stable worldSessionId keeps the first user message identity across turns",
    );
    assert.deepEqual(before.messages[0], after.messages[0]);
    assert.doesNotMatch(
      initial(after)!.content,
      /NEW_PUBLIC_EVENT|UPDATED_SUMMARY|本轮任务/,
    );
    const serialized = JSON.stringify(after.messages);
    assert.match(serialized, /NEW_PUBLIC_EVENT_0/);
    assert.match(serialized, /NEW_PUBLIC_EVENT_1/);
    assert.match(serialized, /PEER_REPLY_0/);
    assert.match(serialized, /PEER_REPLY_1/);
    assert.doesNotMatch(serialized, /UNFINISHED_REPLY/);
    const latest = after.messages.at(-1)!.content;
    assert.match(latest, /UPDATED_SUMMARY/);
    if (purpose !== "summary") {
      assert.match(latest, /本轮任务2/);
      assert.deepEqual(
        middle.messages.slice(0, -1),
        after.messages.slice(0, middle.messages.length - 1),
        "appending dialogue preserves the previous history prefix",
      );
      const history = after.messages.slice(2, -1);
      assert.deepEqual(
        history.map((message) => message.role),
        ["assistant", "user", "user", "assistant", "user", "user"],
      );
      assert.match(history[0].content, /^reply-\d+$/);
      assert.match(history[3].content, /^reply-\d+$/);
      const intervention = JSON.parse(history[1].content).publicEvent;
      assert.equal(intervention.kind, "intervention");
      const peer = JSON.parse(history[2].content).publicEvent;
      assert.equal(peer.kind, "agent");
      assert.equal(peer.speakerId, saved.config.characters[1].id);
      assert.deepEqual(peer.mentions, [character.id]);
      assert.equal(JSON.parse(latest).publicConversation, undefined);
    }
    if (purpose !== "actor")
      assert.doesNotMatch(JSON.stringify(after.messages), /备用回路/);
  }
  assert.equal(new Set(requests.map((request) => request.sessionId)).size, 3);
});
