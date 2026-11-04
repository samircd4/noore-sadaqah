import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

/**
 * Any URL that matches no page (e.g. /xyz, which the proxy rewrites to /bn/xyz) lands here and shows the localized
 * [locale]/not-found.js inside the normal layout, instead of Next's unstyled default 404. It answers with a real
 * 404 status (nothing has streamed yet) and Next adds `noindex`.
 */

/** A nested not-found.js can't set metadata, so the title comes from here ("পাতাটি খুঁজে পাওয়া যায়নি | …"). */
export async function generateMetadata() {
  const t = await getTranslations("notFoundPage");
  return { title: t("title") };
}

export default function CatchAll() {
  notFound();
}
