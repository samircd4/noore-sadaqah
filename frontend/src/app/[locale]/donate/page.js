import { Calculator } from "lucide-react";
import { getTranslations } from "next-intl/server";
import FundCard from "@/components/donate/FundCard";
import OfflineGiving from "@/components/donate/OfflineGiving";
import PageHero from "@/components/layout/PageHero";
import Button from "@/components/ui/Button";
import { apiGet } from "@/lib/api";
import { currentLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";

/**
 * /donate (PAGES.md): PageHero, a FundCard per active fund, other ways to give (bank accounts and mobile-banking
 * numbers with copy buttons) and, once zakat is enabled, the zakat calculator link. Data: GET /funds/, GET /site/.
 * Phone: one column of cards; bank and merchant numbers as cards (RESPONSIVE.md §15).
 */

export async function generateMetadata() {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations("donatePage")]);
  return pageMetadata({ path: "/donate", locale, title: t("title"), description: t("metaDescription") });
}

/** Every fund's bank accounts, each account once. */
function allBankAccounts(funds) {
  const seen = new Set();
  return funds
    .flatMap((f) => f.bank_details ?? [])
    .filter((b) => {
      const key = `${b.bank}|${b.number}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export default async function DonatePage() {
  const locale = await currentLocale();
  const [t, funds, site] = await Promise.all([
    getTranslations("donatePage"),
    apiGet("/funds/", { locale, tags: ["funds"] }),
    apiGet("/site/", { locale, tags: ["site"] }),
  ]);

  return (
    <>
      <PageHero title={t("title")} eyebrow={t("eyebrow")} subtitle={t("subtitle")} breadcrumb={[{ label: t("title") }]} />

      <section aria-labelledby="funds-title" className="bg-sand-50 py-12 sm:py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 id="funds-title" className="font-head text-2xl leading-snug font-bold text-em-900 sm:text-3xl">
            {t("fundsTitle")}
          </h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {funds.map((fund) => (
              <li key={fund.slug} className="min-w-0">
                <FundCard
                  fund={fund}
                  donateLabel={t("cardDonate")}
                  zakatLabel={t("zakatBadge")}
                  note={fund.is_fitra && !site.fitra.open ? t("fitraSoon") : null}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="bg-sand-100 py-12 sm:py-14 lg:py-20">
        <div className="mx-auto max-w-5xl space-y-10 px-4">
          <OfflineGiving banks={allBankAccounts(funds)} mobileBanking={site.mobile_banking} locale={locale} />

          {site.zakat_enabled && (
            <div className="flex flex-col gap-4 rounded-lg bg-em-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
              <p className="font-head text-xl font-bold">{t("zakatCalcText")}</p>
              <Button href="/zakat-calculator" blockOnPhone>
                <Calculator aria-hidden="true" className="size-5" />
                {t("zakatCalc")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
