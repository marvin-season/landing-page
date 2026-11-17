import { createHash } from "node:crypto";
import type { WorldAgentPurpose } from "~/mastra-server/agents/world-agents";
import type { WorldRoom } from "./model";

export function worldSessionId(
  room: WorldRoom,
  purpose: WorldAgentPurpose,
  model: string,
  characterId?: string,
) {
  // Runs, messages and summaries change every turn; configuration changes start
  // a new cache identity. Hashing keeps private configuration out of headers.
  const hash = createHash("sha256")
    .update(
      JSON.stringify([
        room.ownerId,
        room.id,
        purpose,
        characterId ?? "",
        model,
        room.config,
      ]),
    )
    .digest("hex");
  return `world-${purpose}-${hash}`;
}
