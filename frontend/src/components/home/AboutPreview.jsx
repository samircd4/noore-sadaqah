import { ArrowRight, BookOpen, Handshake, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
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

  const values = [
    { Icon: ShieldCheck, title: t("transparencyTitle"), text: t("transparencyText") },
    { Icon: Handshake, title: t("trustTitle"), text: t("trustText") },
    { Icon: BookOpen, title: t("shariahTitle"), text: t("shariahText") },
  ];

  return (
    <section id="about" aria-labelledby="about-title" className="py-12 lg:py-16">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 lg:grid-cols-12 lg:gap-10">
        <div className="relative mb-4 lg:col-span-5 lg:mb-0">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg shadow-2xl">
            <Image src={mainImage.url} alt={mainImage.alt} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
          </div>
          <div className="absolute right-2 -bottom-6 aspect-square w-36 overflow-hidden rounded-lg border-8 border-sand-50 shadow-xl min-[360px]:w-44 sm:-right-3 sm:w-56">
            <Image src={smallImage.url} alt={smallImage.alt} fill sizes="(min-width: 640px) 224px, 176px" className="object-cover" />
          </div>
          <div className="absolute top-6 left-2 rounded-lg bg-gold-500 px-5 py-4 text-em-950 shadow-xl sm:-left-3">
            <p className="font-head text-3xl leading-none font-extrabold">{t("yearsValue")}</p>
            <p className="mt-1 text-xs font-semibold">{t("yearsLabel")}</p>
          </div>
        </div>

        <div className="lg:col-span-7">
          <SectionHeader id="about-title" eyebrow={t("eyebrow")} title={t("title")} align="left" />
          <p className="mt-4 text-lg leading-relaxed text-em-900/80">{t("body")}</p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
            {values.map(({ Icon, title, text }) => (
              <li key={title} className="rounded-lg border border-em-100 bg-em-50 p-4">
                <Icon aria-hidden="true" className="size-8 text-em-700" />
                <p className="mt-2 font-bold">{title}</p>
                <p className="text-sm leading-6 text-em-900/70">{text}</p>
              </li>
            ))}
          </ul>

          <Button href="/about" variant="dark" blockOnPhone className="mt-7">
            {t("cta")}
            <ArrowRight aria-hidden="true" className="size-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
