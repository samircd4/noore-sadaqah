import { getTranslations } from "next-intl/server";
import SectionHeader from "@/components/ui/SectionHeader";
import ProgramCard from "./ProgramCard";

/**
 * Featured programs (HOME_PAGE.md §6) from GET /programs/?featured=1. 1 / 2 / 3 columns.
 * @param {{ programs: any[] }} props
 */
export default async function Programs({ programs }) {
  const t = await getTranslations("programs");
  return (
    <section id="programs" aria-labelledby="programs-title" className="bg-sand-100 py-12 sm:py-14">
      <div className="mx-auto max-w-7xl px-4">
        <SectionHeader id="programs-title" eyebrow={t("eyebrow")} title={t("title")} />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <li key={program.slug} className="flex">
              <div className="w-full">
                <ProgramCard program={program} detailsLabel={t("details")} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
