/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origen del backend, sin el sufijo /api. Ej: http://localhost:3000 */
  readonly VITE_API_URL: string;
  /** Nombre visible del negocio (opcional). */
  readonly VITE_APP_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
