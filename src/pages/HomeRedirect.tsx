import { Navigate } from "react-router-dom";
import { visibleNavItems } from "@/app/navigation";
import { useAuth } from "@/features/auth";

/**
 * La raíz no tiene pantalla propia: manda al primer módulo que el usuario
 * pueda ver. Un cajero sin `reports.view` entra directo a Ventas en vez
 * de chocar contra un panel vacío.
 */
export function HomeRedirect() {
  const { permissions } = useAuth();
  const first = visibleNavItems(permissions)[0];

  return <Navigate to={first?.to ?? "/sin-permiso"} replace />;
}
