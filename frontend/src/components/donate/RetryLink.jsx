"use client";

import { RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import { useDonationDraft } from "@/lib/donation-draft";
import { fundDonateHref } from "@/lib/nav";

/**
 * "আবার চেষ্টা করুন" on /donate/failed (PAGES.md): back to the failed donation's fund. The fund comes from the
 * status response; the sessionStorage draft is used only when it is for that same fund (then the form fills itself
 * from it). Without a matching draft (another browser, storage blocked, or a newer draft for another fund) the
 * amount comes from the status response, through ?amount=.
 * @param {{ fund: string | null, amount: number | null, label: string }} props from GET /donations/{id}/status/
 */
export default function RetryLink({ fund, amount, label }) {
  const stored = useDonationDraft();
  const slug = fund ?? stored?.fund ?? null;
  const draft = stored && stored.fund === slug ? stored : null;

  const href = fundDonateHref(slug, {
    amount: draft ? undefined : amount || undefined,
    campaign: draft?.campaign || undefined,
  });

  return (
    <Button href={href} variant="gold" size="cta" blockOnPhone className="shadow-md">
      <RotateCcw aria-hidden="true" className="size-5" />
      {label}
    </Button>
  );
}
