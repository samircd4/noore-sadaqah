import { getTranslations } from "next-intl/server";
import SectionHeader from "@/components/ui/SectionHeader";
import NewsCard from "./NewsCard";

/**
 * Latest three posts (HOME_PAGE.md §10) from GET /posts/?limit=3. Stacked on phones, 3 columns from md.
 * @param {{ posts: any[], locale: "bn" | "en" }} props
 */
export default async function LatestNews({ posts, locale }) {
  const t = await getTranslations("news");
  return (
    <section id="news" aria-labelledby="news-title" className="py-12 sm:py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <SectionHeader id="news-title" eyebrow={t("eyebrow")} title={t("title")} />
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <NewsCard post={post} locale={locale} readLabel={t("read")} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
