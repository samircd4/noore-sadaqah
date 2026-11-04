import Image from "next/image";
import Breadcrumb from "@/components/ui/Breadcrumb";

/**
 * Page hero for every page except home (PAGES.md "Shared page parts", RESPONSIVE.md §15).
 * Photo + --overlay-hero, or plain bg-em-900 without a photo. The top padding also clears the fixed header
 * (h-16 on phones, h-20 from sm), so the visible padding is py-14 on phones and py-20 / py-28 from sm / lg.
 * @param {object} props
 * @param {string} props.title h1
 * @param {string} [props.eyebrow]
 * @param {string} [props.subtitle] one line
 * @param {{ url: string, alt: string } | null} [props.image]
 * @param {Array<{ label: string, href?: string | object }>} props.breadcrumb trail after Home; last item = this page
 * @param {React.ReactNode} [props.badge] shown above the title (e.g. the program badge)
 */
export default function PageHero({ title, eyebrow, subtitle, image = null, breadcrumb, badge = null }) {
  return (
    <section aria-labelledby="page-title" className={`relative isolate overflow-hidden text-white ${image ? "" : "bg-em-900"}`}>
      {image && (
        <>
          <Image src={image.url} alt={image.alt} fill preload sizes="100vw" className="-z-20 object-cover" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-(image:--overlay-hero)" />
        </>
      )}

      <div className="mx-auto max-w-7xl px-4 pt-30 pb-14 sm:pt-40 sm:pb-20 lg:pt-48 lg:pb-28">
        <Breadcrumb items={breadcrumb} className="text-sand-200" />

        {badge && <div className="mt-6">{badge}</div>}
        {eyebrow && (
          <p className={`text-sm font-bold tracking-widest text-gold-400 ${badge ? "mt-3" : "mt-6"}`}>
            <span aria-hidden="true">— </span>
            {eyebrow}
          </p>
        )}
        <h1
          id="page-title"
          className={`${eyebrow ? "mt-2" : badge ? "mt-3" : "mt-6"} max-w-4xl font-head text-[1.75rem] leading-snug font-bold min-[360px]:text-3xl sm:text-4xl lg:text-5xl`}
        >
          {title}
        </h1>
        {subtitle && <p className="mt-4 max-w-2xl text-base leading-relaxed text-sand-100/90 sm:text-lg">{subtitle}</p>}
      </div>
    </section>
  );
}
