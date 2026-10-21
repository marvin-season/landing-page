import type { Metadata } from "next";
import { getBookkeepingPageMetadata } from "@/lib/bookkeeping-seo";
import type { PageLangParam } from "@/lib/i18n/appRouterI18n";
import { Tools } from "../_components/tools/tools";

export async function generateMetadata({
  params,
}: PageLangParam): Promise<Metadata> {
  const { lang } = await params;
  return {
    ...getBookkeepingPageMetadata(
      lang,
      "/tools",
      "工具 · 记露",
      "记露小工具。",
    ),
    robots: { index: false, follow: true },
  };
}

export default function ToolsPage() {
  return <Tools />;
}
