import type { PageLangParam } from "@/lib/i18n/appRouterI18n";
import { HomeContent } from "./_components/home-content";

export default async function Home({ params }: PageLangParam) {
  await params; // must await params to avoid lang not setup

  return <HomeContent />;
}
