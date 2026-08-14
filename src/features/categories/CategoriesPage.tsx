import { useState, type FormEvent } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
} from "@/components/ui";
import { Can, PERMISSIONS, useAuth } from "@/features/auth";
import { useCategoryTree } from "@/features/products/api";
import type { CategoryNode } from "@/features/products/types";
import { getApiErrorMessage } from "@/lib/api";
import { useDocumentTitle } from "@/lib/hooks";
import {
  detalleDeCategoria,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "./api";

/** Alta o renombre. `padres` son las raíces disponibles como destino. */
function CategoryDialog({
  open,
  categoria,
  padres,
  onClose,
}: {
  open: boolean;
  /** `null` = alta nueva. */
  categoria: CategoryNode | null;
  padres: CategoryNode[];
  onClose: () => void;
}) {
  const crear = useCreateCategory();
  const editar = useUpdateCategory();

  const [name, setName] = useState(categoria?.name ?? "");
  const [parentId, setParentId] = useState<string>(
    categoria?.parentId != null ? String(categoria.parentId) : ""
  );

  const enCurso = crear.isPending || editar.isPending;
  const error = crear.error ?? editar.error;
  const nombreValido = name.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!nombreValido) return;

    const padre = parentId === "" ? null : Number(parentId);

    if (categoria === null) {
      crear.mutate({ name: name.trim(), parentId: padre }, { onSuccess: onClose });
    } else {
      editar.mutate(
        { id: categoria.id, name: name.trim(), parentId: padre },
        { onSuccess: onClose }
      );
    }
  };

  // Una categoría con hijos no puede pasar a ser subcategoría (serían 3 niveles)
  const tieneHijos = (categoria?.children.length ?? 0) > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={categoria === null ? "Nueva categoría" : `Editar ${categoria.name}`}
      description="El árbol admite dos niveles: categoría y subcategoría."
    >
      <form id="form-categoria" className="space-y-6" onSubmit={handleSubmit}>
        <Input
          label="Nombre"
          autoFocus
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <Select
          label="Categoría padre"
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
          disabled={tieneHijos}
          hint={
            tieneHijos
              ? "Tiene subcategorías, así que no puede depender de otra."
              : "Sin padre queda como categoría principal."
          }
        >
          <option value="">Sin padre (categoría principal)</option>
          {padres
            .filter((padre) => padre.id !== categoria?.id)
            .map((padre) => (
              <option key={padre.id} value={padre.id}>
                {padre.name}
              </option>
            ))}
        </Select>

        {error !== null && error !== undefined && (
          <Alert tone="danger" title="No se pudo guardar">
            {getApiErrorMessage(error)}
          </Alert>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose} disabled={enCurso}>
            Cancelar
          </Button>
          <Button type="submit" loading={enCurso} disabled={!nombreValido}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function CategoriesPage() {
  useDocumentTitle("Categorías");

  const { can } = useAuth();
  const puedeGestionar = can(PERMISSIONS.PRODUCTS_MANAGE);

  const arbol = useCategoryTree();
  const borrar = useDeleteCategory();

  const [editando, setEditando] = useState<CategoryNode | null>(null);
  const [creando, setCreando] = useState(false);
  const [aBorrar, setABorrar] = useState<CategoryNode | null>(null);
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null);

  const raices = arbol.data ?? [];

  const confirmarBorrado = () => {
    if (aBorrar === null) return;
    setErrorBorrado(null);

    borrar.mutate(aBorrar.id, {
      onSuccess: () => setABorrar(null),
      onError: (error) => {
        const detalle = detalleDeCategoria(error);
        setErrorBorrado(
          detalle !== null
            ? `No se puede borrar «${aBorrar.name}»: tiene ${detalle.products} producto(s) y ` +
                `${detalle.subcategories} subcategoría(s) activas.`
            : getApiErrorMessage(error)
        );
        setABorrar(null);
      },
    });
  };

  const filaAcciones = (categoria: CategoryNode) => (
    <Can permission={PERMISSIONS.PRODUCTS_MANAGE}>
      <span className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => setEditando(categoria)}>
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:bg-red-50"
          onClick={() => {
            setErrorBorrado(null);
            setABorrar(categoria);
          }}
        >
          Borrar
        </Button>
      </span>
    </Can>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Categorías"
        description="Árbol del catálogo: categorías y sus subcategorías."
        actions={
          <Can permission={PERMISSIONS.PRODUCTS_MANAGE}>
            <Button onClick={() => setCreando(true)}>Nueva categoría</Button>
          </Can>
        }
      />

      {errorBorrado !== null && (
        <Alert tone="danger" title="No se pudo borrar">
          {errorBorrado}
        </Alert>
      )}

      {arbol.isPending ? (
        <LoadingBlock label="Cargando categorías…" />
      ) : arbol.error !== null ? (
        <Alert tone="danger" title="No se pudieron cargar las categorías">
          {getApiErrorMessage(arbol.error)}
        </Alert>
      ) : raices.length === 0 ? (
        <Card flush>
          <EmptyState
            title="Todavía no hay categorías"
            description="Creá la primera para empezar a ordenar el catálogo."
            action={
              puedeGestionar ? (
                <Button onClick={() => setCreando(true)}>Nueva categoría</Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {raices.map((raiz) => (
            <Card key={raiz.id} flush>
              <div className="flex items-center justify-between gap-4 px-6 py-5">
                <span className="flex items-center gap-3">
                  <span className="font-medium text-stone-900">{raiz.name}</span>
                  {!raiz.isActive && <Badge tone="neutral">Inactiva</Badge>}
                  <span className="text-sm text-stone-400">
                    {raiz.children.length === 0
                      ? "Sin subcategorías"
                      : `${raiz.children.length} subcategoría${raiz.children.length === 1 ? "" : "s"}`}
                  </span>
                </span>
                {filaAcciones(raiz)}
              </div>

              {raiz.children.length > 0 && (
                <ul className="divide-y divide-stone-100 border-t border-stone-100">
                  {raiz.children.map((hija) => (
                    <li
                      key={hija.id}
                      className="flex items-center justify-between gap-4 py-3.5 pr-6 pl-12"
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-stone-700">{hija.name}</span>
                        {!hija.isActive && <Badge tone="neutral">Inactiva</Badge>}
                      </span>
                      {filaAcciones(hija)}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* `key` fuerza un formulario limpio por categoría editada */}
      {(creando || editando !== null) && (
        <CategoryDialog
          key={editando?.id ?? "nueva"}
          open
          categoria={editando}
          padres={raices}
          onClose={() => {
            setCreando(false);
            setEditando(null);
          }}
        />
      )}

      <ConfirmDialog
        open={aBorrar !== null}
        title={`¿Borrar «${aBorrar?.name ?? ""}»?`}
        description="Se da de baja del catálogo. No se puede borrar si tiene productos o subcategorías activas."
        confirmLabel="Borrar"
        loading={borrar.isPending}
        onCancel={() => setABorrar(null)}
        onConfirm={confirmarBorrado}
      />
    </div>
  );
}
