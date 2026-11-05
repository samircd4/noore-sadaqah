"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Shared lifecycle for the modal <dialog>s (MobileMenu, VideoButton, Lightbox).
 *
 * body[data-overlay="open"] locks page scroll and hides the sticky donate bar (globals.css). Several dialogs can be
 * open or closing at once, so the flag follows a set of open dialogs: it is removed only when the last one closes,
 * and a dialog that was never opened never touches it.
 *
 * Leaving the page with a dialog open (back gesture, client navigation): Next either unmounts the page or keeps it
 * hidden for back/forward. An unmounted dialog never fires "close", and a hidden page's open modal would make the
 * next page inert, so on cleanup the hook closes the dialog and calls `onClose` as if the visitor had closed it.
 */

/** Dialogs currently open (module scope: shared by every component on the page). */
const openDialogs = new Set();

function syncOverlay() {
  if (openDialogs.size > 0) document.body.dataset.overlay = "open";
  else delete document.body.dataset.overlay;
}

/**
 * @param {() => void} [onClose] called after the dialog closes, however it closed (button, Esc, outside tap, leaving)
 * @returns {{ ref: import("react").RefObject<HTMLDialogElement | null>, open: () => void, close: () => void }}
 */
export function useModalDialog(onClose) {
  const ref = useRef(/** @type {HTMLDialogElement | null} */ (null));
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const open = useCallback(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    openDialogs.add(dialog);
    syncOverlay();
  }, []);

  const close = useCallback(() => ref.current?.close(), []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    const onDialogClose = () => {
      openDialogs.delete(dialog);
      syncOverlay();
      onCloseRef.current?.();
    };
    dialog.addEventListener("close", onDialogClose);
    return () => {
      dialog.removeEventListener("close", onDialogClose);
      if (!openDialogs.has(dialog)) return; // never opened, or already closed: leave the flag alone
      if (dialog.open) dialog.close();
      onDialogClose();
    };
  }, []);

  return { ref, open, close };
}
