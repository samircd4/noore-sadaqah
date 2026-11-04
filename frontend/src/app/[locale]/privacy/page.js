import PolicyPage, { loadPolicy } from "@/components/layout/PolicyPage";
import { currentLocale } from "@/lib/locale";
import { pageMetadata, textFromHtml } from "@/lib/seo";

/** /privacy (PAGES.md, text from POLICIES.md via GET /pages/privacy/). */

export async function generateMetadata() {
  const locale = await currentLocale();
  const page = await loadPolicy("privacy", locale);
  return pageMetadata({ path: "/privacy", locale, title: page.title, description: textFromHtml(page.body_html) });
}

export default async function PrivacyPage() {
  return <PolicyPage slug="privacy" locale={await currentLocale()} />;
}
