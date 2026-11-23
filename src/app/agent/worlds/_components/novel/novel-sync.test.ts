import assert from "node:assert/strict";
import { test } from "node:test";
import { type NovelSyncDivergence, novelSyncStatus } from "./novel-sync";

const server = { text: "服务器\n", updatedAt: 20 };

function reason(
  status: ReturnType<typeof novelSyncStatus>,
): NovelSyncDivergence | undefined {
  return status.kind === "diverged" ? status.reason : undefined;
}

test("novel sync stays quiet without a server copy or when both sides match", () => {
  assert.deepEqual(novelSyncStatus({}, null, "本地\n"), { kind: "none" });
  assert.deepEqual(novelSyncStatus({}, server, server.text), {
    kind: "match",
    updatedAt: 20,
  });
  assert.deepEqual(
    novelSyncStatus({ updatedAt: 20, syncedAt: 20 }, server, server.text),
    { kind: "match", updatedAt: 20 },
  );
});

test("novel sync names which side changed after the last alignment", () => {
  assert.equal(reason(novelSyncStatus({}, server, "本地\n")), "unknown");
  assert.equal(
    reason(novelSyncStatus({ updatedAt: 30, syncedAt: 20 }, server, "本地\n")),
    "local",
  );
  assert.equal(
    reason(
      novelSyncStatus(
        { updatedAt: 20, syncedAt: 20 },
        { text: "新服务器\n", updatedAt: 40 },
        server.text,
      ),
    ),
    "server",
  );
  assert.equal(
    reason(
      novelSyncStatus(
        { updatedAt: 30, syncedAt: 20 },
        { text: "新服务器\n", updatedAt: 40 },
        "本地\n",
      ),
    ),
    "both",
  );
  assert.equal(
    reason(
      novelSyncStatus({ updatedAt: 20, syncedAt: 20 }, server, "正文已变\n"),
    ),
    "unknown",
  );
});
