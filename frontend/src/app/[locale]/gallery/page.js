import { Images } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import GalleryGrid from "@/components/gallery/GalleryGrid";
import PageHero from "@/components/layout/PageHero";
import CategoryChips from "@/components/news/CategoryChips";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import { Link } from "@/i18n/navigation";
import { apiGet, apiGetOrNotFound } from "@/lib/api";
import { parsePage, parseSlug } from "@/lib/list-params";
import { currentLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";

/**
 * /gallery (PAGES.md): category chips (?category=), photo/video toggle (?kind=), grid of tiles, Pagination
 * (?page=, 12 per page), Lightbox. Data: GET /gallery/, /post-categories/. The list reads searchParams, so it
 * renders per request inside <Suspense>; the hero is prerendered.
 */

const KINDS = ["photo", "video"];

export async function generateMetadata() {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations("galleryPage")]);
  return pageMetadata({ path: "/gallery", locale, title: t("title"), description: t("metaDescription") });
}

export default async function GalleryPage({ searchParams }) {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations("galleryPage")]);
  return (
    <>
      <PageHero title={t("title")} eyebrow={t("eyebrow")} subtitle={t("subtitle")} breadcrumb={[{ label: t("title") }]} />
      <section aria-labelledby="gallery-list" className="bg-sand-50 py-12 sm:py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 id="gallery-list" className="sr-only">
            {t("listTitle")}
          </h2>
          <Suspense fallback={<GallerySkeleton />}>
            <GalleryList searchParams={searchParams} locale={locale} />
          </Suspense>
        </div>
      </section>
    </>
  );
}

function GallerySkeleton() {
  return (
    <div aria-hidden="true">
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-11 w-20 rounded-lg bg-sand-200 motion-safe:animate-pulse" />
        ))}
      </div>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="aspect-square rounded-lg bg-sand-200 motion-safe:animate-pulse" />
        ))}
      </ul>
    </div>
  );
}

/** @param {{ searchParams: Promise<Record<string, string | string[] | undefined>>, locale: "bn" | "en" }} props */
async function GalleryList({ searchParams, locale }) {
  const params = await searchParams;
  const category = parseSlug(params.category);
  const kindParam = parseSlug(params.kind);
  const kind = KINDS.includes(kindParam) ? kindParam : "";
  const page = parsePage(params.page);

  const [t, categories, gallery] = await Promise.all([
    getTranslations("galleryPage"),
    apiGet("/post-categories/", { locale, tags: ["posts"] }),
    apiGetOrNotFound("/gallery/", { locale, query: { category, kind, page }, tags: ["gallery"] }),
  ]);

  const kindHref = (k) => {
    const query = Object.fromEntries(Object.entries({ category, kind: k }).filter(([, v]) => v));
    return Object.keys(query).length ? { pathname: "/gallery", query } : "/gallery";
  };

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 lg:flex-1">
          <CategoryChips
            categories={categories}
            active={category}
            label={t("filterLabel")}
            allLabel={t("all")}
            pathname="/gallery"
            keep={{ kind: kind || undefined }}
          />
        </div>
        <nav aria-label={t("kindLabel")} className="shrink-0">
          <ul className="inline-flex rounded-lg border border-sand-300 bg-white p-1">
            {[
              { key: "", label: t("kindAll") },
              { key: "photo", label: t("kindPhoto") },
              { key: "video", label: t("kindVideo") },
            ].map((k) => {
              const active = k.key === kind;
              return (
                <li key={k.key || "all"}>
                  <Link
                    href={kindHref(k.key)}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-4 font-semibold transition motion-reduce:transition-none ${
                      active ? "bg-em-700 text-white" : "text-em-900 hover:bg-sand-100"
                    }`}
                  >
                    {k.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="mt-8">
        {gallery.results.length === 0 ? (
          <EmptyState
            text={t("empty")}
            icon={Images}
            action={category || kind ? { href: "/gallery", label: t("showAll") } : undefined}
          />
        ) : (
          <GalleryGrid items={gallery.results} />
        )}
      </div>

      <Pagination
        page={gallery.page}
        pages={gallery.pages}
        pathname="/gallery"
        query={{ category: category || undefined, kind: kind || undefined }}
        locale={locale}
      />
    </>
  );
}
