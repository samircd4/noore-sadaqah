import { CalendarClock, CircleCheck, HandHeart, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { bnDate, bnNumber, taka } from "@/lib/format";
import { fundDonateHref } from "@/lib/nav";
import DaysLeft from "./DaysLeft";
import MonthlyOptions from "./MonthlyOptions";

/**
 * Progress card + donate options for /campaigns/[slug] (PAGES.md items 2–3). Comes first on phones and sticks
 * on the right from lg (RESPONSIVE.md §15). After the end date: "ক্যাম্পেইন শেষ হয়েছে", the final total and no
 * donate links.
 * @param {{ campaign: any, locale: "bn" | "en" }} props
 */
export default async function CampaignSidebar({ campaign, locale }) {
  const [t, tBanner] = await Promise.all([getTranslations("campaignPage"), getTranslations("campaign")]);
  const ended = campaign.is_ended;
  const fundSlug = campaign.fund?.slug ?? null;

  let timeLabel;
  if (ended) timeLabel = t("ended");
  else if (!campaign.ends_at) timeLabel = t("ongoing");
  else timeLabel = <DaysLeft endsAt={campaign.ends_at} fallback={t("endsOn", { date: bnDate(campaign.ends_at, locale) })} />;

  return (
    <section aria-labelledby="campaign-progress" className="rounded-lg bg-em-900 p-5 text-white shadow-card lg:sticky lg:top-28 sm:p-6">
      <h2 id="campaign-progress" className="sr-only">
        {t("progressTitle")}
      </h2>

      {ended && (
        <p className="mb-4 flex items-center gap-2 rounded-lg bg-gold-500 px-3 py-2 font-bold text-em-950">
          <CircleCheck aria-hidden="true" className="size-5 shrink-0" />
          {t("ended")}
        </p>
      )}

      <p className="font-head text-3xl font-extrabold text-gold-400 sm:text-4xl">{taka(campaign.raised_amount, locale)}</p>
      <p className="mt-1 text-sm text-sand-200">{t("raisedOf", { goal: taka(campaign.goal_amount, locale) })}</p>

      <div className="mt-4">
        <ProgressBar percent={campaign.percent} label={tBanner("progress", { percent: bnNumber(campaign.percent, locale) })} />
        <p aria-hidden="true" className="mt-2 text-end text-sm font-semibold text-sand-100">
          {bnNumber(campaign.percent, locale)}%
        </p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <Users aria-hidden="true" className="size-4 shrink-0 text-gold-400" />
          <dt className="sr-only">{t("donorCountLabel")}</dt>
          <dd>{t("donors", { count: bnNumber(campaign.donor_count, locale) })}</dd>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <CalendarClock aria-hidden="true" className="size-4 shrink-0 text-gold-400" />
          <dt className="sr-only">{t("timeLabel")}</dt>
          <dd>{timeLabel}</dd>
        </div>
      </dl>

      {ended ? (
        <>
          <p className="mt-5 text-base leading-relaxed text-sand-100">{t("endedNote", { amount: taka(campaign.raised_amount, locale) })}</p>
          <Button disabled variant="ghost" className="mt-5 w-full">
            {t("donateClosed")}
          </Button>
        </>
      ) : (
        <>
          {campaign.monthly_options.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 font-semibold text-sand-100">{t("monthlyTitle")}</h3>
              <MonthlyOptions
                options={campaign.monthly_options}
                highlighted={campaign.highlighted_option}
                locale={locale}
                perMonthLabel={tBanner("perMonth")}
                listLabel={tBanner("monthlyOptions")}
                hrefFor={(amount) => fundDonateHref(fundSlug, { amount, campaign: campaign.slug, monthly: true })}
                ariaFor={(amount) => t("monthlyAria", { amount: taka(amount, locale) })}
              />
            </div>
          )}
          <Button href={fundDonateHref(fundSlug, { campaign: campaign.slug })} className="mt-5 w-full">
            <HandHeart aria-hidden="true" className="size-5" />
            {t("oneTime")}
          </Button>
        </>
      )}
    </section>
  );
}
