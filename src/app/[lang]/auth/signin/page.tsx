import { redirect } from "next/navigation";
import type { PageLangParam } from "@/lib/i18n/appRouterI18n";
import { getAuthorizationUrl } from "@/lib/page-auth";

export default async function SignInRedirectPage({
  params,
  searchParams,
}: PageLangParam & {
  searchParams: Promise<{
    returnTo?: string;
    callbackUrl?: string;
    from?: string;
  }>;
}) {
  const { lang } = await params;
  const query = await searchParams;
  redirect(
    getAuthorizationUrl(
      query.returnTo ?? query.callbackUrl ?? query.from ?? "/",
      lang,
    ),
  );
}
