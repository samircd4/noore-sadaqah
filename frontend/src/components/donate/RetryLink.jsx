"use client";

import { RotateCcw } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Link } from "@/i18n/navigation";
import { parseDraft, readDraftText } from "@/lib/donation-draft";

const noSubscribe = () => () => {};

/**
 * "আবার চেষ্টা করুন" on /donate/failed (PAGES.md): back to the fund's form, which fills itself from the draft in
 * sessionStorage. Without a draft (another browser, storage blocked) the fund and amount come from the status
 * response instead, through ?amount=.
 * @param {{ fund: string | null, amount: number | null, label: string }} props from GET /donations/{id}/status/
 */
export default function RetryLink({ fund, amount, label }) {
  const draftText = useSyncExternalStore(noSubscribe, readDraftText, () => "");
  const draft = parseDraft(draftText);

  const slug = draft?.fund ?? fund;
  /** @type {string | { pathname: string, query: Record<string, string | number> }} */
  let href = "/donate";
  if (slug) {
    const query = {};
    if (!draft && amount) query.amount = amount;
    if (draft?.campaign) query.campaign = draft.campaign;
    href = { pathname: `/donate/${slug}`, query };
  }

  return (
    <Link
      href={href}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-8 py-3 text-lg font-bold text-em-950 shadow-md transition hover:bg-gold-400 active:bg-gold-600 motion-reduce:transition-none sm:w-auto"
    >
      <RotateCcw aria-hidden="true" className="size-5" />
      {label}
    </Link>
  );
}
