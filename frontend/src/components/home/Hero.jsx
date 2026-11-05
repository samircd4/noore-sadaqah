import { HandHeart } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import Button from "@/components/ui/Button";
import { DONATE_HREF } from "@/lib/nav";
import VideoButton from "./VideoButton";

/**
 * Hero (HOME_PAGE.md §2). Phone: shorter padding, buttons stacked full width (RESPONSIVE.md §14 row 2).
 * From lg the bottom padding leaves room for the quick-donate panel that overlaps the hero.
 * @param {{ image: { url: string, alt: string }, youtubeId?: string }} props
 */
export default async function Hero({ image, youtubeId }) {
  const t = await getTranslations("hero");

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden text-white">
      <Image src={image.url} alt={image.alt} fill preload sizes="100vw" className="-z-20 object-cover" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-(image:--overlay-hero)" />

      {/* max-w-6xl from xl: "সাদাকাহর" is longer than the design's sample word, and the first line must still fit. */}
      <div className="mx-auto max-w-5xl px-4 pt-24 pb-16 text-center sm:pt-32 sm:pb-24 lg:pb-40 xl:max-w-6xl">
        <p
          lang="ar"
          dir="rtl"
          className="inline-block rounded-lg border border-white/25 bg-em-950/60 px-5 py-1.5 text-sm tracking-wide sm:bg-white/10 sm:backdrop-blur"
        >
          بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
        </p>

        <h1
          id="hero-title"
          className="mt-6 font-head text-[2rem] font-extrabold leading-[1.3] min-[22.5rem]:text-4xl sm:text-5xl lg:text-6xl xl:text-7xl"
        >
          {t.rich("title", {
            highlight: (chunks) => <span className="text-gold-400">{chunks}</span>,
            br: () => <br className="hidden sm:block" />,
          })}
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-sand-100/90 sm:text-xl">{t("subtitle")}</p>

        <div className="mt-4 mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
          <Button href={DONATE_HREF} size="lg" blockOnPhone className="shadow-xl shadow-gold-500/25">
            <HandHeart aria-hidden="true" className="size-5" />
            {t("donateNow")}
          </Button>
          <VideoButton youtubeId={youtubeId} label={t("watchVideo")} />
        </div>
      </div>
    </section>
  );
}
