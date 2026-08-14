import { cn } from "@/lib/cn";

const SIZES = {
  sm: "size-4 border-2",
  md: "size-6 border-2",
  lg: "size-9 border-[3px]",
} as const;

export interface SpinnerProps {
  size?: keyof typeof SIZES;
  className?: string;
  /** Texto para lectores de pantalla. */
  label?: string;
}

export function Spinner({ size = "md", className, label = "Cargando" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block animate-spin rounded-full border-current border-t-transparent",
        SIZES[size],
        className
      )}
    />
  );
}

/** Spinner centrado con aire, para el cuerpo de una página o tarjeta. */
export function LoadingBlock({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-stone-400">
      <Spinner size="lg" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
