import type { Client } from "@libsql/client";
import type { NovelRunStatus } from "./novel-run-contract";

export const novelRunTimeoutMs = 280_000;
const retentionMs = 24 * 60 * 60 * 1000;
const interrupted = "生成已中断，已接收的正文仍可保留。";

type RunKey = [ownerId: string, roomId: string, runId: string];

export function createNovelRunStore(getClient: () => Client, now = Date.now) {
  let ready: Promise<Client> | undefined;
  function database() {
    ready ??= (async () => {
      const db = getClient();
      await db.batch(
        [
          `CREATE TABLE IF NOT EXISTS novel_runs (
            owner_id TEXT NOT NULL, room_id TEXT NOT NULL, id TEXT NOT NULL,
            status TEXT NOT NULL, text TEXT NOT NULL DEFAULT '',
            incomplete INTEGER NOT NULL DEFAULT 0, error TEXT,
            deadline INTEGER NOT NULL, expires_at INTEGER NOT NULL,
            PRIMARY KEY (owner_id, room_id, id)
          )`,
          "CREATE INDEX IF NOT EXISTS novel_runs_expiry ON novel_runs(expires_at)",
        ],
        "write",
      );
      return db;
    })().catch((error) => {
      ready = undefined;
      throw error;
    });
    return ready;
  }

  const keyFilter = "owner_id = ? AND room_id = ? AND id = ?";
  return {
    async create(key: RunKey) {
      const db = await database();
      const time = now();
      await db.execute({
        sql: "DELETE FROM novel_runs WHERE expires_at <= ?",
        args: [time],
      });
      const result = await db.execute({
        sql: `INSERT INTO novel_runs (owner_id, room_id, id, status, deadline, expires_at)
              VALUES (?, ?, ?, 'running', ?, ?) ON CONFLICT DO NOTHING`,
        args: [...key, time + novelRunTimeoutMs + 10_000, time + retentionMs],
      });
      return result.rowsAffected !== 0;
    },
    async read(key: RunKey): Promise<NovelRunStatus | null> {
      const db = await database();
      const time = now();
      const { rows } = await db.execute({
        sql: `SELECT status, text, incomplete, error, deadline
              FROM novel_runs WHERE ${keyFilter} AND expires_at > ?`,
        args: [...key, time],
      });
      const row = rows[0];
      if (!row) return null;
      const text = String(row.text);
      if (row.status === "running" && Number(row.deadline) <= time)
        return { status: "failed", text, incomplete: true, error: interrupted };
      return {
        status: row.status as NovelRunStatus["status"],
        text,
        incomplete: Boolean(row.incomplete),
        error: row.error == null ? null : String(row.error),
      };
    },
    async write(
      key: RunKey,
      { status, text, incomplete, error }: NovelRunStatus,
    ) {
      const result = await (await database()).execute({
        sql: `UPDATE novel_runs SET status = ?, text = ?, incomplete = ?, error = ?
              WHERE ${keyFilter} AND status = 'running' AND deadline > ?`,
        args: [status, text, Number(incomplete), error, ...key, now()],
      });
      return result.rowsAffected !== 0;
    },
    async cancel(key: RunKey) {
      const time = now();
      await (await database()).execute({
        sql: `INSERT INTO novel_runs (owner_id, room_id, id, status, deadline, expires_at)
              VALUES (?, ?, ?, 'cancelled', ?, ?)
              ON CONFLICT (owner_id, room_id, id) DO UPDATE SET status = 'cancelled'
              WHERE status = 'running' AND deadline > excluded.deadline`,
        args: [...key, time, time + retentionMs],
      });
    },
  };
}

export type NovelRunStore = ReturnType<typeof createNovelRunStore>;
