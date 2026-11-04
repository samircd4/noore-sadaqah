import { ChevronDown } from "lucide-react";

/**
 * FAQ list (PAGES.md "Accordion"): native <details>/<summary>, no JavaScript. Headers are at least 44px tall
 * (RESPONSIVE.md §6). The answer is plain text from the API, never HTML.
 * @param {{ items: Array<{ q: string, a: string }> }} props
 */
export default function Accordion({ items }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <details key={i} className="group rounded-lg border border-sand-200 bg-white">
          <summary className="flex min-h-11 list-none items-center justify-between gap-4 rounded-lg px-4 py-3 font-semibold text-em-900 hover:text-em-700 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-gold-500 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">{item.q}</span>
            <ChevronDown
              aria-hidden="true"
              className="size-5 shrink-0 text-gold-600 transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <p className="px-4 pb-4 text-base leading-relaxed text-em-900/80">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
