import { setI18n } from "@lingui/react/server";
import { getI18nInstance, type PageLangParam } from "@/lib/i18n/appRouterI18n";
import { HomeContent } from "./_components/home-content";

export default async function Home({ params }: PageLangParam) {
  const { lang } = await params;

  // Shared layouts may be reused during navigation, so initialize this request.
  setI18n(getI18nInstance(lang));

  return <HomeContent />;
}
