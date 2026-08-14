# Changelog — TerraFlorOS frontend

## [0.1.1] — El refresh de sesión ya no manda cuerpo

- `POST /api/auth/refresh` y `POST /api/auth/logout` viajaban con el literal
  `null` como cuerpo y `Content-Type: application/json`. El `express.json()`
  del backend está en modo strict, que solo acepta objetos y arrays: rechazaba
  la request con **400 `entity.parse.failed`** antes de llegar a la ruta
- Efecto para el usuario: al recargar la página con sesión activa, el refresh
  fallaba y la sesión no se restauraba — volvía a la pantalla de login
- Causa raíz: la instancia de Axios fijaba `Content-Type: application/json`
  por defecto. Con ese header, `transformRequest` serializa **también** los
  cuerpos vacíos, y `null` se convierte en el texto `"null"`. Se quitó el
  header por defecto: Axios ya lo agrega solo cuando hay un objeto como
  cuerpo, así que las requests con datos siguen igual y las que no llevan
  cuerpo ahora no mandan nada
- Las llamadas sin cuerpo pasan `undefined` en vez de `null`, con el motivo
  anotado al lado para que no vuelva a colarse
- Verificado contra un Express real con `express.json()` strict, cookies y
  CORS: `POST /api/auth/refresh` sale sin `Content-Type` y sin cuerpo, da 401
  al cargar sin sesión y 200 al recargar con sesión activa, que se restaura
  correctamente

## [0.1.0] — Base del frontend

- Proyecto React 19 + TypeScript sobre Vite, con React Router v6, TanStack
  Query v5, Axios y Tailwind CSS v4. Sin librería de componentes: los
  controles propios viven en `src/components/ui/`
- Cliente HTTP con `baseURL` desde `VITE_API_URL` y `withCredentials`, para
  que viaje la cookie httpOnly del refresh token
- Ante un 401 se intenta refrescar la sesión **una sola vez** y se reintenta
  la request original con el token nuevo; si el refresh también falla, se
  limpia la sesión y se redirige a `/login`. La request reintentada queda
  marcada para que un segundo 401 no entre en un bucle
- Un único refresh en vuelo: el backend rota el refresh token y trata el reuso
  como robo, así que varias requests fallando a la vez comparten la misma
  petición en lugar de revocarle todas las sesiones al usuario
- Access token solo en memoria, nunca en `localStorage`. Al montar la app se
  intenta restaurar la sesión con la cookie y se cargan usuario y permisos
  efectivos desde `GET /api/auth/me`, con pantalla de carga mientras tanto
- Guards de ruta (`RequireAuth`, `RequirePermission`) y componente `<Can>`
  para elementos sueltos. Es solo interfaz: la autorización la aplica el
  backend en cada endpoint
- Layout con menú lateral filtrado por permisos y drawer en móvil; la raíz
  redirige al primer módulo que el usuario pueda ver
- **Panel**: ventas del día, medios de pago, plantas e inventario
- **Productos**: listado con búsqueda, filtros por tipo, categoría y estado, y
  paginación
- Pantallas provisorias para Ventas, Caja, Inventario, Compras, Proveedores y
  Usuarios, ya con su ruta y su permiso
- Los `Decimal` de Prisma llegan como string en el JSON y los campos de costo
  solo viajan con `products.view_cost`: los tipos y los helpers de formato
  contemplan ambas cosas
