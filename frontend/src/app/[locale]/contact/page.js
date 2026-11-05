import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import MapFacade from "@/components/contact/MapFacade";
import ContactForm from "@/components/forms/ContactForm";
import PageHero from "@/components/layout/PageHero";
import Accordion from "@/components/ui/Accordion";
import { apiGet } from "@/lib/api";
import { currentLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";
import { telDigits, whatsappDigits } from "@/lib/phone";

/**
 * /contact (PAGES.md): contact details and the form (→ POST /contact/), then a tap-to-load map and the FAQ.
 * Phone: details first, then the form (RESPONSIVE.md §15); from lg the form is on the left.
 * Data: GET /site/ (contact, social, contact_faq).
 */

export async function generateMetadata() {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations("contactPage")]);
  return pageMetadata({ path: "/contact", locale, title: t("title"), description: t("metaDescription") });
}

export default async function ContactPage() {
  const locale = await currentLocale();
  const [t, tFooter, site] = await Promise.all([
    getTranslations("contactPage"),
    getTranslations("footer"),
    apiGet("/site/", { locale, tags: ["site"] }),
  ]);
  const c = site.contact;
  const phone = telDigits(c.phone);
  const whatsapp = whatsappDigits(c.whatsapp);
  const social = ["facebook", "youtube", "instagram", "linkedin"].filter((k) => site.social?.[k]);

  const rowLink = "max-w-full font-semibold wrap-anywhere text-em-700 underline-offset-4 hover:text-em-500 hover:underline";
  const details = [
    c.address && { Icon: MapPin, label: t("address"), value: <span>{c.address}</span> },
    c.phone && {
      Icon: Phone,
      label: t("phone"),
      value: phone ? (
        <a href={`tel:${phone}`} className={`inline-flex min-h-11 items-center ${rowLink}`} dir="ltr">
          {c.phone}
        </a>
      ) : (
        <span dir="ltr">{c.phone}</span>
      ),
    },
    whatsapp && {
      Icon: MessageCircle,
      label: t("whatsapp"),
      value: (
        <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center ${rowLink}`} dir="ltr">
          {c.whatsapp}
        </a>
      ),
    },
    c.email && {
      Icon: Mail,
      label: t("email"),
      value: (
        <a href={`mailto:${c.email}`} className={`inline-flex min-h-11 items-center ${rowLink}`}>
          {c.email}
        </a>
      ),
    },
    c.hours && { Icon: Clock, label: t("hours"), value: <span>{c.hours}</span> },
  ].filter(Boolean);

  return (
    <>
      <PageHero title={t("title")} eyebrow={t("eyebrow")} subtitle={t("subtitle")} breadcrumb={[{ label: t("title") }]} />

      <div className="bg-sand-50 py-12 sm:py-14 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-12 lg:gap-12">
          <section aria-labelledby="contact-info" className="min-w-0 lg:order-last lg:col-span-5">
            <div className="rounded-lg bg-em-900 p-5 text-white shadow-card sm:p-8">
              <h2 id="contact-info" className="font-head text-2xl font-bold">
                {t("infoTitle")}
              </h2>
              <dl className="mt-6 space-y-5">
                {details.map(({ Icon, label, value }) => (
                  <div key={label} className="flex gap-4">
                    <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-lg bg-white/10 text-gold-400">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-sm text-sand-200">{label}</dt>
                      <dd className="text-base leading-relaxed text-white [&_a]:text-gold-400 [&_a:hover]:text-white">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>

              {social.length > 0 && (
                <div className="mt-8 border-t border-white/10 pt-6">
                  <h3 className="text-sm font-semibold text-sand-200">{t("social")}</h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {social.map((key) => (
                      <li key={key}>
                        <a
                          href={site.social[key]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center rounded-lg border border-white/25 px-4 text-sm font-semibold hover:border-gold-400 hover:text-gold-400"
                        >
                          {tFooter(key)}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="contact-form" className="min-w-0 rounded-lg border border-sand-200 bg-white p-5 sm:p-8 lg:col-span-7">
            <h2 id="contact-form" className="mb-6 font-head text-2xl font-bold text-em-900">
              {t("formTitle")}
            </h2>
            <ContactForm />
          </section>
        </div>
      </div>

      {c.map_embed_url && (
        <section aria-labelledby="contact-map" className="bg-sand-100 py-12 sm:py-14">
          <div className="mx-auto max-w-7xl px-4">
            <h2 id="contact-map" className="mb-6 font-head text-2xl font-bold text-em-900 sm:text-3xl">
              {t("mapTitle")}
            </h2>
            <MapFacade src={c.map_embed_url} title={t("mapTitle")} address={c.address} buttonLabel={t("mapShow")} note={t("mapNote")} />
          </div>
        </section>
      )}

      {site.contact_faq?.length > 0 && (
        <section aria-labelledby="contact-faq" className="bg-sand-50 py-12 sm:py-14 lg:py-20">
          <div className="mx-auto max-w-3xl px-4">
            <h2 id="contact-faq" className="font-head text-2xl leading-snug font-bold text-em-900 sm:text-3xl">
              {t("faqTitle")}
            </h2>
            <div className="mt-6">
              <Accordion items={site.contact_faq} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
