"use client";

import { Check, Link2, MessageCircle, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * Share row for /news/[slug] (PAGES.md, RESPONSIVE.md §15): one row of 44px buttons. WhatsApp and Facebook are
 * plain links (no third-party scripts); "copy link" uses the clipboard; the phone's own share sheet is offered
 * where the browser has one.
 * @param {{ url: string, title: string }} props url: absolute URL of the post
 */
export default function ShareButtons({ url, title }) {
  const t = useTranslations("newsPage");
  const [copied, setCopied] = useState(false);
  // Only known in the browser; the server renders without the native-share button.
  const canShare = useSyncExternalStore(noSubscribe, () => typeof navigator.share === "function", () => false);

  const box =
    "grid size-11 place-items-center rounded-lg border border-sand-300 bg-white text-em-800 transition hover:border-em-500 hover:text-em-600 active:bg-em-50 motion-reduce:transition-none";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked (insecure context or permission): nothing to do; the URL is in the address bar.
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      // The visitor closed the share sheet.
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-semibold text-em-900">{t("share")}:</span>
      <ul className="flex items-center gap-2">
        <li>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("shareWhatsapp")}
            className={box}
          >
            <MessageCircle aria-hidden="true" className="size-5" />
          </a>
        </li>
        <li>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("shareFacebook")}
            className={box}
          >
            <span aria-hidden="true" className="text-lg font-bold">
              f
            </span>
          </a>
        </li>
        <li>
          <button type="button" onClick={copy} aria-label={t("copyLink")} className={box}>
            {copied ? <Check aria-hidden="true" className="size-5 text-em-600" /> : <Link2 aria-hidden="true" className="size-5" />}
          </button>
        </li>
        {canShare && (
          <li>
            <button type="button" onClick={nativeShare} aria-label={t("shareNative")} className={box}>
              <Share2 aria-hidden="true" className="size-5" />
            </button>
          </li>
        )}
      </ul>
      <p role="status" className="text-sm font-semibold text-em-700">
        {copied ? t("copied") : ""}
      </p>
    </div>
  );
}
