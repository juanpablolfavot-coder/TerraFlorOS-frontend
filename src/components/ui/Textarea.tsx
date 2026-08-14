import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Field } from "./Input";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: ReactNode;
}

/** Igual que Input pero multilínea. El ancho lo fija el contenedor. */
export function Textarea({ label, error, hint, className, id, required, ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  const control = (
    <textarea
      id={textareaId}
      required={required}
      rows={props.rows ?? 3}
      aria-invalid={error !== undefined || undefined}
      className={cn(
        "w-full rounded-lg bg-white px-3.5 py-2.5 text-sm text-stone-900",
        "ring-1 ring-stone-300 ring-inset placeholder:text-stone-400",
        "focus:ring-2 focus:ring-brand-600 focus:outline-none",
        error !== undefined && "ring-red-400 focus:ring-red-500",
        className
      )}
      {...props}
    />
  );

  if (label === undefined) return control;

  return (
    <Field label={label} htmlFor={textareaId} error={error} hint={hint} required={required}>
      {control}
    </Field>
  );
}

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  hint?: string;
}

/** Casilla con su etiqueta al lado, alineada arriba por si la ayuda envuelve. */
export function Checkbox({ label, hint, className, id, ...props }: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={checkboxId}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded accent-brand-600"
        {...props}
      />
      <label htmlFor={checkboxId} className="space-y-0.5">
        <span className="block text-sm font-medium text-stone-700">{label}</span>
        {hint !== undefined && <span className="block text-sm text-stone-500">{hint}</span>}
      </label>
    </div>
  );
}

/**
 * Casilla de tres estados para la ficha de planta: sí / no / sin dato.
 * El backend distingue `true`, `false` y `null`, y perder esa diferencia
 * convertiría "no sabemos" en "no".
 */
export function TriStateSelect({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean | null | undefined;
  onChange: (value: boolean | null) => void;
  hint?: string;
}) {
  const id = useId();
  const actual = value === null || value === undefined ? "" : value ? "si" : "no";

  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <select
        id={id}
        value={actual}
        onChange={(event) => {
          const v = event.target.value;
          onChange(v === "" ? null : v === "si");
        }}
        className={cn(
          "h-11 w-full rounded-lg bg-white px-3.5 pr-8 text-sm text-stone-900",
          "ring-1 ring-stone-300 ring-inset focus:ring-2 focus:ring-brand-600 focus:outline-none"
        )}
      >
        <option value="">Sin dato</option>
        <option value="si">Sí</option>
        <option value="no">No</option>
      </select>
    </Field>
  );
}
