import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import AboutCollage from "@/components/about/AboutCollage";
import ValueCards from "@/components/about/ValueCards";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * About preview (HOME_PAGE.md §5): photo collage, years badge, three value cards.
 * The overlapping photo and badge stay inside the 16px page gutter so nothing scrolls sideways
 * (the design's -right-8 / -left-6 overflow on narrow screens, RESPONSIVE.md §14 row 5).
 * @param {{ mainImage: { url: string, alt: string }, smallImage: { url: string, alt: string } }} props
 */
export default async function AboutPreview({ mainImage, smallImage }) {
  const t = await getTranslations("about");

  return (
    <section id="about" aria-labelledby="about-title" className="py-12 lg:py-16">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 lg:grid-cols-12 lg:gap-10">
        <AboutCollage mainImage={mainImage} smallImage={smallImage} className="mb-4 min-w-0 lg:col-span-5 lg:mb-0" />

        <div className="min-w-0 lg:col-span-7">
          <SectionHeader id="about-title" eyebrow={t("eyebrow")} title={t("title")} align="left" />
          <p className="mt-4 text-lg leading-relaxed text-em-900/80">{t("body")}</p>

          <ValueCards />

          <Button href="/about" variant="dark" blockOnPhone className="mt-7">
            {t("cta")}
            <ArrowRight aria-hidden="true" className="size-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
