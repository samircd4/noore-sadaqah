import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { routing } from "./routing";

/**
 * Per-request i18n config. The locale comes from the `[locale]` root segment
 * (`next/root-params`), or from an explicit override such as
 * `getTranslations({ locale: "en" })`.
 */
export default getRequestConfig(async ({ locale }) => {
  let resolved = locale;
  if (!resolved) {
    const fromRoute = await rootLocale();
    resolved = hasLocale(routing.locales, fromRoute) ? fromRoute : routing.defaultLocale;
  }

  return {
    locale: resolved,
    messages: (await import(`../../messages/${resolved}.json`)).default,
    timeZone: "Asia/Dhaka",
  };
});
