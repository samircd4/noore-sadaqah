"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

/** Resolves the running view transition once the page has re-rendered in the new language. */
let finishTransition = null;

/**
 * বাং / EN switch (HOME_PAGE.md fix 13: palette tokens instead of the design's raw gold and blue).
 * Links to the same page in the other language; 44px tall targets.
 *
 * Switching is animated with the View Transitions API (globals.css): the page cross-fades and the gold highlight
 * slides to the chosen language. Browsers without the API, and people who prefer reduced motion, get a plain switch.
 *
 * @param {{ className?: string, transitionName?: string, onSwitch?: () => void }} props
 *   transitionName: view-transition-name for the sliding highlight; give it to one visible instance only
 *   onSwitch: called when a language is chosen (the drawer closes itself)
 */
export default function LanguageSwitch({ className = "", transitionName, onSwitch }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  // The new language has been committed to the page: let the transition animate to it.
  useEffect(() => {
    finishTransition?.();
    finishTransition = null;
  }, [locale]);

  const choose = (event, code) => {
    if (code === locale) {
      event.preventDefault();
      return;
    }
    onSwitch?.();
    const plainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!plainClick || reduceMotion || typeof document.startViewTransition !== "function") return; // normal Link navigation

    event.preventDefault();
    const target = `${pathname}${window.location.search}${window.location.hash}`;
    document.startViewTransition(
      () =>
        new Promise((resolve) => {
          finishTransition = resolve;
          setTimeout(resolve, 3000); // never leave the page frozen if something goes wrong
          router.push(target, { locale: code, scroll: false });
        }),
    );
  };

  const isEn = locale === "en";

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={`relative grid grid-cols-2 overflow-hidden rounded-lg border border-gold-500 bg-white ${className}`}
    >
      {/* Sliding highlight behind the active language. */}
      <span
        aria-hidden="true"
        style={transitionName ? { viewTransitionName: transitionName } : undefined}
        className={`absolute inset-y-0 left-0 w-1/2 rounded-lg bg-gold-500 transition-transform duration-300 motion-reduce:transition-none ${
          isEn ? "translate-x-full" : "translate-x-0"
        }`}
      />
      {[
        { code: "bn", label: "বাং" },
        { code: "en", label: "EN" },
      ].map(({ code, label }) => (
        <Link
          key={code}
          href={pathname}
          locale={code}
          lang={code}
          scroll={false}
          onClick={(event) => choose(event, code)}
          aria-current={locale === code ? "true" : undefined}
          className={`relative grid h-11 min-w-12 place-items-center rounded-lg px-4 text-sm font-semibold text-em-950 ${
            locale === code ? "" : "hover:bg-sand-100/70"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
