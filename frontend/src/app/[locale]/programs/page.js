import { HeartHandshake } from "lucide-react";
import { getTranslations } from "next-intl/server";
import DonateCta from "@/components/donate/DonateCta";
import ProgramCard from "@/components/home/ProgramCard";
import PageHero from "@/components/layout/PageHero";
import EmptyState from "@/components/ui/EmptyState";
import { apiGet } from "@/lib/api";
import { currentLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";

/**
 * /programs (PAGES.md): PageHero, every program as the home ProgramCard (1 / 2 / 3 columns), DonateCta.
 * Data: GET /programs/ (a plain array, API.md "Pagination").
 */

export async function generateMetadata() {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations("programsPage")]);
  return pageMetadata({ path: "/programs", locale, title: t("title"), description: t("metaDescription") });
}

export default async function ProgramsPage() {
  const locale = await currentLocale();
  const [t, tCard, programs] = await Promise.all([
    getTranslations("programsPage"),
    getTranslations("programs"),
    apiGet("/programs/", { locale, tags: ["programs"] }),
  ]);

  return (
    <>
      <PageHero
        title={t("title")}
        eyebrow={t("eyebrow")}
        subtitle={t("subtitle")}
        breadcrumb={[{ label: t("title") }]}
      />

      <section aria-labelledby="programs-list" className="bg-sand-50 py-12 sm:py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 id="programs-list" className="sr-only">
            {t("listTitle")}
          </h2>
          {programs.length === 0 ? (
            <EmptyState text={t("empty")} icon={HeartHandshake} />
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {programs.map((program) => (
                <li key={program.slug} className="min-w-0">
                  <ProgramCard program={program} detailsLabel={tCard("details")} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <DonateCta />
    </>
  );
}
