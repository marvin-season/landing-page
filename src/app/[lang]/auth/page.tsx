import { Input } from "@landing-page/design-system";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { setI18n } from "@lingui/react/server";
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
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-20">
      <h1 className="text-xl font-semibold text-foreground">
        <Trans>Authorization required</Trans>
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        <Trans>
          This content requires authorization. Enter your username and password
          to continue.
        </Trans>
      </p>
      <form action={authorize} className="mt-8 flex flex-col gap-4">
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="lang" value={lang} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="username" className="text-sm text-foreground">
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
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm text-foreground">
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
          />
        </div>
        {hasError ? (
          <p
            id="authorization-error"
            role="alert"
            className="text-sm text-destructive"
          >
            <Trans>The username or password is incorrect. Try again.</Trans>
          </p>
        ) : null}
        <AuthorizationSubmitButton />
      </form>
    </main>
  );
}
