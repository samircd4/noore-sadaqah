import { Link } from "@/i18n/navigation";
import { bnNumber } from "@/lib/format";

/**
 * Monthly amount cards for a campaign (HOME_PAGE.md §7, PAGES.md /campaigns/[slug]), for dark backgrounds.
 * The highlighted amount is gold with em-950 text (CLAUDE.md rule 5).
 *  - Home banner: 3 compact cards, display only (the banner has its own buttons).
 *  - Campaign page (`hrefFor` given): each card is a link; below 360px they become a vertical list
 *    (RESPONSIVE.md §15).
 * @param {object} props
 * @param {number[]} props.options
 * @param {number | null} [props.highlighted]
 * @param {"bn" | "en"} props.locale
 * @param {string} props.perMonthLabel "টাকা / মাস"
 * @param {string} props.listLabel accessible name of the list
 * @param {(amount: number) => string | object} [props.hrefFor] makes each card a link
 * @param {(amount: number) => string} [props.ariaFor] accessible name of each link ("মাসে ৳১,০০০ দান করুন")
 */
export default function MonthlyOptions({ options, highlighted = null, locale, perMonthLabel, listLabel, hrefFor, ariaFor }) {
  const linked = typeof hrefFor === "function";

  return (
    <ul
      aria-label={listLabel}
      className={linked ? "grid grid-cols-1 gap-2 min-[360px]:grid-cols-3" : "grid grid-cols-3 gap-2 min-[360px]:gap-3 sm:gap-4"}
    >
      {options.map((option) => {
        const isHighlighted = option === highlighted;
        const tone = isHighlighted
          ? "bg-gold-500 text-em-950 shadow-xl [&:focus-visible]:outline-em-950"
          : "border border-white/20 bg-em-950/40 sm:bg-white/10 sm:backdrop-blur";
        const content = (
          <>
            <span className="block font-head text-2xl font-bold sm:text-3xl">{bnNumber(option, locale)}</span>
            <span className={`block text-xs leading-5 ${linked ? "min-[360px]:mt-1" : "mt-1"} ${isHighlighted ? "" : "text-sand-100/80"}`}>{perMonthLabel}</span>
          </>
        );

        if (!linked) {
          return (
            <li key={option} className={`rounded-lg p-3 text-center sm:p-4 ${tone}`}>
              {content}
            </li>
          );
        }
        return (
          <li key={option}>
            <Link
              href={hrefFor(option)}
              aria-label={ariaFor?.(option)}
              className={`flex min-h-11 items-center justify-between gap-3 rounded-lg px-4 py-2 transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 min-[360px]:block min-[360px]:p-3 min-[360px]:text-center ${tone} ${isHighlighted ? "hover:bg-gold-400" : "hover:border-gold-400"}`}
            >
              {content}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
