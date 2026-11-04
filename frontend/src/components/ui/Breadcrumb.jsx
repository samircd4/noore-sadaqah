import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Breadcrumb (PAGES.md "Shared page parts"): `হোম / …`, `text-sm`. "Home" is added automatically.
 * On phones it stays on one line: earlier items keep their width, only the last one truncates (RESPONSIVE.md §15).
 * @param {object} props
 * @param {Array<{ label: string, href?: string | object }>} props.items the trail after Home; the last item is the current page
 * @param {string} [props.className] colour comes from the parent (e.g. text-sand-200 in PageHero)
 */
export default async function Breadcrumb({ items, className = "" }) {
  const t = await getTranslations("breadcrumb");
  const trail = [{ label: t("home"), href: "/" }, ...items];

  return (
    <nav aria-label={t("label")} className={`text-sm ${className}`}>
      <ol className="flex min-w-0 items-center gap-1">
        {trail.map((item, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={i} className={`flex items-center gap-1 ${last ? "min-w-0" : "shrink-0"}`}>
              {i > 0 && <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 opacity-70" />}
              {last || !item.href ? (
                <span aria-current={last ? "page" : undefined} className="truncate">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="inline-flex min-h-11 min-w-11 items-center justify-center underline-offset-4 hover:text-white hover:underline">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
