import { HandHeart, Home, SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Button from "@/components/ui/Button";
import { bnDigits } from "@/lib/format";
import { currentLocale } from "@/lib/locale";
import { DONATE_HREF } from "@/lib/nav";

/**
 * 404 inside the site layout (PAGES.md "not-found.jsx"): friendly message, links to home and donate.
 * Shown for notFound() from a page (unknown program, post, campaign …) and, through [...rest], for any unknown
 * URL. Phone: centered, buttons stacked (RESPONSIVE.md §15). Next.js adds `noindex`.
 */
export default async function NotFound() {
  const [t, locale] = await Promise.all([getTranslations("notFoundPage"), currentLocale()]);
  return (
    <section aria-labelledby="not-found-title" className="bg-sand-50 px-4 pt-32 pb-20 text-center sm:pt-40 sm:pb-28">
      <div className="mx-auto max-w-xl">
        <SearchX aria-hidden="true" className="mx-auto size-16 text-em-700/70" strokeWidth={1.5} />
        <p aria-hidden="true" className="mt-4 font-head text-6xl font-extrabold text-gold-600">
          {bnDigits(404, locale)}
        </p>
        <h1 id="not-found-title" className="mt-3 font-head text-[1.75rem] leading-snug font-bold text-em-900 min-[22.5rem]:text-3xl sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-em-900/80 sm:text-lg">{t("text")}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button href="/" variant="dark" blockOnPhone>
            <Home aria-hidden="true" className="size-5" />
            {t("home")}
          </Button>
          <Button href={DONATE_HREF} blockOnPhone>
            <HandHeart aria-hidden="true" className="size-5" />
            {t("donate")}
          </Button>
        </div>
      </div>
    </section>
  );
}
