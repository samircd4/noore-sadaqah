import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { bnNumber } from "@/lib/format";
import { pageItems } from "@/lib/pagination";

/**
 * Prev / page numbers / Next (PAGES.md "Pagination"), numbers in the page language's digits, current page
 * bg-em-700. Phones show "page X of Y" instead of every number (RESPONSIVE.md §15). Every target is 44px.
 * Page 1 has no `?page=` so it shares the list's canonical URL.
 * @param {object} props
 * @param {number} props.page current page (1-based)
 * @param {number} props.pages total pages
 * @param {string} props.pathname e.g. "/news"
 * @param {Record<string, string | number | undefined>} [props.query] other query params to keep (e.g. category)
 * @param {"bn" | "en"} props.locale
 */
export default async function Pagination({ page, pages, pathname, query = {}, locale }) {
  if (pages <= 1) return null;
  const t = await getTranslations("pagination");

  /** @param {number} n */
  const hrefFor = (n) => {
    const q = Object.fromEntries(Object.entries({ ...query, page: n > 1 ? n : undefined }).filter(([, v]) => v !== undefined && v !== ""));
    return Object.keys(q).length ? { pathname, query: q } : pathname;
  };

  const box = "inline-flex size-11 items-center justify-center rounded-lg font-semibold";
  const idle = `${box} border border-sand-300 bg-white text-em-900 hover:border-em-500 hover:text-em-700`;
  const disabled = `${box} border border-sand-200 text-em-900/30`;

  const arrow = (n, label, Icon, enabled) =>
    enabled ? (
      <Link href={hrefFor(n)} rel={n < page ? "prev" : "next"} aria-label={label} className={idle}>
        <Icon aria-hidden="true" className="size-5" />
      </Link>
    ) : (
      <span aria-hidden="true" className={disabled}>
        <Icon className="size-5" />
      </span>
    );

  return (
    <nav aria-label={t("label")} className="mt-10 flex items-center justify-center gap-2">
      {arrow(page - 1, t("prev"), ChevronLeft, page > 1)}

      <p className="px-3 text-sm font-semibold text-em-900 sm:hidden" aria-live="polite">
        {t("current", { page: bnNumber(page, locale), pages: bnNumber(pages, locale) })}
      </p>

      <ul className="hidden items-center gap-2 sm:flex">
        {pageItems(page, pages).map((item, i) =>
          item === "gap" ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-em-900/60">
              …
            </li>
          ) : (
            <li key={item}>
              {item === page ? (
                <span aria-current="page" className={`${box} bg-em-700 text-white`}>
                  <span className="sr-only">{t("page", { page: bnNumber(item, locale) })}</span>
                  <span aria-hidden="true">{bnNumber(item, locale)}</span>
                </span>
              ) : (
                <Link href={hrefFor(item)} aria-label={t("page", { page: bnNumber(item, locale) })} className={idle}>
                  {bnNumber(item, locale)}
                </Link>
              )}
            </li>
          ),
        )}
      </ul>

      {arrow(page + 1, t("next"), ChevronRight, page < pages)}
    </nav>
  );
}
