"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { daysLeft } from "@/lib/countdown";
import { bnNumber } from "@/lib/format";

const noSubscribe = () => () => {};

/**
 * "আর ১২ দিন বাকি" for a campaign with an end date. The page is prerendered, so the server can't know today's
 * date: it renders `fallback` ("শেষ হবে ৩১ ডিসেম্বর ২০২৬") and the browser swaps in the day count.
 * @param {{ endsAt: string, fallback: string }} props
 */
export default function DaysLeft({ endsAt, fallback }) {
  const t = useTranslations("campaignPage");
  const locale = useLocale();
  // Server snapshot is null (no clock); the client snapshot is a whole number, stable within a day.
  const days = useSyncExternalStore(noSubscribe, () => daysLeft(endsAt, Date.now()), () => null);
  if (!days) return fallback;
  return t("daysLeft", { days: bnNumber(days, locale) });
}
