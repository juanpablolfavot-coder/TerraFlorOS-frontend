import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/**
 * Estructura general: menú fijo a la izquierda en escritorio (desplegable
 * en móvil) y contenido con mucho margen. El ancho máximo evita que las
 * tablas se estiren hasta volverse ilegibles en pantallas grandes.
 */
export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-stone-50">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:pl-72">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />

        <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
