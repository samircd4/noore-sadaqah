import FieldError from "./FieldError";

/**
 * Labelled text input (DESIGN_SYSTEM.md "Input", RESPONSIVE.md §7): 44px tall, 16px text, label above,
 * error below. Pass the right type/inputMode/autoComplete for the field.
 * @param {object} props
 * @param {string} props.id
 * @param {string} props.label
 * @param {string | null} [props.error] translated error message
 * @param {boolean} [props.required]
 * @param {string} [props.requiredLabel] screen-reader text for the * mark
 * @param {string} [props.labelClassName]
 * @param {React.ReactNode} [props.prefix] e.g. "৳", shown inside the field on the left
 * @param {React.Ref<HTMLInputElement>} [props.ref]
 */
export default function Input({ id, label, error, required = false, requiredLabel, labelClassName = "", prefix, className = "", ref, ...rest }) {
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className={`mb-1 block text-sm font-semibold text-em-950 ${labelClassName}`}>
        {label}
        {required && (
          <span className="ms-0.5" aria-hidden="true">
            *
          </span>
        )}
        {required && requiredLabel && <span className="sr-only"> ({requiredLabel})</span>}
      </label>
      <div className="relative">
        {prefix && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-3 flex items-center font-semibold text-em-900/70">
            {prefix}
          </span>
        )}
        <input
          id={id}
          ref={ref}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-11 w-full rounded-lg border bg-white px-3 text-base text-em-950 placeholder:text-em-900/50 focus:border-gold-600 ${
            prefix ? "ps-7" : ""
          } ${error ? "border-gold-600" : "border-sand-300"}`}
          {...rest}
        />
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
