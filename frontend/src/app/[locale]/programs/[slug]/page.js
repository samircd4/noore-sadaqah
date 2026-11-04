import { CircleCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import DonateCta from "@/components/donate/DonateCta";
import ProgramCard from "@/components/home/ProgramCard";
import PageHero from "@/components/layout/PageHero";
import GalleryStrip from "@/components/programs/GalleryStrip";
import ImpactTable from "@/components/programs/ImpactTable";
import ProgramSidebar from "@/components/programs/ProgramSidebar";
import Accordion from "@/components/ui/Accordion";
import Badge from "@/components/ui/Badge";
import Prose from "@/components/ui/Prose";
import { apiGet, apiGetOrNotFound } from "@/lib/api";
import { currentLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";

/**
 * /programs/[slug] (PAGES.md, phone layout RESPONSIVE.md §15). Data: GET /programs/{slug}/ (404 → notFound()).
 * Phone order: hero, sidebar (info + donate box), story, goals, photos, impact, FAQ, other programs.
 * From lg: main column (8) on the left, sticky sidebar (4) on the right.
 */

/** Every program slug, prerendered per language (the parent layout supplies `locale`). */
export async function generateStaticParams({ params }) {
  const programs = await apiGet("/programs/", { locale: params.locale, tags: ["programs"] });
  return programs.map((p) => ({ slug: p.slug }));
}

/** @param {string} slug @param {"bn" | "en"} locale */
const loadProgram = (slug, locale) =>
  apiGetOrNotFound(`/programs/${encodeURIComponent(slug)}/`, { locale, tags: ["programs"] });

export async function generateMetadata({ params }) {
  const [{ slug }, locale] = await Promise.all([params, currentLocale()]);
  const program = await loadProgram(slug, locale);
  return pageMetadata({
    path: `/programs/${program.slug}`,
    locale,
    title: program.title,
    description: program.summary,
    image: program.cover,
  });
}

/** Sub-section heading inside the page (smaller than a section h2). */
function SubHeading({ id, children }) {
  return (
    <h2 id={id} className="font-head text-2xl leading-snug font-bold text-em-900 sm:text-3xl">
      {children}
    </h2>
  );
}

export default async function ProgramPage({ params }) {
  const [{ slug }, locale] = await Promise.all([params, currentLocale()]);
  const [program, t, tNav, tCard] = await Promise.all([
    loadProgram(slug, locale),
    getTranslations("programsPage"),
    getTranslations("nav"),
    getTranslations("programs"),
  ]);

  return (
    <>
      <PageHero
        title={program.title}
        subtitle={program.summary}
        image={program.cover}
        badge={<Badge>{program.badge}</Badge>}
        breadcrumb={[{ label: tNav("programs"), href: "/programs" }, { label: program.title }]}
      />

      <div className="bg-sand-50 py-12 sm:py-14 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-12 lg:gap-8">
          {/* First in the DOM so phones get it right after the hero; moved to the right column from lg. */}
          <aside className="min-w-0 lg:order-last lg:col-span-4">
            <ProgramSidebar program={program} locale={locale} />
          </aside>

          <div className="min-w-0 space-y-12 lg:col-span-8">
            {program.body_html && (
              <section aria-labelledby="program-about">
                <SubHeading id="program-about">{t("about")}</SubHeading>
                <Prose html={program.body_html} className="mt-4" />
              </section>
            )}

            {program.goals.length > 0 && (
              <section aria-labelledby="program-goals">
                <SubHeading id="program-goals">{t("goals")}</SubHeading>
                <ul className="mt-4 space-y-3">
                  {program.goals.map((goal, i) => (
                    <li key={i} className="flex gap-3 text-base leading-relaxed text-em-900/85 sm:text-lg">
                      <CircleCheck aria-hidden="true" className="mt-1 size-5 shrink-0 text-em-500" />
                      <span className="min-w-0">{goal}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {program.images.length > 0 && (
              <section aria-labelledby="program-gallery">
                <SubHeading id="program-gallery">{t("gallery")}</SubHeading>
                <div className="mt-4">
                  <GalleryStrip images={program.images} label={t("gallery")} />
                </div>
              </section>
            )}

            {program.impact.length > 0 && (
              <section aria-labelledby="program-impact">
                <SubHeading id="program-impact">{t("impact")}</SubHeading>
                <div className="mt-4">
                  <ImpactTable rows={program.impact} locale={locale} />
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {program.faq.length > 0 && (
        <section aria-labelledby="program-faq" className="bg-sand-100 py-12 sm:py-14 lg:py-20">
          <div className="mx-auto max-w-3xl px-4">
            <SubHeading id="program-faq">{t("faq")}</SubHeading>
            <div className="mt-6">
              <Accordion items={program.faq} />
            </div>
          </div>
        </section>
      )}

      {program.related.length > 0 && (
        <section aria-labelledby="program-related" className="bg-sand-50 py-12 sm:py-14 lg:py-20">
          <div className="mx-auto max-w-7xl px-4">
            <SubHeading id="program-related">{t("related")}</SubHeading>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {program.related.map((p) => (
                <li key={p.slug} className="min-w-0">
                  <ProgramCard program={p} detailsLabel={tCard("details")} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <DonateCta fundSlug={program.fund?.slug ?? null} />
    </>
  );
}
