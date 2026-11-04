"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import FieldError from "@/components/ui/FieldError";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Link, useRouter } from "@/i18n/navigation";
import { MAX_AMOUNT, parseAmount } from "@/lib/validation/common";
import { quickDonateSchema } from "@/lib/validation/donation";
import AmountPicker from "./AmountPicker";

const DEFAULT_PRESETS = [100, 200, 500, 1000];
const DEFAULT_AMOUNT = 500;

/** sessionStorage key for the donation in progress; /donate/checkout (F3) reads it. */
export const DONATION_DRAFT_KEY = "noore:donation-draft";

/** Keeps the validated form for the checkout step. Storage can be blocked (private mode); checkout then asks again. */
function saveDraft(data, locale) {
  try {
    sessionStorage.setItem(
      DONATION_DRAFT_KEY,
      JSON.stringify({ ...data, kind: "one_time", source: "quick_donate", locale, saved_at: Date.now() }),
    );
  } catch {
    // Nothing to do: the checkout page handles a missing draft.
  }
}

/**
 * Gold quick-donate panel (HOME_PAGE.md §3 and fixes 3–6, 13; RESPONSIVE.md §14 row 3).
 * Validates fund, name, mobile and amount, keeps the draft in sessionStorage (never in the URL) and goes
 * to the checkout step.
 * @param {object} props
 * @param {Array<{ slug: string, title: string, preset_amounts: number[], min_amount: number }>} props.funds
 * @param {string} [props.className] positioning (in flow on phones, overlapping the hero from lg)
 */
export default function QuickDonate({ funds, className = "" }) {
  const t = useTranslations("quickDonate");
  const tAll = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  const schema = useMemo(() => quickDonateSchema(funds), [funds]);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fund: "", donor_name: "", donor_phone: "", amount: String(DEFAULT_AMOUNT) },
  });

  const [fundSlug, amountText] = useWatch({ control, name: ["fund", "amount"] });
  const fund = funds.find((f) => f.slug === fundSlug);
  const presets = fund?.preset_amounts?.length ? fund.preset_amounts : DEFAULT_PRESETS;
  const amount = parseAmount(amountText);

  /** Translates a field error; amount limits need their numbers. */
  const errorText = (field) => {
    const key = errors[field]?.message;
    if (!key) return null;
    if (key === "errors.minAmount") return tAll(key, { min: fund?.min_amount ?? 10 });
    if (key === "errors.maxAmount") return tAll(key, { max: MAX_AMOUNT });
    return tAll(key);
  };

  const onValid = (data) => {
    saveDraft(data, locale);
    router.push("/donate/checkout");
  };

  const amountError = errorText("amount");

  return (
    <section
      id="donate"
      aria-labelledby="quick-donate-title"
      data-hides-donate-bar=""
      className={`scroll-mt-20 sm:scroll-mt-24 ${className}`}
    >
      {/* Focus rings are gold by default; on this gold panel they must be dark to be visible. */}
      <div className="mx-auto max-w-6xl rounded-lg bg-gold-500 px-4 py-6 text-em-950 shadow-xl sm:px-8 sm:py-5 [&_:focus-visible]:outline-em-950">
        <h2 id="quick-donate-title" className="mb-5 text-center text-xl font-bold leading-snug sm:text-2xl lg:text-3xl">
          {t("heading")}
        </h2>

        <form onSubmit={handleSubmit(onValid)} noValidate className="mx-auto max-w-5xl">
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select
              id="qd-fund"
              label={t("fund")}
              required
              requiredLabel={tAll("common.required")}
              placeholder={t("fundPlaceholder")}
              options={funds.map((f) => ({ value: f.slug, label: f.title }))}
              error={errorText("fund")}
              {...register("fund")}
            />
            <Input
              id="qd-name"
              label={t("name")}
              required
              requiredLabel={tAll("common.required")}
              placeholder={t("namePlaceholder")}
              autoComplete="name"
              error={errorText("donor_name")}
              {...register("donor_name")}
            />
            <Input
              id="qd-mobile"
              label={t("mobile")}
              required
              requiredLabel={tAll("common.required")}
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder={t("mobilePlaceholder")}
              error={errorText("donor_phone")}
              {...register("donor_phone")}
            />
          </div>

          <fieldset>
            <legend className="sr-only">{t("amountLegend")}</legend>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
              <AmountPicker
                presets={presets}
                selected={amount}
                onSelect={(value) => setValue("amount", String(value), { shouldValidate: isSubmitted })}
                locale={locale}
                name="qd-preset"
                chipClassName="sm:min-w-[80px] sm:flex-1"
              />
              <span className="col-span-2 text-center text-lg sm:px-1">{t("or")}</span>
              <Input
                id="qd-amount"
                label={t("customAmount")}
                labelClassName="sr-only"
                prefix="৳"
                inputMode="numeric"
                autoComplete="off"
                placeholder={t("customAmountPlaceholder")}
                defaultValue={String(DEFAULT_AMOUNT)}
                className="col-span-2 sm:w-36"
                aria-invalid={amountError ? true : undefined}
                aria-describedby={amountError ? "qd-amount-error" : undefined}
                {...register("amount")}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="col-span-2 min-h-11 rounded-lg bg-em-700 px-6 font-bold text-white shadow-md transition hover:bg-em-500 disabled:opacity-60 motion-reduce:transition-none sm:py-2.5"
              >
                {t("submit")}
              </button>
            </div>
            <FieldError id="qd-amount-error" message={amountError} />
          </fieldset>
        </form>

        <p className="mt-5 text-center text-sm leading-6">
          {t("footnote")}{" "}
          <Link href="/donate" className="rounded-lg font-semibold underline underline-offset-2">
            {t("footnoteLink")}
          </Link>
        </p>
      </div>
    </section>
  );
}
