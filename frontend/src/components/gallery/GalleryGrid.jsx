"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import Lightbox from "./Lightbox";

/**
 * The /gallery grid (PAGES.md, RESPONSIVE.md §15): 2 columns on phones, 3 from md, 4 from lg. Each tile is a
 * button that opens the Lightbox at that item; video tiles carry a play badge.
 * @param {{ items: Array<{ id: number, kind: "photo" | "video", image: { url: string, alt: string }, youtube_id: string, caption: string, category: { slug: string, name: string } | null }> }} props
 */
export default function GalleryGrid({ items }) {
  const t = useTranslations("galleryPage");
  const [index, setIndex] = useState(/** @type {number | null} */ (null));
  const change = useCallback((i) => setIndex(i), []);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((item, i) => (
          <li key={item.id} className="min-w-0">
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-haspopup="dialog"
              aria-label={t(item.kind === "video" ? "openVideo" : "openPhoto", { caption: item.caption || item.image.alt })}
              className="group relative block aspect-square w-full overflow-hidden rounded-lg border border-sand-200 bg-sand-200"
            >
              <Image
                src={item.image.url}
                alt=""
                fill
                sizes="(min-width: 768px) 25vw, 50vw"
                className="object-cover transition duration-500 motion-safe:group-hover:scale-105"
              />
              <span aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-em-950/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
              {item.kind === "video" && (
                <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
                  <span className="grid size-12 place-items-center rounded-lg bg-gold-500 text-em-950 shadow-xl transition group-hover:bg-gold-400 motion-safe:group-hover:scale-110">
                    <Play className="size-6 fill-current" />
                  </span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <Lightbox items={items} index={index} onChange={change} />
    </>
  );
}
