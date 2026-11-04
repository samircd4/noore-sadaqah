import { HandHeart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DONATE_HREF, MAIN_NAV } from "@/lib/nav";
import LanguageSwitch from "./LanguageSwitch";
import Logo from "./Logo";
import MobileMenu from "./MobileMenu";

/**
 * Fixed header (HOME_PAGE.md §1). Phone: logo + menu button, h-16. From sm: language switch and Donate
 * appear, h-20. From lg: the desktop nav replaces the drawer (RESPONSIVE.md §8).
 * @param {{ phone?: string }} props
 */
export default async function Header({ phone }) {
  const t = await getTranslations("nav");

  return (
    <header className="fixed inset-x-0 top-0 z-(--z-header) bg-em-900/90 backdrop-blur-md [view-transition-name:site-header]">
      {/* At lg (1024–1279) the nav is a little tighter than the design so everything fits; design sizes from xl. */}
      <div className="flex h-16 w-full items-center gap-3 px-4 sm:h-20 sm:px-6 lg:px-4 xl:px-6">
        <Link href="/" aria-label={t("homeLink")} className="shrink-0 rounded-lg">
          <Logo />
        </Link>

        <nav aria-label={t("mainNav")} className="ms-auto me-3 hidden items-center text-base font-semibold lg:flex xl:me-8 xl:text-lg">
          {MAIN_NAV.map((item) => (
            // Fixed height so Bengali and English links are exactly the same size.
            <Link
              key={item.key}
              href={item.href}
              className="flex h-10 items-center rounded-lg px-2.5 leading-none whitespace-nowrap text-white hover:bg-white/15 xl:px-4"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex shrink-0 items-center gap-2 sm:gap-4 lg:ms-0 lg:gap-3 xl:gap-4">
          <LanguageSwitch className="hidden sm:grid" transitionName="lang-indicator" />
          <Link
            href={DONATE_HREF}
            className="hidden h-12 w-[120px] items-center justify-center gap-2 rounded-lg bg-gold-500 font-bold text-em-950 transition hover:bg-gold-400 sm:inline-flex"
          >
            <HandHeart aria-hidden="true" className="size-5" />
            {t("donate")}
          </Link>
          <MobileMenu phone={phone} />
        </div>
      </div>
    </header>
  );
}
