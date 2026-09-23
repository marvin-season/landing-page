import { locales, pseudoLocale, sourceLocale } from "./src/lib/i18n/locales";

export default {
  locales,
  pseudoLocale,
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
