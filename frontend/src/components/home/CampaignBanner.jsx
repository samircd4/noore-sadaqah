import { Flame } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { bnNumber, taka } from "@/lib/format";

/**
 * Featured campaign banner (HOME_PAGE.md §7) from GET /campaigns/?featured=1.
 * The fixed-background "parallax" only runs from lg: iOS ignores it and it janks on Android (RESPONSIVE.md §11).
 * Phones get a normal optimised image and compact monthly cards that fit at 320px.
 * @param {{ campaign: any, locale: "bn" | "en" }} props
 */
export default async function CampaignBanner({ campaign, locale }) {
  const t = await getTranslations("campaign");
  const href = `/campaigns/${campaign.slug}`;

  return (
    <section aria-labelledby="campaign-title" className="relative isolate overflow-hidden py-16 text-white lg:py-20">
      <Image src={campaign.cover.url} alt="" fill sizes="100vw" className="-z-20 object-cover lg:hidden" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 hidden bg-cover bg-fixed bg-center lg:block"
        style={{ backgroundImage: `url("${campaign.cover.url}")` }}
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-(image:--overlay-banner)" />

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 lg:grid-cols-2">
        <div>
          <Badge className="px-4 py-1.5 text-sm" icon={<Flame aria-hidden="true" className="size-4" />}>
            {t("badge")}
          </Badge>
          <h2
            id="campaign-title"
            className="mt-4 font-head text-[1.75rem] leading-snug font-bold min-[360px]:text-3xl sm:text-4xl lg:text-5xl"
          >
            {campaign.title}
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-sand-100/90">{campaign.summary}</p>

          <div className="mt-6 max-w-xl">
            <ProgressBar percent={campaign.percent} label={t("progress", { percent: bnNumber(campaign.percent, locale) })} />
            <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-sand-100/90">
              <span>{t("raised", { amount: taka(campaign.raised_amount, locale) })}</span>
              <span>{t("goal", { amount: taka(campaign.goal_amount, locale) })}</span>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <Button href={href} blockOnPhone>
              {t("sponsor")}
            </Button>
            <Button href={href} variant="ghost" blockOnPhone>
              {t("details")}
            </Button>
          </div>
        </div>

        <ul aria-label={t("monthlyOptions")} className="grid grid-cols-3 gap-2 min-[360px]:gap-3 sm:gap-4">
          {campaign.monthly_options.map((option) => {
            const highlighted = option === campaign.highlighted_option;
            return (
              <li
                key={option}
                className={`rounded-lg p-3 text-center sm:p-4 ${
                  highlighted
                    ? "bg-gold-500 text-em-950 shadow-xl"
                    : "border border-white/20 bg-em-950/40 sm:bg-white/10 sm:backdrop-blur"
                }`}
              >
                <p className="font-head text-2xl font-bold sm:text-3xl">{bnNumber(option, locale)}</p>
                <p className={`mt-1 text-xs leading-5 ${highlighted ? "" : "text-sand-100/80"}`}>{t("perMonth")}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
