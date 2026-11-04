import { CalendarClock, HandHeart, MapPin, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Button from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { taka } from "@/lib/format";
import { fundDonateHref } from "@/lib/nav";

/**
 * Sidebar of /programs/[slug] (PAGES.md): info card (beneficiaries, area, duration) and the linked fund's donate
 * box (preset amounts → /donate/[fund]?amount=). Sticky from lg only; on phones it sits right after the hero
 * (RESPONSIVE.md §15), which the page handles with DOM order.
 * @param {object} props
 * @param {{ beneficiary: string, area: string, duration: string, fund: { slug: string, title: string, preset_amounts: number[] } | null }} props.program
 * @param {"bn" | "en"} props.locale
 */
export default async function ProgramSidebar({ program, locale }) {
  const t = await getTranslations("programsPage");
  const facts = [
    { icon: Users, label: t("beneficiary"), value: program.beneficiary },
    { icon: MapPin, label: t("area"), value: program.area },
    { icon: CalendarClock, label: t("duration"), value: program.duration },
  ].filter((f) => f.value);
  const fund = program.fund;

  return (
    <div className="space-y-6 lg:sticky lg:top-28">
      {facts.length > 0 && (
        <section aria-labelledby="program-info" className="rounded-lg border border-em-100 bg-em-50 p-5">
          <h2 id="program-info" className="font-head text-xl font-bold text-em-900">
            {t("info")}
          </h2>
          <dl className="mt-4 space-y-4">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex gap-3">
                <Icon aria-hidden="true" className="mt-1 size-5 shrink-0 text-gold-600" />
                <div className="min-w-0">
                  <dt className="text-sm font-semibold text-em-900/70">{label}</dt>
                  <dd className="text-base break-words text-em-950">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>
      )}

      {fund && (
        <section aria-labelledby="program-donate" className="rounded-lg bg-em-900 p-5 text-white shadow-card">
          <h2 id="program-donate" className="font-head text-xl font-bold">
            {t("donateBox")}
          </h2>
          <p className="mt-1 text-sm text-sand-200">{t("fund", { fund: fund.title })}</p>

          {fund.preset_amounts.length > 0 && (
            <>
              <p className="mt-5 text-sm font-semibold text-sand-100">{t("chooseAmount")}</p>
              <ul className="mt-2 grid grid-cols-2 gap-2">
                {fund.preset_amounts.map((amount) => (
                  <li key={amount}>
                    <Link
                      href={fundDonateHref(fund.slug, { amount })}
                      className="flex h-11 items-center justify-center rounded-lg border border-white/25 bg-white/10 font-bold transition hover:border-gold-400 hover:bg-white/20 active:bg-white/25 motion-reduce:transition-none"
                    >
                      {taka(amount, locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          <Button href={fundDonateHref(fund.slug)} className="mt-5 w-full">
            <HandHeart aria-hidden="true" className="size-5" />
            {t("donate")}
          </Button>
        </section>
      )}
    </div>
  );
}
