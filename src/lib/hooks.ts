import { useEffect, useState } from "react";

/**
 * Retrasa un valor. Sirve para no disparar una request por cada tecla
 * en los buscadores.
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/** Cambia el título de la pestaña mientras el componente está montado. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · TerraFlorOS`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
