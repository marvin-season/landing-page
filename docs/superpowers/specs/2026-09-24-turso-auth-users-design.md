# Turso-backed Auth Users

## Goal

Move authorization users out of the source hash in `verifyCredentials` and into a Turso `auth_users` table. Seed one super admin. Add an admin page that can change passwords. Login, session, and the proxy gate stay the same.

This replaces the earlier Vercel Blob draft. The project already has Turso; a JSON document store is unnecessary.

## Decisions

- Storage is the existing Turso database via `@libsql/client`. Table name: `auth_users`.
- Super admin can create `admin` / `guest` accounts and change any password. No disable or delete.
- Super admin is `marvin` / `super_marvin`. The password is hashed with scrypt before write.
- `verifyCredentials` lives in `src/lib/auth-users/store.ts` so `page-auth.ts` (used by proxy) does not import the database client at the path-helper layer. NextAuth still calls `verifyCredentials`. `session.user.id` = username.
- `/admin` joins `protectedPages`. Unauthenticated visits redirect to `/auth` and come back after login.
- Admin stays outside i18n. The proxy gates `/admin` without rewriting it to `/{lang}/admin`.

## Table

```sql
CREATE TABLE IF NOT EXISTS auth_users (
  username TEXT PRIMARY KEY NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- `username` is unique and is the login id.
- `role` is `super_admin` | `admin` | `guest`. Only `admin` and `guest` can be created.
- List and login responses never include `password_hash`.

Seed, only when the table is empty:

- username `marvin`
- password hash of `super_marvin`
- role `super_admin`

If any row exists, never insert the seed.

## Password hashing

Node `crypto.scrypt`. Encoded string: `scrypt$16384$8$1$<salt_b64url>$<key_b64url>`. Empty passwords are rejected. The old SHA-256 source hash is deleted.

## Modules

- `src/lib/auth-users/password.ts`: `hashPassword` / `verifyPassword`
- `src/lib/auth-users/store.ts`: Turso client, seed, list, verify, update. Tests inject `:memory:`
- `src/lib/page-auth.ts`: path helpers only; `protectedPages` includes `{ path: "/admin", locale: false }`
- `src/auth.ts`: `authorize` calls `verifyCredentials` from the store
- `server/user/index.ts`: `list` + `create` + `updatePassword`

Do not change `mastra-server` storage.

## tRPC

Both procedures require a session.

- `user.list`: `{ users: { username, role, updatedAt }[], canManage: boolean }`
- `user.create`: `{ username, password, role: "admin" | "guest" }`. Caller must have `role === "super_admin"`.
- `user.updatePassword`: `{ username, password }`. Caller must have `role === "super_admin"`.

## Admin UI

- `/admin` links to 「账号」
- `/admin/users` lists username, role, last update. Super admin can expand a create form or a per-row password form.
- Chinese copy. No i18n catalogs.

## Proxy

Remove `admin` from the matcher exclusion. Protected admin + no session → `/auth?returnTo=...`. Protected admin + session → `NextResponse.next()` because `locale` is false.

## Config

Uses existing `TURSO_DATABASE_URL` and `TURSO_DATABASE_AUTH_TOKEN`. Missing URL: login fails (returns false); admin list shows 「存储未配置」.

## Error handling

- Invalid table or connection: login returns false; admin list shows an error.
- Seed write only when the table is empty (`INSERT OR IGNORE`).
- `updatePassword`: unknown user, empty password, non-super-admin caller → explicit errors.
- Changing a password does not revoke existing JWT sessions. They expire on the current 8-hour `maxAge`.

## Out of scope

- Creating another `super_admin`.
- Disabling or deleting users.
- Role changes after create.
- Vercel Blob / Neon user tables.
- Changing NextAuth session shape, Agent `resourceId`, or the `/auth` page.

## Verification

- With Turso configured and an empty `auth_users` table, the first login as `marvin` / `super_marvin` succeeds and inserts the row.
- After a password change, the old password fails and the new password works.
- Unauthenticated `/admin` and `/admin/users` redirect to `/auth` and come back to that admin URL after login.
- `user.list` never returns `passwordHash`.
- Run `nlx tsx --test src/lib/auth-users/password.test.ts src/lib/auth-users/store.test.ts src/lib/page-auth.test.ts` and `nr check`.
