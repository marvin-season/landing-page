import { configSchema, type WorldRoom } from "./model";

/** Upgrade stored roleplay data without treating old dialogue as system orders. */
export function upgradeWorldRoom(room: WorldRoom) {
  const legacy = !("storyGoal" in room.config);
  if (legacy) {
    room.config = configSchema.parse(room.config);
    room.snapshots = room.snapshots.map((snapshot) => ({
      ...snapshot,
      config: configSchema.parse(snapshot.config),
    }));
  }
  for (const message of room.messages) {
    if (message.kind !== "user") continue;
    const config = room.snapshots.find(
      (snapshot) => snapshot.version === message.configVersion,
    )?.config;
    const character = config?.characters.find((c) => c.name === message.name);
    if (character) {
      message.kind = "agent";
      message.speakerId = character.id;
    }
  }
  if (legacy) room.summary = null;
  return room;
}
