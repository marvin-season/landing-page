import ViewDirectory from "@app/chapter/_components/view-directory";
import type { PageLangParam } from "@/lib/i18n/appRouterI18n";

const ChapterDirectoryPage = async ({ params }: PageLangParam) => {
  const lang = (await params).lang;

  return <ViewDirectory lang={lang} />;
};

export default ChapterDirectoryPage;
