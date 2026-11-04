import { bnNumber, shortNumber } from "@/lib/format";

/**
 * One number with a label (DESIGN_SYSTEM.md "Stat card"). Numbers of a lakh and more use the short form
 * ("১ লক্ষ+"); smaller ones are shown in full ("১২,৫০০+").
 * @param {{ value: number, suffix?: string, label: string, locale: "bn" | "en", accent?: boolean }} props
 */
export default function StatCard({ value, suffix = "", label, locale, accent = false }) {
  const number = value >= 100_000 ? shortNumber(value, locale) : bnNumber(value, locale);
  return (
    <div className="rounded-lg border border-sand-200 bg-white p-4 text-center shadow-sm sm:p-5">
      <p className={`font-head text-3xl font-extrabold leading-snug sm:text-4xl ${accent ? "text-gold-600" : "text-em-700"}`}>
        {number}
        {suffix}
      </p>
      <p className="mt-1 text-sm leading-6 text-em-900/70">{label}</p>
    </div>
  );
}
