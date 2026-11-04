import PolicyPage, { loadPolicy } from "@/components/layout/PolicyPage";
import { currentLocale } from "@/lib/locale";
import { pageMetadata, textFromHtml } from "@/lib/seo";

/** /terms (PAGES.md, text from POLICIES.md via GET /pages/terms/). */

export async function generateMetadata() {
  const locale = await currentLocale();
  const page = await loadPolicy("terms", locale);
  return pageMetadata({ path: "/terms", locale, title: page.title, description: textFromHtml(page.body_html) });
}

export default async function TermsPage() {
  return <PolicyPage slug="terms" locale={await currentLocale()} />;
}
