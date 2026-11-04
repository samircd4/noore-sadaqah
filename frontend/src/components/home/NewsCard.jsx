import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { bnDate } from "@/lib/format";

/**
 * One news card (HOME_PAGE.md §10). The "পড়ুন" link carries the post title for screen readers.
 * @param {{ post: any, locale: "bn" | "en", readLabel: string }} props
 */
export default function NewsCard({ post, locale, readLabel }) {
  const href = `/news/${post.slug}`;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-sand-200 bg-white transition hover:shadow-xl">
      <div className="relative h-48 overflow-hidden">
        <Image
          src={post.cover.url}
          alt={post.cover.alt}
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover transition duration-700 motion-safe:group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-bold text-gold-600">
          <time dateTime={post.published_at}>{bnDate(post.published_at, locale)}</time>
          {post.category && <> · {post.category.name}</>}
        </p>
        <h3 className="mt-2 font-head text-xl leading-snug font-bold text-em-900">{post.title}</h3>
        <Link
          href={href}
          className="mt-auto inline-flex min-h-11 w-fit items-center gap-1 rounded-lg pt-3 font-semibold text-em-700 hover:text-em-500"
        >
          {readLabel}
          <span className="sr-only">: {post.title}</span>
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </article>
  );
}
