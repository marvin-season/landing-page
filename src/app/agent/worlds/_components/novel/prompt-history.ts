import Dexie, { type EntityTable } from "dexie";

export const promptLabels = {
  chapter: "续写下一章",
  rewrite: "润色整章",
  selection: "润色选段",
  stitch: "剧情粘合",
  merge: "剧情合并",
  insert: "剧情插入",
} as const;

type PromptKind = keyof typeof promptLabels;

export type NovelPrompt = {
  id: number;
  roomKey: string;
  kind: PromptKind;
  text: string;
  createdAt: number;
};

const db = new Dexie("world-novel-prompt-history");
db.version(1).stores({ prompts: "++id,roomKey" });
const prompts: EntityTable<NovelPrompt, "id"> = db.table("prompts");

export async function recordNovelPrompt(
  roomKey: string,
  kind: PromptKind,
  text: string,
) {
  if (!text.trim()) return;
  try {
    await prompts.add({ roomKey, kind, text, createdAt: Date.now() });
  } catch {
    // Storage errors must not interrupt a writing task.
  }
}

export function readNovelPrompts(roomKey: string) {
  return prompts.where("roomKey").equals(roomKey).reverse().toArray();
}
