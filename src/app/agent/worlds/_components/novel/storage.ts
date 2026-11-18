import Dexie, { type Table } from "dexie";
import { worldRequest } from "@/lib/group-chat/client";
import type { WorldRoom } from "@/lib/group-chat/model";
import type { Novel } from "./model";

const db = new Dexie("world-novels");
db.version(1).stores({ novels: "key" });
export const novels: Table<{ key: string; novel: Novel }, string> =
  db.table("novels");

export async function legacyNovelRoomIds() {
  const keys = await novels.toCollection().primaryKeys();
  return keys.map((key) => key.slice(key.lastIndexOf(":") + 1));
}

export async function migrateLegacyNovel(id: string) {
  const { room: source } = await worldRequest<{ room: WorldRoom }>(
    `rooms/${id}`,
  );
  const key = `${source.ownerId}:${source.id}`;
  const existing = await novels.get(key);
  if (source.kind === "novel" || !existing)
    throw new Error("当前浏览器没有可迁移的旧小说。");
  const { room } = await worldRequest<{ room: WorldRoom }>("rooms", "POST", {
    ...source.config,
    kind: "novel",
  });
  try {
    await db.transaction("rw", novels, async () => {
      const latest = await novels.get(key);
      if (!latest) throw new Error("这部小说已迁移，请刷新存档列表。");
      await novels.add({ ...latest, key: `${room.ownerId}:${room.id}` });
      await novels.delete(key);
    });
  } catch (error) {
    await worldRequest(`rooms/${room.id}`, "DELETE").catch(() => {});
    throw error;
  }
  return room.id;
}
