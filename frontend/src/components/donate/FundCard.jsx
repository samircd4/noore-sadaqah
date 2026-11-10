import { HandHeart } from "lucide-react";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

/**
 * One fund on /donate (PAGES.md): cover, title, summary and a gold "দান করুন" button to /donate/[fund].
 * Zakat-eligible funds carry the "যাকাত গ্রহণযোগ্য" badge. One column on phones (RESPONSIVE.md §15).
 * @param {object} props
 * @param {{ slug: string, title: string, summary: string, cover: { url: string, alt: string } | null, is_zakat_eligible: boolean }} props.fund
 * @param {string} props.donateLabel
 * @param {string} props.zakatLabel
 * @param {string | null} [props.note] small line under the summary (e.g. fitra "শীঘ্রই আসছে")
 */
export default function FundCard({ fund, donateLabel, zakatLabel, note = null }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-sand-200 bg-white shadow-card">
      <div className="relative aspect-[3/2] bg-em-900">
        {fund.cover && (
          <Image
            src={fund.cover.url}
            alt={fund.cover.alt}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        )}
        {fund.is_zakat_eligible && <Badge className="absolute start-3 top-3">{zakatLabel}</Badge>}
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="font-head text-2xl leading-snug font-bold text-em-900">{fund.title}</h3>
        <p className="mt-2 flex-1 text-base leading-relaxed text-em-900/80">{fund.summary}</p>
        {note && <p className="mt-3 text-sm font-semibold text-em-700">{note}</p>}
        <Button href={`/donate/${fund.slug}`} className="mt-5 w-full">
          <HandHeart aria-hidden="true" className="size-5" />
          {donateLabel}
        </Button>
      </div>
    </article>
  );
}
