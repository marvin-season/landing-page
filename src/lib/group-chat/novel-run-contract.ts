import { z } from "zod";

export const novelRunToolCall = z.object({
  id: z.string(),
  name: z.string(),
  state: z.enum(["calling", "done", "error"]),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  errorText: z.string().nullable().optional(),
});

export const novelRunPhase = z.enum([
  "preparing",
  "applying_skills",
  "writing",
]);

export const novelRunStatus = z.object({
  status: z.enum(["running", "completed", "failed", "cancelled"]),
  text: z.string(),
  incomplete: z.boolean(),
  error: z.string().nullable(),
  tools: z.array(novelRunToolCall).optional(),
  /** 构思时间线阶段；仅 running 时有意义。 */
  phase: novelRunPhase.optional(),
});

export type NovelRunToolCall = z.infer<typeof novelRunToolCall>;
export type NovelRunPhase = z.infer<typeof novelRunPhase>;
export type NovelRunStatus = z.infer<typeof novelRunStatus>;
