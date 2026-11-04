"use client";

import { useEffect, useRef } from "react";

/**
 * The two-line brand name ("নূরে সাদাকাহ / ফাউন্ডেশন", "Noore Sadaqah / Foundation"), DESIGN_SYSTEM.md "Logo":
 * - the name keeps its natural letter spacing (spaced-out Bengali breaks the word up visually);
 * - the second line is spread to exactly the width of the name, in either language;
 * - fixed line heights keep the block the same height in Bengali and English (44px phones, 52px from sm);
 * - it never wraps (header and footer).
 *
 * The spacing is measured in the browser (after the fonts load and whenever the name's size changes), so it is
 * exact for the real font on every device. The second line can't change the layout while this happens
 * (`w-0 min-w-full`). Browsers keep Bengali clusters (ন্ড, শ) together when letter-spacing is applied.
 *
 * @param {{ line1: string, line2: string, locale: "bn" | "en" }} props
 */
export default function BrandName({ line1, line2, locale }) {
  const line1Ref = useRef(/** @type {HTMLSpanElement | null} */ (null));
  const line2Ref = useRef(/** @type {HTMLSpanElement | null} */ (null));

  useEffect(() => {
    const name = line1Ref.current;
    const slogan = line2Ref.current;
    if (!name || !slogan) return undefined;

    let frame = 0;
    const fit = () => {
      slogan.style.letterSpacing = "0px";
      const natural = slogan.getBoundingClientRect().width;
      slogan.style.letterSpacing = "10px";
      const spaced = slogan.getBoundingClientRect().width;
      // Gaps the browser really spaces (Bengali clusters differ from the character count), minus the trailing one.
      const gaps = Math.max(1, Math.round((spaced - natural) / 10) - 1);
      // The name's own letter-spacing (English) also adds a gap after its last letter: leave it out of the target.
      const target = name.getBoundingClientRect().width - (parseFloat(getComputedStyle(name).letterSpacing) || 0);
      slogan.style.letterSpacing = `${(target - natural) / gaps}px`;
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };

    schedule();
    document.fonts?.ready.then(schedule);
    // The name changes size at breakpoints (and on phone rotation). ResizeObserver ignores inline elements, so watch
    // the name's block wrapper, which is exactly as wide as the name.
    const observer = new ResizeObserver(schedule);
    observer.observe(/** @type {Element} */ (name.parentElement));
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [line1, line2]);

  // Bengali glyphs are narrower than Latin at the same size, so the Bengali lines are a step larger.
  // Server-rendered spacing for the second line is close already; the effect above makes it exact.
  const isEn = locale === "en";
  const nameSize = isEn ? "text-base tracking-[0.04em] sm:text-xl" : "text-lg sm:text-2xl";
  const sloganSize = isEn ? "text-sm tracking-[0.3em] sm:text-base sm:tracking-[0.42em]" : "text-base tracking-[0.35em] sm:text-lg";

  return (
    <span lang={locale} className="inline-block shrink-0 whitespace-nowrap font-head font-bold">
      <span className={`block h-6 leading-6 text-white sm:h-7 sm:leading-7 ${nameSize}`}>
        <span ref={line1Ref}>{line1}</span>
      </span>
      <span className={`block h-5 w-0 min-w-full leading-5 text-sand-200 sm:h-6 sm:leading-6 ${sloganSize}`}>
        <span ref={line2Ref}>{line2}</span>
      </span>
    </span>
  );
}
