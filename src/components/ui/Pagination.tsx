import { Button } from "./Button";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/**
 * Paginación mínima: "mostrando X–Y de Z" + anterior/siguiente.
 * Coincide con lo que devuelve el backend ({ items, total, page, pageSize }).
 */
export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-stone-200 px-6 py-4 sm:flex-row">
      <p className="tabular text-sm text-stone-500">
        {total === 0 ? "Sin resultados" : `Mostrando ${from}–${to} de ${total}`}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <span className="tabular px-2 text-sm text-stone-500">
          {page} / {lastPage}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
