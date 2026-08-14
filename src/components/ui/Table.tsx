import type { HTMLAttributes, ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Tabla simple y aireada. Se usa como composición (`<Table><THead>…`) en
 * vez de recibir una config de columnas: es más código en la pantalla,
 * pero se lee mejor y no hay que pelear con una abstracción cuando una
 * celda necesita algo distinto.
 */
export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function THead({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn("border-b border-stone-200", className)} {...props}>
      {children}
    </thead>
  );
}

export function TBody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-stone-100", className)} {...props}>
      {children}
    </tbody>
  );
}

export interface TRProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Resalta la fila al pasar el mouse (filas clickeables). */
  interactive?: boolean;
}

export function TR({ interactive = false, className, children, ...props }: TRProps) {
  return (
    <tr
      className={cn(interactive && "cursor-pointer transition-colors hover:bg-stone-50", className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export interface THProps extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "right" | "center";
}

export function TH({ align = "left", className, children, ...props }: THProps) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3.5 text-xs font-semibold tracking-wide text-stone-500 uppercase",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export interface TDProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "right" | "center";
  /** Alinea números en columna (montos, cantidades). */
  numeric?: boolean;
}

export function TD({ align = "left", numeric = false, className, children, ...props }: TDProps) {
  return (
    <td
      className={cn(
        "px-4 py-4 text-stone-700",
        numeric && "tabular",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}

/** Fila única que ocupa toda la tabla: vacío, carga o error. */
export function TableMessage({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-16 text-center text-sm text-stone-500">
        {children}
      </td>
    </tr>
  );
}
