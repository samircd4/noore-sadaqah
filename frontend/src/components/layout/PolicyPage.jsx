import { getTranslations } from "next-intl/server";
import PageHero from "@/components/layout/PageHero";
import Prose from "@/components/ui/Prose";
import { Link } from "@/i18n/navigation";
import { apiGetOrNotFound } from "@/lib/api";
import { bnDate } from "@/lib/format";

/** The three policy pages, in footer order (POLICIES.md). */
export const POLICY_PAGES = [
  { slug: "privacy", href: "/privacy", label: "privacy" },
  { slug: "terms", href: "/terms", label: "terms" },
  { slug: "refund-policy", href: "/refund-policy", label: "refund" },
];

/**
 * Loads a policy from GET /pages/{slug}/ (API.md). Shared by the page and its generateMetadata (cached).
 * @param {string} slug @param {"bn" | "en"} locale
 */
export function loadPolicy(slug, locale) {
  return apiGetOrNotFound(`/pages/${slug}/`, { locale, tags: ["pages"] });
}

/**
 * /privacy, /terms, /refund-policy (PAGES.md): PageHero without a photo, "সর্বশেষ হালনাগাদ: {date}", max-w-3xl
 * prose with text-base and text-xl headings on phones (RESPONSIVE.md §15), links to the other two policies.
 * @param {{ slug: string, locale: "bn" | "en" }} props
 */
export default async function PolicyPage({ slug, locale }) {
  const [page, t, tFooter] = await Promise.all([loadPolicy(slug, locale), getTranslations("policy"), getTranslations("footer")]);
  const others = POLICY_PAGES.filter((p) => p.slug !== slug);

  return (
    <>
      <PageHero title={page.title} breadcrumb={[{ label: page.title }]} />

      <article className="bg-sand-50 py-12 sm:py-14 lg:py-20">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-sm font-semibold text-em-900/70">
            {t("lastUpdated", { date: bnDate(page.updated_at, locale) })}
          </p>
          <Prose
            html={page.body_html}
            className="mt-6 sm:text-base [&_blockquote]:rounded-lg [&_blockquote]:bg-gold-500/10 [&_blockquote]:py-3 [&_blockquote]:pe-4 [&_blockquote]:font-semibold [&_h2]:text-xl sm:[&_h2]:text-xl"
          />

          <nav aria-labelledby="policy-others" className="mt-12 border-t border-sand-200 pt-6">
            <h2 id="policy-others" className="font-semibold text-em-900">
              {t("otherPolicies")}
            </h2>
            <ul className="mt-2 flex flex-wrap gap-x-6">
              {others.map((p) => (
                <li key={p.slug}>
                  <Link href={p.href} className="inline-flex min-h-11 items-center font-semibold text-em-700 underline underline-offset-4 hover:text-em-500">
                    {tFooter(p.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </article>
    </>
  );
}
