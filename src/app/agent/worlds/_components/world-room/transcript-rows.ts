import type { WorldMessage } from "@/lib/group-chat/model";

export function isUnfinishedReply(message: WorldMessage) {
  return (
    message.kind !== "system" &&
    message.status !== "complete" &&
    message.status !== "streaming"
  );
}

export function transcriptRows(messages: WorldMessage[]) {
  const unfinished = messages.filter(isUnfinishedReply);
  const visible = new Set(unfinished.slice(-2).map((message) => message.id));
  type Row =
    | { type: "message"; message: WorldMessage }
    | { type: "folded"; id: string; messages: WorldMessage[] };
  const rows: Row[] = [];
  let folded: WorldMessage[] = [];
  const flush = () => {
    if (!folded.length) return;
    rows.push({ type: "folded", id: folded[0]!.id, messages: folded });
    folded = [];
  };
  for (const message of messages) {
    if (
      unfinished.length > 2 &&
      isUnfinishedReply(message) &&
      !visible.has(message.id)
    ) {
      folded.push(message);
      continue;
    }
    flush();
    rows.push({ type: "message", message });
  }
  flush();
  return rows;
}
