# Unified Page Authorization

## Goal

Protect selected pages with one configurable gate, one credential pair, and one auth page. Unauthenticated requests to those pages redirect to `/auth`; after a successful login the user continues to the original URL. Public pages stay public.

## Decisions

- Flow and credentials are unified. Resume’s username + password is the only login; Agent’s User ID form goes away.
- `session.user.id` is the username. Agent threads and memory keep using that id as `resourceId`.
- A central path config is the only switch. `src/proxy.ts` is the only door. Pages read the session when they need the user; they do not redirect.
- NextAuth remains the only session. The resume HMAC cookie is removed.
- Session `maxAge` is 8 hours (resume’s current window). One password now also unlocks private resume content.
- Credentials stay hardcoded for this version, behind a single `verifyCredentials` function so a later database lookup can replace the body without touching the page, proxy, or session shape.

## Config

`src/lib/page-auth.ts` owns the list and the helpers:

```ts
export const protectedPages = [
  { path: "/resume", locale: true },
  { path: "/agent", locale: false },
]
```

- Matching is by prefix: `path` itself or any subpath (`/agent`, `/agent/{threadId}`).
- `locale: true` also matches `/{lang}` + `path` (and its subpaths).
- Helpers: `isProtectedPath`, `getAuthorizationUrl`, `getSafeReturnTo`.
- `returnTo` must be a same-origin relative path that `isProtectedPath` accepts. Anything else becomes `/`.
- Adding a protected page means adding one row. Admin and the marketing home are not in the list.

## Session and credentials

NextAuth Credentials accept `username` and `password`. `authorize` only calls:

```ts
verifyCredentials(username, password): Promise<boolean>
```

This version’s implementation is the existing SHA-256 digest compare (`username:password` vs the hash already in source). On success it returns `{ id: username, name: username }`. On failure it returns `null`.

`verifyCredentials` is the extension point. Do not add a provider registry or a user table now. A future database check replaces only this function.

`pages.signIn` is `/auth`. JWT strategy is unchanged. `AUTH_SECRET` missing means verification fails and no session is issued.

## Auth page

`/auth` is the only authorization UI: username + password, generic copy (“此内容需要授权”), `error=invalid` for bad credentials without distinguishing missing user vs wrong password.

- Already signed in → redirect to `returnTo`.
- Submit uses a Server Action that calls NextAuth `signIn("credentials")`, then redirects to `returnTo`.
- `/auth/signin` and `/auth/resume` only redirect to `/auth`, mapping `callbackUrl` / `returnTo`.

## Proxy

`src/proxy.ts` matcher includes `agent` (still excludes `api`, `auth`, static assets). Order:

1. Protected path and no session → redirect `/auth?returnTo=...`.
2. Protected path and session → continue. Agent does not get locale rewrite. Resume still gets `Cache-Control: private, no-store` and `X-Robots-Tag: noindex, nofollow, noarchive`, then locale handling.
3. `/auth` is outside the matcher so it cannot loop.
4. Everyone else keeps the existing locale detect / rewrite behavior.

## What pages stop doing

- `src/app/[lang]/resume/page.tsx`: drop the cookie check and redirect.
- `src/app/agent/layout.tsx`: still call `auth()` for the sidebar user; do not redirect to sign-in.
- Agent sign-out `callbackUrl` becomes `/auth`.
- Resume layout metadata (`noindex`) stays.

tRPC `protectedProcedure` and `POST /api/chat` already use NextAuth. No API change.

## Remove

- Resume cookie helpers and `resume-access` cookie (`src/lib/resume-access.ts`). Move the hash compare behind `verifyCredentials`.
- `/auth/resume` form page and `/auth/signin` User ID form (replace with redirects).
- Agent-only warning copy about typing an arbitrary User ID.

Existing User ID sessions become invalid. Users sign in again with username + password.

## Error handling and edges

- Bad credentials → stay on `/auth` with a generic error.
- Illegal `returnTo` (external URL, public path, `//evil`) → `/`.
- Unauthenticated `/resume`, `/zh/resume`, `/agent`, `/agent/{threadId}` → `/auth`, then back to that path after success.
- Signed-in visit to `/auth` → `returnTo`.
- Old `/auth/signin` and `/auth/resume` bookmarks still work via redirect.
- Removing a row from `protectedPages` stops gating that path.

## Out of scope

- Admin protection.
- Database-backed users (only the `verifyCredentials` seam is reserved).
- Per-page credential strategies.
- Changing chat, tRPC, or Mastra resource semantics beyond `user.id` = username.

## Verification

- Unauthenticated `/resume`, `/zh/resume`, and `/agent` all land on `/auth` and return to the original URL after a correct login.
- Wrong password is blocked. After a correct login, Agent `user.id` equals the username.
- Public pages do not require login. Deleting a config row stops intercepting that path.
- Swapping `verifyCredentials` to a database lookup later does not require changes to `/auth`, proxy, or `protectedPages`.
- Run `nr check`.
