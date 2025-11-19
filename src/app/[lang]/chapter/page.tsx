import ViewDirectory from "@/components/book-experience/view-directory";
import { getChapters } from "@/lib/chapters";
import type { PageLangParam } from "@/lib/i18n/appRouterI18n";
import { getI18nInstance } from "@/lib/i18n/appRouterI18n";

const ChapterDirectoryPage = async ({ params }: PageLangParam) => {
  const lang = (await params).lang;
  const i18n = getI18nInstance(lang);
  const chapters = getChapters(i18n);
  return <ViewDirectory chapters={chapters} coverHref={`/${lang}`} />;
};

export default ChapterDirectoryPage;
