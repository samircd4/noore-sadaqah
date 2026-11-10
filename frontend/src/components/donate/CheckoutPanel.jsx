"use client";

import { HandCoins, Lock, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import FieldError from "@/components/ui/FieldError";
import { createDonation } from "@/lib/actions/donate";
import { saveDraft, useDonationDraft } from "@/lib/donation-draft";
import { bnDigits, taka } from "@/lib/format";
import { fundDonateHref } from "@/lib/nav";
import MethodPicker from "./MethodPicker";

/**
 * /donate/checkout (PAGES.md): summary of the draft from sessionStorage and "পেমেন্ট করুন", which calls the
 * createDonation server action; on success the action redirects to the gateway. The quick-donate draft has no
 * payment method yet, so it is asked here. Loading state and a guard prevent a double submit (QA §3).
 * If Django refuses the campaign (ended, or not this fund's), the campaign is dropped from the draft so the next
 * "পেমেন্ট করুন" gives to the fund itself instead of failing again.
 * Phone: summary full width, buttons stacked with "পেমেন্ট করুন" on top (RESPONSIVE.md §15).
 * @param {object} props
 * @param {Record<string, string>} props.fundTitles slug → title, from GET /funds/
 * @param {string[]} props.methods `site.payment_methods`
 * @param {"bn" | "en"} props.locale
 */
export default function CheckoutPanel({ fundTitles, methods, locale }) {
  const t = useTranslations("checkout");
  const tForm = useTranslations("donateForm");
  const tAll = useTranslations();
  // undefined on the server (loading state); the draft or null in the browser.
  const draft = useDonationDraft();
  const [method, setMethod] = useState(/** @type {string} */ (""));
  const [result, setResult] = useState(/** @type {{ fieldErrors?: Record<string, { key: string, params: object }>, error?: string } | null} */ (null));
  const [pending, startTransition] = useTransition();
  const sending = useRef(false);
  const [campaignDropped, setCampaignDropped] = useState(false);

  // Back from the gateway page, the browser may restore this page from its cache with the button still "paying"
  // (the redirect never returned): load it fresh instead.
  useEffect(() => {
    const onPageShow = (event) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  if (draft === undefined) {
    return <p className="py-12 text-center text-em-900/70">{tAll("common.loading")}</p>;
  }
  if (draft === null || !fundTitles[draft.fund]) {
    return <EmptyState text={t("empty")} icon={HandCoins} action={{ href: "/donate", label: t("startAgain") }} />;
  }

  const draftMethod = draft.method && methods.includes(draft.method) ? draft.method : "";
  const chosenMethod = draftMethod || method;
  const changeHref = fundDonateHref(draft.fund, { campaign: draft.campaign || undefined });

  const pay = () => {
    if (sending.current) return;
    if (!chosenMethod) {
      setResult({ fieldErrors: { method: { key: "errors.required", params: {} } } });
      return;
    }
    sending.current = true;
    setResult(null);
    startTransition(async () => {
      const { saved_at: _s, source: _source, ...body } = draft;
      // Remember the method, so "আবার চেষ্টা করুন" after a failed payment keeps it.
      if (!draftMethod) saveDraft({ ...body, source: draft.source, method: chosenMethod });
      const response = await createDonation({ ...body, method: chosenMethod, locale });
      // Only failures come back; on success the browser is already on its way to the gateway.
      if (response) {
        if (response.fieldErrors?.campaign && body.campaign) {
          const { campaign: _campaign, ...withoutCampaign } = body;
          saveDraft({ ...withoutCampaign, source: draft.source, method: chosenMethod });
          setCampaignDropped(true);
        }
        setResult(response);
        sending.current = false;
      }
    });
  };

  const rows = [
    { label: t("fund"), value: fundTitles[draft.fund] },
    { label: t("amount"), value: taka(draft.amount, locale), strong: true },
    { label: t("type"), value: draft.kind === "monthly" ? t("monthly") : t("oneTime") },
    { label: t("name"), value: draft.donor_name },
    { label: t("mobile"), value: bnDigits(draft.donor_phone, locale) },
    draft.donor_email ? { label: t("email"), value: draft.donor_email } : null,
    draft.on_behalf_of ? { label: t("onBehalf"), value: draft.on_behalf_of } : null,
    draft.is_anonymous ? { label: t("anonymous"), value: t("anonymousYes") } : null,
    draftMethod ? { label: t("method"), value: tForm(`method.${draftMethod}`) } : null,
  ].filter(Boolean);

  const fieldErrors = Object.entries(result?.fieldErrors ?? {}).filter(([field]) => field !== "method" || draftMethod);
  const methodError = !draftMethod && result?.fieldErrors?.method ? tAll(result.fieldErrors.method.key, result.fieldErrors.method.params) : null;

  return (
    <div className="space-y-6">
      <section aria-labelledby="checkout-summary" className="rounded-lg border border-sand-200 bg-white p-5 shadow-card sm:p-6">
        <h2 id="checkout-summary" className="font-head text-xl font-bold text-em-900">
          {t("summaryTitle")}
        </h2>
        <dl className="mt-4 divide-y divide-sand-200">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
              <dt className="text-sm font-semibold text-em-900/70">{row.label}</dt>
              <dd className={`min-w-0 break-words text-end ${row.strong ? "text-xl font-bold text-em-900" : "text-base text-em-950"}`}>{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {!draftMethod && <MethodPicker methods={methods} name="checkout-method" value={method} onChange={setMethod} error={methodError} />}

      {(fieldErrors.length > 0 || result?.error) && (
        <div role="alert" className="rounded-lg border border-gold-500 bg-sand-100 p-4">
          {result?.error && <FieldError id="checkout-error" message={tAll(result.error)} />}
          {fieldErrors.length > 0 && (
            <>
              {/* Only the campaign was refused: it is already dropped, so "পেমেন্ট করুন" again is the fix. */}
              {!(campaignDropped && fieldErrors.every(([field]) => field === "campaign")) && (
                <p className="font-semibold text-em-950">{t("fixFields")}</p>
              )}
              <ul className="mt-1">
                {fieldErrors.map(([field, e]) => (
                  <li key={field}>
                    <FieldError id={`checkout-${field}-error`} message={tAll(e.key, e.params)} />
                  </li>
                ))}
              </ul>
              {campaignDropped && <p className="mt-2 text-base text-em-950">{t("campaignDropped")}</p>}
            </>
          )}
        </div>
      )}

      <p className="flex gap-2 text-sm leading-relaxed text-em-900/80">
        <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-em-700" />
        <span>{t("secureNote")}</span>
      </p>

      {/* Pay first in the DOM so it is on top on phones; to the right of "change" from sm. */}
      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
        <Button variant="gold" size="cta" blockOnPhone className="shadow-md" onClick={pay} disabled={pending} aria-busy={pending || undefined}>
          <Lock aria-hidden="true" className="size-5" />
          {pending ? t("paying") : t("pay")}
        </Button>
        <Button
          href={changeHref}
          variant="outline"
          size="cta"
          blockOnPhone
          aria-disabled={pending || undefined}
          className={pending ? "pointer-events-none opacity-60" : ""}
        >
          <Pencil aria-hidden="true" className="size-4" />
          {t("change")}
        </Button>
      </div>
    </div>
  );
}
