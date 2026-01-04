import { FeatureServer } from "@/app/[lang]/(home)/_components/feature-server";
import { FeaturesContent } from "@/app/[lang]/(home)/_components/features";
import type { PageLangParam } from "@/lib/i18n/appRouterI18n";
import { getI18nInstance } from "@/lib/i18n/appRouterI18n";
import { Mine } from "./_components/mine";
export default async function Home({ params }: PageLangParam) {
  const lang = (await params).lang;
  // biome-ignore lint/correctness/noUnusedVariables: <i18n>
  const i18n = getI18nInstance(lang);

  return (
    <>
      <Mine />
      <FeatureServer>
        {({ featuresPromise }) => (
          <FeaturesContent featuresPromise={featuresPromise} />
        )}
      </FeatureServer>
    </>
  );
}
