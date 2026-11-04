"use client";

import { HandHeart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { DONATE_HREF } from "@/lib/nav";

/** Routes where the bar is never shown (RESPONSIVE.md §9). */
const HIDDEN_ROUTES = [/^\/donate(\/|$)/, /^\/zakat-calculator/, /^\/login/, /^\/account/];

/**
 * Sticky gold "দান করুন" bar below lg (DECISIONS.md D14, RESPONSIVE.md §9).
 * Hides on some routes and while any element marked `data-hides-donate-bar` (the quick-donate panel,
 * the footer) is on screen. CSS in globals.css also hides it while a menu or modal is open and while
 * an input has focus (the phone keyboard is up).
 */
export default function MobileDonateBar() {
  const t = useTranslations("donateBar");
  const pathname = usePathname();
  const routeHidden = HIDDEN_ROUTES.some((re) => re.test(pathname));
  const [blockedBySection, setBlockedBySection] = useState(false);

  useEffect(() => {
    const targets = document.querySelectorAll("[data-hides-donate-bar]");
    if (targets.length === 0) return undefined;
    const visible = new Set();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      setBlockedBySection(visible.size > 0);
    });
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  const hidden = routeHidden || blockedBySection;

  return (
    <div
      data-mobile-donate-bar=""
      inert={hidden}
      className={`fixed inset-x-0 bottom-0 z-(--z-sticky-bar) bg-gold-500 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_var(--tw-shadow-color)] shadow-em-950/20 transition-transform duration-300 motion-reduce:transition-none lg:hidden ${
        hidden ? "translate-y-full" : "translate-y-0"
      }`}
    >
      <Link
        href={DONATE_HREF}
        className="flex h-14 items-center justify-center gap-2 text-lg font-bold text-em-950 active:bg-gold-400"
      >
        <HandHeart aria-hidden="true" className="size-6" />
        {t("label")}
      </Link>
    </div>
  );
}
