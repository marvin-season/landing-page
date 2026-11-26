import { z } from "zod";

export const novelRunStatus = z.object({
  status: z.enum(["running", "completed", "failed", "cancelled"]),
  text: z.string(),
  incomplete: z.boolean(),
  error: z.string().nullable(),
});

export type NovelRunStatus = z.infer<typeof novelRunStatus>;
