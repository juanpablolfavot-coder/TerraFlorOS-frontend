import { createContext } from "react";
import type { AuthContextValue } from "./types";

/**
 * En archivo aparte del provider para que Fast Refresh no se rompa
 * (un módulo con componentes no debería exportar también valores).
 */
export const AuthContext = createContext<AuthContextValue | null>(null);
