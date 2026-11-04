"use client";

import { CircleCheck, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useRef, useState } from "react";
import FieldError from "@/components/ui/FieldError";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { sendContactMessage } from "@/lib/actions/forms";
import { useFocusFirstError } from "./useFocusFirstError";

/**
 * Contact form on /contact (PAGES.md): name, phone or email, subject, message → POST /contact/ (rate-limited).
 * A real <form> with a server action, so it also works before JavaScript loads. One column, 44px fields,
 * full-width submit on phones (RESPONSIVE.md §7).
 */
export default function ContactForm() {
  const t = useTranslations("contactPage");
  const tAll = useTranslations();
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const formRef = useRef(/** @type {HTMLFormElement | null} */ (null));
  const [state, formAction, pending] = useActionState(sendContactMessage, null);
  // "Send another" hides this success; a new submission returns a new state object, so its success shows again.
  const [dismissed, setDismissed] = useState(/** @type {unknown} */ (null));
  useFocusFirstError(formRef, state);

  if (state?.ok && dismissed !== state) {
    return (
      <div role="status" className="rounded-lg border border-em-100 bg-em-50 p-6 text-center">
        <CircleCheck aria-hidden="true" className="mx-auto size-12 text-em-600" />
        <p className="mt-3 text-lg font-semibold text-em-900">{t("sent")}</p>
        <button
          type="button"
          onClick={() => setDismissed(state)}
          className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-em-700 px-5 font-semibold text-em-700 hover:bg-em-700 hover:text-white"
        >
          {t("sendAnother")}
        </button>
      </div>
    );
  }

  const values = state?.ok === false ? (state.values ?? {}) : {};
  const err = (name) => {
    const e = state?.fieldErrors?.[name];
    return e ? tAll(e.key, e.params) : null;
  };
  const common = { required: true, requiredLabel: tCommon("required") };

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <Input id="contact-name" name="name" label={t("name")} autoComplete="name" maxLength={120} defaultValue={values.name} error={err("name")} {...common} />
      <Input
        id="contact-contact"
        name="contact"
        label={t("contact")}
        placeholder={t("contactPlaceholder")}
        autoComplete="email"
        maxLength={120}
        defaultValue={values.contact}
        error={err("contact")}
        {...common}
      />
      <Input id="contact-subject" name="subject" label={t("subject")} maxLength={150} defaultValue={values.subject} error={err("subject")} {...common} />
      <Textarea
        id="contact-message"
        name="message"
        label={t("message")}
        placeholder={t("messagePlaceholder")}
        maxLength={2000}
        rows={6}
        defaultValue={values.message}
        error={err("message")}
        {...common}
      />

      {state?.error && <FieldError id="contact-form-error" message={tAll(state.error)} />}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-7 py-3 font-bold text-em-950 transition hover:bg-gold-400 active:bg-gold-600 disabled:opacity-60 sm:w-auto motion-reduce:transition-none"
      >
        <Send aria-hidden="true" className="size-5" />
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
