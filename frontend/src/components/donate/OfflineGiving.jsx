import { Landmark, Smartphone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { bnDigits } from "@/lib/format";
import CopyButton from "./CopyButton";

/**
 * "Other ways to give" (PAGES.md "/donate" and the side of "/donate/[fund]"): bank accounts and mobile-banking
 * merchant numbers, each number with a copy button; cards on phones (RESPONSIVE.md §15). Entries still empty in
 * the API (CONTENT.md TODO) are left out; with nothing left, a line points to the contact page.
 * @param {object} props
 * @param {Array<{ bank: string, account_name: string, branch: string, number: string, routing: string, swift: string }>} props.banks
 * @param {Array<{ service: string, number: string, type: string }>} props.mobileBanking `site.mobile_banking`
 * @param {"bn" | "en"} props.locale
 * @param {string} [props.headingId]
 */
export default async function OfflineGiving({ banks, mobileBanking, locale, headingId = "offline-giving" }) {
  const t = await getTranslations("donatePage");
  const bankList = banks.filter((b) => b.number);
  const mobileList = mobileBanking.filter((m) => m.number);
  const empty = bankList.length === 0 && mobileList.length === 0;

  const row = (label, value) =>
    value ? (
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-em-900/70">{label}</dt>
        <dd className="text-base break-words text-em-950">{value}</dd>
      </div>
    ) : null;

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="font-head text-2xl leading-snug font-bold text-em-900">
        {t("offlineTitle")}
      </h2>
      <p className="mt-2 text-base leading-relaxed text-em-900/80">{t("offlineIntro")}</p>

      {empty ? (
        <p className="mt-4 rounded-lg border border-dashed border-sand-300 bg-white p-4 text-base text-em-900/80">
          {t("offlineEmpty")}{" "}
          <Link href="/contact" className="font-semibold text-em-700 underline underline-offset-2">
            {t("contactLink")}
          </Link>
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {mobileList.map((m) => (
            <li key={`${m.service}-${m.number}`} className="flex items-start gap-3 rounded-lg border border-sand-200 bg-white p-4">
              <Smartphone aria-hidden="true" className="mt-1 size-5 shrink-0 text-gold-600" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-em-900">
                  {t(`service.${m.service}`)} · {t(`numberType.${m.type}`)}
                </p>
                <p className="mt-1 text-lg font-bold tracking-wide text-em-950">{bnDigits(m.number, locale)}</p>
              </div>
              <CopyButton value={m.number} label={t("copyAria", { label: t(`service.${m.service}`) })} copiedLabel={t("copied")} />
            </li>
          ))}
          {bankList.map((b) => (
            <li key={`${b.bank}-${b.number}`} className="flex items-start gap-3 rounded-lg border border-sand-200 bg-white p-4">
              <Landmark aria-hidden="true" className="mt-1 size-5 shrink-0 text-gold-600" />
              <dl className="min-w-0 flex-1 space-y-2">
                {row(t("bank"), b.bank)}
                {row(t("accountName"), b.account_name)}
                {row(t("accountNumber"), b.number)}
                {row(t("branch"), b.branch)}
                {row(t("routing"), b.routing)}
                {row(t("swift"), b.swift)}
              </dl>
              <CopyButton value={b.number} label={t("copyAria", { label: b.bank })} copiedLabel={t("copied")} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
