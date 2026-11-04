import { Mail, MapPin, Phone, Play } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { bnDigits } from "@/lib/format";
import { DONATE_HREF } from "@/lib/nav";
import { currentYear } from "@/lib/time";
import Logo from "./Logo";
import NewsletterForm from "./NewsletterForm";

/** What each online method covers, as printed in the design's footer (CONTENT.md §5: show only live methods). */
const METHOD_LABELS = {
  bkash: "bKash",
  sslcommerz: "Nagad · Rocket · Visa · Mastercard",
};

/**
 * Site footer (HOME_PAGE.md §12). Phone: one column, with the two link lists side by side (RESPONSIVE.md §14).
 * @param {{ site: any, locale: "bn" | "en" }} props `site` is GET /site/
 */
export default async function Footer({ site, locale }) {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const year = await currentYear();
  const { contact, social } = site;
  const image = site.home_images?.footer;

  const socialLinks = [
    { key: "facebook", href: social.facebook, icon: <span className="font-bold">f</span> },
    { key: "youtube", href: social.youtube, icon: <Play aria-hidden="true" className="size-4 fill-current" /> },
    { key: "instagram", href: social.instagram, icon: <span className="text-sm font-bold">ig</span> },
    { key: "linkedin", href: social.linkedin, icon: <span className="text-sm font-bold">in</span> },
  ].filter((s) => s.href);

  const linkClass = "inline-flex min-h-11 items-center rounded-lg hover:text-gold-400";

  return (
    <footer data-hides-donate-bar="" className="relative isolate overflow-hidden border-t border-em-600 text-sand-200/85">
      {image && <Image src={image.url} alt="" fill sizes="100vw" className="-z-20 object-cover" />}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-(image:--overlay-footer)" />

      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-8 px-4 pt-10 pb-12 lg:grid-cols-3 xl:grid-cols-[1.25fr_1fr_1fr_1.2fr_1.3fr] xl:gap-x-6">
        <div className="col-span-2 lg:col-span-1">
          <Link href="/" aria-label={tNav("homeLink")} className="inline-block rounded-lg">
            <Logo />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">{t("tagline")}</p>
          {socialLinks.length > 0 && (
            <ul aria-label={t("social")} className="mt-4 flex gap-3">
              {socialLinks.map((s) => (
                <li key={s.key}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t(s.key)}
                    className="grid size-11 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-gold-500 hover:text-em-950"
                  >
                    {s.icon}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="mb-2 font-bold text-white">{t("links")}</h2>
          <ul className="text-sm">
            <li><Link href="/about" className={linkClass}>{tNav("about")}</Link></li>
            <li><Link href="/programs" className={linkClass}>{tNav("programs")}</Link></li>
            <li><Link href="/gallery" className={linkClass}>{tNav("gallery")}</Link></li>
            <li><Link href="/news" className={linkClass}>{tNav("news")}</Link></li>
            <li><Link href="/transparency" className={linkClass}>{tNav("transparency")}</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 font-bold text-white">{t("support")}</h2>
          <ul className="text-sm">
            <li><Link href={DONATE_HREF} className={linkClass}>{tNav("donate")}</Link></li>
            <li><Link href="/programs" className={linkClass}>{t("initiatives")}</Link></li>
            <li><Link href="/news" className={linkClass}>{t("stories")}</Link></li>
            <li><Link href={{ pathname: "/get-involved", query: { tab: "volunteer" } }} className={linkClass}>{t("beVolunteer")}</Link></li>
          </ul>
        </div>

        <div className="col-span-2 lg:col-span-1">
          <h2 className="mb-2 font-bold text-white">{t("contact")}</h2>
          <ul className="space-y-1 text-sm">
            {contact.address && (
              <li className="flex min-h-11 items-center gap-2">
                <MapPin aria-hidden="true" className="size-4 shrink-0 text-gold-400" />
                <span className="sr-only">{t("address")}: </span>
                {contact.address}
              </li>
            )}
            {contact.phone && (
              <li>
                <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} className={`${linkClass} gap-2`}>
                  <Phone aria-hidden="true" className="size-4 shrink-0 text-gold-400" />
                  <span className="sr-only">{t("phone")}: </span>
                  <span dir="ltr">{contact.phone}</span>
                </a>
              </li>
            )}
            {contact.email && (
              <li>
                <a href={`mailto:${contact.email}`} className={`${linkClass} gap-2 break-all`}>
                  <Mail aria-hidden="true" className="size-4 shrink-0 text-gold-400" />
                  <span className="sr-only">{t("email")}: </span>
                  {contact.email}
                </a>
              </li>
            )}
          </ul>
        </div>

        <div className="col-span-2 lg:col-span-1">
          <h2 className="mb-3 font-bold text-white">{t("updates")}</h2>
          <NewsletterForm />
          {site.payment_methods?.length > 0 && (
            <p className="mt-4 text-xs leading-6 text-sand-200/70">
              <span className="sr-only">{t("paymentMethods")}: </span>
              <span lang="en">{site.payment_methods.map((m) => METHOD_LABELS[m]).filter(Boolean).join(" · ")}</span>
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-x-6 gap-y-2 px-4 py-5 text-xs leading-6 text-sand-200/70">
          <p>
            {t("copyright", { year: bnDigits(year, locale) })}
          </p>
          {/* POLICIES.md: all three policies are linked from the footer (payment gateways check for them). */}
          <nav aria-label={t("legal")}>
            <ul className="flex flex-wrap gap-x-4">
              <li><Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-gold-400">{t("privacy")}</Link></li>
              <li><Link href="/terms" className="inline-flex min-h-11 items-center hover:text-gold-400">{t("terms")}</Link></li>
              <li><Link href="/refund-policy" className="inline-flex min-h-11 items-center hover:text-gold-400">{t("refund")}</Link></li>
            </ul>
          </nav>
          <p>{t("photoCredit")}</p>
        </div>
      </div>
    </footer>
  );
}
