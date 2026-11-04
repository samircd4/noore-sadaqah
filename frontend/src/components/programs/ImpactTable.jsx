import { getTranslations } from "next-intl/server";
import { bnDigits, bnNumber } from "@/lib/format";

/**
 * Impact by year (PAGES.md /programs/[slug]): a real table from md, stacked cards below md, both from the same
 * data (RESPONSIVE.md §13). Never scrolls sideways.
 * @param {{ rows: Array<{ year: number, metric: string, value: number }>, locale: "bn" | "en" }} props
 */
export default async function ImpactTable({ rows, locale }) {
  if (rows.length === 0) return null;
  const t = await getTranslations("programsPage");
  const sorted = [...rows].sort((a, b) => b.year - a.year);

  return (
    <>
      <table className="hidden w-full overflow-hidden rounded-lg border border-sand-200 bg-white text-start md:table">
        <thead className="bg-em-50 text-sm text-em-900">
          <tr>
            <th scope="col" className="px-4 py-3 text-start font-semibold">{t("year")}</th>
            <th scope="col" className="px-4 py-3 text-start font-semibold">{t("metric")}</th>
            <th scope="col" className="px-4 py-3 text-end font-semibold">{t("value")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sand-200">
          {sorted.map((row, i) => (
            <tr key={i}>
              <th scope="row" className="px-4 py-3 text-start font-semibold text-em-900">{bnDigits(row.year, locale)}</th>
              <td className="px-4 py-3 text-em-900/80">{row.metric}</td>
              <td className="px-4 py-3 text-end font-head text-xl font-bold text-em-700">{bnNumber(row.value, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="space-y-3 md:hidden">
        {sorted.map((row, i) => (
          <li key={i} className="rounded-lg border border-sand-200 bg-white p-4">
            <p className="font-head text-3xl font-extrabold text-em-700">{bnNumber(row.value, locale)}</p>
            <p className="mt-1 text-base text-em-900/80">{row.metric}</p>
            <p className="mt-2 text-sm text-em-900/70">
              {t("year")}: <span className="font-semibold">{bnDigits(row.year, locale)}</span>
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
