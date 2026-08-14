import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Quita el padding interno (útil cuando adentro va una tabla). */
  flush?: boolean;
}

export function Card({ flush = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-stone-200 bg-white",
        !flush && "p-6 sm:p-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-6", className)}>
      <div className="space-y-1.5">
        <h2 className="text-base font-semibold">{title}</h2>
        {description !== undefined && <p className="text-sm text-stone-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Tarjeta de métrica del dashboard: etiqueta arriba, número grande abajo. */
export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "warning" | "danger" | "brand";
}) {
  const tones = {
    default: "text-stone-900",
    brand: "text-brand-700",
    warning: "text-amber-600",
    danger: "text-red-600",
  } as const;

  return (
    <Card className="space-y-3">
      <p className="text-sm font-medium text-stone-500">{label}</p>
      {/*
        Un importe largo ($ 4.812.900,75) no entra en la tarjeta cuando hay
        cuatro columnas. Cortarlo en dos líneas es peor que achicarlo, así
        que los valores largos bajan un escalón de tamaño y nunca se parten.
      */}
      <p
        className={cn(
          "tabular font-semibold tracking-tight whitespace-nowrap",
          typeof value === "string" && value.length > 12 ? "text-xl" : "text-2xl",
          tones[tone]
        )}
      >
        {value}
      </p>
      {hint !== undefined && <p className="text-sm text-stone-400">{hint}</p>}
    </Card>
  );
}
