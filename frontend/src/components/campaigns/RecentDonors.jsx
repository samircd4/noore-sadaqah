import { HeartHandshake, UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import EmptyState from "@/components/ui/EmptyState";
import { bnDate, taka } from "@/lib/format";

/**
 * Recent donors (PAGES.md item 5): first name + amount + date. The API sends only the first name, or null when
 * the donor chose anonymity; it never sends phone or email, and this list shows nothing else.
 * @param {{ donors: Array<{ name: string | null, amount: number, paid_at: string }>, locale: "bn" | "en", ended: boolean }} props
 */
export default async function RecentDonors({ donors, locale, ended }) {
  const t = await getTranslations("campaignPage");
  if (donors.length === 0) {
    return ended ? null : <EmptyState text={t("noDonors")} icon={HeartHandshake} />;
  }
  return (
    <ul className="divide-y divide-sand-200 rounded-lg border border-sand-200 bg-white">
      {donors.map((donor, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg bg-em-50 text-em-700">
            <UserRound className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`truncate font-semibold ${donor.name ? "text-em-950" : "text-em-900/70"}`}>{donor.name ?? t("anonymous")}</p>
            <p className="text-sm text-em-900/70">
              <time dateTime={donor.paid_at}>{bnDate(donor.paid_at, locale)}</time>
            </p>
          </div>
          <p className="shrink-0 font-head text-lg font-bold text-em-700">{taka(donor.amount, locale)}</p>
        </li>
      ))}
    </ul>
  );
}
