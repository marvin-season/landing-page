import { Input } from "@landing-page/design-system";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { setI18n } from "@lingui/react/server";
import { LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { getI18nInstance, type PageLangParam } from "@/lib/i18n/appRouterI18n";
import { getAuthorizationUrl, getSafeReturnTo } from "@/lib/page-auth";
import { AuthorizationSubmitButton } from "./_components/submit-button";

async function authorize(formData: FormData) {
  "use server";

  const returnTo = getSafeReturnTo(formData.get("returnTo"));
  const locale = formData.get("lang");
  const lang = typeof locale === "string" ? locale : undefined;
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
      redirect(`${getAuthorizationUrl(returnTo, lang)}&error=invalid`);
    }
    throw error;
  }
}

export async function generateMetadata(props: PageLangParam) {
  const { lang } = await props.params;
  const i18n = getI18nInstance(lang);

  return {
    title: i18n._(msg`Authorization required`),
    description: i18n._(
      msg`This content requires authorization. Enter your username and password to continue.`,
    ),
    robots: { index: false, follow: false, noarchive: true },
  };
}

export default async function AuthorizationPage({
  params,
  searchParams,
}: PageLangParam & {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const { lang } = await params;
  const query = await searchParams;
  const returnTo = getSafeReturnTo(query.returnTo);

  setI18n(getI18nInstance(lang));

  const session = await auth();
  if (session?.user?.id) {
    redirect(returnTo);
  }

  const hasError = query.error === "invalid";

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card/80 p-8 shadow-2xl shadow-primary/10 shinchan:matte-surface shinchan:shadow-sm sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-5 inline-flex size-12 items-center justify-center rounded-full border border-border/70 bg-background/80 text-primary shadow-sm">
            <LockKeyhole className="size-5" aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-semibold tracking-normal text-foreground">
            <Trans>Authorization required</Trans>
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
            <Trans>
              This content requires authorization. Enter your username and
              password to continue.
            </Trans>
          </p>
        </div>
        <form action={authorize} className="space-y-5">
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="lang" value={lang} />
          <div className="space-y-2">
            <label
              htmlFor="username"
              className="text-sm font-medium text-foreground"
            >
              <Trans>Username</Trans>
            </label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoFocus
              required
              aria-invalid={hasError}
              aria-describedby={hasError ? "authorization-error" : undefined}
              className="h-11 rounded-xl px-3.5"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              <Trans>Password</Trans>
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={hasError}
              aria-describedby={hasError ? "authorization-error" : undefined}
              className="h-11 rounded-xl px-3.5"
            />
          </div>
          {hasError ? (
            <p
              id="authorization-error"
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive"
            >
              <Trans>The username or password is incorrect. Try again.</Trans>
            </p>
          ) : null}
          <AuthorizationSubmitButton />
        </form>
      </div>
    </main>
  );
}
