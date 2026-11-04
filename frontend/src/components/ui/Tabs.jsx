"use client";

import { useSearchParams } from "next/navigation";
import { useId, useRef } from "react";

/**
 * Tabs (PAGES.md "Tabs"): underlined active tab in gold. The active tab IS `?tab=` in the URL (useSearchParams), so
 * the right panel is in the first HTML and a link to another `?tab=` (e.g. the footer's volunteer link while already
 * on the page) switches it. Clicking a tab updates the URL with replaceState (no reload, no new history entry), which
 * Next syncs into useSearchParams. Inactive panels stay mounted (hidden), so a half-filled form isn't lost.
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
  const valid = (key) => tabs.some((t) => t.key === key);
  const active = valid(requested) ? requested : valid(fallback) ? fallback : tabs[0].key;
  const baseId = useId();
  const buttons = useRef(/** @type {Array<HTMLButtonElement | null>} */ ([]));

  const select = (key, focus = false) => {
    const url = new URL(window.location.href);
    url.searchParams.set(param, key);
    // null state, as in Next's docs: Next then syncs the new URL into useSearchParams (and the router).
    window.history.replaceState(null, "", url);
    if (focus) {
      const button = buttons.current[tabs.findIndex((t) => t.key === key)];
      button?.focus();
      button?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };

  const onKeyDown = (event) => {
    const i = tabs.findIndex((t) => t.key === active);
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
