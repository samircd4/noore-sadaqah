import FieldError from "./FieldError";

/**
 * Labelled multi-line text field, same look and error handling as Input (16px text so iOS doesn't zoom,
 * RESPONSIVE.md §7).
 * @param {object} props
 * @param {string} props.id
 * @param {string} props.label
 * @param {string | null} [props.error] translated error message
 * @param {boolean} [props.required]
 * @param {string} [props.requiredLabel] screen-reader text for the * mark
 * @param {string} [props.hint] shown after the label, e.g. "ঐচ্ছিক"
 */
export default function Textarea({ id, label, error, required = false, requiredLabel, hint, className = "", rows = 5, ...rest }) {
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-em-950">
        {label}
        {required && (
          <span className="ms-0.5" aria-hidden="true">
            *
          </span>
        )}
        {required && requiredLabel && <span className="sr-only"> ({requiredLabel})</span>}
        {hint && <span className="ms-1 font-normal text-em-900/60">({hint})</span>}
      </label>
      <textarea
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`block w-full rounded-lg border bg-white px-3 py-2.5 text-base leading-relaxed text-em-950 placeholder:text-em-900/50 focus:border-gold-600 ${
          error ? "border-gold-600" : "border-sand-300"
        }`}
        {...rest}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}
