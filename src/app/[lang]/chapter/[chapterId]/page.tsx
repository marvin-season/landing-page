import { notFound } from "next/navigation";
import linguiConfig from "~/lingui.config";

import { getChapters } from "@/components/sections/book-experience/chapters";
import ContentView from "@/components/sections/book-experience/content-view";
import { getI18nInstance } from "@/lib/i18n/appRouterI18n";
import type { PageLangParam } from "@/lib/i18n/appRouterI18n";

interface ChapterPageProps extends PageLangParam {
  params: Promise<{ chapterId: string; lang: string }>;
}

export async function generateStaticParams() {
  // 需要为每种语言生成静态参数
  const allParams: { chapterId: string; lang: string }[] = [];
  
  for (const lang of linguiConfig.locales) {
    const i18n = getI18nInstance(lang);
    const chapters = getChapters(i18n);
    const params = chapters.map((chapter) => ({
      chapterId: chapter.id,
      lang,
    }));
    allParams.push(...params);
  }
  
  return allParams;
}

const ChapterPage = async ({ params }: ChapterPageProps) => {
  const { chapterId, lang } = await params;
  const i18n = getI18nInstance(lang);
  const chapters = getChapters(i18n);
  const activeChapter = chapters.find((chapter) => chapter.id === chapterId);

  if (!activeChapter) {
    notFound();
  }

  return <ContentView activeChapter={activeChapter} />;
};

export default ChapterPage;
