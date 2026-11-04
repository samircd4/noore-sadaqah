/**
 * Progress bar for campaigns (DESIGN_SYSTEM.md "Progress bar"). Meant for dark backgrounds.
 * @param {{ percent: number, label: string }} props label is read by screen readers ("লক্ষ্যের ৬৪% সংগৃহীত")
 */
export default function ProgressBar({ percent, label }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={label}
      className="h-3 overflow-hidden rounded-lg border border-white/10 bg-white/20"
    >
      <div className="h-full rounded-lg bg-gold-500" style={{ width: `${value}%` }} />
    </div>
  );
}
