# Unified Page Authorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate `/resume` and `/agent` with one path config, one username/password credential, and one `/auth` page that continues to the original URL after success.

**Architecture:** `src/lib/page-auth.ts` is the only switch (path list + `verifyCredentials`). `src/proxy.ts` is the only door: no NextAuth session on a configured path redirects to `/auth?returnTo=...`. NextAuth Credentials verify through `verifyCredentials`; `session.user.id` is the username. Pages read the session but do not redirect.

**Tech Stack:** Next.js 16 `src/proxy.ts`, NextAuth 5 (`next-auth@5.0.0-beta.32`), TypeScript, Biome, Node `node:test` via `tsx`

## Global Constraints

- Flow and credentials are unified. Resume’s username + password is the only login; Agent’s User ID form goes away.
- `session.user.id` is the username.
- A central path config is the only switch. `src/proxy.ts` is the only door. Pages read the session when they need the user; they do not redirect.
- NextAuth remains the only session. The resume HMAC cookie is removed.
- Session `maxAge` is 8 hours.
- Credentials stay hardcoded for this version, behind a single `verifyCredentials` function. Do not add a provider registry or a user table.
- Admin and the marketing home are not protected.
- Do not run `nr build` unless a type error cannot be diagnosed otherwise. Use `nr check` and `tsx --test`.
- Use `ni` / `nr` / `nlx` — do not invoke `pnpm` directly.
- Do not put the plaintext resume password in tests, docs, or comments.

---

## File map

| File | Role |
|------|------|
| Create `src/lib/page-auth.ts` | `protectedPages`, path helpers, `verifyCredentials` |
| Create `src/lib/page-auth.test.ts` | Unit tests for helpers + failed credential check |
| Modify `src/auth.ts` | Username/password Credentials, 8h session, `pages.signIn: "/auth"` |
| Create `src/app/auth/page.tsx` | Single auth form (Server Action → `signIn`) |
| Modify `src/app/auth/signin/page.tsx` | Redirect to `/auth` |
| Modify `src/app/auth/resume/page.tsx` | Redirect to `/auth` |
| Modify `src/app/auth/layout.tsx` | Generic metadata |
| Modify `src/proxy.ts` | Session gate from config; include `agent` in matcher |
| Modify `src/app/[lang]/resume/page.tsx` | Remove cookie gate |
| Modify `src/app/agent/layout.tsx` | Remove sign-in redirect |
| Modify `src/app/agent/_components/AgentSidebar.tsx` | Sign-out `callbackUrl` → `/auth` |
| Delete `src/lib/resume-access.ts` | Replaced by `page-auth.ts` |
| Modify `docs/architecture.md` | Describe the unified gate |

---

### Task 1: Page-auth config and credential seam

**Files:**
- Create: `src/lib/page-auth.ts`
- Create: `src/lib/page-auth.test.ts`

**Interfaces:**
- Consumes: `locales` from `src/lib/i18n/locales.ts`
- Produces:

```ts
export type ProtectedPage = {
  path: string
  locale?: boolean
}

export const protectedPages: ProtectedPage[]

export function isProtectedPath(pathname: string): boolean
export function getProtectedPage(pathname: string): ProtectedPage | undefined
export function getSafeReturnTo(value: unknown): string
export function getAuthorizationUrl(returnTo: string): string
export function verifyCredentials(
  username: string,
  password: string,
): Promise<boolean>
```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/page-auth.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAuthorizationUrl,
  getProtectedPage,
  getSafeReturnTo,
  isProtectedPath,
  verifyCredentials,
} from "./page-auth";

describe("isProtectedPath", () => {
  it("matches resume with and without locale prefix", () => {
    assert.equal(isProtectedPath("/resume"), true);
    assert.equal(isProtectedPath("/zh/resume"), true);
    assert.equal(isProtectedPath("/en/resume"), true);
    assert.equal(isProtectedPath("/zh/resume/"), true);
  });

  it("matches agent and agent thread paths", () => {
    assert.equal(isProtectedPath("/agent"), true);
    assert.equal(isProtectedPath("/agent/thread-1"), true);
  });

  it("does not match public or lookalike paths", () => {
    assert.equal(isProtectedPath("/"), false);
    assert.equal(isProtectedPath("/admin"), false);
    assert.equal(isProtectedPath("/agency"), false);
    assert.equal(isProtectedPath("/zh"), false);
    assert.equal(isProtectedPath("/zh/home"), false);
  });
});

describe("getProtectedPage", () => {
  it("returns locale config for resume and not for agent", () => {
    assert.equal(getProtectedPage("/zh/resume")?.locale, true);
    assert.equal(getProtectedPage("/agent")?.locale, false);
    assert.equal(getProtectedPage("/admin"), undefined);
  });
});

describe("getSafeReturnTo", () => {
  it("keeps protected relative paths", () => {
    assert.equal(getSafeReturnTo("/resume"), "/resume");
    assert.equal(getSafeReturnTo("/zh/resume"), "/zh/resume");
    assert.equal(getSafeReturnTo("/agent/thread-1"), "/agent/thread-1");
  });

  it("rejects public, absolute, and protocol-relative values", () => {
    assert.equal(getSafeReturnTo("/"), "/");
    assert.equal(getSafeReturnTo("/admin"), "/");
    assert.equal(getSafeReturnTo("https://evil.test/resume"), "/");
    assert.equal(getSafeReturnTo("//evil.test/resume"), "/");
    assert.equal(getSafeReturnTo("/agency"), "/");
    assert.equal(getSafeReturnTo(undefined), "/");
  });
});

describe("getAuthorizationUrl", () => {
  it("points at /auth with a sanitized returnTo", () => {
    assert.equal(
      getAuthorizationUrl("/agent/thread-1"),
      "/auth?returnTo=%2Fagent%2Fthread-1",
    );
    assert.equal(getAuthorizationUrl("https://evil.test"), "/auth?returnTo=%2F");
  });
});

describe("verifyCredentials", () => {
  it("rejects the wrong username or password", async () => {
    assert.equal(await verifyCredentials("wrong", "wrong"), false);
    assert.equal(await verifyCredentials("", ""), false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
nlx tsx --test src/lib/page-auth.test.ts
```

Expected: FAIL with `Cannot find module './page-auth'` (or equivalent module-not-found).

- [ ] **Step 3: Implement `src/lib/page-auth.ts`**

Create `src/lib/page-auth.ts`. Do not add `import "server-only"` so `tsx` can import it. Keep the existing credential digest; do not add a plaintext password.

```ts
import { createHash, timingSafeEqual } from "node:crypto";
import { locales } from "@/lib/i18n/locales";

export type ProtectedPage = {
  path: string;
  locale?: boolean;
};

export const protectedPages: ProtectedPage[] = [
  { path: "/resume", locale: true },
  { path: "/agent", locale: false },
];

const credentialsHash =
  "78a4c94a01ce7f420ac9546d1ad8dcbf2417ae88796ae27d24399ad22f0df07b";

function normalizePathname(pathname: string) {
  try {
    const decoded = decodeURIComponent(pathname);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/";
    return decoded.replace(/\/+$/, "") || "/";
  } catch {
    return "/";
  }
}

function matchesPage(pathname: string, page: ProtectedPage) {
  const normalized = normalizePathname(pathname);
  const prefixes = page.locale
    ? [page.path, ...locales.map((locale) => `/${locale}${page.path}`)]
    : [page.path];

  return prefixes.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export function getProtectedPage(pathname: string) {
  return protectedPages.find((page) => matchesPage(pathname, page));
}

export function isProtectedPath(pathname: string) {
  return getProtectedPage(pathname) !== undefined;
}

export function getSafeReturnTo(value: unknown) {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return "/";
  }

  const pathname = normalizePathname(value.split(/[?#]/, 1)[0] ?? "/");
  return isProtectedPath(pathname) ? pathname : "/";
}

export function getAuthorizationUrl(returnTo: string) {
  return `/auth?${new URLSearchParams({
    returnTo: getSafeReturnTo(returnTo),
  })}`;
}

export async function verifyCredentials(username: string, password: string) {
  if (!username || !password) return false;

  const hash = createHash("sha256").update(`${username}:${password}`).digest();
  const expected = Buffer.from(credentialsHash, "hex");
  if (hash.length !== expected.length) return false;

  return timingSafeEqual(hash, expected);
}
```

`verifyCredentials` is the only extension point for a later database lookup. Do not add a provider map.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
nlx tsx --test src/lib/page-auth.test.ts
```

Expected: PASS, all tests ok. If `@/` fails to resolve, rerun:

```bash
nlx tsx --tsconfig tsconfig.json --test src/lib/page-auth.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/page-auth.ts src/lib/page-auth.test.ts
git commit -m "$(cat <<'EOF'
feat: add configurable page-auth helpers and credential seam

EOF
)"
```

---

### Task 2: NextAuth uses the shared credentials

**Files:**
- Modify: `src/auth.ts`

**Interfaces:**
- Consumes: `verifyCredentials(username: string, password: string): Promise<boolean>`
- Produces: NextAuth Credentials fields `username` and `password`; `pages.signIn` is `"/auth"`; session `maxAge` is `8 * 60 * 60`; `session.user.id` is the username

- [ ] **Step 1: Replace the User ID provider with username/password**

Replace the entire contents of `src/auth.ts` with:

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyCredentials } from "@/lib/page-auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!process.env.AUTH_SECRET) return null;

        const username = credentials?.username;
        const password = credentials?.password;
        if (typeof username !== "string" || typeof password !== "string") {
          return null;
        }
        if (!(await verifyCredentials(username, password))) {
          return null;
        }

        return {
          id: username,
          name: username,
          email: `${username}@local.dev`,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub ?? "";
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
});
```

Do not change `src/app/api/auth/[...nextauth]/route.ts` or `src/types/next-auth.d.ts`. They already expose `handlers` and `session.user.id`.

- [ ] **Step 2: Typecheck the auth module**

Run:

```bash
nlx tsc --noEmit --pretty false --incremental false
```

If that is too slow or noisy, at minimum run `nr check` and confirm `src/auth.ts` has no Biome/type issues. Expected: no errors in `src/auth.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/auth.ts
git commit -m "$(cat <<'EOF'
feat: authenticate NextAuth with the shared username and password

EOF
)"
```

---

### Task 3: Single `/auth` page and legacy redirects

**Files:**
- Create: `src/app/auth/page.tsx`
- Modify: `src/app/auth/signin/page.tsx`
- Modify: `src/app/auth/resume/page.tsx`
- Modify: `src/app/auth/layout.tsx`

**Interfaces:**
- Consumes: `auth`, `signIn` from `src/auth.ts`; `getAuthorizationUrl`, `getSafeReturnTo` from `src/lib/page-auth.ts`
- Produces: `/auth` form that signs in and redirects to `returnTo`; `/auth/signin` and `/auth/resume` redirect to `/auth` with mapped query params

- [ ] **Step 1: Add the unified auth page**

Create `src/app/auth/page.tsx`:

```tsx
import { Button, Input } from "@landing-page/design-system";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { getAuthorizationUrl, getSafeReturnTo } from "@/lib/page-auth";

async function authorize(formData: FormData) {
  "use server";

  const returnTo = getSafeReturnTo(formData.get("returnTo"));
  const username = formData.get("username");
  const password = formData.get("password");

  try {
    await signIn("credentials", {
      username,
      password,
      redirectTo: returnTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`${getAuthorizationUrl(returnTo)}&error=invalid`);
    }
    throw error;
  }
}

export default async function AuthorizationPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const params = await searchParams;
  const returnTo = getSafeReturnTo(params.returnTo);
  const session = await auth();
  if (session?.user?.id) {
    redirect(returnTo);
  }

  const hasError = params.error === "invalid";

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-foreground">需要授权</h1>
          <p className="text-sm text-muted-foreground">
            此内容需要授权，请输入账号和密码后继续。
          </p>
        </div>
        <form action={authorize} className="space-y-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              账号
            </label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              aria-invalid={hasError}
              aria-describedby={hasError ? "authorization-error" : undefined}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              密码
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={hasError}
              aria-describedby={hasError ? "authorization-error" : undefined}
            />
          </div>
          {hasError ? (
            <p
              id="authorization-error"
              role="alert"
              className="text-sm text-destructive"
            >
              账号或密码错误，请重试。
            </p>
          ) : null}
          <Button type="submit" className="w-full">
            授权并继续
          </Button>
        </form>
      </div>
    </main>
  );
}
```

Successful `signIn(..., { redirectTo })` throws a Next.js redirect. That error is not an `AuthError`, so it must be rethrown. Do not swallow it.

- [ ] **Step 2: Replace legacy auth routes with redirects**

Replace `src/app/auth/signin/page.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { getAuthorizationUrl } from "@/lib/page-auth";

export default async function SignInRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{
    returnTo?: string;
    callbackUrl?: string;
    from?: string;
  }>;
}) {
  const params = await searchParams;
  redirect(
    getAuthorizationUrl(
      params.returnTo ?? params.callbackUrl ?? params.from ?? "/",
    ),
  );
}
```

Replace `src/app/auth/resume/page.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { getAuthorizationUrl } from "@/lib/page-auth";

export default async function ResumeAuthRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  redirect(getAuthorizationUrl(params.returnTo ?? "/resume"));
}
```

- [ ] **Step 3: Generic auth layout metadata**

In `src/app/auth/layout.tsx`, change metadata to:

```ts
export const metadata: Metadata = {
  title: brandedTitle(`授权 · ${SITE_NAME}`),
  description: "Authorize to continue",
  robots: { index: false, follow: false, noarchive: true },
};
```

Leave `SessionProvider`, `ThemeProvider`, and `ThemeMenu` as they are.

- [ ] **Step 4: Lint the new auth files**

Run:

```bash
nr check
```

Expected: no Biome errors on the files in this task.

- [ ] **Step 5: Commit**

```bash
git add src/app/auth/page.tsx src/app/auth/signin/page.tsx src/app/auth/resume/page.tsx src/app/auth/layout.tsx
git commit -m "$(cat <<'EOF'
feat: serve one authorization page for protected routes

EOF
)"
```

---

### Task 4: Proxy is the only door

**Files:**
- Modify: `src/proxy.ts`

**Interfaces:**
- Consumes: `auth` from `src/auth.ts`; `getAuthorizationUrl`, `getProtectedPage` from `src/lib/page-auth.ts`
- Produces: unauthenticated protected paths redirect to `/auth?returnTo=...`; agent skips locale rewrite; resume keeps private cache / robots headers

- [ ] **Step 1: Replace resume-cookie gating with session + config**

Replace the entire contents of `src/proxy.ts` with:

```ts
/*
 * For more info see
 * https://nextjs.org/docs/app/building-your-application/routing/internationalization
 * */

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { locales, sourceLocale } from "@/lib/i18n/locales";
import { getAuthorizationUrl, getProtectedPage } from "@/lib/page-auth";

const defaultPrefix = `/${sourceLocale}`;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPage = getProtectedPage(pathname);

  if (protectedPage) {
    const session = await auth();
    if (!session?.user?.id) {
      return withPrivateHeaders(
        NextResponse.redirect(
          new URL(getAuthorizationUrl(pathname), request.url),
        ),
        protectedPage.path === "/resume",
      );
    }

    if (!protectedPage.locale) {
      return NextResponse.next();
    }

    return withPrivateHeaders(localize(request), protectedPage.path === "/resume");
  }

  const seoFiles = ["/manifest.json", "/robots.txt", "/sitemap.xml"];
  if (seoFiles.includes(pathname)) {
    return NextResponse.next();
  }

  return localize(request);
}

function withPrivateHeaders(response: NextResponse, enabled: boolean) {
  if (!enabled) return response;
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

function localize(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === defaultPrefix || pathname.startsWith(`${defaultPrefix}/`)) {
    request.nextUrl.pathname = pathname.slice(defaultPrefix.length) || "/";
    return NextResponse.redirect(request.nextUrl);
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (pathnameHasLocale) return NextResponse.next();

  request.nextUrl.pathname = `${defaultPrefix}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(request.nextUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/trpc (tRPC files)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - pdfjs (PDF.js worker, character maps, fonts, and Wasm)
     * - knowledge/examples (sample documents)
     * - favicon.ico (favicon file)
     * - manifest.json, robots.txt, sitemap.xml (SEO files)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Agent is included so the session gate can run. Auth stays excluded
     * to avoid a redirect loop.
     */
    "/((?!knowledge/examples(?:/|$)|pdfjs(?:/|$)|_next/static|api|auth|agui|admin|_next/image|favicon.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|md)$).*)",
  ],
};
```

The matcher no longer excludes `agent`. It still excludes `auth`.

- [ ] **Step 2: Confirm helpers still pass**

Run:

```bash
nlx tsx --test src/lib/page-auth.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/proxy.ts
git commit -m "$(cat <<'EOF'
feat: gate configured pages in proxy with the NextAuth session

EOF
)"
```

---

### Task 5: Remove the old gates

**Files:**
- Modify: `src/app/[lang]/resume/page.tsx`
- Modify: `src/app/agent/layout.tsx`
- Modify: `src/app/agent/_components/AgentSidebar.tsx`
- Delete: `src/lib/resume-access.ts`

**Interfaces:**
- Consumes: `auth()` in the agent layout for sidebar user data only
- Produces: resume page renders without a cookie check; agent layout does not redirect; sign-out goes to `/auth`; no remaining `resume-access` imports

- [ ] **Step 1: Strip the resume page cookie check**

Replace `src/app/[lang]/resume/page.tsx` with:

```tsx
import type { PageLangParam } from "@/lib/i18n/appRouterI18n";
import Experience from "./_components/experience";
import Intro from "./_components/intro";
import Stack from "./_components/stack";

export default async function ResumePage({ params }: PageLangParam) {
  await params;

  return (
    <div className="space-y-16">
      <Stack />
      <Intro />
      <Experience />
    </div>
  );
}
```

`params` is still a Promise in this app. Awaiting it keeps the Next.js 16 page signature valid even though `lang` is unused. Do not add a redirect. Leave `src/app/[lang]/resume/layout.tsx` metadata (`robots: noindex`) unchanged.

- [ ] **Step 2: Stop redirecting in the agent layout**

In `src/app/agent/layout.tsx`, remove the `redirect` import and the unauthenticated redirect. Keep `auth()` for the sidebar.

Delete these lines:

```ts
import { redirect } from "next/navigation";
```

```ts
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/agent");
  }
```

The layout body stays:

```tsx
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="agent-sketch h-dvh overflow-hidden shinchan:font-sans">
        <ThemeProvider>
          <TankQueryClientProvider>
            <div className="flex h-full flex-col md:flex-row">
              <AgentSidebar user={session?.user ?? { id: "" }} />
              <LocatorRuntime />
              <main className="relative min-h-0 min-w-0 flex-1 overflow-auto md:flex-1">
                {children}
              </main>
            </div>
          </TankQueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
```

Proxy is the door. The empty `{ id: "" }` fallback is only for the theoretical case that the layout renders without a session; do not add a redirect.

- [ ] **Step 3: Point agent sign-out at `/auth`**

In `src/app/agent/_components/AgentSidebar.tsx`, replace all four

```ts
signOut({ callbackUrl: "/auth/signin" })
```

with

```ts
signOut({ callbackUrl: "/auth" })
```

Do not change other sidebar behavior.

- [ ] **Step 4: Delete the old resume-access module**

Delete `src/lib/resume-access.ts`.

Search the repo for `resume-access`, `resumeCookieName`, `hasResumeAccess`, `getResumeAuthorizationUrl`, and `verifyResumeCredentials`. The only remaining credential check must be `verifyCredentials` in `src/lib/page-auth.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/app/[lang]/resume/page.tsx src/app/agent/layout.tsx src/app/agent/_components/AgentSidebar.tsx
git rm src/lib/resume-access.ts
git commit -m "$(cat <<'EOF'
refactor: drop per-page resume and agent authorization gates

EOF
)"
```

---

### Task 6: Docs and repo check

**Files:**
- Modify: `docs/architecture.md`

**Interfaces:**
- Consumes: the behavior shipped in Tasks 1–5
- Produces: architecture text that matches the unified gate

- [ ] **Step 1: Update architecture docs**

In `docs/architecture.md`, replace the Agent / Auth / proxy bullets (the current §3.2, §3.3, and the proxy sentence in §3.5) with:

```md
### 3.2 Agent `src/app/agent/`

- 独立 `layout.tsx`：全屏布局，读取 NextAuth 会话给侧边栏用，**不在 layout 里做登录跳转**。
- 是否需要登录由 `src/lib/page-auth.ts` 的 `protectedPages` 声明，`src/proxy.ts` 统一拦截。
- 挂载 `TankQueryClientProvider`（tRPC + React Query），侧边栏与 `ChatModeSwitcher`。
- 动态线程页：`agent/[threadId]/page.tsx`。

### 3.3 认证 `src/app/auth/`

- NextAuth v5：`src/auth.ts`（账号 + 密码，校验走 `verifyCredentials`）、`src/app/api/auth/[...nextauth]/route.ts`。
- JWT session，8 小时；`session.user.id` 为登录账号。
- 唯一认证页是 `/auth`。`/auth/signin` 与 `/auth/resume` 只做兼容跳转。
- 受保护路径由 `src/lib/page-auth.ts` 的 `protectedPages` 配置；未登录访问时 `src/proxy.ts` 跳到 `/auth?returnTo=...`。

### 3.5 国际化与 `src/proxy.ts`

- Next.js 16 使用 `src/proxy.ts` 作为请求拦截入口（不再需要根目录 `middleware.ts`）。
- 先按 `protectedPages` 做会话门闩（matcher 包含 `agent`，排除 `auth`），再做 `Accept-Language` locale 检测与重写。
```

Do not rewrite unrelated architecture sections.

- [ ] **Step 2: Run unit tests and Biome**

Run:

```bash
nlx tsx --test src/lib/page-auth.test.ts
nr check
```

Expected: tests PASS; Biome reports no errors.

- [ ] **Step 3: Manual verification checklist**

With `nr dev` (port 3001) and a signed-out browser:

1. `/` loads without `/auth`.
2. `/admin` loads without `/auth`.
3. `/resume` and `/zh/resume` redirect to `/auth?returnTo=...` and, after a correct login, return to that resume URL.
4. `/agent` and a thread URL `/agent/<id>` redirect to `/auth` and return after login.
5. Wrong password stays on `/auth` with “账号或密码错误，请重试。”
6. After login, Agent UI shows the username as the user id (footer / session).
7. `/auth/signin?callbackUrl=/agent` and `/auth/resume?returnTo=/zh/resume` land on `/auth` and preserve a safe `returnTo`.
8. Sign out from Agent lands on `/auth`.

Do not launch headless Chrome. The user reviews UI manually.

- [ ] **Step 4: Commit**

```bash
git add docs/architecture.md
git commit -m "$(cat <<'EOF'
docs: describe the unified page authorization gate

EOF
)"
```

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| `protectedPages` + prefix / locale matching | 1 |
| `isProtectedPath`, `getAuthorizationUrl`, `getSafeReturnTo` | 1 |
| `verifyCredentials` hardcoded hash, DB-ready seam | 1 |
| Illegal `returnTo` → `/` | 1 |
| NextAuth username/password, `user.id` = username | 2 |
| `AUTH_SECRET` missing → no session | 2 |
| Session `maxAge` 8 hours, `pages.signIn: "/auth"` | 2 |
| Single `/auth` page, generic copy, `error=invalid` | 3 |
| Signed-in `/auth` → `returnTo` | 3 |
| `/auth/signin` and `/auth/resume` redirects | 3 |
| Proxy is the only door; matcher includes agent, excludes auth | 4 |
| Agent skips locale rewrite; resume private headers | 4 |
| Resume page drops cookie check | 5 |
| Agent layout drops redirect | 5 |
| Sign-out → `/auth` | 5 |
| Delete `resume-access` | 5 |
| tRPC / `/api/chat` unchanged | (no task — already session-based) |
| Architecture docs + `nr check` | 6 |
| Admin / home not gated | 1 tests + 4 matcher + 6 manual |
