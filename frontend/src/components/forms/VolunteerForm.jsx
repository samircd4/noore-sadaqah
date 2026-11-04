"use client";

import { CircleCheck, UserPlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useMemo, useRef } from "react";
import FieldError from "@/components/ui/FieldError";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { registerVolunteer } from "@/lib/actions/forms";
import { districtOptions } from "@/lib/districts";
import { useFocusFirstError } from "./useFocusFirstError";

/**
 * Volunteer sign-up on /get-involved (PAGES.md): name, phone, email (optional), district (native select of the
 * 64 districts), skills, availability → POST /volunteers/. One column on phones, two from sm (RESPONSIVE.md §7, §15).
 */
export default function VolunteerForm() {
  const t = useTranslations("getInvolvedPage");
  const tAll = useTranslations();
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const formRef = useRef(/** @type {HTMLFormElement | null} */ (null));
  const [state, formAction, pending] = useActionState(registerVolunteer, null);
  const districts = useMemo(() => districtOptions(locale === "en" ? "en" : "bn"), [locale]);
  useFocusFirstError(formRef, state);

  if (state?.ok) {
    return (
      <div role="status" className="rounded-lg border border-em-100 bg-em-50 p-6 text-center">
        <CircleCheck aria-hidden="true" className="mx-auto size-12 text-em-600" />
        <p className="mt-3 text-lg font-semibold text-em-900">{t("volunteerThanks")}</p>
      </div>
    );
  }

  const values = state?.ok === false ? state.values ?? {} : {};
  const err = (name) => {
    const e = state?.fieldErrors?.[name];
    return e ? tAll(e.key, e.params) : null;
  };
  const req = { required: true, requiredLabel: tCommon("required") };
  // React doesn't re-apply a changed defaultValue to a mounted <select>, and the form reset after the action puts
  // it back on its first default. Keying on the returned value remounts the select with the visitor's choice.

  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-5 sm:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      <Input id="vol-name" name="name" label={t("name")} autoComplete="name" maxLength={120} defaultValue={values.name} error={err("name")} {...req} />
      <Input
        id="vol-phone"
        name="phone"
        label={t("phone")}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="01XXXXXXXXX"
        defaultValue={values.phone}
        error={err("phone")}
        {...req}
      />
      <Input
        id="vol-email"
        name="email"
        label={`${t("email")} (${t("optional")})`}
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={values.email}
        error={err("email")}
      />
      <Select
        key={`district-${values.district ?? ""}`}
        id="vol-district"
        name="district"
        label={t("district")}
        placeholder={t("districtPlaceholder")}
        options={districts}
        defaultValue={values.district ?? ""}
        error={err("district")}
        {...req}
      />
      <Select
        key={`availability-${values.availability ?? ""}`}
        id="vol-availability"
        name="availability"
        label={`${t("availability")} (${t("optional")})`}
        placeholder={t("availabilityPlaceholder")}
        options={[
          { value: "weekdays", label: t("weekdays") },
          { value: "weekends", label: t("weekends") },
          { value: "flexible", label: t("flexible") },
        ]}
        defaultValue={values.availability ?? ""}
        error={err("availability")}
        className="sm:col-span-2"
      />
      <Textarea
        id="vol-skills"
        name="skills"
        label={t("skills")}
        hint={t("optional")}
        placeholder={t("skillsPlaceholder")}
        maxLength={500}
        rows={3}
        defaultValue={values.skills}
        error={err("skills")}
        className="sm:col-span-2"
      />

      {state?.error && (
        <div className="sm:col-span-2">
          <FieldError id="vol-form-error" message={tAll(state.error)} />
        </div>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-7 py-3 font-bold text-em-950 transition hover:bg-gold-400 active:bg-gold-600 disabled:opacity-60 sm:w-auto motion-reduce:transition-none"
        >
          <UserPlus aria-hidden="true" className="size-5" />
          {pending ? t("submitting") : t("submit")}
        </button>
      </div>
    </form>
  );
}
