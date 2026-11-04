import Image from "next/image";

/**
 * Photo strip on /programs/[slug] (PAGES.md). Scrolls sideways inside its own container with snap; on phones one
 * photo plus the edge of the next is visible (RESPONSIVE.md §4 and §15). CSS only, no JavaScript.
 * The strip is focusable so keyboard users can scroll it.
 * @param {{ images: Array<{ url: string, alt: string }>, label: string }} props label: accessible name of the strip
 */
export default function GalleryStrip({ images, label }) {
  if (images.length === 0) return null;
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="-mx-4 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:thin] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-gold-500 sm:mx-0 sm:px-0"
    >
      <ul className="flex snap-x snap-mandatory gap-4">
        {images.map((image, i) => (
          <li
            key={`${image.url}-${i}`}
            className="relative aspect-[4/3] w-[75%] shrink-0 snap-start overflow-hidden rounded-lg bg-sand-200 sm:w-[40%] lg:w-[calc((100%-2rem)/3)]"
          >
            <Image
              src={image.url}
              alt={image.alt}
              fill
              sizes="(min-width: 1024px) 22vw, (min-width: 640px) 40vw, 75vw"
              className="object-cover"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
