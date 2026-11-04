import PolicyPage, { loadPolicy } from "@/components/layout/PolicyPage";
import { currentLocale } from "@/lib/locale";
import { pageMetadata, textFromHtml } from "@/lib/seo";

/** /refund-policy (PAGES.md, text from POLICIES.md via GET /pages/refund-policy/). */

export async function generateMetadata() {
  const locale = await currentLocale();
  const page = await loadPolicy("refund-policy", locale);
  return pageMetadata({ path: "/refund-policy", locale, title: page.title, description: textFromHtml(page.body_html) });
}

export default async function RefundPolicyPage() {
  return <PolicyPage slug="refund-policy" locale={await currentLocale()} />;
}
