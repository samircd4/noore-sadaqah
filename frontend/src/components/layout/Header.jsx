import { HandHeart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DONATE_HREF, MAIN_NAV } from "@/lib/nav";
import LanguageSwitch from "./LanguageSwitch";
import Logo from "./Logo";
import MobileMenu from "./MobileMenu";

/**
 * Fixed header (HOME_PAGE.md §1). Phone: logo + compact Donate + menu button, h-16. From sm: language switch
 * appears and Donate takes the design size, h-20. From lg: the desktop nav replaces the drawer (RESPONSIVE.md §8).
 * @param {{ phone?: string }} props
 */
export default async function Header({ phone }) {
  const t = await getTranslations("nav");

  return (
    <header className="fixed inset-x-0 top-0 z-(--z-header) bg-em-900/90 backdrop-blur-md [view-transition-name:site-header]">
      {/* At lg (1024–1279) the nav is a little tighter than the design so everything fits; design sizes from xl. */}
      <div className="flex h-16 w-full items-center gap-2 px-4 sm:h-20 sm:gap-3 sm:px-6 lg:px-4 xl:px-6">
        {/* min-w-0 + overflow-hidden: with a very large browser text size the name is cut off rather than pushing
            the menu button off screen (QA §1). At normal sizes it always fits. */}
        {/* Below 375px only the logo mark shows, so the name isn't cut off by the Donate button. */}
        <Link href="/" aria-label={t("homeLink")} className="min-w-0 overflow-hidden rounded-lg">
          <Logo nameClassName="max-[374px]:hidden" />
        </Link>

        <nav aria-label={t("mainNav")} className="ms-auto me-3 hidden items-center text-base font-semibold lg:flex xl:me-8 xl:text-lg">
          {MAIN_NAV.map((item) => (
            // Fixed height so Bengali and English links are exactly the same size.
            <Link
              key={item.key}
              href={item.href}
              className="flex h-11 items-center rounded-lg px-2.5 leading-none whitespace-nowrap text-white hover:bg-white/15 xl:px-4"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex shrink-0 items-center gap-2 sm:gap-4 lg:ms-0 lg:gap-3 xl:gap-4">
          <LanguageSwitch className="hidden sm:grid" transitionName="lang-indicator" />
          {/* Phones get a compact Donate (h-11, text-sm; icon from 400px, where the English name leaves room for
              it); the design's 120px button from sm. The drawer keeps its own Donate too. */}
          <Link
            href={DONATE_HREF}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gold-500 px-3 text-sm font-bold whitespace-nowrap text-em-950 transition hover:bg-gold-400 sm:h-12 sm:w-[120px] sm:gap-2 sm:px-0 sm:text-base"
          >
            <HandHeart aria-hidden="true" className="hidden size-4 min-[400px]:block sm:size-5" />
            {t("donate")}
          </Link>
          <MobileMenu phone={phone} />
        </div>
      </div>
    </header>
  );
}
