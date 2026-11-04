/**
 * Small gold label (DESIGN_SYSTEM.md "Badge"). Text on gold is em-950.
 * @param {{ children: React.ReactNode, className?: string, icon?: React.ReactNode }} props
 */
export default function Badge({ children, className = "", icon = null }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg bg-gold-500/90 px-3 py-1 text-xs font-bold tracking-wide text-em-950 ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
