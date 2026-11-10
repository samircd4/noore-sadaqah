import { Calculator, Clock } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import DonateForm from "@/components/donate/DonateForm";
import OfflineGiving from "@/components/donate/OfflineGiving";
import PageHero from "@/components/layout/PageHero";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Prose from "@/components/ui/Prose";
import { apiGet, apiGetOrNotFound } from "@/lib/api";
import { currentLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";

/**
 * /donate/[fund] (PAGES.md): the donate form and the fund's story. Data: GET /funds/{slug}/ (404 → notFound()),
 * GET /site/ (payment methods, mobile banking, fitra, zakat flag).
 * Phone: form first, story after (RESPONSIVE.md §7, §15). From lg: form (7) left, story and offline details (5) right.
 * The form reads ?amount= / ?campaign= in the browser, so the rest of the page is prerendered.
 * The page body reads the URL's [fund] inside <Suspense>, so a navigation shows the placeholder at once
 * (Next.js "instant" navigations) instead of waiting for the fund.
 */

export async function generateStaticParams({ params }) {
  const funds = await apiGet("/funds/", { locale: params.locale, tags: ["funds"] });
  return funds.map((f) => ({ fund: f.slug }));
}

/** @param {string} slug @param {"bn" | "en"} locale */
const loadFund = (slug, locale) => apiGetOrNotFound(`/funds/${encodeURIComponent(slug)}/`, { locale, tags: ["funds"] });

export async function generateMetadata({ params }) {
  const [{ fund: slug }, locale, t] = await Promise.all([params, currentLocale(), getTranslations("donatePage")]);
  const fund = await loadFund(slug, locale);
  return pageMetadata({
    path: `/donate/${fund.slug}`,
    locale,
    title: t("fundTitle", { fund: fund.title }),
    description: fund.summary,
    image: fund.cover,
  });
}

/** Placeholder with the form's rough height while the client form loads (no layout jump). */
function FormSkeleton() {
  return <div aria-hidden="true" className="h-[52rem] animate-pulse rounded-lg bg-sand-100 motion-reduce:animate-none sm:h-[44rem]" />;
}

/** Placeholder for the whole page while the fund loads: hero band, then the form's area. */
function PageSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
      <div className="h-64 bg-em-900 sm:h-72" />
      <div className="bg-sand-50 py-12 sm:py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:grid lg:grid-cols-12 lg:gap-10">
          <div className="h-[52rem] rounded-lg bg-sand-100 sm:h-[44rem] lg:col-span-7" />
        </div>
      </div>
    </div>
  );
}

export default function FundDonatePage({ params }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FundDonateBody params={params} />
    </Suspense>
  );
}

/** @param {{ params: Promise<{ fund: string }> }} props */
async function FundDonateBody({ params }) {
  const [{ fund: slug }, locale] = await Promise.all([params, currentLocale()]);
  const [fund, site, t] = await Promise.all([
    loadFund(slug, locale),
    apiGet("/site/", { locale, tags: ["site"] }),
    getTranslations("donatePage"),
  ]);
  // The fitra form (people × rate) waits for ZAKAT_POLICY.md sign-off; until fitra opens there is no form.
  const fitraClosed = fund.is_fitra && !site.fitra.open;

  return (
    <>
      <PageHero
        title={t("fundTitle", { fund: fund.title })}
        subtitle={fund.summary}
        badge={fund.is_zakat_eligible ? <Badge>{t("zakatBadge")}</Badge> : null}
        breadcrumb={[{ label: t("title"), href: "/donate" }, { label: fund.title }]}
      />

      <div className="bg-sand-50 py-12 sm:py-14 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 lg:grid-cols-12 lg:gap-10">
          <section aria-labelledby="donate-form-title" className="min-w-0 lg:col-span-7">
            <div className="rounded-lg border border-sand-200 bg-white p-5 shadow-card sm:p-8">
              <h2 id="donate-form-title" className="mb-6 font-head text-2xl leading-snug font-bold text-em-900">
                {t("formTitle")}
              </h2>
              {fitraClosed ? (
                <div className="flex gap-3 rounded-lg bg-sand-100 p-5 text-em-950">
                  <Clock aria-hidden="true" className="mt-1 size-5 shrink-0 text-em-700" />
                  <div>
                    <p className="font-bold">{t("fitraClosedTitle")}</p>
                    <p className="mt-1 text-base leading-relaxed text-em-900/80">{t("fitraClosedText")}</p>
                  </div>
                </div>
              ) : (
                <Suspense fallback={<FormSkeleton />}>
                  <DonateForm
                    fund={{
                      slug: fund.slug,
                      title: fund.title,
                      preset_amounts: fund.preset_amounts,
                      min_amount: fund.min_amount,
                      allow_recurring: fund.allow_recurring,
                    }}
                    methods={site.payment_methods}
                  />
                </Suspense>
              )}
            </div>
          </section>

          <div className="min-w-0 space-y-10 lg:col-span-5">
            <section aria-labelledby="fund-story">
              {fund.cover && (
                <div className="relative mb-6 aspect-[3/2] overflow-hidden rounded-lg">
                  <Image src={fund.cover.url} alt={fund.cover.alt} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
                </div>
              )}
              <h2 id="fund-story" className="font-head text-2xl leading-snug font-bold text-em-900">
                {t("fundStory")}
              </h2>
              {fund.body_html && <Prose html={fund.body_html} className="mt-4" />}
            </section>

            {fund.is_zakat_eligible && site.zakat_enabled && (
              <div className="rounded-lg bg-em-900 p-5 text-white">
                <p className="font-head text-lg font-bold">{t("zakatCalcText")}</p>
                <Button href="/zakat-calculator" className="mt-4 w-full">
                  <Calculator aria-hidden="true" className="size-5" />
                  {t("zakatCalc")}
                </Button>
              </div>
            )}

            <OfflineGiving banks={fund.bank_details ?? []} mobileBanking={site.mobile_banking} locale={locale} />
          </div>
        </div>
      </div>
    </>
  );
}
