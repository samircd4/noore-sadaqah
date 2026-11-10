"use client";

import { LoaderCircle, MessageSquareText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { refreshDonation } from "@/lib/actions/donate";

const INTERVAL_MS = 5000;
const MAX_TRIES = 12;

/**
 * Shown on /donate/success while the donation is PENDING (PAGES.md): asks the refreshDonation server action every
 * 5 seconds, 12 times. When Django reports a final status the page reloads its server data (PAID shows the
 * receipt; FAILED/CANCELLED moves to /donate/failed). A failed check counts as a try. After 12 tries:
 * "নিশ্চিত হলে এসএমএস পাবেন".
 * The status always comes from the API, never from the URL.
 * @param {{ id: string, locale: "bn" | "en" }} props
 */
export default function DonationPoller({ id, locale }) {
  const t = useTranslations("donationResult");
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let tries = 0;
    let stopped = false;
    let timer;
    const tick = async () => {
      tries += 1;
      let status = null;
      try {
        status = await refreshDonation(id, locale);
      } catch {
        // Offline for a moment, or a new deploy changed the action: count the try and keep going.
      }
      if (stopped) return;
      const state = /** @type {any} */ (status)?.status;
      if (state === "paid") {
        router.refresh();
        return;
      }
      if (state === "failed" || state === "cancelled") {
        router.replace(`/donate/failed?id=${encodeURIComponent(id)}`);
        return;
      }
      if (tries >= MAX_TRIES) {
        setGaveUp(true);
        return;
      }
      timer = setTimeout(tick, INTERVAL_MS);
    };
    timer = setTimeout(tick, INTERVAL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [id, locale, router]);

  if (gaveUp) {
    return (
      <p role="status" className="mt-6 flex items-start justify-center gap-2 text-base leading-relaxed text-em-900/80">
        <MessageSquareText aria-hidden="true" className="mt-1 size-5 shrink-0 text-em-700" />
        <span>{t("pendingLong")}</span>
      </p>
    );
  }
  return (
    <p role="status" className="mt-6 flex items-center justify-center gap-2 text-base text-em-900/80">
      <LoaderCircle aria-hidden="true" className="size-5 shrink-0 text-em-700 motion-safe:animate-spin" />
      <span>{t("pendingText")}</span>
    </p>
  );
}
