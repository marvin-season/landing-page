# Resend Email Integration

## Goal

Add a safe, reusable Resend integration that can send the provided test email without exposing the API key to browser code or committing it to the repository.

## Design

- Install the `resend` package as a runtime dependency [installed].
- Read the credential from the server-only `RESEND_API_KEY` environment variable.
- Document the variable in `.env.example` with a placeholder.
- Create a server-only Resend client in `src/lib/resend.ts`.
- Add a development-only `POST /api/email/test` route that sends the provided message.
- Return structured JSON for successful sends, configuration errors, and Resend API failures.
- Return `404` outside development so the test endpoint cannot be abused in production.

## Data Flow

1. A developer sends a `POST` request to `/api/email/test`.
2. The route rejects the request unless `NODE_ENV` is `development`.
3. The server-only Resend client reads `RESEND_API_KEY`.
4. Resend sends an email from `onboarding@resend.dev` to `mrvnseason@gmail.com`.
5. The route returns the Resend result or a sanitized error response.

## Verification

- Run the repository's Biome check.
- Do not send an email automatically during verification.
- The user can manually call the endpoint after replacing the placeholder with a real Resend API key in `.env.local`.
