import type { PageLangParam } from "@/lib/i18n/appRouterI18n";
import { Mine } from "./_components/mine";

export default async function Home({ params }: PageLangParam) {
  await params; // must await params to avoid lang not setup
  return <Mine />;
}
