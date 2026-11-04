"use client";

import { Play, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

/**
 * "ভিডিও দেখুন" button with a modal player (HOME_PAGE.md fix 8). The YouTube iframe only exists while
 * the dialog is open, so nothing loads before a tap and the video stops when it closes (QA §2).
 * @param {{ youtubeId?: string, label: string }} props
 */
export default function VideoButton({ youtubeId, label }) {
  const t = useTranslations();
  const dialogRef = useRef(/** @type {HTMLDialogElement | null} */ (null));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const onClose = () => {
      setOpen(false);
      delete document.body.dataset.overlay;
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  const show = () => {
    setOpen(true);
    dialogRef.current?.showModal();
    document.body.dataset.overlay = "open";
  };

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/30 bg-em-950/60 px-9 py-4 text-lg font-semibold text-white transition hover:bg-white/20 motion-reduce:transition-none sm:w-auto sm:bg-white/10 sm:backdrop-blur"
      >
        <Play aria-hidden="true" className="size-5 fill-current" />
        {label}
      </button>

      <dialog
        ref={dialogRef}
        aria-label={t("video.title")}
        onClick={(event) => event.target === dialogRef.current && dialogRef.current?.close()}
        className="w-[calc(100%-2rem)] max-w-4xl rounded-lg bg-em-950 p-0 text-white backdrop:bg-em-950/80"
      >
        <div className="flex items-center justify-between gap-4 px-4 py-2">
          <p className="font-head font-bold">{t("video.title")}</p>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label={t("common.close")}
            className="grid size-11 place-items-center rounded-lg bg-white/10 hover:bg-white/20"
          >
            <X aria-hidden="true" className="size-6" />
          </button>
        </div>
        <div className="aspect-video w-full bg-em-900">
          {open && youtubeId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1&rel=0`}
              title={t("video.title")}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="size-full"
            />
          ) : (
            <p className="grid size-full place-items-center px-6 text-center text-sand-100">{t("video.comingSoon")}</p>
          )}
        </div>
      </dialog>
    </>
  );
}
