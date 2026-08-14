import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "@/app/routes";
import { AuthProvider } from "@/features/auth";
import { queryClient } from "@/lib/queryClient";

/**
 * Orden de los providers: React Query va primero porque AuthProvider
 * limpia su caché al cerrar sesión, y el router va antes que auth para
 * que los guards puedan navegar.
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
