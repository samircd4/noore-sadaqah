"use client";

import { useEffect } from "react";

/**
 * After a failed submit, moves focus to the first field with an error and scrolls it to the middle of the
 * screen, so the phone keyboard doesn't hide it (RESPONSIVE.md §7).
 * @param {import("react").RefObject<HTMLFormElement | null>} formRef
 * @param {unknown} state the useActionState result; runs each time it changes
 */
export function useFocusFirstError(formRef, state) {
  useEffect(() => {
    const field = formRef.current?.querySelector('[aria-invalid="true"]');
    if (field instanceof HTMLElement) {
      field.focus({ preventScroll: true });
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      field.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    }
  }, [formRef, state]);
}
