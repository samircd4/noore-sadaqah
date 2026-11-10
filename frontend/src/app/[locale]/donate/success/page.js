import { CircleCheck, Download, HandHeart, Hourglass } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import ClearDraft from "@/components/donate/ClearDraft";
import DonationPoller from "@/components/donate/DonationPoller";
import ShareButtons from "@/components/news/ShareButtons";
import Button from "@/components/ui/Button";
import { redirect } from "@/i18n/navigation";
import { donationStatus } from "@/lib/donation-status";
import { bnDate, taka } from "@/lib/format";
import { currentLocale } from "@/lib/locale";
import { localizedPath, pageMetadata } from "@/lib/seo";

/**
 * /donate/success?id= (PAGES.md). The status is read from GET /donations/{id}/status/, never from the URL, so
 * opening this page for an unpaid donation never shows "paid" (QA §4).
 *  - PAID: thanks, amount, receipt number, receipt download, share buttons
 *  - PENDING: "যাচাই করা হচ্ছে…" and a poller (refreshDonation every 5 s, 12 times)
 *  - anything else: /donate/failed?id=
 * Phone: one centered column, buttons full width (RESPONSIVE.md §15). Not indexed.
 */

export async function generateMetadata() {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations("donationResult")]);
  return { ...pageMetadata({ path: "/donate/success", locale, title: t("successMeta") }), robots: { index: false, follow: false } };
}

export default async function SuccessPage({ searchParams }) {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations("common")]);
  return (
    <section className="min-h-dvh bg-sand-50 px-4 pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div className="mx-auto max-w-xl text-center">
        <Suspense fallback={<p className="py-12 text-em-900/70">{t("loading")}</p>}>
          <SuccessBody searchParams={searchParams} locale={locale} />
        </Suspense>
      </div>
    </section>
  );
}

/** @param {{ searchParams: Promise<Record<string, string | string[] | undefined>>, locale: "bn" | "en" }} props */
async function SuccessBody({ searchParams, locale }) {
  const { id } = await searchParams;
  const [status, t] = await Promise.all([donationStatus(id, locale), getTranslations("donationResult")]);
  if (!status) notFound();
  if (status.status !== "paid" && status.status !== "pending") {
    redirect({ href: { pathname: "/donate/failed", query: { id: status.id } }, locale });
  }

  const heading = "font-head text-[1.75rem] leading-snug font-bold text-em-900 min-[22.5rem]:text-3xl sm:text-4xl";

  if (status.status === "pending") {
    return (
      <>
        <Hourglass aria-hidden="true" className="mx-auto size-16 text-gold-600" strokeWidth={1.5} />
        <h1 className={`mt-4 ${heading}`}>{t("pendingTitle")}</h1>
        <p className="mt-3 text-lg font-semibold text-em-900">
          {taka(status.amount, locale)} · {status.fund.title}
        </p>
        <DonationPoller id={status.id} locale={locale} />
      </>
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const shareUrl = new URL(localizedPath(`/donate/${status.fund.slug}`, locale), siteUrl).toString();
  const facts = [
    { label: t("amount"), value: taka(status.amount, locale) },
    { label: t("fund"), value: status.fund.title },
    { label: t("receiptNo"), value: status.receipt_no },
    status.paid_at ? { label: t("paidAt"), value: bnDate(status.paid_at, locale) } : null,
  ].filter(Boolean);

  return (
    <>
      <ClearDraft />
      <CircleCheck aria-hidden="true" className="mx-auto size-16 text-em-600" strokeWidth={1.5} />
      <h1 className={`mt-4 ${heading}`}>{t("successTitle")}</h1>
      <p className="mt-3 text-base leading-relaxed text-em-900/80 sm:text-lg">{t("successText")}</p>

      <dl className="mt-8 divide-y divide-sand-200 rounded-lg border border-sand-200 bg-white px-5 text-start shadow-card">
        {facts.map((f) => (
          <div key={f.label} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
            <dt className="text-sm font-semibold text-em-900/70">{f.label}</dt>
            <dd className="min-w-0 break-words font-semibold text-em-950">{f.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {status.receipt_url && (
          // Django serves the PDF at /r/… (not a Next.js page), so a plain link.
          <a
            href={status.receipt_url}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-em-700 px-7 py-3 font-bold text-white transition hover:bg-em-500 active:bg-em-800 motion-reduce:transition-none sm:w-auto"
          >
            <Download aria-hidden="true" className="size-5" />
            {t("downloadReceipt")}
          </a>
        )}
        <Button href="/donate" variant="gold" blockOnPhone>
          <HandHeart aria-hidden="true" className="size-5" />
          {t("donateAgain")}
        </Button>
      </div>

      <div className="mt-10 flex justify-center">
        <ShareButtons url={shareUrl} title={status.fund.title} />
      </div>
    </>
  );
}
