import { HandHeart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Button from "@/components/ui/Button";
import { fundDonateHref } from "@/lib/nav";

/**
 * Gold band that ends most content pages (PAGES.md "DonateCta"): one line of text and a dark button.
 * Text on gold is em-950 (CLAUDE.md rule 5); focus rings on gold are em-950 (DESIGN_SYSTEM.md "Interaction").
 * @param {object} props
 * @param {string} [props.text] defaults to the generic line in messages "donateCta.text"
 * @param {string | null} [props.fundSlug] the fund the button donates to (falls back to the general donate link)
 */
export default async function DonateCta({ text, fundSlug = null }) {
  const t = await getTranslations("donateCta");
  return (
    <section className="bg-gold-500 text-em-950 [&_:focus-visible]:outline-em-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:flex-row sm:items-center sm:justify-between lg:py-12">
        <p className="min-w-0 font-head text-xl leading-snug font-bold sm:text-2xl">{text ?? t("text")}</p>
        <Button href={fundDonateHref(fundSlug)} variant="dark" blockOnPhone className="shrink-0">
          <HandHeart aria-hidden="true" className="size-5" />
          {t("button")}
        </Button>
      </div>
    </section>
  );
}
