import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
export const idSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[\w-]+$/);
export const characterSchema = z.object({
  id: idSchema,
  name: text(30).min(1, "请填写角色名称"),
  identity: text(300).min(1, "请填写角色身份"),
  personality: text(600).min(1, "请填写角色性格"),
  goal: text(600).min(1, "请填写角色目标"),
  publicInfo: text(1200),
  privateInfo: text(1200),
  style: text(300),
  model: text(160).min(1),
  enabled: z.boolean(),
});
export const configSchema = z
  .object({
    title: text(60).min(1, "请填写世界名称"),
    background: text(8000).min(1, "请填写世界背景"),
    scene: text(2000).min(1, "请填写初始场景"),
    rules: text(4000),
    facts: text(4000),
    userName: text(30).min(1, "请填写你的角色名称"),
    userRole: text(1000),
    characters: z.array(characterSchema).min(2).max(6),
    maxTurns: z.number().int().min(1).max(10),
  })
  .superRefine((value, ctx) => {
    const names = [value.userName, ...value.characters.map((c) => c.name)];
    if (new Set(names).size !== names.length)
      ctx.addIssue({
        code: "custom",
        message: "同一世界中的角色名称不能重复",
        path: ["characters"],
      });
    const ids = value.characters.map((c) => c.id);
    if (
      new Set(ids).size !== ids.length ||
      ids.includes("user") ||
      ids.includes("system")
    )
      ctx.addIssue({
        code: "custom",
        message: "角色标识重复或无效",
        path: ["characters"],
      });
  });
export type Character = z.infer<typeof characterSchema>;
export type WorldConfig = z.infer<typeof configSchema>;
export const messageSchema = z.object({
  id: idSchema,
  seq: z.number().int().positive(),
  speakerId: idSchema,
  name: text(60),
  kind: z.enum(["user", "agent", "system"]),
  text: z.string().max(12000),
  status: z.enum([
    "streaming",
    "complete",
    "interrupted",
    "failed",
    "truncated",
  ]),
  configVersion: z.number().int().positive(),
  runId: idSchema.nullable(),
  mentions: z.array(idSchema).max(6),
  createdAt: z.string().datetime(),
});
export type WorldMessage = z.infer<typeof messageSchema>;
export type RunStatus =
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "interrupted";
export type WorldRun = {
  id: string;
  status: RunStatus;
  phase: string;
  reason: string;
  startedAt: number;
  leaseUntil: number;
  deadline: number;
  calls: number;
  turns: number;
  limit: number;
  mentions: string[];
  configVersion: number;
  mode: RunInput["mode"];
  usage: { input: number; output: number; reportedCalls: number };
};
export type WorldRoom = {
  id: string;
  ownerId: string;
  status: "draft" | "active" | "ended";
  config: WorldConfig;
  version: number;
  snapshots: Array<{ version: number; config: WorldConfig }>;
  messages: WorldMessage[];
  summary: { text: string; throughSeq: number; configVersion: number } | null;
  run: WorldRun | null;
  runs: WorldRun[];
  paused: boolean;
  createdAt: string;
  updatedAt: string;
};
export type RoomListItem = Pick<
  WorldRoom,
  "id" | "status" | "updatedAt" | "paused"
> & {
  title: string;
  characters: string[];
  messageCount: number;
};
export const runInputSchema = z.object({
  clientRequestId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  mode: z.enum(["auto", "step", "save", "retry"]),
  text: text(8000).default(""),
  mentions: z.array(idSchema).max(6).default([]),
  retryMessageId: idSchema.optional(),
  resume: z.boolean().default(false),
});
export type RunInput = z.infer<typeof runInputSchema>;
export const presetInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("world"),
    name: text(60).min(1),
    content: configSchema,
  }),
  z.object({
    kind: z.literal("character"),
    name: text(60).min(1),
    content: characterSchema,
  }),
]);
export type WorldPreset = z.infer<typeof presetInputSchema> & { id: string };
export const backupSchema = z.object({
  format: z.literal("world-chat"),
  schemaVersion: z.literal(1),
  config: configSchema,
  snapshots: z
    .array(
      z.object({ version: z.number().int().positive(), config: configSchema }),
    )
    .min(1)
    .max(1000),
  version: z.number().int().positive(),
  messages: z.array(messageSchema).max(10000),
  summary: z
    .object({
      text: text(6000),
      throughSeq: z.number().int().nonnegative(),
      configVersion: z.number().int().positive(),
    })
    .nullable(),
});
export function exportBackup(room: WorldRoom) {
  return {
    format: "world-chat" as const,
    schemaVersion: 1 as const,
    config: room.config,
    snapshots: room.snapshots,
    version: room.version,
    messages: room.messages,
    summary: room.summary,
  };
}
export function exportMarkdown(room: WorldRoom) {
  return `# ${room.config.title}\n\n${room.messages
    .map(
      (m) =>
        `## ${m.name}${m.status === "complete" ? "" : "（未完成，不计入剧情）"}\n\n${m.text}`,
    )
    .join("\n\n")}\n`;
}
export class WorldError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export type WorldEvent = {
  runId: string;
  eventSeq: number;
} & (
  | { type: "room"; room: WorldRoom }
  | { type: "phase"; phase: string }
  | { type: "message"; message: WorldMessage }
  | { type: "delta"; messageId: string; text: string }
  | { type: "done" }
  | { type: "error"; message: string; code: string }
);
export type WorldEventPayload = WorldEvent extends infer Event
  ? Event extends WorldEvent
    ? Omit<Event, "runId" | "eventSeq">
    : never
  : never;
