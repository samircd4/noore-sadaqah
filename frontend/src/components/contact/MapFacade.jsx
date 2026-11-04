"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";

/**
 * Tap-to-load map (RESPONSIVE.md §12, §15): nothing from Google loads until the visitor presses the button.
 * `src` is `contact.map_embed_url` from GET /site/ (set by an Admin).
 * @param {{ src: string, title: string, address: string, buttonLabel: string, note: string }} props
 */
export default function MapFacade({ src, title, address, buttonLabel, note }) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <iframe
        src={src}
        title={title}
        className="aspect-[4/3] w-full rounded-lg border border-sand-200 sm:aspect-[16/7]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    );
  }

  return (
    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-4 rounded-lg border border-em-100 bg-em-50 p-6 text-center sm:aspect-[16/7]">
      <MapPin aria-hidden="true" className="size-12 text-em-700" />
      {address && <p className="font-semibold text-em-900">{address}</p>}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-em-800 px-6 font-semibold text-white transition hover:bg-em-700 active:bg-em-900 motion-reduce:transition-none"
      >
        {buttonLabel}
      </button>
      <p className="text-sm text-em-900/70">{note}</p>
    </div>
  );
}
