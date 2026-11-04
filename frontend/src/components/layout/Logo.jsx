import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import BrandName from "./BrandName";

/**
 * The foundation's logo and name (DESIGN_SYSTEM.md "Logo"). The name follows the page language and both of its
 * lines have the same width (BrandName). The block is the same height in Bengali and English, and never wraps.
 * The image is decorative here: the surrounding link carries the accessible name.
 */
export default async function Logo() {
  const [t, locale] = await Promise.all([getTranslations("brand"), getLocale()]);

  return (
    <span className="flex items-center gap-2.5 sm:gap-3">
      <span className="relative size-11 shrink-0 overflow-hidden rounded-full bg-white shadow-sm ring-2 ring-white/70 sm:size-14">
        <Image src="/brand/logo-256.png" alt="" fill sizes="(min-width: 640px) 56px, 44px" className="object-contain" />
      </span>
      <BrandName line1={t("line1")} line2={t("line2")} locale={locale === "en" ? "en" : "bn"} />
    </span>
  );
}
