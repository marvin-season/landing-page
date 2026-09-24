import { redirect } from "next/navigation";
import type { PageLangParam } from "@/lib/i18n/appRouterI18n";
import { withLocalePrefix } from "@/lib/i18n/locales";
import { getAuthorizationUrl } from "@/lib/page-auth";

export default async function ResumeAuthRedirectPage({
  params,
  searchParams,
}: PageLangParam & {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { lang } = await params;
  const query = await searchParams;
  redirect(
    getAuthorizationUrl(
      query.returnTo ?? withLocalePrefix("/resume", lang),
      lang,
    ),
  );
}
