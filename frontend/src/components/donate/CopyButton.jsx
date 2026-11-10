"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/**
 * 44px button that copies a bank account or merchant number (PAGES.md "/donate", RESPONSIVE.md §15).
 * @param {{ value: string, label: string, copiedLabel: string }} props label: accessible name ("… কপি করুন")
 */
export default function CopyButton({ value, label, copiedLabel }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: the number is on screen to copy by hand.
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? copiedLabel : label}
      className="grid size-11 shrink-0 place-items-center rounded-lg border border-sand-300 bg-white text-em-800 transition hover:border-em-500 hover:text-em-600 active:bg-em-50 motion-reduce:transition-none"
    >
      {copied ? <Check aria-hidden="true" className="size-5 text-em-600" /> : <Copy aria-hidden="true" className="size-5" />}
      <span aria-live="polite" className="sr-only">
        {copied ? copiedLabel : ""}
      </span>
    </button>
  );
}
