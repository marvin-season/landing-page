import { UnifiedMarkdown } from "@/components/ui";
import type { PageLangParam } from "@/lib/i18n/appRouterI18n";
import { getI18nInstance } from "@/lib/i18n/appRouterI18n";

export default async function Home({ params }: PageLangParam) {
  const lang = (await params).lang;
  // biome-ignore lint/correctness/noUnusedVariables: <i18n>
  const i18n = getI18nInstance(lang);
  return <UnifiedMarkdown content="Hello, **world**! $$\\sqrt{2}$$" />;
}
