import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const FIELD_BASE =
  "w-full rounded-lg bg-white px-3.5 text-sm text-stone-900 placeholder:text-stone-400 " +
  "ring-1 ring-stone-300 ring-inset transition-shadow " +
  "focus:ring-2 focus:ring-brand-600 focus:outline-none " +
  "disabled:bg-stone-50 disabled:text-stone-500";

const INVALID = "ring-red-400 focus:ring-red-500";

/** Etiqueta + control + mensaje de error, con el `id` ya cableado. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-stone-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error !== undefined ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        hint !== undefined && <p className="text-sm text-stone-500">{hint}</p>
      )}
    </div>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  hint?: ReactNode;
}

export function Input({ label, error, hint, className, id, required, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const control = (
    <input
      id={inputId}
      required={required}
      aria-invalid={error !== undefined || undefined}
      aria-errormessage={error !== undefined ? `${inputId}-error` : undefined}
      className={cn(FIELD_BASE, "h-11", error !== undefined && INVALID, className)}
      {...props}
    />
  );

  if (label === undefined) return control;

  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
      {control}
    </Field>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: ReactNode;
}

export function Select({ label, error, hint, className, id, required, children, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  const control = (
    <select
      id={selectId}
      required={required}
      aria-invalid={error !== undefined || undefined}
      className={cn(FIELD_BASE, "h-11 pr-8", error !== undefined && INVALID, className)}
      {...props}
    >
      {children}
    </select>
  );

  if (label === undefined) return control;

  return (
    <Field label={label} htmlFor={selectId} error={error} hint={hint} required={required}>
      {control}
    </Field>
  );
}

/** Input de búsqueda con lupa. El filtrado real lo hace quien lo usa. */
export function SearchInput({ className, ...props }: InputProps) {
  return (
    <div className={cn("relative", className)}>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-400"
      >
        <circle cx="9" cy="9" r="6" />
        <path d="m13.5 13.5 4 4" strokeLinecap="round" />
      </svg>
      <Input type="search" className="h-11 pl-10" {...props} />
    </div>
  );
}
