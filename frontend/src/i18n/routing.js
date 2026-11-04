import { defineRouting } from "next-intl/routing";

/** Locales and URL style (docs/I18N.md): Bengali without a prefix, English under /en. */
export const routing = defineRouting({
  locales: ["bn", "en"],
  defaultLocale: "bn",
  localePrefix: "as-needed",
  // No redirect based on browser language or cookie: many phones in Bangladesh are set to
  // English, but the site is Bengali first. The URL alone decides the language.
  localeDetection: false,
});
