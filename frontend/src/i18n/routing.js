import { defineRouting } from "next-intl/routing";

/**
 * Locales and URL style (docs/I18N.md): every page has its language in the URL, /bn/... and /en/... ("always").
 * An unprefixed URL (/ or /about, old links) redirects to the Bengali one. With "as-needed" (Bengali without a
 * prefix) Next's link prefetching took "/about" for the home route with locale "about" and got 404s (D16).
 */
export const routing = defineRouting({
  locales: ["bn", "en"],
  defaultLocale: "bn",
  localePrefix: "always",
  // No redirect based on browser language or cookie: many phones in Bangladesh are set to
  // English, but the site is Bengali first. The URL alone decides the language.
  localeDetection: false,
  // pageMetadata (src/lib/seo.js) already writes canonical + hreflang into the HTML. The proxy's automatic
  // `Link` header would add a second set whose x-default is the unprefixed (redirecting) URL.
  alternateLinks: false,
});
