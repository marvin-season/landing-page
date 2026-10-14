import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-origin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await getSiteOrigin();
  return [
    {
      url: `${origin}/zh/admin/bbq`,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
