import { BadgeCheck, Download } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { bnDate } from "@/lib/format";

/**
 * Legal registration (PAGES.md /about item 7 and /transparency item 2): authority, number, date and the
 * certificate PDF. Data: GET /site/ `registration`. Until CONTENT.md §2 is filled in, shows a "coming soon" line.
 * Phone: full width with a full-width download button (RESPONSIVE.md §15).
 * @param {{ registration: { authority: string, number: string, date: string | null, certificate_url: string | null }, locale: "bn" | "en", headingId: string }} props
 */
export default async function RegistrationCard({ registration, locale, headingId }) {
  const t = await getTranslations("registration");
  const rows = [
    { label: t("authority"), value: registration.authority },
    { label: t("number"), value: registration.number },
    { label: t("date"), value: registration.date ? bnDate(registration.date, locale) : "" },
  ].filter((r) => r.value);

  return (
    <section aria-labelledby={headingId} className="rounded-lg border border-em-100 bg-em-50 p-5 sm:p-8">
      <div className="flex items-center gap-3">
        <BadgeCheck aria-hidden="true" className="size-8 shrink-0 text-em-700" />
        <h2 id={headingId} className="font-head text-2xl leading-snug font-bold text-em-900">
          {t("title")}
        </h2>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-base text-em-900/70">{t("pending")}</p>
      ) : (
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          {rows.map((r) => (
            <div key={r.label} className="min-w-0">
              <dt className="text-sm font-semibold text-em-900/70">{r.label}</dt>
              <dd className="mt-1 text-base font-bold break-words text-em-950">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {registration.certificate_url && (
        <a
          href={registration.certificate_url}
          target="_blank"
          rel="noopener"
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-em-800 px-7 py-3 font-semibold text-white transition hover:bg-em-700 active:bg-em-900 sm:w-auto motion-reduce:transition-none"
        >
          <Download aria-hidden="true" className="size-5" />
          {t("download")}
        </a>
      )}
    </section>
  );
}
