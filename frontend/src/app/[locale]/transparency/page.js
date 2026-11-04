import { getTranslations } from "next-intl/server";
import RegistrationCard from "@/components/about/RegistrationCard";
import DonateCta from "@/components/donate/DonateCta";
import PageHero from "@/components/layout/PageHero";
import FundTotals from "@/components/transparency/FundTotals";
import ReportsList from "@/components/transparency/ReportsList";
import Prose from "@/components/ui/Prose";
import SectionHeader from "@/components/ui/SectionHeader";
import { apiGet } from "@/lib/api";
import { currentLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";

/**
 * /transparency (PAGES.md): hero, registration, reports, fund-wise yearly totals (zakat separate),
 * "আপনার দান কীভাবে খরচ হয়". Data: GET /site/, /reports/, /transparency/totals/, /pages/how-we-spend/.
 * Tables become cards on phones (RESPONSIVE.md §13, §15).
 */

export async function generateMetadata() {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations("transparencyPage")]);
  return pageMetadata({ path: "/transparency", locale, title: t("title"), description: t("metaDescription") });
}

export default async function TransparencyPage() {
  const locale = await currentLocale();
  const [t, site, reports, totals, spending] = await Promise.all([
    getTranslations("transparencyPage"),
    apiGet("/site/", { locale, tags: ["site"] }),
    apiGet("/reports/", { locale, tags: ["reports"] }),
    apiGet("/transparency/totals/", { locale, tags: ["transparency"] }),
    apiGet("/pages/how-we-spend/", { locale, tags: ["pages"] }),
  ]);

  return (
    <>
      <PageHero title={t("title")} eyebrow={t("eyebrow")} subtitle={t("subtitle")} breadcrumb={[{ label: t("title") }]} />

      <div className="bg-sand-50 py-12 sm:py-14 lg:py-20">
        <div className="mx-auto max-w-5xl space-y-14 px-4 lg:space-y-20">
          <RegistrationCard registration={site.registration} locale={locale} headingId="transparency-registration" />

          <section aria-labelledby="transparency-reports">
            <h2 id="transparency-reports" className="font-head text-2xl leading-snug font-bold text-em-900 sm:text-3xl">
              {t("reportsTitle")}
            </h2>
            <div className="mt-6">
              <ReportsList reports={reports} locale={locale} />
            </div>
          </section>

          <section aria-labelledby="transparency-totals">
            <h2 id="transparency-totals" className="font-head text-2xl leading-snug font-bold text-em-900 sm:text-3xl">
              {t("totalsTitle")}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-em-900/80">{t("totalsIntro")}</p>
            <div className="mt-6">
              <FundTotals years={totals.years} locale={locale} />
            </div>
          </section>

          <section aria-labelledby="transparency-spending" className="rounded-lg border border-em-100 bg-white p-5 sm:p-8">
            <SectionHeader id="transparency-spending" eyebrow={t("howWeSpendEyebrow")} title={spending.title} align="left" />
            <Prose html={spending.body_html} className="mt-5" />
          </section>
        </div>
      </div>

      <DonateCta />
    </>
  );
}
