import Image from "next/image";
import { getTranslations } from "next-intl/server";

/**
 * Photo collage with the years badge (HOME_PAGE.md §5), shared by the home AboutPreview and the /about story
 * (PAGES.md). The overlapping photo and badge stay inside the 16px page gutter (RESPONSIVE.md §14 row 5).
 * @param {{ mainImage: { url: string, alt: string }, smallImage: { url: string, alt: string }, className?: string }} props
 */
export default async function AboutCollage({ mainImage, smallImage, className = "" }) {
  const t = await getTranslations("about");
  return (
    <div className={`relative ${className}`}>
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
  );
}
