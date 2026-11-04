import { CircleAlert } from "lucide-react";

/**
 * Error line under a field (DESIGN_SYSTEM.md "Input error"): no red in the palette, so em-950 text with an icon.
 * @param {{ id: string, message?: string | null }} props
 */
export default function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-semibold leading-6 text-em-950">
      <CircleAlert aria-hidden="true" className="mt-1 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
