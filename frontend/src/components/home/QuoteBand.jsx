import { Quote } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

/**
 * Gold quote band (HOME_PAGE.md §9) from GET /site/ `quote`. The design puts white text on gold, which fails
 * contrast (CLAUDE.md rule 5): the text is em-950 here, with an extra light gold wash so it reads on the photo.
 * @param {{ quote: { text: string, source: string }, image?: { url: string } }} props
 */
export default async function QuoteBand({ quote, image }) {
  const t = await getTranslations("quote");
  return (
    <section aria-label={t("label")} className="relative isolate overflow-hidden py-14 text-em-950">
      {image && <Image src={image.url} alt="" fill sizes="100vw" className="-z-20 object-cover" />}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-(image:--overlay-gold)" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gold-400/60" />

      <figure className="mx-auto max-w-4xl px-4 text-center">
        <Quote aria-hidden="true" className="mx-auto size-12 opacity-80" />
        <blockquote>
          <p className="mt-2 font-head text-2xl leading-snug font-bold sm:text-3xl lg:text-4xl">{quote.text}</p>
        </blockquote>
        <figcaption className="mt-4 text-sm font-semibold text-em-950/85">{quote.source}</figcaption>
      </figure>
    </section>
  );
}
