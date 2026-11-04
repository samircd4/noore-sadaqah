"use client";

import { useId, useRef, useState } from "react";

/**
 * Tabs (PAGES.md "Tabs"): underlined active tab in gold, synced to `?tab=` in the URL. The server reads `?tab=`
 * and passes `initial`, so the right panel is in the first HTML; switching updates the URL with replaceState
 * (no reload, no new history entry). Inactive panels stay mounted (hidden), so a half-filled form isn't lost.
 * Keyboard: arrows, Home, End (WAI-ARIA tabs pattern). On phones the tab row scrolls sideways (RESPONSIVE.md §15).
 * @param {object} props
 * @param {Array<{ key: string, label: string, content: React.ReactNode }>} props.tabs
 * @param {string} props.initial key of the tab shown first
 * @param {string} props.label accessible name of the tab list
 * @param {string} [props.param="tab"] the query parameter to sync
 */
export default function Tabs({ tabs, initial, label, param = "tab" }) {
  const [active, setActive] = useState(tabs.some((t) => t.key === initial) ? initial : tabs[0].key);
  const baseId = useId();
  const buttons = useRef(/** @type {Array<HTMLButtonElement | null>} */ ([]));

  const select = (key, focus = false) => {
    setActive(key);
    const url = new URL(window.location.href);
    url.searchParams.set(param, key);
    window.history.replaceState(window.history.state, "", url);
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
