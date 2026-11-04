import { Link } from "@/i18n/navigation";

/**
 * Category filter for /news and /gallery (PAGES.md): links to `?category=`, "All" first. On phones the row scrolls
 * sideways inside itself with snap and a fade at the right edge (RESPONSIVE.md §4, §15); from sm it wraps.
 * Changing the category drops `?page=`, so the filtered list starts at page 1; `keep` carries other filters along.
 * @param {object} props
 * @param {Array<{ slug: string, name: string }>} props.categories
 * @param {string} props.active current category slug, "" for all
 * @param {string} props.label accessible name of the filter
 * @param {string} props.allLabel
 * @param {string} [props.pathname="/news"]
 * @param {Record<string, string | undefined>} [props.keep] other query values to keep, e.g. `{ kind: "video" }`
 */
export default function CategoryChips({ categories, active, label, allLabel, pathname = "/news", keep = {} }) {
  const items = [{ slug: "", name: allLabel }, ...categories];
  const hrefFor = (slug) => {
    const query = Object.fromEntries(Object.entries({ ...keep, category: slug || undefined }).filter(([, v]) => v));
    return Object.keys(query).length ? { pathname, query } : pathname;
  };
  return (
    <nav aria-label={label} className="-mx-4 sm:mx-0">
      <ul className="flex snap-x gap-2 overflow-x-auto px-4 pb-2 mask-r-from-85% [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:px-0 sm:mask-none">
        {items.map((c) => {
          const isActive = c.slug === active;
          return (
            <li key={c.slug || "all"} className="shrink-0 snap-start">
              <Link
                href={hrefFor(c.slug)}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-lg border px-4 font-semibold whitespace-nowrap transition motion-reduce:transition-none ${
                  isActive
                    ? "border-em-700 bg-em-700 text-white"
                    : "border-sand-300 bg-white text-em-900 hover:border-em-500 hover:text-em-700"
                }`}
              >
                {c.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
