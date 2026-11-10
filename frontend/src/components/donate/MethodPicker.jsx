"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import FieldError from "@/components/ui/FieldError";
import { paymentLogos } from "@/lib/payment-methods";

/**
 * Payment method as large radio cards (PAGES.md "/donate/[fund]" step 6, RESPONSIVE.md §15): bKash, or
 * "card & other" (SSLCommerz). Only the gateways in `site.payment_methods` are offered.
 * Works controlled (checkout: value + onChange) or with react-hook-form (donate form: inputProps = register()).
 * @param {object} props
 * @param {string[]} props.methods `site.payment_methods`
 * @param {string} props.name
 * @param {string | null} [props.error] translated
 * @param {string} [props.value]
 * @param {(value: string) => void} [props.onChange]
 * @param {object} [props.inputProps]
 */
export default function MethodPicker({ methods, name, error = null, value, onChange, inputProps }) {
  const t = useTranslations("donateForm");
  const tCommon = useTranslations("common");
  const errorId = `${name}-error`;
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-sm font-semibold text-em-950">
        {t("methodLegend")}
        <span aria-hidden="true" className="ms-0.5">
          *
        </span>
        <span className="sr-only"> ({tCommon("required")})</span>
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {methods.map((method, i) => {
          const logos = paymentLogos([method]).slice(0, 4);
          const controlled = onChange ? { checked: value === method, onChange: () => onChange(method) } : {};
          return (
            <label key={method} className="relative block cursor-pointer">
              <input
                type="radio"
                name={name}
                value={method}
                // The first radio carries the error state so "focus the first error" lands in this group.
                aria-invalid={error && i === 0 ? true : undefined}
                className="peer sr-only"
                {...controlled}
                {...inputProps}
              />
              <span className="flex h-full min-h-16 flex-col gap-2 rounded-lg border-2 border-sand-300 bg-white p-3 transition peer-checked:border-em-600 peer-checked:bg-em-50 peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-500 motion-reduce:transition-none">
                <span className="block font-bold text-em-900">{t(`method.${method}`)}</span>
                <span className="block text-sm text-em-900/70">{t(`methodHelp.${method}`)}</span>
                {/* Under the text, so the label keeps the full width on a 320px phone. */}
                <span className="flex flex-wrap gap-1">
                  {logos.map((logo) => (
                    // Third-party marks keep their own colours (DESIGN_SYSTEM.md); decorative next to the text.
                    <Image key={logo.key} src={logo.src} alt="" width={40} height={24} unoptimized className="h-6 w-10 rounded-lg object-contain" />
                  ))}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}
