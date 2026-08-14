import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Sección plegable para formularios largos (la ficha de planta tiene más
 * de treinta campos). Arranca abierta o cerrada según `defaultOpen`.
 */
export function Collapsible({
  title,
  description,
  defaultOpen = false,
  badge,
  children,
  className,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div className={cn("rounded-lg border border-stone-200 bg-white", className)}>
      <button
        type="button"
        onClick={() => setOpen((previo) => !previo)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-stone-50"
      >
        <span className="space-y-0.5">
          <span className="flex items-center gap-2">
            <span className="font-medium text-stone-900">{title}</span>
            {badge}
          </span>
          {description !== undefined && (
            <span className="block text-sm text-stone-500">{description}</span>
          )}
        </span>

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cn(
            "size-5 shrink-0 text-stone-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div id={contentId} className="border-t border-stone-100 px-5 py-6">
          {children}
        </div>
      )}
    </div>
  );
}
