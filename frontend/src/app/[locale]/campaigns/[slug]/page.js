import { getTranslations } from "next-intl/server";
import CampaignSidebar from "@/components/campaigns/CampaignSidebar";
import RecentDonors from "@/components/campaigns/RecentDonors";
import DonateCta from "@/components/donate/DonateCta";
import PageHero from "@/components/layout/PageHero";
import Badge from "@/components/ui/Badge";
import Prose from "@/components/ui/Prose";
import { apiGet, apiGetOrNotFound } from "@/lib/api";
import { currentLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";

/**
 * /campaigns/[slug] (PAGES.md, phone layout RESPONSIVE.md §15). Data: GET /campaigns/{slug}/ (404 → notFound()).
 * Phone order: hero, progress + donate card, story, recent donors. From lg: story and donors on the left (8),
 * sticky progress card on the right (4).
 */

export async function generateStaticParams({ params }) {
  const campaigns = await apiGet("/campaigns/", { locale: params.locale, tags: ["campaigns"] });
  return campaigns.map((c) => ({ slug: c.slug }));
}

/** @param {string} slug @param {"bn" | "en"} locale */
const loadCampaign = (slug, locale) =>
  apiGetOrNotFound(`/campaigns/${encodeURIComponent(slug)}/`, { locale, tags: ["campaigns"] });

export async function generateMetadata({ params }) {
  const [{ slug }, locale] = await Promise.all([params, currentLocale()]);
  const campaign = await loadCampaign(slug, locale);
  return pageMetadata({
    path: `/campaigns/${campaign.slug}`,
    locale,
    title: campaign.title,
    description: campaign.summary,
    image: campaign.cover,
  });
}

export default async function CampaignPage({ params }) {
  const [{ slug }, locale] = await Promise.all([params, currentLocale()]);
  const [campaign, t] = await Promise.all([loadCampaign(slug, locale), getTranslations("campaignPage")]);
  const ended = campaign.is_ended;

  return (
    <>
      <PageHero
        title={campaign.title}
        subtitle={campaign.summary}
        image={campaign.cover}
        badge={ended ? <Badge>{t("ended")}</Badge> : null}
        breadcrumb={[{ label: t("breadcrumb") }, { label: campaign.title }]}
      />

      <div className="bg-sand-50 py-12 sm:py-14 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-12 lg:gap-8">
          {/* First in the DOM so phones get it right after the hero; moved to the right column from lg. */}
          <aside className="min-w-0 lg:order-last lg:col-span-4">
            <CampaignSidebar campaign={campaign} locale={locale} />
          </aside>

          <div className="min-w-0 space-y-12 lg:col-span-8">
            {campaign.body_html && (
              <section aria-labelledby="campaign-story">
                <h2 id="campaign-story" className="font-head text-2xl leading-snug font-bold text-em-900 sm:text-3xl">
                  {t("story")}
                </h2>
                <Prose html={campaign.body_html} className="mt-4" />
              </section>
            )}

            {(campaign.recent_donors.length > 0 || !ended) && (
              <section aria-labelledby="campaign-donors">
                <h2 id="campaign-donors" className="font-head text-2xl leading-snug font-bold text-em-900 sm:text-3xl">
                  {t("donorsTitle")}
                </h2>
                <div className="mt-4">
                  <RecentDonors donors={campaign.recent_donors} locale={locale} ended={ended} />
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {!ended && <DonateCta fundSlug={campaign.fund?.slug ?? null} />}
    </>
  );
}
