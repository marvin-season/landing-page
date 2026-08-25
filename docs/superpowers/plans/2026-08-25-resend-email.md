# Resend Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable server-only Resend client and a development-only endpoint that sends the requested test email.

**Architecture:** The API key stays in `RESEND_API_KEY` and is read lazily by a server-only client module. A Next.js route handler exposes the sample send operation only during development and returns sanitized JSON responses.

**Tech Stack:** Next.js 16 route handlers, TypeScript, Resend Node.js SDK, Biome

## Global Constraints

- Never expose `RESEND_API_KEY` to client-side code.
- Never commit a real API key.
- Do not send an email during automated verification.
- The test endpoint must return `404` outside development.

---

### Task 1: Add the development email sender

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Create: `src/lib/resend.ts`
- Create: `src/app/api/email/test/route.ts`

**Interfaces:**
- Produces: `getResend(): Resend`, a lazy server-only Resend client.
- Produces: `POST(): Promise<Response>`, a development-only test-email endpoint.

- [ ] **Step 1: Install the runtime dependency**

Run:

```bash
ni resend
```

Expected: `resend` is added to `dependencies`, and the package manager updates installation artifacts.

- [ ] **Step 2: Document the environment variable**

Append this placeholder to `.env.example`:

```dotenv

# Resend email API key
RESEND_API_KEY=re_xxxxxxxxx
```

- [ ] **Step 3: Create the lazy server-only client**

Create `src/lib/resend.ts`:

```typescript
import "server-only";

import { Resend } from "resend";

let resend: Resend | undefined;

export function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  resend ??= new Resend(apiKey);
  return resend;
}
```

- [ ] **Step 4: Create the development-only test endpoint**

Create `src/app/api/email/test/route.ts`:

```typescript
import { getResend } from "@/lib/resend";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { data, error } = await getResend().emails.send({
      from: "onboarding@resend.dev",
      to: "mrvnseason@gmail.com",
      subject: "Hello World",
      html: "<p>Congrats on sending your <strong>first email</strong>!</p>",
    });

    if (error) {
      console.error("Resend rejected the test email:", error);
      return Response.json({ error: "Failed to send email" }, { status: 502 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error("Failed to send test email:", error);
    return Response.json({ error: "Failed to send email" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Run static verification**

Run:

```bash
nr check
```

Expected: Biome exits successfully with no new errors.

- [ ] **Step 6: Configure and manually verify**

The user replaces the placeholder locally without sharing or committing the key:

```dotenv
RESEND_API_KEY=re_your_real_key
```

Start the app with `nr dev`, then manually send:

```bash
curl -X POST http://localhost:3001/api/email/test
```

Expected: HTTP `200` with Resend response data. This manual send is not performed automatically.
