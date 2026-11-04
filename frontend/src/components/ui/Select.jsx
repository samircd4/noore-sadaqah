import { ChevronDown } from "lucide-react";
import FieldError from "./FieldError";

/**
 * Labelled native select (good on phones). Same look and error handling as Input.
 * @param {object} props
 * @param {string} props.id
 * @param {string} props.label
 * @param {Array<{ value: string, label: string }>} props.options
 * @param {string} [props.placeholder] first, empty option
 * @param {string | null} [props.error]
 * @param {boolean} [props.required]
 * @param {string} [props.requiredLabel]
 * @param {React.Ref<HTMLSelectElement>} [props.ref]
 */
export default function Select({ id, label, options, placeholder, error, required = false, requiredLabel, className = "", ref, ...rest }) {
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
      </label>
      <div className="relative">
        <select
          id={id}
          ref={ref}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-11 w-full appearance-none rounded-lg border bg-white ps-3 pe-9 text-base text-em-950 focus:border-gold-600 ${
            error ? "border-gold-600" : "border-sand-300"
          }`}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-em-900/70" />
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
