import { getTranslations } from "next-intl/server";
import DonateCta from "@/components/donate/DonateCta";
import NewsCard from "@/components/home/NewsCard";
import PageHero from "@/components/layout/PageHero";
import ShareButtons from "@/components/news/ShareButtons";
import Badge from "@/components/ui/Badge";
import Prose from "@/components/ui/Prose";
import { apiGet, apiGetOrNotFound } from "@/lib/api";
import { bnDate } from "@/lib/format";
import { currentLocale } from "@/lib/locale";
import { localizedPath, pageMetadata } from "@/lib/seo";

/**
 * /news/[slug] (PAGES.md): cover, date, category badge, title, body (sanitized HTML from Django), share buttons,
 * 3 related posts, DonateCta. Drafts and unknown slugs are a 404 from the API → notFound().
 * Structured data: NewsArticle (SEO_ANALYTICS.md).
 */

/** The newest page of posts is prerendered; older posts render on first visit. */
export async function generateStaticParams({ params }) {
  const posts = await apiGet("/posts/", { locale: params.locale, query: { page: 1 }, tags: ["posts"] });
  return posts.results.map((p) => ({ slug: p.slug }));
}

/** @param {string} slug @param {"bn" | "en"} locale */
const loadPost = (slug, locale) => apiGetOrNotFound(`/posts/${encodeURIComponent(slug)}/`, { locale, tags: ["posts"] });

export async function generateMetadata({ params }) {
  const [{ slug }, locale] = await Promise.all([params, currentLocale()]);
  const post = await loadPost(slug, locale);
  const meta = pageMetadata({ path: `/news/${post.slug}`, locale, title: post.title, description: post.excerpt, image: post.cover });
  // pageMetadata() sets type "website"; a post is an article with a publish date.
  return { ...meta, openGraph: { ...meta.openGraph, type: "article", publishedTime: post.published_at } };
}

export default async function NewsPostPage({ params }) {
  const [{ slug }, locale] = await Promise.all([params, currentLocale()]);
  const [post, t, tNews, tMeta] = await Promise.all([
    loadPost(slug, locale),
    getTranslations("newsPage"),
    getTranslations("news"),
    getTranslations("meta"),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const url = new URL(localizedPath(`/news/${post.slug}`, locale), siteUrl).toString();

  // JSON-LD for search engines. Values come from the API; JSON.stringify + escaping "<" keeps it inert.
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.excerpt,
    image: [post.cover.url],
    datePublished: post.published_at,
    inLanguage: locale,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: tMeta("siteName"), url: siteUrl },
    publisher: { "@type": "Organization", name: tMeta("siteName"), logo: { "@type": "ImageObject", url: new URL("/icon.png", siteUrl).toString() } },
  }).replace(/</g, "\\u003c");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <PageHero
        title={post.title}
        image={post.cover}
        badge={post.category ? <Badge>{post.category.name}</Badge> : null}
        eyebrow={<time dateTime={post.published_at}>{bnDate(post.published_at, locale)}</time>}
        breadcrumb={[{ label: t("title"), href: "/news" }, { label: post.title }]}
      />

      <article className="bg-sand-50 py-12 sm:py-14 lg:py-20">
        <div className="mx-auto max-w-3xl px-4">
          {post.excerpt && <p className="font-head text-xl leading-relaxed text-em-900 sm:text-2xl">{post.excerpt}</p>}
          <Prose html={post.body_html} className={post.excerpt ? "mt-6" : ""} />
          <div className="mt-10 border-t border-sand-200 pt-6">
            <ShareButtons url={url} title={post.title} />
          </div>
        </div>
      </article>

      {post.related.length > 0 && (
        <section aria-labelledby="news-related" className="bg-sand-100 py-12 sm:py-14 lg:py-20">
          <div className="mx-auto max-w-7xl px-4">
            <h2 id="news-related" className="font-head text-2xl leading-snug font-bold text-em-900 sm:text-3xl">
              {t("related")}
            </h2>
            <ul className="mt-8 grid gap-6 md:grid-cols-3">
              {post.related.map((p) => (
                <li key={p.slug} className="min-w-0">
                  <NewsCard post={p} locale={locale} readLabel={tNews("read")} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <DonateCta />
    </>
  );
}
