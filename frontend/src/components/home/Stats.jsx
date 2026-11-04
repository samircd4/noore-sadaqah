import { getTranslations } from "next-intl/server";
import StatCard from "@/components/ui/StatCard";

/**
 * Four impact numbers (HOME_PAGE.md §4) from GET /site/ `stats`. 2×2 on phones, 4 in a row from lg.
 * The second and fourth number use the gold accent, as in the design.
 * @param {{ stats: Array<{ value: number, suffix: string, label: string }>, locale: "bn" | "en", className?: string }} props
 */
export default async function Stats({ stats, locale, className = "" }) {
  const t = await getTranslations("stats");
  return (
    <section aria-labelledby="stats-title" className={`pb-12 ${className}`}>
      <h2 id="stats-title" className="sr-only">
        {t("heading")}
      </h2>
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 sm:gap-6 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} value={stat.value} suffix={stat.suffix} label={stat.label} locale={locale} accent={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}
