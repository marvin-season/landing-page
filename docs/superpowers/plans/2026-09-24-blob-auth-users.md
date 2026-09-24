# Blob-backed Auth Users Implementation Plan

> Superseded: use Turso `auth_users` instead. See `docs/superpowers/specs/2026-09-24-turso-auth-users-design.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store authorization users in a private Vercel Blob JSON file, seed `marvin`, and let the super admin change passwords from `/admin/users`.

**Architecture:** `src/lib/auth-users/` owns hashing and the Blob document. `verifyCredentials` reads that store. tRPC `user.list` / `user.updatePassword` write it. `/admin` joins `protectedPages`; the proxy gates it without locale rewrite.

**Tech Stack:** `@vercel/blob`, Node `crypto.scrypt`, NextAuth Credentials, tRPC, `tsx --test`, Biome

## Global Constraints

- Storage is Vercel Blob. One private object: `auth/users.json`.
- First version only changes passwords. No create, disable, or delete user.
- Super admin is `marvin` / `super_marvin`. Hash before write.
- `verifyCredentials` remains the only login seam. NextAuth session shape does not change.
- `/admin` is protected and is not rewritten to `/{lang}/admin`.
- Do not commit `BLOB_READ_WRITE_TOKEN`. Ask the user when live verification needs it.
- Use `ni` / `nr` / `nlx`. Do not run `nr build` unless a type error cannot be diagnosed otherwise.
- Do not put the plaintext seed password in docs beyond this plan and the already-written spec.

---

## File map

| File | Role |
|------|------|
| Create `src/lib/auth-users/password.ts` | `hashPassword` / `verifyPassword` via scrypt |
| Create `src/lib/auth-users/password.test.ts` | Hash + verify unit tests |
| Create `src/lib/auth-users/store.ts` | Types, memory-testable port, seed, list, verify, update |
| Create `src/lib/auth-users/store.test.ts` | Seed / list / verify / update tests |
| Create `src/lib/auth-users/blob.ts` | Vercel Blob read/write adapter |
| Modify `src/lib/page-auth.ts` | Blob-backed `verifyCredentials`; protect `/admin` |
| Modify `src/lib/page-auth.test.ts` | `/admin` is protected; `returnTo` keeps `/admin` |
| Modify `src/proxy.ts` | Include `/admin` in matcher |
| Modify `server/user/index.ts` | `list` + `updatePassword` |
| Modify `src/app/admin/page.tsx` | Link to 账号; drop mock user cards |
| Create `src/app/admin/users/page.tsx` | Password admin UI |
| Modify `.env.example` | Document `BLOB_READ_WRITE_TOKEN` |
| Modify `docs/architecture.md` | Blob users + protected admin |

---

### Task 1: Password hashing

**Files:**
- Create: `src/lib/auth-users/password.ts`
- Create: `src/lib/auth-users/password.test.ts`

**Interfaces:**
- Produces:

```ts
export function hashPassword(password: string): Promise<string>
export function verifyPassword(password: string, encoded: string): Promise<boolean>
```

Encoded format: `scrypt$16384$8$1$<salt_b64url>$<key_b64url>`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword / verifyPassword", () => {
  it("accepts the original password and rejects another", async () => {
    const encoded = await hashPassword("correct-horse");
    assert.equal(await verifyPassword("correct-horse", encoded), true);
    assert.equal(await verifyPassword("wrong-password", encoded), false);
  });

  it("rejects an empty password", async () => {
    await assert.rejects(() => hashPassword(""), /empty/i);
    assert.equal(await verifyPassword("", "scrypt$16384$8$1$YQ$YQ"), false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `nlx tsx --test src/lib/auth-users/password.test.ts`

Expected: FAIL because `./password` is missing.

- [ ] **Step 3: Implement**

Use `randomBytes(16)`, `scrypt(password, salt, 32, { N: 16384, r: 8, p: 1 })`, `timingSafeEqual`. Reject empty passwords in `hashPassword`. `verifyPassword` returns false for empty input or a malformed encoded string.

- [ ] **Step 4: Run tests**

Run: `nlx tsx --test src/lib/auth-users/password.test.ts`

Expected: PASS

---

### Task 2: Auth user store

**Files:**
- Create: `src/lib/auth-users/store.ts`
- Create: `src/lib/auth-users/store.test.ts`
- Create: `src/lib/auth-users/blob.ts`

**Interfaces:**
- Consumes: `hashPassword`, `verifyPassword`
- Produces:

```ts
export type UserRole = "super_admin"

export type AuthUser = {
  username: string
  passwordHash: string
  role: UserRole
  updatedAt: string
}

export type PublicAuthUser = {
  username: string
  role: UserRole
  updatedAt: string
}

export type AuthUsersPort = {
  read(): Promise<string | null>
  write(json: string, options?: { overwrite?: boolean }): Promise<void>
}

export class AuthStoreError extends Error {}

export const AUTH_USERS_PATH = "auth/users.json"
export const SUPER_ADMIN_USERNAME = "marvin"

export function createMemoryAuthUsersPort(initial?: string | null): AuthUsersPort
export function setAuthUsersPort(port: AuthUsersPort): void
export function getAuthUsersPort(): AuthUsersPort

export function listPublicUsers(users: AuthUser[]): PublicAuthUser[]
export function loadAuthUsers(): Promise<AuthUser[]>
export function verifyUserPassword(username: string, password: string): Promise<boolean>
export function updateUserPassword(username: string, password: string): Promise<PublicAuthUser>
export function getUserRole(username: string): Promise<UserRole | null>
```

Seed user when `read()` returns null: username `marvin`, password `super_marvin`, role `super_admin`. Write with `overwrite: false`. If that write fails, read again. Never overwrite an existing document with the seed.

Invalid JSON throws `AuthStoreError`. `updateUserPassword` throws if the user is missing or the password is empty.

- [ ] **Step 1: Write store tests against `createMemoryAuthUsersPort`**

Cover: first load seeds `marvin`; list omits `passwordHash`; correct seed password verifies; wrong password fails; update then old password fails; missing user throws; empty password throws; existing JSON is not replaced by seed.

- [ ] **Step 2: Implement store + memory port**

- [ ] **Step 3: Implement blob port**

Install: `ni @vercel/blob`

```ts
import { get, put } from "@vercel/blob"

export const blobAuthUsersPort: AuthUsersPort = {
  async read() {
    if (!hasBlobCredentials()) {
      throw new AuthStoreError("storage is not configured")
    }
    const result = await get(AUTH_USERS_PATH, {
      access: "private",
      useCache: false,
    })
    if (!result) return null
    return await new Response(result.stream).text()
  },
  async write(json, options) {
    if (!hasBlobCredentials()) {
      throw new AuthStoreError("storage is not configured")
    }
    await put(AUTH_USERS_PATH, json, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: options?.overwrite ?? true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    })
  },
}

function hasBlobCredentials() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN),
  )
}
```

Default port is the blob port. Tests call `setAuthUsersPort(createMemoryAuthUsersPort())` in `before` / `after`.

- [ ] **Step 4: Run store tests**

Run: `nlx tsx --test src/lib/auth-users/store.test.ts`

Expected: PASS

---

### Task 3: Wire login and protect admin

**Files:**
- Modify: `src/lib/page-auth.ts`
- Modify: `src/lib/page-auth.test.ts`

**Interfaces:**
- Consumes: `verifyUserPassword`
- Produces: unchanged `verifyCredentials(username, password): Promise<boolean>`

- [ ] **Step 1: Update page-auth tests**

- `protectedPages` includes `{ path: "/admin", locale: false }`
- `isProtectedPath("/admin")` and `isProtectedPath("/admin/users")` are true
- `getSafeReturnTo("/admin")` is `"/admin"`
- `getSafeReturnTo("/admin/users")` is `"/admin/users"`
- `verifyCredentials` still rejects empty / wrong passwords (store errors become `false`)

- [ ] **Step 2: Implement**

```ts
export const protectedPages: ProtectedPage[] = [
  { path: "/resume", locale: true },
  { path: "/agent", locale: false },
  { path: "/admin", locale: false },
]

export async function verifyCredentials(username: string, password: string) {
  if (!username || !password) return false
  try {
    return await verifyUserPassword(username, password)
  } catch {
    return false
  }
}
```

Remove the hardcoded SHA-256 digest.

- [ ] **Step 3: Run**

Run: `nlx tsx --test src/lib/page-auth.test.ts src/lib/auth-users/password.test.ts src/lib/auth-users/store.test.ts`

Expected: PASS

---

### Task 4: Proxy matcher

**Files:**
- Modify: `src/proxy.ts`

Admin is currently excluded from the matcher. Remove `admin` from the negative lookahead. Existing logic already skips locale rewrite when `protectedPage.locale` is false, so `/admin` with a session returns `NextResponse.next()`.

- [ ] **Step 1: Change matcher**

From:

`"/((?!knowledge/examples(?:/|$)|pdfjs(?:/|$)|_next/static|api|agui|admin|_next/image|...`

To:

`"/((?!knowledge/examples(?:/|$)|pdfjs(?:/|$)|_next/static|api|agui|_next/image|...`

- [ ] **Step 2: Confirm no other admin special case remains**

---

### Task 5: tRPC user procedures

**Files:**
- Modify: `server/user/index.ts`

```ts
import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { protectedProcedure, router } from "~/server/trpc"
import {
  AuthStoreError,
  getUserRole,
  listPublicUsers,
  loadAuthUsers,
  SUPER_ADMIN_USERNAME,
  updateUserPassword,
} from "@/lib/auth-users/store"

export const userRouter = router({
  list: protectedProcedure.query(async () => {
    try {
      return listPublicUsers(await loadAuthUsers())
    } catch (error) {
      throw toTrpcError(error)
    }
  }),
  updatePassword: protectedProcedure
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const role = await getUserRole(ctx.userId)
      if (role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only a super admin can change passwords",
        })
      }
      try {
        return await updateUserPassword(input.username, input.password)
      } catch (error) {
        throw toTrpcError(error)
      }
    }),
})
```

Map `AuthStoreError` with "storage is not configured" to `PRECONDITION_FAILED`. Missing user → `NOT_FOUND`. Other store errors → `INTERNAL_SERVER_ERROR`.

`SUPER_ADMIN_USERNAME` is imported only if needed; role check uses `getUserRole`, not a hardcoded name compare in the router (the seeded user is the only super admin).

---

### Task 6: Admin users page

**Files:**
- Modify: `src/app/admin/page.tsx`
- Create: `src/app/admin/users/page.tsx`

Entry page: keep the 管理入口 heading, add a link to `/admin/users` labeled 「账号」, remove the mock `user.list` cards that expect `id` / `name` / `email`.

Users page (`"use client"`):

- Query `user.list`
- Table: 用户名 / 角色 / 上次更新
- Each row: 新密码 + 确认密码 + 「修改密码」
- Client-side mismatch shows 「两次密码不一致」
- Mutation `user.updatePassword`
- Show query/mutation errors in Chinese when possible, otherwise the server message

Use `@landing-page/design-system` `Button` and `Input`. Match the existing admin spacing (`space-y-6 px-4 py-8`).

---

### Task 7: Docs and env example

**Files:**
- Modify: `.env.example`
- Modify: `docs/architecture.md`

`.env.example` adds:

```
# Vercel Blob read-write token for auth/users.json
BLOB_READ_WRITE_TOKEN=
```

Architecture:

- 3.3: credentials come from Vercel Blob via `verifyCredentials`
- 3.4: `/admin` is session-gated; `/admin/users` changes passwords
- 3.5: matcher includes admin; locale rewrite does not apply

---

## Verification

- `nlx tsx --test src/lib/auth-users/password.test.ts src/lib/auth-users/store.test.ts src/lib/page-auth.test.ts`
- `nr check`
- After the user provides `BLOB_READ_WRITE_TOKEN`: first login as `marvin` / `super_marvin` creates the blob; `/admin/users` can change the password; old password fails.
