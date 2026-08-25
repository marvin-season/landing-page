import { isDevelopment } from "@landing-page/utils";
import {
  DEFAULT_DEV_EMAIL_RECIPIENT,
  EmailSendError,
  sendEmail,
} from "@/lib/email/send-email";

export async function POST() {
  if (!isDevelopment) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const data = await sendEmail({
      to: DEFAULT_DEV_EMAIL_RECIPIENT,
      subject: "Hello World",
      html: "<p>Congrats on sending your <strong>first email</strong>!</p>",
    });

    return Response.json({ data });
  } catch (error) {
    console.error("Failed to send test email:", error);

    if (error instanceof EmailSendError) {
      const status =
        error.code === "validation"
          ? 400
          : error.code === "provider"
            ? 502
            : 500;
      return Response.json({ error: error.message }, { status });
    }

    return Response.json({ error: "Failed to send email" }, { status: 500 });
  }
}
