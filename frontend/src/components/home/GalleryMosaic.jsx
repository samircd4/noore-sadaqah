import Image from "next/image";
import { getTranslations } from "next-intl/server";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * Six-tile mosaic (HOME_PAGE.md §8) from GET /gallery/?limit=6.
 * Phones: 4 tiles in 2 columns, 120px rows (one big, two small, one wide); from md the design's 6 tiles
 * in 4 columns with 170px rows (RESPONSIVE.md §14 row 8).
 */
const TILES = [
  { className: "col-span-2 row-span-2", sizes: "(min-width: 768px) 50vw, 100vw" },
  { className: "", sizes: "(min-width: 768px) 25vw, 50vw" },
  { className: "", sizes: "(min-width: 768px) 25vw, 50vw" },
  { className: "col-span-2 md:col-span-1 md:row-span-2", sizes: "(min-width: 768px) 25vw, 100vw" },
  // Two rows tall (the design has one): 6 tiles then fill all 12 cells of the 4×3 grid instead of leaving a hole.
  { className: "hidden md:block md:row-span-2", sizes: "25vw" },
  { className: "hidden md:block md:col-span-2", sizes: "50vw" },
];

/** @param {{ items: Array<{ id: number, image: { url: string, alt: string } }> }} props */
export default async function GalleryMosaic({ items }) {
  const t = await getTranslations("gallery");

  return (
    <section id="gallery" aria-labelledby="gallery-title" className="py-12 sm:py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <SectionHeader
          id="gallery-title"
          eyebrow={t("eyebrow")}
          title={t("title")}
          align="split"
          action={{ href: "/gallery", label: t("viewAll") }}
        />
        <ul className="mt-10 grid auto-rows-[120px] grid-cols-2 gap-3 sm:gap-4 md:auto-rows-[170px] md:grid-cols-4">
          {items.slice(0, TILES.length).map((item, i) => (
            <li
              key={item.id}
              className={`group relative overflow-hidden rounded-lg border border-sand-200 ${TILES[i].className}`}
            >
              <Image
                src={item.image.url}
                alt={item.image.alt}
                fill
                sizes={TILES[i].sizes}
                className="object-cover transition duration-500 motion-safe:group-hover:scale-[1.03]"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
