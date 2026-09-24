import { Button, Input } from "@landing-page/design-system";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
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
