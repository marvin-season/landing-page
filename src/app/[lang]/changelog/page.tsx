import { msg } from "@lingui/core/macro";
import { setI18n } from "@lingui/react/server";
import type { Metadata } from "next";
import { getI18nInstance, type PageLangParam } from "@/lib/i18n/appRouterI18n";
import { ChangelogContent } from "./_components/changelog-content";

const pageTitle = msg`Product updates | Docs workspace`;
const pageDescription = msg`Three shipped iterations of the Docs workspace, from reading files to citing PDF text to selection-aware AI.`;

export async function generateMetadata({
  params,
}: PageLangParam): Promise<Metadata> {
  const { lang } = await params;
  const i18n = getI18nInstance(lang);
  const title = i18n._(pageTitle);
  const description = i18n._(pageDescription);

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function ChangelogPage({ params }: PageLangParam) {
  const { lang } = await params;
  const i18n = getI18nInstance(lang);
  setI18n(i18n);

  return <ChangelogContent lang={lang} />;
}
