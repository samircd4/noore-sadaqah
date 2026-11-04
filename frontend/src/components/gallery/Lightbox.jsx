"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { bnNumber } from "@/lib/format";

/**
 * Full-screen viewer for /gallery (PAGES.md "Lightbox", RESPONSIVE.md §15): arrows and ←/→ keys, Esc to close
 * (native <dialog>, which also traps focus), swipe left/right on touch screens, swipe down to close, a 44px close
 * button in the top corner, caption at the bottom. Only the current image loads (at full width, sizes 100vw,
 * RESPONSIVE.md §12). A video's YouTube iframe exists only while it is shown, so closing or moving on stops it.
 * @param {object} props
 * @param {Array<{ id: number, kind: "photo" | "video", image: { url: string, alt: string }, youtube_id: string, caption: string, category: { name: string } | null }>} props.items
 * @param {number | null} props.index open item, or null when closed
 * @param {(index: number | null) => void} props.onChange
 */
export default function Lightbox({ items, index, onChange }) {
  const t = useTranslations("galleryPage");
  const tAll = useTranslations();
  const locale = useLocale();
  const dialogRef = useRef(/** @type {HTMLDialogElement | null} */ (null));
  const start = useRef(/** @type {{ x: number, y: number } | null} */ (null));

  const open = index !== null;
  const count = items.length;
  const item = open ? items[index] : null;

  // Open/close the native dialog with the index; tell the layout an overlay is open (hides the sticky bar).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.body.dataset.overlay = "open";
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const onClose = () => {
      delete document.body.dataset.overlay;
      onChange(null);
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [onChange]);

  const go = (step) => {
    if (index === null || count < 2) return;
    onChange((index + step + count) % count);
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowRight") go(1);
    else if (event.key === "ArrowLeft") go(-1);
  };

  // Swipe: sideways ≥ 50px changes the item, down ≥ 80px closes. Mouse drags are ignored.
  const onPointerDown = (event) => {
    if (event.pointerType !== "mouse") start.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = event.clientX - s.x;
    const dy = event.clientY - s.y;
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    else if (dy >= 80 && dy > Math.abs(dx)) dialogRef.current?.close();
  };

  const control =
    "grid size-12 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 active:bg-white/30 motion-reduce:transition-none";
  // Arrows sit on top of the photo, so they get a dark backing that stays visible on bright images.
  const arrow =
    "absolute top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-lg border border-white/20 bg-em-950/70 text-white shadow-lg transition hover:bg-em-950/90 active:bg-em-950 motion-reduce:transition-none";

  return (
    <dialog
      ref={dialogRef}
      data-lightbox=""
      aria-label={t("lightbox")}
      onKeyDown={onKeyDown}
      className="m-0 h-dvh max-h-none w-full max-w-none flex-col bg-em-950 p-0 text-white backdrop:bg-em-950 open:flex"
    >
      {item && (
        <>
          <div className="flex shrink-0 items-center justify-between gap-4 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 sm:px-5">
            <p className="text-sm font-semibold text-sand-200" aria-live="polite">
              {t("counter", { current: bnNumber(index + 1, locale), total: bnNumber(count, locale) })}
            </p>
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label={tAll("common.close")} className={control}>
              <X aria-hidden="true" className="size-6" />
            </button>
          </div>

          <div
            className="relative min-h-0 flex-1 touch-none select-none"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              start.current = null;
            }}
          >
            {item.kind === "video" ? (
              <div className="absolute inset-0 grid place-items-center px-3 sm:px-20">
                <div className="aspect-video w-full max-w-5xl overflow-hidden rounded-lg bg-em-900">
                  {item.youtube_id ? (
                    <iframe
                      key={item.id}
                      src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(item.youtube_id)}?autoplay=1&rel=0`}
                      title={item.caption}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                      className="size-full"
                    />
                  ) : (
                    <div className="relative size-full">
                      <Image src={item.image.url} alt="" fill sizes="100vw" className="object-cover opacity-30" />
                      <p className="absolute inset-0 grid place-items-center px-6 text-center text-lg font-semibold">
                        {tAll("video.comingSoon")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Image key={item.id} src={item.image.url} alt={item.image.alt} fill sizes="100vw" className="object-contain" />
            )}

            {count > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label={t("prev")} className={`${arrow} start-2 sm:start-5`}>
                  <ChevronLeft aria-hidden="true" className="size-7" />
                </button>
                <button type="button" onClick={() => go(1)} aria-label={t("next")} className={`${arrow} end-2 sm:end-5`}>
                  <ChevronRight aria-hidden="true" className="size-7" />
                </button>
              </>
            )}
          </div>

          <div className="shrink-0 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-center sm:px-8">
            {item.category && <p className="text-xs font-bold tracking-widest text-gold-400">{item.category.name}</p>}
            <p className="mx-auto mt-1 max-w-3xl text-base leading-relaxed">{item.caption}</p>
            <p className="mt-1 text-xs text-sand-200/70 sm:hidden">{t("swipeHint")}</p>
          </div>
        </>
      )}
    </dialog>
  );
}
