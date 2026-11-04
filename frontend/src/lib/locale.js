import { locale as rootLocale } from "next/root-params";

/**
 * The current page language in server components ("bn" | "en"), from the [locale] root segment.
 * Not available in server actions or route handlers (pass the locale in a form field there).
 * @returns {Promise<"bn" | "en">}
 */
export async function currentLocale() {
  return (await rootLocale()) === "en" ? "en" : "bn";
}
