import { Mine } from "@/app/[lang]/(home)/_components/mine";
import type { PageLangParam } from "@/lib/i18n/appRouterI18n";
import { getI18nInstance } from "@/lib/i18n/appRouterI18n";

export default async function Home({ params }: PageLangParam) {
  const lang = (await params).lang;
  const i18n = getI18nInstance(lang);
  console.log(i18n);
  return <Mine />;
}
