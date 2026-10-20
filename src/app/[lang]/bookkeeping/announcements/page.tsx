import { msg } from "@lingui/core/macro";
import type { Metadata } from "next";
import { getBookkeepingPageMetadata } from "@/lib/bookkeeping-seo";
import { getI18nInstance, type PageLangParam } from "@/lib/i18n/appRouterI18n";
import { Announcements } from "../_components/announcements/announcements";

export async function generateMetadata({
  params,
}: PageLangParam): Promise<Metadata> {
  const { lang } = await params;
  const i18n = getI18nInstance(lang);
  return getBookkeepingPageMetadata(
    lang,
    "/announcements",
    i18n._(msg`公告 · 记露`),
    i18n._(msg`查看记露的最新公告、更新与使用提醒。`),
  );
}
export default function AnnouncementsPage() {
  return <Announcements />;
}
