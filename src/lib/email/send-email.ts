import "server-only";

import { isDevelopment } from "@landing-page/utils";
import { z } from "zod";
import { getResend } from "@/lib/resend";

export const DEFAULT_EMAIL_FROM = "onboarding@resend.dev";
export const DEFAULT_DEV_EMAIL_RECIPIENT = "mrvnseason@gmail.com";

const emailAddressSchema = z.email();
const recipientsSchema = z.union([
  emailAddressSchema,
  z.array(emailAddressSchema).min(1),
]);

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_SENDS = 10;
const sendTimestamps: number[] = [];

export class EmailSendError extends Error {
  constructor(
    message: string,
    readonly code: "config" | "validation" | "provider",
  ) {
    super(message);
    this.name = "EmailSendError";
  }
}

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
};

export type SendEmailResult = {
  id: string;
  status: "sent";
  provider: "resend";
};

function normalizeRecipients(to: string | string[]): string[] {
  return (Array.isArray(to) ? to : [to]).map((address) =>
    address.trim().toLowerCase(),
  );
}

function getAllowlist(): string[] | null {
  const raw = process.env.EMAIL_ALLOWLIST?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((address) => address.trim().toLowerCase())
      .filter(Boolean);
  }
  if (isDevelopment) {
    return [DEFAULT_DEV_EMAIL_RECIPIENT];
  }
  return null;
}

function assertRateLimit() {
  const now = Date.now();
  while (
    sendTimestamps.length > 0 &&
    sendTimestamps[0]! < now - RATE_LIMIT_WINDOW_MS
  ) {
    sendTimestamps.shift();
  }
  if (sendTimestamps.length >= RATE_LIMIT_MAX_SENDS) {
    throw new EmailSendError(
      "Too many emails sent, try again later",
      "validation",
    );
  }
  sendTimestamps.push(now);
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const parsedTo = recipientsSchema.safeParse(input.to);
  if (!parsedTo.success) {
    throw new EmailSendError("Invalid recipient email address", "validation");
  }

  const subject = input.subject.trim();
  if (!subject) {
    throw new EmailSendError("Subject is required", "validation");
  }

  const text = input.text?.trim();
  const html = input.html?.trim();
  const body = text
    ? { text, ...(html ? { html } : {}) }
    : html
      ? { html }
      : null;
  if (!body) {
    throw new EmailSendError(
      "Email body is required (text or html)",
      "validation",
    );
  }

  const recipients = normalizeRecipients(parsedTo.data);
  const allowlist = getAllowlist();
  if (allowlist) {
    const blocked = recipients.filter(
      (address) => !allowlist.includes(address),
    );
    if (blocked.length > 0) {
      throw new EmailSendError(
        `Recipient not allowed: ${blocked.join(", ")}`,
        "validation",
      );
    }
  }

  const from = process.env.EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM;
  assertRateLimit();

  const { data, error } = await getResend().emails.send({
    from,
    to: recipients,
    subject,
    ...body,
  });

  if (error || !data?.id) {
    throw new EmailSendError(
      error?.message || "Failed to send email",
      "provider",
    );
  }

  return {
    id: data.id,
    status: "sent",
    provider: "resend",
  };
}
