"use client";

import { CircleCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import FieldError from "@/components/ui/FieldError";
import { subscribe } from "@/lib/actions/forms";

/**
 * Footer newsletter sign-up (HOME_PAGE.md fix 12): a real <form> posting to a server action.
 * Works without JavaScript too (progressive enhancement through the form action).
 */
export default function NewsletterForm() {
  const t = useTranslations("footer");
  const tErrors = useTranslations();
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(subscribe, null);

  if (state?.ok) {
    return (
      <p role="status" className="flex items-start gap-2 text-sm leading-6 text-sand-100">
        <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-gold-400" />
        {t("subscribed")}
      </p>
    );
  }

  const fieldError = state?.fieldErrors?.email;
  const message = fieldError ? tErrors(fieldError.key, fieldError.params) : state?.error ? tErrors(state.error) : null;

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="locale" value={locale} />
      <label htmlFor="newsletter-email" className="sr-only">
        {t("emailLabel")}
      </label>
      <div className="flex rounded-lg border border-white/10 bg-white/10 p-1">
        <input
          id="newsletter-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder={t("emailPlaceholder")}
          defaultValue={state?.ok === false ? state.values?.email : undefined}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? "newsletter-error" : undefined}
          className="h-11 min-w-0 flex-1 rounded-lg bg-transparent px-3 text-base text-white placeholder:text-sand-200/60"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 whitespace-nowrap rounded-lg bg-gold-500 px-4 text-sm font-bold text-em-950 transition hover:bg-gold-400 disabled:opacity-60"
        >
          {t("subscribe")}
        </button>
      </div>
      {/* On the dark footer the error text needs a light color. */}
      <div className="[&_p]:text-sand-100">
        <FieldError id="newsletter-error" message={message} />
      </div>
    </form>
  );
}
