import { ChartColumn } from "lucide-react";
import { getTranslations } from "next-intl/server";
import EmptyState from "@/components/ui/EmptyState";
import { bnDigits, taka } from "@/lib/format";

/**
 * Fund-wise totals by year (PAGES.md /transparency item 4): a table is required; zakat funds are listed
 * separately (API.md, CLAUDE.md rule 12). One card per year: a table from md, label/amount rows below.
 * Data: GET /transparency/totals/.
 * @param {{ years: Array<{ year: number, total: number, funds: Array<{ slug: string, title: string, total: number, is_zakat: boolean }> }>, locale: "bn" | "en" }} props
 */
export default async function FundTotals({ years, locale }) {
  const t = await getTranslations("transparencyPage");
  if (years.length === 0) return <EmptyState text={t("noTotals")} icon={ChartColumn} />;

  return (
    <div className="space-y-6">
      {years.map((y) => {
        const groups = [
          { label: t("generalFunds"), rows: y.funds.filter((f) => !f.is_zakat), zakat: false },
          { label: t("zakatFunds"), rows: y.funds.filter((f) => f.is_zakat), zakat: true },
        ].filter((g) => g.rows.length > 0);
        const yearLabel = bnDigits(y.year, locale);

        return (
          <section key={y.year} aria-labelledby={`totals-${y.year}`} className="overflow-hidden rounded-lg border border-sand-200 bg-white">
            <h3 id={`totals-${y.year}`} className="bg-em-900 px-4 py-3 font-head text-xl font-bold text-white">
              {yearLabel}
            </h3>

            <table className="hidden w-full md:table">
              <thead className="text-sm text-em-900/70">
                <tr className="border-b border-sand-200">
                  <th scope="col" className="px-4 py-2 text-start font-semibold">{t("fund")}</th>
                  <th scope="col" className="px-4 py-2 text-end font-semibold">{t("amount")}</th>
                </tr>
              </thead>
              {groups.map((g) => (
                <tbody key={g.label} className="divide-y divide-sand-100">
                  <tr className={g.zakat ? "bg-gold-500/10" : "bg-sand-50"}>
                    <th scope="colgroup" colSpan={2} className="px-4 py-2 text-start text-sm font-bold text-em-900">
                      {g.label}
                    </th>
                  </tr>
                  {g.rows.map((f) => (
                    <tr key={f.slug}>
                      <th scope="row" className="px-4 py-3 text-start font-semibold text-em-950">{f.title}</th>
                      <td className="px-4 py-3 text-end font-head text-lg font-bold text-em-700">{taka(f.total, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
              <tfoot>
                <tr className="border-t-2 border-em-100 bg-em-50">
                  <th scope="row" className="px-4 py-3 text-start font-bold text-em-900">{t("yearTotal", { year: yearLabel })}</th>
                  <td className="px-4 py-3 text-end font-head text-xl font-extrabold text-em-900">{taka(y.total, locale)}</td>
                </tr>
              </tfoot>
            </table>

            <div className="md:hidden">
              {groups.map((g) => (
                <div key={g.label}>
                  <p className={`px-4 py-2 text-sm font-bold text-em-900 ${g.zakat ? "bg-gold-500/10" : "bg-sand-50"}`}>{g.label}</p>
                  <dl className="divide-y divide-sand-100">
                    {g.rows.map((f) => (
                      <div key={f.slug} className="flex items-center justify-between gap-4 px-4 py-3">
                        <dt className="min-w-0 font-semibold text-em-950">{f.title}</dt>
                        <dd className="shrink-0 font-head text-lg font-bold text-em-700">{taka(f.total, locale)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 border-t-2 border-em-100 bg-em-50 px-4 py-3">
                <p className="font-bold text-em-900">{t("yearTotal", { year: yearLabel })}</p>
                <p className="shrink-0 font-head text-xl font-extrabold text-em-900">{taka(y.total, locale)}</p>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
