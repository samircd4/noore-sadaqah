import { Eye, Target } from "lucide-react";
import { getTranslations } from "next-intl/server";
import AboutCollage from "@/components/about/AboutCollage";
import PersonCard from "@/components/about/PersonCard";
import RegistrationCard from "@/components/about/RegistrationCard";
import ValueCards from "@/components/about/ValueCards";
import DonateCta from "@/components/donate/DonateCta";
import Stats from "@/components/home/Stats";
import PageHero from "@/components/layout/PageHero";
import Prose from "@/components/ui/Prose";
import SectionHeader from "@/components/ui/SectionHeader";
import { apiGet } from "@/lib/api";
import { currentLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";

/**
 * /about (PAGES.md): hero, story + collage, mission and vision, principles, stats, board and advisors,
 * registration, DonateCta. Data: GET /site/ (about, stats, registration, images), /pages/about/ (story),
 * /people/. Phone layout RESPONSIVE.md §15: story text then photos; cards stacked; board grid 2 columns.
 */

export async function generateMetadata() {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations("aboutPage")]);
  return pageMetadata({ path: "/about", locale, title: t("title"), description: t("metaDescription") });
}

export default async function AboutPage() {
  const locale = await currentLocale();
  const [t, site, story, people] = await Promise.all([
    getTranslations("aboutPage"),
    apiGet("/site/", { locale, tags: ["site"] }),
    apiGet("/pages/about/", { locale, tags: ["pages"] }),
    apiGet("/people/", { locale, tags: ["people"] }),
  ]);
  const images = site.home_images;

  return (
    <>
      <PageHero
        title={t("title")}
        eyebrow={t("eyebrow")}
        subtitle={t("subtitle")}
        image={images.hero}
        breadcrumb={[{ label: t("title") }]}
      />

      {/* Story: text first on phones, collage beside it from lg. */}
      <section aria-labelledby="about-story" className="bg-sand-50 py-12 sm:py-14 lg:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 lg:grid-cols-12 lg:gap-12">
          <div className="min-w-0 lg:col-span-7">
            <SectionHeader id="about-story" eyebrow={t("storyEyebrow")} title={story.title} align="left" />
            <Prose html={story.body_html} className="mt-5" />
          </div>
          <AboutCollage mainImage={images.about_main} smallImage={images.about_small} className="mb-6 lg:col-span-5 lg:mb-0" />
        </div>
      </section>

      {site.about && (
        <section aria-label={`${t("missionTitle")}, ${t("visionTitle")}`} className="bg-sand-100 py-12 sm:py-14 lg:py-20">
          <ul className="mx-auto grid max-w-7xl gap-6 px-4 md:grid-cols-2">
            {[
              { Icon: Target, title: t("missionTitle"), text: site.about.mission },
              { Icon: Eye, title: t("visionTitle"), text: site.about.vision },
            ].map(({ Icon, title, text }) => (
              <li key={title} className="rounded-lg border border-em-100 bg-em-50 p-6 sm:p-8">
                <Icon aria-hidden="true" className="size-10 text-gold-600" />
                <h2 className="mt-3 font-head text-2xl leading-snug font-bold text-em-900">{title}</h2>
                <p className="mt-3 text-base leading-relaxed text-em-900/80 sm:text-lg">{text}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="about-principles" className="bg-sand-50 py-12 sm:py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeader id="about-principles" eyebrow={t("principlesEyebrow")} title={t("principlesTitle")} />
          <ValueCards className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-3 sm:gap-6" />
        </div>
      </section>

      <Stats stats={site.stats} locale={locale} className="bg-sand-50" />

      {people.length > 0 && (
        <section aria-labelledby="about-people" className="bg-sand-100 py-12 sm:py-14 lg:py-20">
          <div className="mx-auto max-w-7xl px-4">
            <SectionHeader id="about-people" eyebrow={t("peopleEyebrow")} title={t("peopleTitle")} />
            <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
              {people.map((person, i) => (
                <li key={i} className="min-w-0">
                  <PersonCard person={person} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="bg-sand-50 py-12 sm:py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <RegistrationCard registration={site.registration} locale={locale} headingId="about-registration" />
        </div>
      </div>

      <DonateCta />
    </>
  );
}
