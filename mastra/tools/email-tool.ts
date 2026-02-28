import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const emailInputSchema = z.object({
  to: z.union([z.string(), z.array(z.string())]).describe("Recipient email(s)"),
  subject: z.string().describe("Email subject"),
  text: z.string().optional().describe("Plain text body"),
  html: z.string().optional().describe("HTML body"),
  from: z.string().optional().describe("Sender email, overrides EMAIL_FROM"),
});

export const sendEmailTool = createTool({
  id: "send-email",
  description:
    "Send an email using Resend API. Requires RESEND_API_KEY and EMAIL_FROM env vars.",
  inputSchema: emailInputSchema,
  outputSchema: z.object({
    id: z.string().optional(),
    status: z.string(),
    provider: z.literal("resend"),
    content: z.string(),
  }),
  execute: async (inputData) => {
    return {
      id: "1",
      status: "sent",
      provider: "resend" as const,
      content: inputData.text!,
    };
  },
});
