import type { ReactNode } from "react";

import ChapterSidebar from "@/components/sections/book-experience/chapter-sidebar";
import SceneLayout from "@/components/sections/book-experience/scene-layout";
import type { PageLangParam } from "@/lib/i18n/appRouterI18n";

const ChapterLayout = async ({
  children,
  params,
}: { children: ReactNode } & PageLangParam) => {
  const lang = (await params).lang;

  return (
    <SceneLayout
      lang={lang}
      title="Open the index and plan your AI content blueprint together"
      description="From workflows to insights and asset governance, we curated four core chapters for AI-powered content teams. Choose one to dive deeper."
      className="flex flex-col gap-10 lg:flex-row"
    >
      <ChapterSidebar />
      <div className="flex-1">{children}</div>
    </SceneLayout>
  );
};

export default ChapterLayout;
