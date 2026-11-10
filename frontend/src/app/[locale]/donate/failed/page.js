import { CircleX, Home, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import RetryLink from "@/components/donate/RetryLink";
import Button from "@/components/ui/Button";
import { redirect } from "@/i18n/navigation";
import { apiGet } from "@/lib/api";
import { donationStatus } from "@/lib/donation-status";
import { bnDigits } from "@/lib/format";
import { currentLocale } from "@/lib/locale";
import { telDigits } from "@/lib/phone";
import { pageMetadata } from "@/lib/seo";

/**
 * /donate/failed?id= (PAGES.md): "পেমেন্ট সম্পন্ন হয়নি", the reason if known, "আবার চেষ্টা করুন" (the form refilled
 * from sessionStorage, or fund and amount from the status) and the contact phone. A donation that is in fact PAID or
 * still PENDING goes to the success page, which shows the real state. Not indexed.
 */

export async function generateMetadata() {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations("donationResult")]);
  return { ...pageMetadata({ path: "/donate/failed", locale, title: t("failedMeta") }), robots: { index: false, follow: false } };
}

export default async function FailedPage({ searchParams }) {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations("common")]);
  return (
    <section className="min-h-dvh bg-sand-50 px-4 pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div className="mx-auto max-w-xl text-center">
        <Suspense fallback={<p className="py-12 text-em-900/70">{t("loading")}</p>}>
          <FailedBody searchParams={searchParams} locale={locale} />
        </Suspense>
      </div>
    </section>
  );
}

/** @param {{ searchParams: Promise<Record<string, string | string[] | undefined>>, locale: "bn" | "en" }} props */
async function FailedBody({ searchParams, locale }) {
  const { id } = await searchParams;
  const [status, site, t] = await Promise.all([
    donationStatus(id, locale),
    apiGet("/site/", { locale, tags: ["site"] }),
    getTranslations("donationResult"),
  ]);
  if (status && (status.status === "paid" || status.status === "pending")) {
    redirect({ href: { pathname: "/donate/success", query: { id: status.id } }, locale });
  }
  const phone = telDigits(site.contact.phone);

  return (
    <>
      <CircleX aria-hidden="true" className="mx-auto size-16 text-em-700" strokeWidth={1.5} />
      <h1 className="mt-4 font-head text-[1.75rem] leading-snug font-bold text-em-900 min-[22.5rem]:text-3xl sm:text-4xl">
        {t("failedTitle")}
      </h1>
      {status?.fail_reason && <p className="mt-3 text-base font-semibold text-em-950">{t("reason", { reason: status.fail_reason })}</p>}
      <p className="mt-3 text-base leading-relaxed text-em-900/80 sm:text-lg">{t("failedText")}</p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <RetryLink fund={status?.fund.slug ?? null} amount={status?.amount ?? null} label={t("tryAgain")} />
        <Button href="/" variant="dark" blockOnPhone>
          <Home aria-hidden="true" className="size-5" />
          {t("home")}
        </Button>
      </div>

      {phone && (
        <p className="mt-8 text-base text-em-900/80">
          {t("needHelp")}{" "}
          <a href={`tel:${phone}`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-em-700 underline underline-offset-2">
            <Phone aria-hidden="true" className="size-4" />
            {bnDigits(site.contact.phone, locale)}
          </a>
        </p>
      )}
    </>
  );
}
