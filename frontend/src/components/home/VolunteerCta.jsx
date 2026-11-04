import Image from "next/image";
import { getTranslations } from "next-intl/server";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * Volunteer / monthly donor call to action (HOME_PAGE.md §11). The design's light green overlay used
 * off-palette colors and left white text hard to read; a stronger emerald gradient from the palette is used.
 * @param {{ image?: { url: string } }} props
 */
export default async function VolunteerCta({ image }) {
  const t = await getTranslations("volunteer");
  return (
    <section aria-labelledby="volunteer-title" className="px-4 pb-14">
      <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-lg border border-sand-200 px-5 py-10 text-white sm:px-6 sm:py-12 lg:px-12 lg:py-16">
        {image && <Image src={image.url} alt="" fill sizes="(min-width: 1280px) 1280px, 100vw" className="-z-20 object-cover" />}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-em-950/85 via-em-900/65 to-em-900/30" />

        <div className="max-w-xl">
          <SectionHeader id="volunteer-title" eyebrow={t("eyebrow")} title={t("title")} align="left" tone="dark" />
          <p className="mt-4 text-lg leading-relaxed text-sand-100/90">{t("body")}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <Button href={{ pathname: "/get-involved", query: { tab: "volunteer" } }} blockOnPhone>
              {t("volunteer")}
            </Button>
            <Button href={{ pathname: "/get-involved", query: { tab: "monthly" } }} variant="ghost" blockOnPhone>
              {t("monthly")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
