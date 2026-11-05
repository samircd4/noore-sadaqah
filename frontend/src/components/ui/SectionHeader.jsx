import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * Eyebrow + h2, centered or split with a "see all" link (DESIGN_SYSTEM.md "Section header").
 * @param {object} props
 * @param {string} props.eyebrow
 * @param {string} props.title
 * @param {string} props.id id of the h2, for aria-labelledby on the section
 * @param {"center" | "split" | "left"} [props.align="center"]
 * @param {"light" | "dark"} [props.tone="light"] dark = on a photo or dark background
 * @param {{ href: string | object, label: string }} [props.action] link shown on the right (split)
 */
export default function SectionHeader({ eyebrow, title, id, align = "center", tone = "light", action }) {
  const eyebrowColor = tone === "dark" ? "text-gold-400" : "text-gold-600";
  const titleColor = tone === "dark" ? "text-white" : "text-em-900";

  const heading = (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : ""}>
      <p className={`text-sm font-bold tracking-widest ${eyebrowColor}`}>
        <span aria-hidden="true">— </span>
        {eyebrow}
      </p>
      <h2
        id={id}
        className={`mt-2 font-head text-[1.75rem] font-bold leading-snug min-[22.5rem]:text-3xl sm:text-4xl lg:text-5xl ${titleColor}`}
      >
        {title}
      </h2>
    </div>
  );

  if (align !== "split" || !action) return heading;

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      {heading}
      <Link
        href={action.href}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border-b-2 border-gold-500 font-semibold text-em-700 hover:text-em-500"
      >
        {action.label}
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </div>
  );
}
