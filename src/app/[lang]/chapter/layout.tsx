import SceneLayout from "@app/_components/scene-layout";
import ChapterSidebar from "@app/chapter/_components/chapter-sidebar";
import { msg } from "@lingui/core/macro";
import type { ReactNode } from "react";
import type { PageLangParam } from "@/lib/i18n/appRouterI18n";
import { getI18nInstance } from "@/lib/i18n/appRouterI18n";

const ChapterLayout = async ({
  children,
  params,
}: { children: ReactNode } & PageLangParam) => {
  const lang = (await params).lang;
  const i18n = getI18nInstance(lang);
  return (
    <SceneLayout
      lang={lang}
      title={i18n._(
        msg`Open the index and plan your AI content blueprint together`,
      )}
      description={i18n._(
        msg`From workflows to insights and asset governance, we curated four core chapters for AI-powered content teams. Choose one to dive deeper.`,
      )}
      className="flex flex-col gap-10 lg:flex-row"
    >
      <ChapterSidebar />
      <div className="flex-1">{children}</div>
    </SceneLayout>
  );
};

export default ChapterLayout;
