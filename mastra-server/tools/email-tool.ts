import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { sendEmail } from "@/lib/email/send-email";

const emailAddressSchema = z.email().describe("Recipient email");

const emailInputSchema = z.object({
  to: z
    .union([emailAddressSchema, z.array(emailAddressSchema).min(1)])
    .describe("Recipient email(s)"),
  subject: z.string().min(1).describe("Email subject"),
  text: z.string().optional().describe("Plain text body"),
  html: z.string().optional().describe("HTML body"),
});

export const sendEmailTool = createTool({
  id: "send-email",
  description:
    "Send an email through the configured Resend service. Use the exact recipient, subject, and body the user provided. Do not invent recipients. The sender address is fixed by the server.",
  inputSchema: emailInputSchema,
  outputSchema: z.object({
    id: z.string().optional(),
    status: z.string(),
    provider: z.literal("resend"),
    content: z.string(),
  }),
  execute: async (inputData) => {
    const result = await sendEmail({
      to: inputData.to,
      subject: inputData.subject,
      text: inputData.text,
      html: inputData.html,
    });

    return {
      ...result,
      content: inputData.text ?? inputData.html ?? "",
    };
  },
});
