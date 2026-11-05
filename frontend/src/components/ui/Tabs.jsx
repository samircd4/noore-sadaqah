"use client";

import { useSearchParams } from "next/navigation";
import { useId, useRef, useState } from "react";

/**
 * Tabs (PAGES.md "Tabs"): underlined active tab in gold, synced with `?tab=` in the URL both ways.
 *  - The first tab comes from `?tab=` (useSearchParams), so the right panel is in the first HTML.
 *  - Clicking a tab (or an arrow key) switches it at once from local state, then writes the URL with replaceState
 *    (no reload, no new history entry). Next syncs that URL into useSearchParams a moment later; those updates are
 *    our own (`pending`) and are ignored, so quick key presses never jump back.
 *  - Any other change of `?tab=` (e.g. the footer's volunteer link while already on the page) switches the tab.
 * Inactive panels stay mounted (hidden), so a half-filled form isn't lost.
 * useSearchParams needs a <Suspense> boundary above this component (it renders per request).
 * Keyboard: arrows, Home, End (WAI-ARIA tabs pattern). On phones the tab row scrolls sideways (RESPONSIVE.md §15).
 * @param {object} props
 * @param {Array<{ key: string, label: string, content: React.ReactNode }>} props.tabs
 * @param {string} [props.fallback] tab shown when `?tab=` is missing or unknown; the first tab by default
 * @param {string} props.label accessible name of the tab list
 * @param {string} [props.param="tab"] the query parameter to sync
 */
export default function Tabs({ tabs, fallback, label, param = "tab" }) {
  const requested = useSearchParams().get(param);
  const resolve = (key) => (tabs.some((t) => t.key === key) ? key : tabs.some((t) => t.key === fallback) ? fallback : tabs[0].key);
  const [active, setActive] = useState(() => resolve(requested));
  const [seen, setSeen] = useState(requested); // the last `?tab=` this component reacted to
  const [pending, setPending] = useState(/** @type {string[]} */ ([])); // keys we wrote, not yet back from Next

  // Adjust state while rendering when the URL changes (React's "storing information from previous renders").
  if (requested !== seen) {
    setSeen(requested);
    const own = requested === null ? -1 : pending.indexOf(requested);
    if (own !== -1) {
      setPending(pending.slice(own + 1));
    } else {
      setPending([]);
      setActive(resolve(requested));
    }
  }
  const baseId = useId();
  const buttons = useRef(/** @type {Array<HTMLButtonElement | null>} */ ([]));

  const select = (key, focus = false) => {
    setActive(key);
    // Compare with the live URL, not `active`, which can lag one render behind during quick key presses.
    const url = new URL(window.location.href);
    if (url.searchParams.get(param) !== key) {
      setPending((keys) => [...keys, key]);
      url.searchParams.set(param, key);
      // null state, as in Next's docs: Next then syncs the new URL into useSearchParams (and the router), so a later
      // link back to the previous `?tab=` is seen as a change.
      window.history.replaceState(null, "", url);
    }
    if (focus) {
      const button = buttons.current[tabs.findIndex((t) => t.key === key)];
      button?.focus();
      button?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };

  const onKeyDown = (event) => {
    // Move from the focused tab (WAI-ARIA pattern); select() focuses synchronously, so this is always current.
    const focused = buttons.current.indexOf(/** @type {HTMLButtonElement} */ (event.target));
    const i = focused !== -1 ? focused : tabs.findIndex((t) => t.key === active);
    const last = tabs.length - 1;
    const next = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(tabs[next].key, true);
  };

  return (
    <div>
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex min-w-max snap-x gap-1 border-b border-sand-200">
          {tabs.map((tab, i) => {
            const selected = tab.key === active;
            return (
              <button
                key={tab.key}
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tab.key}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${tab.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(tab.key)}
                className={`-mb-px min-h-12 snap-start border-b-[3px] px-4 font-semibold whitespace-nowrap transition-colors motion-reduce:transition-none sm:px-6 sm:text-lg ${
                  selected ? "border-gold-500 text-em-900" : "border-transparent text-em-900/60 hover:border-sand-300 hover:text-em-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`${baseId}-panel-${tab.key}`}
          aria-labelledby={`${baseId}-tab-${tab.key}`}
          hidden={tab.key !== active}
          tabIndex={0}
          className="pt-8 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-gold-500 sm:pt-10"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
