# TerraFlorOS — Frontend

Interfaz web del ERP de vivero **TerraFlorOS**. Consume la API REST del
backend (`TerraFlorOS-backend`, rutas bajo `/api`).

Criterio de diseño: **limpio y espacioso**. Mucho aire, tipografía grande,
poco color. La operación diaria manda; los efectos visuales no.

---

## Stack

| Pieza          | Elección                                        |
| -------------- | ----------------------------------------------- |
| Framework      | React 19 + TypeScript                           |
| Build          | Vite                                            |
| Ruteo          | React Router v6                                 |
| Datos          | TanStack Query v5                               |
| HTTP           | Axios                                           |
| Estilos        | Tailwind CSS v4 (configuración en CSS, sin JS)  |
| Componentes    | Propios, en `src/components/ui/`                |

No hay librería de componentes: los controles que se usan son pocos y
mantenerlos propios evita pelear con estilos ajenos.

---

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # ajustar VITE_API_URL
npm run dev                  # http://localhost:5173
```

El backend tiene que estar corriendo y con `CORS_ORIGIN` incluyendo
`http://localhost:5173` (es su valor por defecto).

### Variables de entorno

| Variable        | Descripción                                                    |
| --------------- | -------------------------------------------------------------- |
| `VITE_API_URL`  | Origen del backend, **sin** el sufijo `/api`. Ej: `http://localhost:3000` |
| `VITE_APP_NAME` | Nombre visible del negocio (opcional, por defecto `TerraFlorOS`) |

### Scripts

| Comando             | Qué hace                              |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Servidor de desarrollo con HMR        |
| `npm run build`     | Chequeo de tipos + build de producción |
| `npm run preview`   | Sirve el build de producción          |
| `npm run typecheck` | Solo chequeo de tipos                 |

---

## Estructura

```
src/
  app/
    navigation.ts        Módulos del menú y su permiso
    routes.tsx           Árbol de rutas con sus guards
  components/
    icons.tsx            Iconos propios (SVG)
    layout/              AppLayout, Sidebar, Topbar
    ui/                  Button, Input, Card, Table, Spinner, …
  features/
    auth/                Contexto de sesión, permisos y guards
    cash/                Caja: apertura y estado del turno
    dashboard/           Panel del día
    products/            Listado de productos
    sales/               POS: buscador, carrito y cobro
  lib/
    api.ts               Instancia de Axios + refresh de sesión
    session.ts           Access token en memoria
    format.ts            Dinero, cantidades y fechas en es-AR
    queryClient.ts       Configuración de TanStack Query
    hooks.ts             useDebouncedValue, useDocumentTitle
  pages/                 Login, 404, 403, placeholders
```

---

## Autenticación

El esquema sigue lo que expone el backend:

- **Access token en memoria.** Nunca en `localStorage` ni `sessionStorage`:
  si hay un XSS, no encuentra un token guardado para robar. Se pierde al
  recargar, y está bien.
- **Refresh token en cookie httpOnly**, que pone el backend con
  `path=/api/auth`. El JavaScript no puede leerla. Por eso todas las
  requests van con `withCredentials: true`.
- **Al arrancar la app** se intenta `POST /api/auth/refresh`. Si responde,
  se pide `GET /api/auth/me` y la sesión queda restaurada; si no, se cae a
  la pantalla de login. Mientras tanto se muestra una pantalla de carga:
  sin ese estado intermedio la app parpadearía a `/login` en cada recarga.
- **Ante un 401** el interceptor intenta refrescar **una sola vez** y
  reintenta la request original con el token nuevo. Si el refresh también
  falla, limpia la sesión y manda a `/login`.

Dos detalles que evitan problemas reales:

1. **Un solo refresh en vuelo.** Si cinco requests fallan con 401 a la vez,
   todas esperan el mismo refresh. El backend rota el refresh token y trata
   el reuso como robo: varios refresh concurrentes con la misma cookie le
   revocarían **todas** las sesiones al usuario.
2. **La request reintentada se marca.** Si el reintento vuelve a dar 401, el
   error sube tal cual en vez de entrar en un bucle de refresh.

### Permisos

`GET /api/auth/me` devuelve los permisos **efectivos** (los del rol, más o
menos los overrides individuales). Con eso:

```tsx
const { can } = useAuth();
can(PERMISSIONS.PRODUCTS_VIEW_COST);       // boolean

<Can permission={PERMISSIONS.PRODUCTS_MANAGE}>
  <Button>Nuevo producto</Button>
</Can>
```

En rutas:

```tsx
<Route element={<RequirePermission permission={PERMISSIONS.REPORTS_VIEW} />}>
  <Route path="panel" element={<DashboardPage />} />
</Route>
```

> Esto es **solo interfaz**: decide qué se muestra y qué se oculta. La
> autorización de verdad la aplica el backend en cada endpoint. Esconder un
> botón no protege nada.

El menú lateral se filtra igual, y la raíz `/` redirige al primer módulo
que el usuario pueda ver: un cajero sin `reports.view` entra directo a
Ventas en vez de chocar contra un panel vacío.

---

## Notas sobre los datos

- **Los `Decimal` de Prisma llegan como string** en el JSON (precios,
  costos, stock). Usar `toNumber()` / `formatMoney()` de `lib/format.ts`;
  nunca hacer aritmética directa sobre esos campos.
- **Los campos de costo pueden no venir.** `lastCost`, `averageCost`,
  `cmv`, `margin` e `inventoryValueAtCost` solo viajan si el usuario tiene
  `products.view_cost`. Por eso son opcionales en los tipos y la interfaz
  tiene que funcionar sin ellos.
- **Errores del backend** con la forma `{ error: { code, message, details } }`.
  Para mostrarlos: `getApiErrorMessage(error)`; para errores de validación
  por campo: `getApiFieldErrors(error)`.

---

## Estado actual

Implementado:

- Login, cierre de sesión y restauración de sesión al recargar
- Layout, menú filtrado por permisos, 403 y 404
- **Panel**: ventas del día, medios de pago, plantas e inventario
- **Productos**: listado con búsqueda, filtros por tipo/categoría/estado y
  paginación
- **Ventas (POS)**: buscador que escanea y busca, carrito, pago mixto y cobro
- **Caja**: apertura con saldo inicial y estado del turno en vivo

Pendiente (las rutas y los permisos ya existen, falta la interfaz):
Inventario, Compras, Proveedores y Usuarios. También los movimientos
manuales de caja y el cierre con arqueo.

---

## Endpoints que le faltan al backend

El POS está completo del lado del frontend, pero **no puede cobrar** hasta
que existan estos endpoints:

| Endpoint | Para qué | Qué hace el frontend mientras tanto |
| --- | --- | --- |
| `GET /api/payment-methods` | Catálogo de medios de pago | Explica que falta y deja el cobro deshabilitado. No se cablean ids fijos: cobrar con el método equivocado sería un error silencioso en los datos |
| `GET /api/price-lists` | Saber cuál es la lista por defecto (`isDefault`) | Deduce las listas de los precios de los productos y, si hay más de una, deja elegir |
| `GET /api/customers` | Cliente opcional de la venta | Vende sin cliente; `customerId` ya está contemplado |

Dos detalles del contrato actual que conviene tener presentes:

- `POST /api/cash/sessions` espera **`cashRegisterId`**, mientras que
  `/api/cash/sessions/current` y `POST /api/sales` usan `registerId`. El
  schema es `.strict()`, así que el nombre equivocado devuelve 400
- `GET /api/cash/registers` y `/sessions/current` exigen `cash.open`, de modo
  que un vendedor con solo `sales.create` no puede ni consultar si hay una
  caja abierta
