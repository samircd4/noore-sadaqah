import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";

/**
 * Photo card for one program (HOME_PAGE.md §6). The whole card is a link. On phones the height grows with the
 * text (min-h-80) instead of the design's fixed h-96, so long titles never clip (RESPONSIVE.md §14 row 6).
 * @param {{ program: { slug: string, badge: string, title: string, summary: string, cover: { url: string, alt: string } }, detailsLabel: string }} props
 */
export default function ProgramCard({ program, detailsLabel }) {
  return (
    <Link
      href={`/programs/${program.slug}`}
      className="group relative isolate flex min-h-80 flex-col justify-end overflow-hidden rounded-lg border border-sand-200/50 text-white shadow-card transition duration-300 hover:shadow-card-hover motion-safe:hover:-translate-y-1 lg:h-96"
    >
      <Image
        src={program.cover.url}
        alt={program.cover.alt}
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="-z-20 object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-(image:--overlay-card)" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-t from-em-950/95 via-em-950/50 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90"
      />

      <div className="w-full p-5 transition-transform duration-300 motion-safe:group-hover:-translate-y-1 sm:p-6">
        <Badge>{program.badge}</Badge>
        <h3 className="mt-3 font-head text-2xl leading-snug font-bold transition-colors group-hover:text-gold-400">{program.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-sand-100/90">{program.summary}</p>
        {/* Always visible (no hover-only content, RESPONSIVE.md §6). Part of the card link, so a span, not a button. */}
        <div className="mt-4 flex justify-end">
          <span
            aria-hidden="true"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gold-500 px-3.5 text-sm font-bold text-em-950 shadow-md transition-colors group-hover:bg-gold-400 group-active:bg-gold-600 motion-reduce:transition-none"
          >
            {detailsLabel}
            <ArrowRight className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
