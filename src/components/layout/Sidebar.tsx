import { NavLink } from "react-router-dom";
import { visibleNavItems } from "@/app/navigation";
import { IconClose, IconLeaf } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useAuth } from "@/features/auth";

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { permissions } = useAuth();
  const items = visibleNavItems(permissions);

  return (
    <>
      {/* Fondo oscuro solo en móvil, cuando el menú está desplegado */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-stone-900/20 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-stone-200 bg-white",
          "transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-20 items-center justify-between gap-3 px-7">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <IconLeaf />
            </span>
            <span className="text-lg font-semibold tracking-tight text-stone-900">
              {import.meta.env.VITE_APP_NAME ?? "TerraFlorOS"}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 lg:hidden"
            aria-label="Cerrar menú"
          >
            <IconClose />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                )
              }
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <p className="px-7 py-6 text-xs text-stone-400">TerraFlorOS · Gestión de vivero</p>
      </aside>
    </>
  );
}
