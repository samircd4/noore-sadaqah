import { getTranslations } from "next-intl/server";
import CheckoutPanel from "@/components/donate/CheckoutPanel";
import { apiGet } from "@/lib/api";
import { currentLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";

/**
 * /donate/checkout (PAGES.md): review the donation kept in sessionStorage, then "পেমেন্ট করুন" → createDonation
 * → the gateway. Nothing personal is rendered on the server: the summary is built in the browser from the draft.
 * Data: GET /funds/ (titles), GET /site/ (payment methods). Not indexed.
 */

export async function generateMetadata() {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations("checkout")]);
  return { ...pageMetadata({ path: "/donate/checkout", locale, title: t("title") }), robots: { index: false, follow: false } };
}

export default async function CheckoutPage() {
  const locale = await currentLocale();
  const [t, funds, site] = await Promise.all([
    getTranslations("checkout"),
    apiGet("/funds/", { locale, tags: ["funds"] }),
    apiGet("/site/", { locale, tags: ["site"] }),
  ]);
  const fundTitles = Object.fromEntries(funds.map((f) => [f.slug, f.title]));

  return (
    <section aria-labelledby="checkout-title" className="min-h-dvh bg-sand-50 px-4 pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div className="mx-auto max-w-2xl">
        <h1 id="checkout-title" className="font-head text-[1.75rem] leading-snug font-bold text-em-900 min-[22.5rem]:text-3xl sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base leading-relaxed text-em-900/80">{t("subtitle")}</p>
        <div className="mt-8">
          <CheckoutPanel fundTitles={fundTitles} methods={site.payment_methods} locale={locale} />
        </div>
      </div>
    </section>
  );
}
