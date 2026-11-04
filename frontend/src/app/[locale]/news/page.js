import { Newspaper } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import DonateCta from "@/components/donate/DonateCta";
import NewsCard from "@/components/home/NewsCard";
import PageHero from "@/components/layout/PageHero";
import CategoryChips from "@/components/news/CategoryChips";
import NewsGridSkeleton from "@/components/news/NewsGridSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import { apiGet, apiGetOrNotFound } from "@/lib/api";
import { parsePage, parseSlug } from "@/lib/list-params";
import { currentLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";

/**
 * /news (PAGES.md): PageHero, category chips (?category=), NewsCard grid, Pagination (?page=, 12 per page).
 * The hero is prerendered; the list reads searchParams, so it renders per request inside <Suspense>
 * (frontend/CLAUDE.md rule 7). A page past the end is a 404 from the API → notFound().
 */

export async function generateMetadata() {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations("newsPage")]);
  return pageMetadata({ path: "/news", locale, title: t("title"), description: t("metaDescription") });
}

export default async function NewsPage({ searchParams }) {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations("newsPage")]);

  return (
    <>
      <PageHero title={t("title")} eyebrow={t("eyebrow")} subtitle={t("subtitle")} breadcrumb={[{ label: t("title") }]} />

      <section aria-labelledby="news-list" className="bg-sand-50 py-12 sm:py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 id="news-list" className="sr-only">
            {t("listTitle")}
          </h2>
          <Suspense fallback={<NewsGridSkeleton />}>
            <NewsList searchParams={searchParams} locale={locale} />
          </Suspense>
        </div>
      </section>

      <DonateCta />
    </>
  );
}

/** @param {{ searchParams: Promise<Record<string, string | string[] | undefined>>, locale: "bn" | "en" }} props */
async function NewsList({ searchParams, locale }) {
  const params = await searchParams;
  const category = parseSlug(params.category);
  const page = parsePage(params.page);

  const [t, tNews, categories, posts] = await Promise.all([
    getTranslations("newsPage"),
    getTranslations("news"),
    apiGet("/post-categories/", { locale, tags: ["posts"] }),
    apiGetOrNotFound("/posts/", { locale, query: { category, page }, tags: ["posts"] }),
  ]);

  return (
    <>
      <CategoryChips categories={categories} active={category} label={t("filterLabel")} allLabel={t("all")} />

      {posts.results.length === 0 ? (
        <div className="mt-8">
          <EmptyState text={t("empty")} icon={Newspaper} action={category ? { href: "/news", label: t("showAll") } : undefined} />
        </div>
      ) : (
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {posts.results.map((post) => (
            <li key={post.slug} className="min-w-0">
              <NewsCard post={post} locale={locale} readLabel={tNews("read")} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={posts.page} pages={posts.pages} pathname="/news" query={{ category: category || undefined }} locale={locale} />
    </>
  );
}
