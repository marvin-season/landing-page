import { locales, sourceLocale } from "./src/lib/i18n/locales";

export default {
  locales,
  sourceLocale,
  fallbackLocales: {
    default: sourceLocale,
  },
  catalogs: [
    {
      path: "src/locales/{locale}",
      include: ["src/"],
    },
  ],
};
