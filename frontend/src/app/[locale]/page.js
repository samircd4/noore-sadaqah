import AboutPreview from "@/components/home/AboutPreview";
import CampaignBanner from "@/components/home/CampaignBanner";
import GalleryMosaic from "@/components/home/GalleryMosaic";
import Hero from "@/components/home/Hero";
import LatestNews from "@/components/home/LatestNews";
import Programs from "@/components/home/Programs";
import QuoteBand from "@/components/home/QuoteBand";
import Stats from "@/components/home/Stats";
import VolunteerCta from "@/components/home/VolunteerCta";
import QuickDonate from "@/components/donate/QuickDonate";
import { apiGet } from "@/lib/api";
import { currentLocale } from "@/lib/locale";

/**
 * Home page: design/reference/home.html, built phone-first (docs/HOME_PAGE.md, docs/RESPONSIVE.md §14).
 * All content comes from the API (mock fixtures while API_MODE=mock).
 */
export default async function HomePage() {
  const locale = await currentLocale();

  const [site, funds, programs, campaigns, gallery, posts] = await Promise.all([
    apiGet("/site/", { locale, tags: ["site"] }),
    apiGet("/funds/", { locale, tags: ["funds"] }),
    apiGet("/programs/", { locale, query: { featured: 1 }, tags: ["programs"] }),
    apiGet("/campaigns/", { locale, query: { featured: 1 }, tags: ["campaigns"] }),
    apiGet("/gallery/", { locale, query: { limit: 6, kind: "photo" }, tags: ["gallery"] }),
    apiGet("/posts/", { locale, query: { limit: 3 }, tags: ["posts"] }),
  ]);

  // Fitra uses its own form (people × rate) and opens only after ZAKAT_POLICY.md sign-off.
  const donateFunds = funds.filter((f) => !f.is_fitra || site.zakat_enabled);
  const campaign = campaigns[0];
  const images = site.home_images;

  return (
    <>
      {/* The quick-donate panel sits in normal flow on phones and overlaps the hero bottom from lg. */}
      <div className="relative">
        <Hero image={images.hero} youtubeId={site.promo_video?.youtube_id} />
        <QuickDonate
          funds={donateFunds}
          className="relative z-(--z-raised) -mt-8 px-4 lg:absolute lg:inset-x-0 lg:-bottom-[120px] lg:mt-0"
        />
      </div>
      <Stats stats={site.stats} locale={locale} className="pt-8 lg:pt-36" />
      <AboutPreview mainImage={images.about_main} smallImage={images.about_small} />
      <Programs programs={programs} />
      {campaign && <CampaignBanner campaign={campaign} locale={locale} />}
      <GalleryMosaic items={gallery.results} />
      <QuoteBand quote={site.quote} image={images.quote} />
      <LatestNews posts={posts.results} locale={locale} />
      <VolunteerCta image={images.volunteer} />
    </>
  );
}
