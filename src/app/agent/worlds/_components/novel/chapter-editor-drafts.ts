import Dexie, { liveQuery, type Table } from "dexie";

type EditorDraft = { roomKey: string; chapterId: string; text: string; baseText?: string };

const db = new Dexie("world-novel-editor-drafts");
db.version(1).stores({ drafts: "[roomKey+chapterId]" });
const drafts: Table<EditorDraft, [string, string]> = db.table("drafts");

export function observeChapterEditorDrafts(roomKey: string) {
  return liveQuery(async () => {
    const rows = await drafts.where("roomKey").equals(roomKey).toArray();
    return new Map(rows.map(({ chapterId, text }) => [chapterId, text]));
  });
}

export async function readChapterEditorDraft(
  roomKey: string,
  chapterId: string,
) {
  return (await drafts.get([roomKey, chapterId]))?.text;
}

export function readChapterEditorDraftRecord(roomKey: string, chapterId: string) {
  return drafts.get([roomKey, chapterId]);
}

export async function writeChapterEditorDraft(
  roomKey: string,
  chapterId: string,
  text: string | undefined,
  baseText?: string,
) {
  if (text === undefined) await drafts.delete([roomKey, chapterId]);
  else await drafts.put({ roomKey, chapterId, text, baseText });
}
