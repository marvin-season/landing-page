import type { Client } from "@libsql/client";
import { getAuthDb } from "@/lib/auth-users/store";
import {
  novelDailyCharLimit,
  novelQuotaExceededMessage,
  utcDayKey,
} from "./limits";

export class NovelQuotaError extends Error {
  constructor(
    message: string,
    readonly status = 429,
  ) {
    super(message);
    this.name = "NovelQuotaError";
  }
}

export type NovelQuotaSnapshot = {
  day: string;
  used: number;
  limit: number;
};

export function createNovelQuotaStore(getClient: () => Client = getAuthDb) {
  const ready = new WeakMap<Client, Promise<unknown>>();

  async function database() {
    const client = getClient();
    let pending = ready.get(client);
    if (!pending) {
      pending = client
        .execute(`
          CREATE TABLE IF NOT EXISTS novel_fingerprint_quota (
            fingerprint TEXT NOT NULL,
            day TEXT NOT NULL,
            chars INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (fingerprint, day)
          )
        `)
        .catch((error) => {
          ready.delete(client);
          throw error;
        });
      ready.set(client, pending);
    }
    await pending;
    return client;
  }

  async function readUsage(
    fingerprint: string,
    day = utcDayKey(),
  ): Promise<NovelQuotaSnapshot> {
    const client = await database();
    const result = await client.execute({
      sql: "SELECT chars FROM novel_fingerprint_quota WHERE fingerprint = ? AND day = ?",
      args: [fingerprint, day],
    });
    const used = Number(result.rows[0]?.chars ?? 0);
    return {
      day,
      used: Number.isFinite(used) ? Math.max(0, Math.trunc(used)) : 0,
      limit: novelDailyCharLimit,
    };
  }

  return {
    readUsage,

    /**
     * 预扣本次 prompt 字符。已超额或本次会超过每日上限时抛出 NovelQuotaError。
     * 同一 run 只应调用一次。
     */
    async reserveInput(fingerprint: string, chars: number, now = new Date()) {
      const amount = Math.max(0, Math.trunc(chars));
      const day = utcDayKey(now);
      const client = await database();
      const updatedAt = now.toISOString();
      const transaction = await client.transaction("write");
      try {
        const current = await transaction.execute({
          sql: "SELECT chars FROM novel_fingerprint_quota WHERE fingerprint = ? AND day = ?",
          args: [fingerprint, day],
        });
        const used = Number(current.rows[0]?.chars ?? 0);
        const next =
          (Number.isFinite(used) ? Math.max(0, Math.trunc(used)) : 0) + amount;
        if (next > novelDailyCharLimit) {
          throw new NovelQuotaError(novelQuotaExceededMessage());
        }
        await transaction.execute({
          sql: `
            INSERT INTO novel_fingerprint_quota (fingerprint, day, chars, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(fingerprint, day) DO UPDATE SET
              chars = excluded.chars,
              updated_at = excluded.updated_at
          `,
          args: [fingerprint, day, next, updatedAt],
        });
        await transaction.commit();
        return {
          day,
          used: next,
          limit: novelDailyCharLimit,
        } satisfies NovelQuotaSnapshot;
      } finally {
        transaction.close();
      }
    },

    /** 任务结束后追加模型输出字符；跨日则记到新的一天。 */
    async addOutput(fingerprint: string, chars: number, now = new Date()) {
      const amount = Math.max(0, Math.trunc(chars));
      if (!amount) return readUsage(fingerprint, utcDayKey(now));
      const day = utcDayKey(now);
      const client = await database();
      const updatedAt = now.toISOString();
      await client.execute({
        sql: `
          INSERT INTO novel_fingerprint_quota (fingerprint, day, chars, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(fingerprint, day) DO UPDATE SET
            chars = chars + excluded.chars,
            updated_at = excluded.updated_at
        `,
        args: [fingerprint, day, amount, updatedAt],
      });
      return readUsage(fingerprint, day);
    },
  };
}

export type NovelQuotaStore = ReturnType<typeof createNovelQuotaStore>;

export const novelQuotaStore = createNovelQuotaStore();
