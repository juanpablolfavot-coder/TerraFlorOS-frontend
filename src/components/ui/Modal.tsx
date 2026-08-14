import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

/**
 * Diálogo modal simple. Sin librería: cierra con Escape y con clic en el
 * fondo, y lleva el foco adentro al abrirse.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  /**
   * `onClose` suele ser una función nueva en cada render del que llama.
   * Si el efecto dependiera de ella se re-ejecutaría con cada tecla, y
   * el `focus()` de abajo le robaría el foco al input que se está
   * tipeando. Guardándola en un ref, el efecto solo depende de `open`.
   */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Escape: se suscribe una sola vez por apertura
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Foco: SOLO al abrirse, y sin pisar al que ya tenga el foco adentro
  // (por ejemplo un campo con autoFocus).
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (panel !== null && !panel.contains(document.activeElement)) {
      panel.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-stone-900/30" onClick={onClose} aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-lg rounded-card border border-stone-200 bg-white p-6 sm:p-8",
          "focus:outline-none",
          className
        )}
      >
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description !== undefined && <p className="text-sm text-stone-500">{description}</p>}
        </div>

        {children !== undefined && <div className="mt-6">{children}</div>}

        {footer !== undefined && (
          <div className="mt-8 flex justify-end gap-3">{footer}</div>
        )}
      </div>
    </div>
  );
}

/** Confirmación de una acción destructiva (vaciar carrito, cancelar venta). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Volver",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      className="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading} autoFocus>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
