import { msg } from "@lingui/core/macro";
import type { Metadata } from "next";
import { getBookkeepingPageMetadata } from "@/lib/bookkeeping-seo";
import { getI18nInstance, type PageLangParam } from "@/lib/i18n/appRouterI18n";
import { BbqSettings } from "../_components/bbq-settings";

export async function generateMetadata({
  params,
}: PageLangParam): Promise<Metadata> {
  const { lang } = await params;
  const i18n = getI18nInstance(lang);
  return {
    ...getBookkeepingPageMetadata(
      lang,
      "/settings",
      i18n._(msg`设置 · Loopy 记账`),
      i18n._(msg`管理记账数据备份与应用安装。`),
    ),
    // Local account tools and records are not search landing pages.
    robots: { index: false, follow: true },
  };
}

export default function BbqSettingsPage() {
  return <BbqSettings />;
}
