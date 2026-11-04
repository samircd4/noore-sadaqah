import { BriefcaseBusiness, CalendarClock, HandHeart, MapPin, Mail, Receipt, Repeat, SlidersHorizontal, ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import VolunteerForm from "@/components/forms/VolunteerForm";
import PageHero from "@/components/layout/PageHero";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Prose from "@/components/ui/Prose";
import Tabs from "@/components/ui/Tabs";
import { Link } from "@/i18n/navigation";
import { apiGet } from "@/lib/api";
import { bnDate, taka } from "@/lib/format";
import { currentLocale } from "@/lib/locale";
import { fundDonateHref } from "@/lib/nav";
import { pageMetadata } from "@/lib/seo";

/**
 * /get-involved (PAGES.md): tabs `?tab=monthly|volunteer|careers`.
 *  - monthly: benefits, the fund's monthly amounts, button to the monthly donate form (orphan fund, PAGES.md)
 *  - volunteer: the volunteer form → POST /volunteers/
 *  - careers: GET /jobs/, or EmptyState "এই মুহূর্তে কোনো পদ খালি নেই"
 * The tab comes from searchParams, so the tabs render per request inside <Suspense> (frontend/CLAUDE.md rule 7).
 */

const TABS = ["monthly", "volunteer", "careers"];
/** PAGES.md: the monthly tab sends people to the orphan fund's monthly form. */
const MONTHLY_FUND = "orphan";

export async function generateMetadata() {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations("getInvolvedPage")]);
  return pageMetadata({ path: "/get-involved", locale, title: t("title"), description: t("metaDescription") });
}

export default async function GetInvolvedPage({ searchParams }) {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations("getInvolvedPage")]);

  return (
    <>
      <PageHero
        title={t("title")}
        eyebrow={t("eyebrow")}
        subtitle={t("subtitle")}
        breadcrumb={[{ label: t("title") }]}
      />
      <div className="bg-sand-50 py-10 sm:py-14 lg:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <Suspense fallback={<TabsSkeleton />}>
            <GetInvolvedTabs searchParams={searchParams} locale={locale} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

function TabsSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="flex gap-2 border-b border-sand-200 pb-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-9 w-28 rounded-lg bg-sand-200 motion-safe:animate-pulse" />
        ))}
      </div>
      <div className="mt-8 h-72 rounded-lg bg-sand-100 motion-safe:animate-pulse" />
    </div>
  );
}

/** @param {{ searchParams: Promise<Record<string, string | string[] | undefined>>, locale: "bn" | "en" }} props */
async function GetInvolvedTabs({ searchParams, locale }) {
  const params = await searchParams;
  const requested = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initial = TABS.includes(requested ?? "") ? /** @type {string} */ (requested) : "monthly";

  const [t, fund, jobs] = await Promise.all([
    getTranslations("getInvolvedPage"),
    apiGet(`/funds/${MONTHLY_FUND}/`, { locale, tags: ["funds"] }).catch(() => null),
    apiGet("/jobs/", { locale, tags: ["jobs"] }),
  ]);

  return (
    <Tabs
      label={t("tabsLabel")}
      initial={initial}
      tabs={[
        { key: "monthly", label: t("tabMonthly"), content: <MonthlyPanel fund={fund} locale={locale} t={t} /> },
        {
          key: "volunteer",
          label: t("tabVolunteer"),
          content: (
            <div className="rounded-lg border border-sand-200 bg-white p-5 sm:p-8">
              <h2 className="font-head text-2xl leading-snug font-bold text-em-900 sm:text-3xl">{t("volunteerTitle")}</h2>
              <p className="mt-3 mb-6 text-base leading-relaxed text-em-900/80">{t("volunteerIntro")}</p>
              <VolunteerForm />
            </div>
          ),
        },
        { key: "careers", label: t("tabCareers"), content: <CareersPanel jobs={jobs} locale={locale} t={t} /> },
      ]}
    />
  );
}

function MonthlyPanel({ fund, locale, t }) {
  const benefits = [
    { Icon: Repeat, title: t("benefit1Title"), text: t("benefit1Text") },
    { Icon: SlidersHorizontal, title: t("benefit2Title"), text: t("benefit2Text") },
    { Icon: Receipt, title: t("benefit3Title"), text: t("benefit3Text") },
  ];
  const amounts = fund?.allow_recurring ? fund.preset_amounts : [];

  return (
    <div className="grid gap-8 lg:grid-cols-5 lg:gap-10">
      <div className="lg:col-span-3">
        <h2 className="font-head text-2xl leading-snug font-bold text-em-900 sm:text-3xl">{t("monthlyTitle")}</h2>
        <p className="mt-3 text-base leading-relaxed text-em-900/80 sm:text-lg">{t("monthlyIntro")}</p>
        <ul className="mt-6 space-y-4">
          {benefits.map(({ Icon, title, text }) => (
            <li key={title} className="flex gap-4 rounded-lg border border-em-100 bg-em-50 p-4">
              <Icon aria-hidden="true" className="mt-0.5 size-7 shrink-0 text-em-700" />
              <div>
                <p className="font-bold text-em-900">{title}</p>
                <p className="mt-1 text-sm leading-6 text-em-900/70">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg bg-em-900 p-5 text-white shadow-card sm:p-6 lg:col-span-2 lg:self-start">
        <HandHeart aria-hidden="true" className="size-9 text-gold-400" />
        <h3 className="mt-3 font-head text-xl font-bold">{t("monthlyAmounts")}</h3>
        {fund && <p className="mt-1 text-sm text-sand-200">{t("monthlyFund", { fund: fund.title })}</p>}
        {amounts.length > 0 && (
          <ul className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
            {amounts.map((amount) => (
              <li key={amount}>
                <Link
                  href={fundDonateHref(MONTHLY_FUND, { amount, monthly: true })}
                  className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-bold transition hover:border-gold-400 motion-reduce:transition-none min-[360px]:block min-[360px]:p-3 min-[360px]:text-center"
                >
                  <span className="block font-head text-xl">{taka(amount, locale)}</span>
                  <span className="block text-xs font-normal text-sand-100/80">{t("perMonth")}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Button href={fundDonateHref(MONTHLY_FUND, { monthly: true })} className="mt-5 w-full">
          {t("monthlyCta")}
        </Button>
      </div>
    </div>
  );
}

function CareersPanel({ jobs, locale, t }) {
  return (
    <div>
      <h2 className="font-head text-2xl leading-snug font-bold text-em-900 sm:text-3xl">{t("careersTitle")}</h2>
      <p className="mt-3 text-base leading-relaxed text-em-900/80">{t("careersIntro")}</p>
      <div className="mt-6">
        {jobs.length === 0 ? (
          <EmptyState text={t("noJobs")} icon={BriefcaseBusiness} />
        ) : (
          <ul className="space-y-5">
            {jobs.map((job) => (
              <li key={job.slug}>
                <article aria-labelledby={`job-${job.slug}`} className="rounded-lg border border-sand-200 bg-white p-5 sm:p-6">
                  <h3 id={`job-${job.slug}`} className="font-head text-xl leading-snug font-bold text-em-900">
                    {job.title}
                  </h3>
                  <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-em-900/70">
                    {job.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin aria-hidden="true" className="size-4 text-gold-600" />
                        <span className="sr-only">{t("location")}: </span>
                        {job.location}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock aria-hidden="true" className="size-4 text-gold-600" />
                      {job.closes_at ? t("closes", { date: bnDate(job.closes_at, locale) }) : t("openUntilFilled")}
                    </span>
                  </p>
                  <Prose html={job.body_html} className="mt-4 sm:text-base" />
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    {job.apply_email && (
                      <a
                        href={`mailto:${job.apply_email}?subject=${encodeURIComponent(job.title)}`}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-em-800 px-6 font-semibold text-white hover:bg-em-700 sm:w-auto"
                      >
                        <Mail aria-hidden="true" className="size-5" />
                        {t("applyEmail")}
                      </a>
                    )}
                    {job.apply_url && (
                      <a
                        href={job.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-em-700 px-6 font-semibold text-em-700 hover:bg-em-700 hover:text-white sm:w-auto"
                      >
                        <ExternalLink aria-hidden="true" className="size-5" />
                        {t("applyOnline")}
                      </a>
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
