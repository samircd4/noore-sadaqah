"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import FieldError from "@/components/ui/FieldError";
import Input from "@/components/ui/Input";
import { Link, useRouter } from "@/i18n/navigation";
import { loadDraft, saveDraft } from "@/lib/donation-draft";
import { taka } from "@/lib/format";
import { MAX_AMOUNT, parseAmount } from "@/lib/validation/common";
import { donationSchema } from "@/lib/validation/donation";
import AmountPicker from "./AmountPicker";
import MethodPicker from "./MethodPicker";

/** A slug from the URL (?campaign=), or "". */
const slugParam = (value) => (value && /^[a-z0-9-]{1,80}$/.test(value) ? value : "");

/**
 * The donate form on /donate/[fund] (PAGES.md steps 1–8, RESPONSIVE.md §7 and §15). Validates with the same Zod
 * schema as the server action, keeps the donation in sessionStorage (never in the URL) and goes to checkout.
 * Reads ?amount= and ?campaign= from the URL; a saved draft for this fund (coming back from checkout or the failed
 * page) fills the form again, and an ?amount= in the URL wins over the draft's amount.
 *
 * Monthly giving needs donor login, which arrives in phase F4; until then ?monthly=1 shows a note and the gift is
 * one-time.
 * @param {object} props
 * @param {{ slug: string, title: string, preset_amounts: number[], min_amount: number, allow_recurring: boolean }} props.fund
 * @param {string[]} props.methods `site.payment_methods`
 */
export default function DonateForm({ fund, methods }) {
  const t = useTranslations("donateForm");
  const tAll = useTranslations();
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlAmount = parseAmount(searchParams.get("amount"));
  const campaign = slugParam(searchParams.get("campaign"));
  const wantsMonthly = searchParams.get("monthly") === "1" && fund.allow_recurring;
  const presets = fund.preset_amounts.length > 0 ? fund.preset_amounts : [100, 200, 500, 1000];
  const startAmount = urlAmount && urlAmount > 0 ? urlAmount : (presets[Math.floor(presets.length / 2)] ?? fund.min_amount);

  // Unticking "on someone's behalf" hides those fields but react-hook-form keeps their values: blank them before
  // validating, so a hidden field never blocks the form and never reaches the draft.
  const resolver = useMemo(() => {
    const zod = zodResolver(donationSchema([fund]));
    return (values, context, options) =>
      zod(values.on_behalf ? values : { ...values, on_behalf_of: "", on_behalf_permission: false }, context, options);
  }, [fund]);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm({
    resolver,
    defaultValues: {
      fund: fund.slug,
      campaign,
      amount: String(startAmount),
      kind: "one_time",
      donor_name: "",
      donor_phone: "",
      donor_email: "",
      on_behalf: false,
      on_behalf_of: "",
      on_behalf_permission: false,
      is_anonymous: false,
      method: methods.length === 1 ? methods[0] : "",
      locale,
    },
  });

  // Fill the form again from a draft for this fund (after "পরিবর্তন করুন" or "আবার চেষ্টা করুন").
  useEffect(() => {
    const draft = loadDraft();
    if (!draft || draft.fund !== fund.slug) return;
    reset((current) => ({
      ...current,
      campaign: campaign || draft.campaign || "",
      amount: String(urlAmount && urlAmount > 0 ? urlAmount : draft.amount),
      donor_name: draft.donor_name ?? "",
      donor_phone: draft.donor_phone ?? "",
      donor_email: draft.donor_email ?? "",
      on_behalf: Boolean(draft.on_behalf_of),
      on_behalf_of: draft.on_behalf_of ?? "",
      on_behalf_permission: Boolean(draft.on_behalf_permission),
      is_anonymous: Boolean(draft.is_anonymous),
      method: draft.method && methods.includes(draft.method) ? draft.method : current.method,
    }));
    // Only once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [amountText, onBehalf] = useWatch({ control, name: ["amount", "on_behalf"] });
  const amount = parseAmount(amountText);

  /** Translates a field error; amount limits need their numbers. */
  const errorText = (field) => {
    const key = errors[field]?.message;
    if (!key) return null;
    if (key === "errors.minAmount") return tAll(key, { min: fund.min_amount });
    if (key === "errors.maxAmount") return tAll(key, { max: MAX_AMOUNT });
    return tAll(key);
  };

  const onValid = (data) => {
    // `on_behalf` is only the checkbox that shows the field; the schema drops it.
    const { locale: _locale, ...donation } = data;
    saveDraft({
      ...donation,
      source: "donate_form",
      locale,
    });
    router.push("/donate/checkout");
  };

  const amountError = errorText("amount");
  const checkRow =
    "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-sand-300 bg-white px-3 py-2.5 has-[:checked]:border-em-500 has-[:checked]:bg-em-50";
  const checkbox = "mt-1 size-5 shrink-0 accent-em-700";

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-6">
      {wantsMonthly && (
        <p className="flex gap-3 rounded-lg border border-gold-500 bg-sand-100 p-4 text-base leading-relaxed text-em-950">
          <Info aria-hidden="true" className="mt-1 size-5 shrink-0" />
          <span>{t("monthlySoon")}</span>
        </p>
      )}
      {campaign && <p className="text-sm font-semibold text-em-700">{t("campaignNote")}</p>}
      <FieldError id="donate-campaign-error" message={errorText("campaign")} />

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-em-950">
          {t("amountLegend")}
          <span aria-hidden="true" className="ms-0.5">
            *
          </span>
          <span className="sr-only"> ({tCommon("required")})</span>
        </legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AmountPicker
            presets={presets}
            selected={amount}
            onSelect={(value) => setValue("amount", String(value), { shouldValidate: isSubmitted })}
            locale={locale}
            name="donate-preset"
          />
        </div>
        <Input
          id="donate-amount"
          label={t("customAmount")}
          prefix="৳"
          inputMode="numeric"
          pattern="[0-9০-৯]*"
          autoComplete="off"
          placeholder={t("customAmountPlaceholder")}
          className="mt-4"
          aria-invalid={amountError ? true : undefined}
          aria-describedby={amountError ? "donate-amount-error" : "donate-amount-hint"}
          {...register("amount")}
        />
        {!amountError && (
          <p id="donate-amount-hint" className="mt-1.5 text-sm text-em-900/70">
            {t("minHint", { min: taka(fund.min_amount, locale) })}
          </p>
        )}
        <FieldError id="donate-amount-error" message={amountError} />
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          id="donate-name"
          label={t("name")}
          required
          requiredLabel={tCommon("required")}
          autoComplete="name"
          maxLength={120}
          placeholder={t("namePlaceholder")}
          error={errorText("donor_name")}
          {...register("donor_name")}
        />
        <Input
          id="donate-mobile"
          label={t("mobile")}
          required
          requiredLabel={tCommon("required")}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={t("mobilePlaceholder")}
          error={errorText("donor_phone")}
          {...register("donor_phone")}
        />
        <div className="sm:col-span-2">
          <Input
            id="donate-email"
            label={`${t("email")} (${t("optional")})`}
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            placeholder={t("emailPlaceholder")}
            error={errorText("donor_email")}
            aria-describedby={errors.donor_email ? "donate-email-error" : "donate-email-hint"}
            {...register("donor_email")}
          />
          {!errors.donor_email && (
            <p id="donate-email-hint" className="mt-1.5 text-sm text-em-900/70">
              {t("emailHelp")}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <label className={checkRow}>
          <input type="checkbox" className={checkbox} {...register("on_behalf")} />
          <span className="text-base text-em-950">{t("onBehalf")}</span>
        </label>
        {onBehalf && (
          <div className="space-y-3 rounded-lg border border-sand-200 bg-sand-50 p-4">
            <Input
              id="donate-on-behalf"
              label={t("onBehalfName")}
              autoComplete="off"
              maxLength={120}
              placeholder={t("onBehalfNamePlaceholder")}
              error={errorText("on_behalf_of")}
              {...register("on_behalf_of")}
            />
            <div>
              <label className={checkRow}>
                <input
                  type="checkbox"
                  className={checkbox}
                  aria-invalid={errors.on_behalf_permission ? true : undefined}
                  aria-describedby={errors.on_behalf_permission ? "donate-permission-error" : undefined}
                  {...register("on_behalf_permission")}
                />
                <span className="text-base text-em-950">{t("onBehalfPermission")}</span>
              </label>
              <FieldError id="donate-permission-error" message={errorText("on_behalf_permission")} />
            </div>
          </div>
        )}
        <label className={checkRow}>
          <input type="checkbox" className={checkbox} {...register("is_anonymous")} />
          <span className="min-w-0">
            <span className="block text-base text-em-950">{t("anonymous")}</span>
            <span className="block text-sm text-em-900/70">{t("anonymousHelp")}</span>
          </span>
        </label>
      </div>

      <MethodPicker methods={methods} name="method" error={errorText("method")} inputProps={register("method")} />

      <p className="text-sm leading-relaxed text-em-900/80">
        {t.rich("consent", {
          terms: (chunks) => (
            <Link href="/terms" className="font-semibold text-em-700 underline underline-offset-2">
              {chunks}
            </Link>
          ),
          refund: (chunks) => (
            <Link href="/refund-policy" className="font-semibold text-em-700 underline underline-offset-2">
              {chunks}
            </Link>
          ),
        })}
      </p>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-8 py-3 text-lg font-bold text-em-950 shadow-md transition hover:bg-gold-400 active:bg-gold-600 disabled:opacity-60 motion-reduce:transition-none sm:w-auto"
      >
        {t("submit")}
        <ArrowRight aria-hidden="true" className="size-5" />
      </button>
    </form>
  );
}
