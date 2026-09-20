import { Button, Input } from "@landing-page/design-system";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createResumeSession,
  getResumeAuthorizationUrl,
  getResumeReturnTo,
  hasResumeAccess,
  resumeCookieName,
  resumeSessionMaxAge,
  verifyResumeCredentials,
} from "@/lib/resume-access";

export const metadata: Metadata = {
  title: "个人简历授权",
  robots: { index: false, follow: false, noarchive: true },
};

async function authorizeResume(formData: FormData) {
  "use server";

  const returnTo = getResumeReturnTo(formData.get("returnTo"));
  const username = formData.get("username");
  const password = formData.get("password");
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !verifyResumeCredentials(username, password)
  ) {
    redirect(`${getResumeAuthorizationUrl(returnTo)}&error=invalid`);
  }

  const cookieStore = await cookies();
  cookieStore.set(resumeCookieName, createResumeSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: resumeSessionMaxAge,
  });
  redirect(returnTo);
}

export default async function ResumeAuthorizationPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const params = await searchParams;
  const returnTo = getResumeReturnTo(params.returnTo);
  const cookieStore = await cookies();
  if (hasResumeAccess(cookieStore.get(resumeCookieName)?.value)) {
    redirect(returnTo);
  }

  const hasError = params.error === "invalid";

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            个人简历授权
          </h1>
          <p className="text-sm text-muted-foreground">
            此页面为私密内容，请输入账号和密码后访问。
          </p>
        </div>
        <form action={authorizeResume} className="space-y-4">
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
          {hasError && (
            <p
              id="authorization-error"
              role="alert"
              className="text-sm text-destructive"
            >
              账号或密码错误，请重试。
            </p>
          )}
          <Button type="submit" className="w-full">
            授权并查看简历
          </Button>
        </form>
      </div>
    </main>
  );
}
