import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { type Client, createClient, type Transaction } from "@libsql/client";
import {
  backupSchema,
  configSchema,
  presetInputSchema,
  type RoomListItem,
  type RunInput,
  type RunStatus,
  WorldError,
  type WorldMessage,
  type WorldPreset,
  type WorldRoom,
} from "./model";

export const LEASE_MS = 15000;
export function roomListing(room: WorldRoom): RoomListItem {
  return {
    id: room.id,
    status: room.status,
    title: room.config.title,
    characters: room.config.characters.map((c) => c.name),
    messageCount: room.messages.filter((m) => m.kind !== "system").length,
    updatedAt: room.updatedAt,
    paused: room.paused,
  };
}
export function appendMessage(
  room: WorldRoom,
  input: Omit<WorldMessage, "id" | "seq" | "createdAt" | "configVersion">,
) {
  const message: WorldMessage = {
    ...input,
    id: randomUUID(),
    seq: (room.messages.at(-1)?.seq ?? 0) + 1,
    createdAt: new Date().toISOString(),
    configVersion: room.version,
  };
  room.messages.push(message);
  return message;
}
export function finishRun(room: WorldRoom, status: RunStatus, reason: string) {
  if (room.run?.status === "running") {
    room.run.status = status;
    room.run.reason = reason;
    room.run.phase = reason;
    for (const message of room.messages) {
      if (message.runId === room.run.id && message.status === "streaming")
        message.status = "interrupted";
    }
  }
  room.paused = status !== "completed";
}

export function createWorldStore(getClient: () => Client) {
  let ready: Promise<Client> | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(work: () => Promise<T>): Promise<T> {
    const pending = queue.then(work, work).catch((error: unknown) => {
      if (error instanceof WorldError) throw error;
      throw new WorldError(
        "storage_unavailable",
        "存档读取或保存失败，请检查数据库后重试",
        503,
      );
    });
    queue = pending.catch(() => {});
    return pending;
  }
  function database() {
    ready ??= (async () => {
      const db = getClient();
      await db.batch(
        [
          "CREATE TABLE IF NOT EXISTS world_rooms (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, data TEXT NOT NULL, listing TEXT NOT NULL, updated_at TEXT NOT NULL)",
          "CREATE INDEX IF NOT EXISTS world_rooms_owner ON world_rooms(owner_id, updated_at DESC)",
          "CREATE TABLE IF NOT EXISTS world_requests (room_id TEXT NOT NULL, request_id TEXT NOT NULL, hash TEXT NOT NULL, PRIMARY KEY(room_id, request_id))",
          "CREATE TABLE IF NOT EXISTS world_presets (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, data TEXT NOT NULL)",
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
  async function load(tx: Transaction, ownerId: string, id: string) {
    const result = await tx.execute({
      sql: "SELECT data FROM world_rooms WHERE id = ? AND owner_id = ?",
      args: [id, ownerId],
    });
    if (!result.rows[0])
      throw new WorldError("not_found", "房间不存在或无权访问", 404);
    const room = JSON.parse(String(result.rows[0].data)) as WorldRoom;
    if (
      room.run?.status === "running" &&
      (room.run.leaseUntil < Date.now() || room.run.deadline < Date.now())
    )
      finishRun(room, "interrupted", "运行已中断，请手动继续");
    return room;
  }
  async function persist(tx: Transaction, room: WorldRoom) {
    await tx.execute({
      sql: "UPDATE world_rooms SET data = ?, listing = ?, updated_at = ? WHERE id = ? AND owner_id = ?",
      args: [
        JSON.stringify(room),
        JSON.stringify(roomListing(room)),
        room.updatedAt,
        room.id,
        room.ownerId,
      ],
    });
  }
  async function change<T>(
    ownerId: string,
    id: string,
    work: (room: WorldRoom, tx: Transaction) => T | Promise<T>,
  ) {
    return serial(async () => {
      const tx = await (await database()).transaction("write");
      try {
        const room = await load(tx, ownerId, id);
        const value = await work(room, tx);
        await persist(tx, room);
        await tx.commit();
        return { room, value };
      } finally {
        tx.close();
      }
    });
  }
  async function insert(room: WorldRoom) {
    return serial(async () => {
      await (await database()).execute({
        sql: "INSERT INTO world_rooms VALUES (?, ?, ?, ?, ?)",
        args: [
          room.id,
          room.ownerId,
          JSON.stringify(room),
          JSON.stringify(roomListing(room)),
          room.updatedAt,
        ],
      });
      return room;
    });
  }
  function fresh(ownerId: string, input: unknown): WorldRoom {
    const config = configSchema.parse(input);
    return {
      id: randomUUID(),
      ownerId,
      config,
      version: 1,
      snapshots: [{ version: 1, config: structuredClone(config) }],
      status: "draft",
      messages: [],
      summary: null,
      run: null,
      runs: [],
      paused: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    change,
    create: (ownerId: string, input: unknown) => insert(fresh(ownerId, input)),
    async get(ownerId: string, id: string) {
      return (await change(ownerId, id, () => {})).room;
    },
    async list(ownerId: string) {
      const result = await (await database()).execute({
        sql: "SELECT listing FROM world_rooms WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 200",
        args: [ownerId],
      });
      return result.rows.map(
        (row) => JSON.parse(String(row.listing)) as RoomListItem,
      );
    },
    async update(
      ownerId: string,
      id: string,
      input: unknown,
      expectedVersion: number,
    ) {
      const config = configSchema.parse(input);
      return (
        await change(ownerId, id, (room) => {
          if (room.version !== expectedVersion)
            throw new WorldError("conflict", "设定已更新，请刷新后重试", 409);
          if (room.status === "ended")
            throw new WorldError("ended", "故事已结束，复制为新世界后再编辑");
          if (room.run?.status === "running")
            throw new WorldError("running", "请先暂停对话再修改设定", 409);
          if (
            room.status !== "draft" &&
            JSON.stringify(room.config.characters.map((c) => c.id)) !==
              JSON.stringify(config.characters.map((c) => c.id))
          )
            throw new WorldError(
              "members_locked",
              "故事开始后不能增减成员，请复制为新世界",
            );
          room.config = config;
          room.version += 1;
          room.snapshots.push({
            version: room.version,
            config: structuredClone(config),
          });
          room.summary = null;
          room.updatedAt = new Date().toISOString();
          if (room.status !== "draft") {
            room.paused = true;
            appendMessage(room, {
              speakerId: "system",
              name: "世界设定",
              kind: "system",
              text: "房主更新了世界设定，后续对话使用新的设定。",
              status: "complete",
              runId: null,
              mentions: [],
            });
          }
        })
      ).room;
    },
    async rename(ownerId: string, id: string, title: string) {
      return (
        await change(ownerId, id, (room) => {
          room.config.title = title;
          room.updatedAt = new Date().toISOString();
        })
      ).room;
    },
    async stop(ownerId: string, id: string, runId?: string) {
      return (
        await change(ownerId, id, (room) => {
          if (runId && room.run?.id !== runId) return;
          finishRun(room, "paused", "已暂停");
        })
      ).room;
    },
    async end(ownerId: string, id: string) {
      return (
        await change(ownerId, id, (room) => {
          finishRun(room, "paused", "故事已结束");
          room.status = "ended";
          room.updatedAt = new Date().toISOString();
        })
      ).room;
    },
    async remove(ownerId: string, id: string) {
      await change(ownerId, id, async (_room, tx) => {
        await tx.execute({
          sql: "DELETE FROM world_requests WHERE room_id = ?",
          args: [id],
        });
        await tx.execute({
          sql: "DELETE FROM world_rooms WHERE id = ? AND owner_id = ?",
          args: [id, ownerId],
        });
      });
    },
    async begin(ownerId: string, id: string, input: RunInput) {
      return change(ownerId, id, async (room, tx) => {
        const hash = createHash("sha256")
          .update(JSON.stringify(input))
          .digest("hex");
        const previous = await tx.execute({
          sql: "SELECT hash FROM world_requests WHERE room_id = ? AND request_id = ?",
          args: [id, input.clientRequestId],
        });
        if (previous.rows[0]) {
          if (previous.rows[0].hash !== hash)
            throw new WorldError(
              "idempotency_conflict",
              "重复请求的内容不同",
              409,
            );
          return { duplicate: true, started: false, replacedRunId: null };
        }
        if (room.version !== input.expectedVersion)
          throw new WorldError("conflict", "设定已更新，请刷新后发送", 409);
        if (room.status === "ended")
          throw new WorldError("ended", "故事已结束");
        const mentions = [...new Set(input.mentions)];
        for (const participantId of mentions) {
          if (
            !room.config.characters.some(
              (c) => c.id === participantId && c.enabled,
            )
          )
            throw new WorldError("invalid_mention", "点名的角色不存在或已禁用");
        }
        if (input.mode === "retry") {
          const target = room.messages.find(
            (m) => m.id === input.retryMessageId,
          );
          const latest = room.messages
            .filter((m) => m.kind !== "system")
            .at(-1);
          if (
            !target ||
            target !== latest ||
            target.kind !== "agent" ||
            !["failed", "interrupted", "truncated"].includes(target.status) ||
            target.configVersion !== room.version
          )
            throw new WorldError(
              "invalid_retry",
              "上下文已变化，请重新点名该角色",
            );
          if (
            !room.config.characters.some(
              (c) => c.id === target.speakerId && c.enabled,
            )
          )
            throw new WorldError("invalid_retry", "该角色已禁用");
          mentions.splice(0, mentions.length, target.speakerId);
        }
        const hasMessage = Boolean(input.text || input.mentions.length);
        if (input.mode === "save" && !hasMessage)
          throw new WorldError("empty_message", "请输入内容或点名角色");
        if (room.run?.status === "running" && !hasMessage)
          throw new WorldError("running", "房间已有正在进行的对话", 409);
        const started =
          input.mode !== "save" &&
          (!hasMessage || !room.paused || input.resume);
        if (started && !room.config.characters.some((c) => c.enabled))
          throw new WorldError("no_characters", "请至少启用一位角色");
        const replacedRunId =
          room.run?.status === "running" ? room.run.id : null;
        if (replacedRunId)
          finishRun(room, "interrupted", "用户插话，中止上一轮");
        if (hasMessage)
          appendMessage(room, {
            speakerId: "user",
            name: room.config.userName,
            kind: "user",
            text: input.text || "请回应。",
            mentions: input.mentions,
            status: "complete",
            runId: null,
          });
        if (started) {
          if (room.run) room.runs.push(structuredClone(room.run));
          const now = Date.now();
          room.run = {
            id: randomUUID(),
            status: "running",
            phase: "正在选择发言者",
            reason: "",
            startedAt: now,
            leaseUntil: now + LEASE_MS,
            deadline: now + 180000,
            calls: 0,
            turns: 0,
            limit:
              input.mode === "step" || input.mode === "retry"
                ? 1
                : mentions.length || room.config.maxTurns,
            mentions,
            configVersion: room.version,
            mode: input.mode,
            usage: { input: 0, output: 0, reportedCalls: 0 },
          };
          room.paused = false;
        } else if (replacedRunId || input.mode === "save") room.paused = true;
        room.status = "active";
        room.updatedAt = new Date().toISOString();
        await tx.execute({
          sql: "INSERT INTO world_requests VALUES (?, ?, ?)",
          args: [id, input.clientRequestId, hash],
        });
        return { duplicate: false, started, replacedRunId };
      });
    },
    async during(
      ownerId: string,
      id: string,
      runId: string,
      work: (room: WorldRoom) => void,
    ) {
      return (
        await change(ownerId, id, (room) => {
          if (room.run?.id !== runId || room.run.status !== "running")
            throw new WorldError("stopped", "对话已停止", 409);
          room.run.leaseUntil = Date.now() + LEASE_MS;
          work(room);
        })
      ).room;
    },
    async import(ownerId: string, input: unknown) {
      const backup = backupSchema.parse(input);
      const versions = new Map(
        backup.snapshots.map((snapshot) => [snapshot.version, snapshot.config]),
      );
      if (
        versions.size !== backup.snapshots.length ||
        !versions.has(backup.version)
      )
        throw new WorldError("invalid_backup", "备份配置版本不完整");
      const room = fresh(ownerId, backup.config);
      room.version = backup.version;
      room.snapshots = backup.snapshots;
      const ids = new Set<string>();
      let seq = 0;
      for (const message of backup.messages) {
        const config = versions.get(message.configVersion);
        if (
          !config ||
          message.seq <= seq ||
          ids.has(message.id) ||
          (message.kind === "agent" &&
            !config.characters.some((c) => c.id === message.speakerId)) ||
          (message.kind === "user" && message.speakerId !== "user") ||
          (message.kind === "system" && message.speakerId !== "system") ||
          message.mentions.some(
            (id) => !config.characters.some((c) => c.id === id),
          )
        )
          throw new WorldError("invalid_backup", "备份消息引用或顺序不完整");
        ids.add(message.id);
        seq = message.seq;
        room.messages.push({
          ...message,
          id: randomUUID(),
          runId: null,
          status:
            message.status === "streaming" ? "interrupted" : message.status,
        });
      }
      // Rebuild summaries from validated public history; imported summaries are not trusted facts.
      room.summary = null;
      room.status = room.messages.length ? "active" : "draft";
      room.paused = true;
      return insert(room);
    },
    async presets(ownerId: string) {
      const rows = await (await database()).execute({
        sql: "SELECT id, data FROM world_presets WHERE owner_id = ? ORDER BY rowid DESC",
        args: [ownerId],
      });
      return rows.rows.map(
        (row) =>
          ({
            ...JSON.parse(String(row.data)),
            id: String(row.id),
          }) as WorldPreset,
      );
    },
    async savePreset(ownerId: string, input: unknown, id?: string) {
      const preset = presetInputSchema.parse(input);
      return serial(async () => {
        const db = await database();
        const presetId = id ?? randomUUID();
        if (id) {
          const result = await db.execute({
            sql: "UPDATE world_presets SET data = ? WHERE id = ? AND owner_id = ?",
            args: [JSON.stringify(preset), id, ownerId],
          });
          if (!result.rowsAffected)
            throw new WorldError("not_found", "预设不存在", 404);
        } else
          await db.execute({
            sql: "INSERT INTO world_presets VALUES (?, ?, ?)",
            args: [presetId, ownerId, JSON.stringify(preset)],
          });
        return { ...preset, id: presetId } as WorldPreset;
      });
    },
    async removePreset(ownerId: string, id: string) {
      await (await database()).execute({
        sql: "DELETE FROM world_presets WHERE id = ? AND owner_id = ?",
        args: [id, ownerId],
      });
    },
  };
}
export type WorldStore = ReturnType<typeof createWorldStore>;
let client: Client | undefined;
export const worldStore = createWorldStore(() => {
  if (!client) {
    const url =
      process.env.GROUP_CHAT_DATABASE_URL || "file:./db/group-chat.db";
    if (url.startsWith("file:"))
      mkdirSync(dirname(resolve(url.slice(5))), { recursive: true });
    client = createClient({
      url,
      authToken: process.env.GROUP_CHAT_DATABASE_TOKEN,
    });
  }
  return client;
});
