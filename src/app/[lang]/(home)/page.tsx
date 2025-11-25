import SceneLayout from "@app/_components/scene-layout";
import ViewClosed from "@app/_components/view-closed";
import { msg } from "@lingui/core/macro";
import type { PageLangParam } from "@/lib/i18n/appRouterI18n";
import { getI18nInstance } from "@/lib/i18n/appRouterI18n";

export default async function Home({ params }: PageLangParam) {
  const lang = (await params).lang;
  const i18n = getI18nInstance(lang);
  return (
    <SceneLayout
      lang={lang}
      title={i18n._(
        msg`Enter the next-gen AI content collaboration platform through a "book" interface`,
      )}
      description={i18n._(
        msg`We shaped the experience as a breathing book. Open it to reveal chapters on strategy, creation, insight, and governance right at your fingertips.`,
      )}
    >
      <ViewClosed lang={lang} />
    </SceneLayout>
  );
}
