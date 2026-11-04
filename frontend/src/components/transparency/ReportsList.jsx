import { Download, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import EmptyState from "@/components/ui/EmptyState";
import { bnDigits } from "@/lib/format";

/**
 * Reports on /transparency (PAGES.md item 3): year, type, "ডাউনলোড" (PDF). A table from md, cards below
 * (RESPONSIVE.md §13). Data: GET /reports/ (newest first).
 * @param {{ reports: Array<{ id: number, kind: string, year: number | null, title: string, file_url: string }>, locale: "bn" | "en" }} props
 */
export default async function ReportsList({ reports, locale }) {
  const t = await getTranslations("transparencyPage");
  if (reports.length === 0) return <EmptyState text={t("noReports")} icon={FileText} />;

  const kindLabel = { annual: t("kindAnnual"), audit: t("kindAudit"), registration: t("kindRegistration"), other: t("kindOther") };
  const year = (r) => (r.year ? bnDigits(r.year, locale) : "—");
  const link = (r, compact) => (
    <a
      href={r.file_url}
      target="_blank"
      rel="noopener"
      aria-label={t("downloadAria", { title: r.title })}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-em-700 px-4 font-semibold text-em-700 transition hover:bg-em-700 hover:text-white motion-reduce:transition-none ${compact ? "" : "w-full"}`}
    >
      <Download aria-hidden="true" className="size-4" />
      {t("download")}
    </a>
  );

  return (
    <>
      <table className="hidden w-full overflow-hidden rounded-lg border border-sand-200 bg-white md:table">
        <thead className="bg-em-50 text-sm text-em-900">
          <tr>
            <th scope="col" className="px-4 py-3 text-start font-semibold">{t("year")}</th>
            <th scope="col" className="px-4 py-3 text-start font-semibold">{t("kind")}</th>
            <th scope="col" className="px-4 py-3 text-start font-semibold">{t("document")}</th>
            <th scope="col" className="px-4 py-3 text-end font-semibold"><span className="sr-only">{t("download")}</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sand-200">
          {reports.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-semibold text-em-900">{year(r)}</td>
              <td className="px-4 py-3 text-em-900/80">{kindLabel[r.kind] ?? r.kind}</td>
              <th scope="row" className="px-4 py-3 text-start font-semibold text-em-950">{r.title}</th>
              <td className="px-4 py-2 text-end">{link(r, true)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="space-y-3 md:hidden">
        {reports.map((r) => (
          <li key={r.id} className="rounded-lg border border-sand-200 bg-white p-4">
            <p className="text-sm font-semibold text-gold-600">
              {kindLabel[r.kind] ?? r.kind} · {year(r)}
            </p>
            <p className="mt-1 font-semibold text-em-950">{r.title}</p>
            <div className="mt-3">{link(r, false)}</div>
          </li>
        ))}
      </ul>
    </>
  );
}
