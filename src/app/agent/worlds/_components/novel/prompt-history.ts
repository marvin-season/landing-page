import Dexie, { type EntityTable } from "dexie";

export type NovelPrompt = {
  id: number;
  roomKey: string;
  text: string;
  createdAt: number;
};

const db = new Dexie("world-novel-prompt-history");
db.version(1).stores({ prompts: "++id,roomKey" });
const prompts: EntityTable<NovelPrompt, "id"> = db.table("prompts");

export async function recordNovelPrompt(roomKey: string, text: string) {
  if (!text.trim()) return;
  try {
    await prompts.add({ roomKey, text, createdAt: Date.now() });
  } catch {
    // Storage errors must not interrupt a writing task.
  }
}

export function readNovelPrompts(roomKey: string) {
  return prompts.where("roomKey").equals(roomKey).reverse().toArray();
}
