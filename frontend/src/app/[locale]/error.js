"use client";

import { Home, RotateCcw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Error boundary for every page (PAGES.md "error.jsx"): a friendly message, "try again" and home.
 * Never shows the error message or stack trace (production also hides them; `digest` is only for the logs).
 * Phone: centered, buttons stacked (RESPONSIVE.md §15).
 * @param {{ error: Error & { digest?: string }, reset: () => void }} props
 */
export default function ErrorPage({ reset }) {
  const t = useTranslations("errorPage");
  return (
    <section role="alert" aria-labelledby="error-title" className="bg-sand-50 px-4 pt-32 pb-20 text-center sm:pt-40 sm:pb-28">
      <div className="mx-auto max-w-xl">
        <TriangleAlert aria-hidden="true" className="mx-auto size-16 text-gold-600" strokeWidth={1.5} />
        <h1 id="error-title" className="mt-4 font-head text-[1.75rem] leading-snug font-bold text-em-900 min-[360px]:text-3xl sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-em-900/80 sm:text-lg">{t("text")}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-7 py-3 font-bold text-em-950 transition hover:bg-gold-400 active:bg-gold-600 sm:w-auto motion-reduce:transition-none"
          >
            <RotateCcw aria-hidden="true" className="size-5" />
            {t("retry")}
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-em-800 px-7 py-3 font-semibold text-white transition hover:bg-em-700 sm:w-auto motion-reduce:transition-none"
          >
            <Home aria-hidden="true" className="size-5" />
            {t("home")}
          </Link>
        </div>
      </div>
    </section>
  );
}
