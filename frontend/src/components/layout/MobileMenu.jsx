"use client";

import { HandHeart, Menu, Phone, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Link } from "@/i18n/navigation";
import { DONATE_HREF, MAIN_NAV } from "@/lib/nav";
import LanguageSwitch from "./LanguageSwitch";

/**
 * Phone/tablet menu (HOME_PAGE.md fix 1, RESPONSIVE.md §8). Uses a modal <dialog>, which gives focus
 * trapping, Esc to close and an inert page behind it for free. Closes on outside tap and on link tap.
 * Open/close animation (slide from the right, backdrop fade, staggered links) is CSS only: globals.css "Drawer".
 * @param {{ phone?: string }} props contact phone shown at the bottom of the drawer
 */
export default function MobileMenu({ phone }) {
  const t = useTranslations("nav");
  const dialogRef = useRef(/** @type {HTMLDialogElement | null} */ (null));

  const open = () => {
    dialogRef.current?.showModal();
    document.body.dataset.overlay = "open";
  };
  const close = () => dialogRef.current?.close();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const onClose = () => delete document.body.dataset.overlay;
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={t("openMenu")}
        aria-haspopup="dialog"
        className="group grid size-11 place-items-center rounded-lg bg-white/15 text-white hover:bg-white/25 active:bg-white/30 lg:hidden"
      >
        <Menu aria-hidden="true" className="size-6 transition-transform motion-safe:group-active:scale-90" />
      </button>

      <dialog
        ref={dialogRef}
        aria-label={t("menuTitle")}
        data-drawer=""
        // Outside tap: the click lands on the dialog element itself (the backdrop area), not on its content.
        onClick={(event) => event.target === dialogRef.current && close()}
        className="m-0 ms-auto h-dvh max-h-none w-[85vw] max-w-xs flex-col bg-em-900 p-0 text-white backdrop:bg-em-950/60 open:flex"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <span className="font-head text-lg font-bold">{t("menuTitle")}</span>
          <button
            type="button"
            onClick={close}
            aria-label={t("closeMenu")}
            className="grid size-11 place-items-center rounded-lg bg-white/10 hover:bg-white/20"
          >
            <X aria-hidden="true" className="size-6" />
          </button>
        </div>

        <nav aria-label={t("mainNav")} className="flex-1 overflow-y-auto px-2 py-3">
          <ul>
            {MAIN_NAV.map((item, i) => (
              <li key={item.key} data-drawer-item="" style={{ "--i": i }}>
                <Link
                  href={item.href}
                  onClick={close}
                  className="flex min-h-12 items-center rounded-lg px-3 text-lg font-semibold hover:bg-white/10"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-4 border-t border-white/10 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <LanguageSwitch className="w-fit" onSwitch={close} />
          <Link
            href={DONATE_HREF}
            onClick={close}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-gold-500 font-bold text-em-950 hover:bg-gold-400"
          >
            <HandHeart aria-hidden="true" className="size-5" />
            {t("donate")}
          </Link>
          {phone && (
            <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="flex min-h-11 items-center gap-2 text-sand-200 hover:text-gold-400">
              <Phone aria-hidden="true" className="size-4" />
              <span dir="ltr">{phone}</span>
            </a>
          )}
        </div>
      </dialog>
    </>
  );
}
