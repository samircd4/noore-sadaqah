import { FlaskConical } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { readApiConfig, resolveTarget } from "@/lib/api-mode";
import { bnDigits, taka } from "@/lib/format";
import { currentLocale } from "@/lib/locale";
import { MOCK_OUTCOMES, mockGatewayDonation, settleMockDonation } from "@/mocks/gateway";

/**
 * /donate/mock-gateway?id= — mock mode only (frontend/CLAUDE.md "Mock API" rule 2, the one page that may touch
 * src/mocks/). Stands in for the SSLCommerz / bKash payment page: buttons for success, failure, cancel and "stay
 * pending". Each one settles the donation on the server, like Django's gateway callback, and redirects like Django
 * will (303 → /{locale}/donate/success or /failed). In static or live mode, or when donations are served by Django,
 * it is a 404.
 */

export const metadata = { robots: { index: false, follow: false } };

/** True only while POST /donations/ is answered by the mock. */
function donationsMocked() {
  try {
    return resolveTarget(readApiConfig(), "POST", "/donations/") === "mock";
  } catch {
    return false;
  }
}

/** Server action for the four buttons. */
async function settle(formData) {
  "use server";
  if (!donationsMocked()) notFound();
  const id = String(formData.get("id") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  if (!MOCK_OUTCOMES.includes(/** @type {any} */ (outcome))) notFound();
  const target = settleMockDonation(id, /** @type {any} */ (outcome));
  if (!target) notFound();
  redirect(target);
}

export default async function MockGatewayPage({ searchParams }) {
  const t = await getTranslations("common");
  return (
    <section className="min-h-dvh bg-sand-100 px-4 pt-28 pb-16 sm:pt-36">
      <div className="mx-auto max-w-md">
        <Suspense fallback={<p className="py-12 text-center text-em-900/70">{t("loading")}</p>}>
          <MockGatewayBody searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

/** @param {{ searchParams: Promise<Record<string, string | string[] | undefined>> }} props */
async function MockGatewayBody({ searchParams }) {
  if (!donationsMocked()) notFound();
  const [{ id }, locale, t] = await Promise.all([searchParams, currentLocale(), getTranslations("mockGateway")]);
  const donation = mockGatewayDonation(Array.isArray(id) ? id[0] : id);
  if (!donation) notFound();

  const buttons = [
    { outcome: "success", className: "bg-em-700 text-white hover:bg-em-500" },
    { outcome: "fail", className: "bg-em-950 text-white hover:bg-em-800" },
    { outcome: "cancel", className: "border border-em-700 bg-white text-em-700 hover:bg-em-50" },
    { outcome: "pending", className: "bg-gold-500 text-em-950 hover:bg-gold-400" },
  ];

  return (
    <div className="rounded-lg border-2 border-dashed border-em-700 bg-white p-6 shadow-card">
      <p className="flex items-center gap-2 text-sm font-bold tracking-wide text-em-700">
        <FlaskConical aria-hidden="true" className="size-5" />
        {t("badge")}
      </p>
      <h1 className="mt-3 font-head text-2xl leading-snug font-bold text-em-900">{t("title")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-em-900/80">{t("note")}</p>

      <dl className="mt-5 space-y-2 text-base">
        <div className="flex justify-between gap-4">
          <dt className="text-em-900/70">{t("amount")}</dt>
          <dd className="font-bold text-em-950">{taka(donation.amount, locale)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-em-900/70">{t("method")}</dt>
          <dd className="font-semibold text-em-950">{donation.method}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-em-900/70">{t("ref")}</dt>
          <dd className="font-mono text-sm break-all text-em-950">{donation.gateway_ref}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-em-900/70">{t("status")}</dt>
          <dd className="font-semibold text-em-950">{donation.status}</dd>
        </div>
      </dl>

      {donation.status !== "pending" && <p className="mt-4 text-sm font-semibold text-em-950">{t("settled")}</p>}

      <form action={settle} className="mt-6 grid gap-3">
        <input type="hidden" name="id" value={donation.id} />
        {buttons.map((b) => (
          <button
            key={b.outcome}
            type="submit"
            name="outcome"
            value={b.outcome}
            className={`min-h-12 rounded-lg px-5 font-bold transition motion-reduce:transition-none ${b.className}`}
          >
            {t(`outcome.${b.outcome}`)}
          </button>
        ))}
      </form>
      <p className="mt-4 text-xs text-em-900/60">{t("idLabel", { id: bnDigits(donation.id.slice(0, 8), "en") })}</p>
    </div>
  );
}
