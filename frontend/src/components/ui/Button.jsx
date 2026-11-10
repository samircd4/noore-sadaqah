import { Link } from "@/i18n/navigation";

/**
 * Buttons and button-looking links (DESIGN_SYSTEM.md "Reusable patterns").
 * Every variant is at least 44px tall (RESPONSIVE.md §6). Text on gold is always em-950 (CLAUDE.md rule 5).
 */

const VARIANTS = {
  gold: "bg-gold-500 text-em-950 font-bold hover:bg-gold-400 active:bg-gold-600",
  dark: "bg-em-800 text-white font-semibold hover:bg-em-700 active:bg-em-900",
  primary: "bg-em-700 text-white font-bold hover:bg-em-500 active:bg-em-800",
  // Secondary action on light backgrounds ("পরিবর্তন করুন").
  outline: "border border-em-700 text-em-700 font-semibold hover:bg-em-700 hover:text-white active:bg-em-800",
  ghost: "border border-white/40 text-white font-semibold hover:bg-white/10 active:bg-white/20",
  // Glass on photos: solid on phones, blurred from sm (RESPONSIVE.md §11).
  glass: "border border-white/30 bg-em-950/60 text-white font-semibold hover:bg-white/20 sm:bg-white/10 sm:backdrop-blur",
};

const SIZES = {
  md: "min-h-11 px-7 py-3",
  lg: "min-h-11 px-9 py-4 text-lg",
  // The main step of a form (donate form, checkout, failed page): 48px tall.
  cta: "min-h-12 px-8 py-3 text-lg",
};

/**
 * @param {object} props
 * @param {keyof typeof VARIANTS} [props.variant="gold"]
 * @param {keyof typeof SIZES} [props.size="md"]
 * @param {string | object} [props.href] internal link target (next-intl Link); omit for a <button>
 * @param {boolean} [props.external] render `href` as a plain <a> (a file Django serves, not a Next.js page)
 * @param {boolean} [props.blockOnPhone] full width below the sm breakpoint
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export default function Button({ variant = "gold", size = "md", href, external = false, blockOnPhone = false, className = "", children, ...rest }) {
  const classes = [
    "inline-flex items-center justify-center gap-2 rounded-lg text-center transition motion-reduce:transition-none",
    "disabled:cursor-not-allowed disabled:opacity-60",
    VARIANTS[variant],
    SIZES[size],
    blockOnPhone ? "w-full sm:w-auto" : "",
    className,
  ].join(" ");

  if (href !== undefined && external) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }
  if (href !== undefined) {
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
