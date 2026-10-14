import type { MetadataRoute } from "next";
import { getBookkeepingAlternates } from "@/lib/bookkeeping-seo";
import { availableLocales } from "@/lib/i18n/locales";
import { getSiteOrigin } from "@/lib/site-origin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await getSiteOrigin();
  return availableLocales.map((lang) => {
    const { canonical, languages } = getBookkeepingAlternates(lang);
    return {
      url: `${origin}${canonical}`,
      changeFrequency: "weekly",
      priority: 1,
      alternates: {
        languages: Object.fromEntries(
          Object.entries(languages).map(([locale, path]) => [
            locale,
            `${origin}${path}`,
          ]),
        ),
      },
    };
  });
}
