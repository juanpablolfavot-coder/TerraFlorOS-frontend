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
    receipt/             Hoja de comprobante (presupuesto y venta)
    ui/                  Button, Input, Card, Table, Spinner, …
  features/
    auth/                Contexto de sesión, permisos y guards
    cash/                Caja: apertura, movimientos, cierre e historial
    categories/          Árbol de categorías
    customers/           Clientes, direcciones y cuenta corriente
    dashboard/           Panel del día
    inventory/           Inventario: stock por lote, movimientos y ajustes
    prices/              Consulta de precios de mostrador
    products/            Catálogo: lista, ficha, precios y códigos
    purchases/           Compras, recepción y productos a reponer
    quotes/              Presupuestos y su conversión en venta
    users/               Usuarios, roles y permisos individuales
    sales/               POS: buscador, carrito y cobro
    settings/            Configuración del sistema
    suppliers/           Proveedores y su catálogo
  lib/
    api.ts               Instancia de Axios + refresh de sesión
    session.ts           Access token en memoria
    format.ts            Dinero, cantidades y fechas en es-AR
    image.ts             Redimensiona y comprime el logo antes de guardarlo
    print.ts             Imprimir y "descargar PDF" de los comprobantes
    safe.ts              Lecturas defensivas de respuestas del backend
    queryClient.ts       Configuración de TanStack Query
    hooks.ts             useDebouncedValue, useDocumentTitle
  pages/                 Login, 404 y 403
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
- **Productos**: listado con búsqueda, filtros por tipo/categoría/estado,
  precio y stock disponible por fila, y paginación
- **Ventas (POS)**: buscador que escanea y busca, carrito, cliente opcional,
  pago mixto con vuelto en efectivo (medio de pago por botones y atajos de
  billetes) y cobro, con comprobante para imprimir o guardar en PDF
- **Detalle de una venta**: qué se cobró, con qué se pagó y cuánto vuelto se
  dio, con reimpresión del comprobante desde cualquier venta pasada
- **Caja**: apertura, resumen del turno en vivo, detalle completo de
  movimientos (manuales y automáticos) y cierre con arqueo
- **Historial de cajas**: turnos cerrados y abiertos con su diferencia de
  arqueo, y el detalle de cada uno (arqueo, ventas por medio de pago,
  movimientos y las ventas con su hora)
- **Catálogo**: lista con filtros, alta y edición de productos con ficha
  botánica, precios por lista con historial, códigos de barras y árbol de
  categorías
- **Compras**: órdenes con sus estados, recepción de mercadería que genera
  lotes, y la lista de productos bajo stock mínimo
- **Proveedores**: padrón con búsqueda, ficha completa, catálogo del
  proveedor y las compras hechas a cada uno
- **Presupuestos**: cotizaciones con precio congelado y vencimiento a los 7
  días, con comprobante para imprimir y conversión en venta (que es donde se
  piden la caja y los pagos)
- **Consulta de precios**: pantalla de mostrador para responder «¿cuánto
  está esto?» — se escanea o se busca, y muestra precio de venta, stock y
  ficha de la planta en grande. Nunca costos, aunque el usuario los tenga
- **Clientes**: padrón con búsqueda y filtros, ficha con direcciones,
  cuenta corriente (solo lectura) y sus compras, más el selector de cliente
  del POS

- **Usuarios**: padrón con filtros, alta con rol y sucursal, edición,
  cambio de contraseña y editor de permisos individuales sobre el rol
- **Configuración**: las settings del sistema agrupadas, con el interruptor
  de «permitir vender sin stock» explicado en criollo, y los **datos del
  vivero** (nombre, teléfono, dirección y logo) que salen en los comprobantes
- **Comprobantes**: presupuesto y venta comparten la misma hoja imprimible,
  encabezada con el logo, el nombre, la dirección y el teléfono del vivero.
  Son documentos de cara al cliente: sin costos, sin márgenes y sin el nombre
  de la lista de precios con la que se facturó
- **Inventario**: stock disponible por producto con filtros y atajo a los
  sobrevendidos, detalle con lotes (incluido el de sobreventa) y libro de
  movimientos, ajustes manuales de entrada y salida, y regularización de
  sobreventa

No quedan módulos en placeholder: todas las rutas del menú tienen su
pantalla.

---

## Contrato con el backend

Detalles del contrato que conviene tener presentes:

- **Naming de caja:** todos los endpoints usan `registerId`, incluido
  `POST /api/cash/sessions`. Su schema es `.strict()`, así que un nombre
  distinto devuelve 400
- **Lecturas de caja** (`GET /api/cash/registers` y `/sessions/current`)
  aceptan `sales.create` **o** `cash.open`: un vendedor puede consultar si
  hay caja abierta y facturar. Abrirla sigue exigiendo `cash.open`
- **`GET /api/price-lists`** devuelve las listas activas con la default
  primera. El POS toma esa como precio base y, si hay más de una, deja
  elegir; al cambiarla recalcula todo el carrito
- **`GET /api/payment-methods`** devuelve los métodos activos para cobrar
- **Leer clientes acepta `sales.create` o `customers.manage`** (mismo criterio
  que la caja): el POS necesita buscar y elegir cliente al facturar. Crear,
  editar, borrar y tocar direcciones exige `customers.manage`
- **El logo del vivero es una setting**, no un archivo: `company.logo` guarda
  un data URL base64. El navegador redimensiona la imagen a 400 px de ancho y
  la comprime antes de mandarla (`lib/image.ts`), porque el backend acepta
  hasta 400.000 caracteres. El resto de las settings de texto sigue topado en
  1000 caracteres, así que **solo el logo puede ser largo**
- **`PATCH /api/settings` no crea claves**: si una setting no está en la base,
  responde 400. Las claves nuevas se agregan corriendo el seed del backend,
  que es idempotente
- **El detalle de un turno de caja NO trae `session.sales`**: ese agregado
  existe solo en las filas del listado (`GET /api/cash/sessions`). En el
  detalle las ventas vienen como array aparte —con las anuladas incluidas— y
  los totales de efectivo, en `summary`
- **`GET /api/sales/:id`** devuelve la venta completa, incluida `priceList`
  y (con `products.view_cost`) `costTotal` y `margin`. Los tres son datos
  internos: van en la pantalla de la venta, nunca en el comprobante
- **Inventario:** `GET /api/inventory/overview` devuelve el disponible por
  producto pero **no la categoría** de cada fila (se puede filtrar por
  `categoryId`, no mostrarla). `GET /api/inventory/products/:id` trae los
  lotes con `currentQty != 0` —los negativos **también**, que son los de
  sobreventa— de **todas las sucursales**, y sus totales
- **El ajuste no devuelve el stock resultante**: `POST
  /api/inventory/adjustments` responde `{ productId, branchId, applied }`
  con lo que hizo en cada lote, así que la pantalla vuelve a leer el detalle
  en vez de calcular el disponible nuevo por su cuenta
- **Una entrada cancela primero la sobreventa**: si el producto arrastra
  deuda, la entrada la lleva hacia cero y recién el excedente crea un lote
  nuevo. `POST /api/inventory/products/:id/settle-oversold` es el atajo que
  carga la deuda exacta (409 si no hay deuda)
- **El cliente de la venta es opcional**, pero si viaja `customerId` el
  backend factura con la lista de precios asignada a ese cliente. Por eso el
  POS cambia de lista al elegirlo: mandar precios de otra lista haría que su
  validación de «vender por debajo de lista» rechace la venta
- **La cuenta corriente es solo lectura.** `GET /api/customers/:id/account`
  devuelve saldo y movimientos, pero todavía no hay forma de crear asientos:
  no existe la venta a crédito ni el registro de pagos
- **La invariante de direcciones la resuelve el backend:** si el cliente
  tiene direcciones, hay exactamente una principal. La primera queda
  principal aunque no se pida, marcar una nueva desmarca la anterior y al
  borrar la principal se promueve la más antigua de las que quedan
- **`GET /api/price-lists` exige `products.view`**, no `sales.create`: en el
  formulario de cliente ese campo se muestra de solo lectura para quien no
  tenga ese permiso
- **`GET /api/cash/sessions/:id/movements`** devuelve el detalle completo del
  turno: los manuales y los automáticos (`SALE_CASH` de cada venta en
  efectivo), de cualquier usuario, en orden cronológico y sin paginar. Cada
  movimiento trae el `user` que lo hizo. Leerlo pide los mismos permisos que
  el resto de las lecturas de caja (`sales.create` o `cash.open`)
- **El cierre es irreversible:** la sesión cerrada es inmutable y un segundo
  cierre devuelve 409, por eso el arqueo pide confirmación explícita
- `cashIn` del resumen incluye las ventas en efectivo, no solo los depósitos
  manuales
- El POS manda siempre el `unitPrice` de cada línea para que su total sea
  idéntico al que calcula el backend: si difiriera por centavos, el vuelto
  que calcula el servidor no sería el que vio el cajero
- **Vuelto en efectivo.** El backend valida, en este orden: los pagos NO
  efectivos no pueden superar el total (tarjeta y transferencia no dan
  vuelto), la suma tiene que cubrir el total, y el vuelto (suma − total) no
  puede superar el efectivo recibido. Tolerancia de `0.004`. La respuesta
  trae `changeGiven`, que además queda persistido en la venta
- **Los `payments` se guardan por el bruto entregado**, y a la caja entra el
  NETO (efectivo recibido − vuelto) en un solo movimiento `SALE_CASH` por
  venta. Por eso el resumen del turno expone `summary.changeGiven`: el
  efectivo de `salesByPaymentMethod` es el bruto y `expectedCash` es el neto,
  y el vuelto es exactamente la diferencia entre los dos
- **El historial de cajas pide `cash.close` o `reports.view`**, no los
  permisos del turno en curso: el cajero revisa sus propios cierres y un
  encargado con `reports.view` puede mirarlos sin tocar la caja. Por eso
  tiene su propia entrada de menú, y no solo un enlace dentro de Caja
- **El detalle de un turno no dice con qué medio se pagó cada venta.** El
  desglose por medio de pago que devuelve es AGREGADO del turno; la lista de
  ventas trae número, hora, total, cliente y estado
- **`stock.allow_negative` cambia el comportamiento de la venta.** Con la
  setting en `true` el backend acepta vender sin stock (queda negativo y se
  regulariza después) y marca la venta con `oversold`; con `false` responde
  409 como siempre. El POS la lee para avisar antes de cobrar: aviso ámbar
  cuando se va a vender en negativo, aviso rojo cuando el backend lo va a
  rechazar. El bloqueo real lo sigue haciendo el servidor — el stock que
  conoce la pantalla puede estar desactualizado
- **Leer `/api/settings` acepta `sales.create` o `settings.manage`**,
  justamente para que el POS pueda consultarla; escribir exige
  `settings.manage` y queda auditado
- **`PATCH /api/settings` recibe un ARRAY pelado** y NO crea claves nuevas:
  el set lo define el seed. Los valores son siempre string, y valida por
  clave (`stock.allow_negative` solo `"true"`/`"false"`; redondeo y umbral,
  números no negativos)
- **Usuarios: el backend se protege solo contra el auto-bloqueo.** Rechaza
  desactivarse a uno mismo, eliminarse, y quitarse `users.manage` (tanto por
  cambio de rol como por override). La pantalla aplica las mismas reglas
  antes de ofrecer la acción: son cálculos idénticos sobre el rol y los
  overrides, no una lista de casos aparte
- **No hay endpoint de sucursales.** El selector del formulario de usuario se
  arma con las sucursales que ya tienen asignadas otros usuarios, y lo
  aclara: no puede ofrecer una recién creada que todavía no tenga gente
- **`PUT /api/users/:id/permissions` recibe un ARRAY pelado** y reemplaza
  TODOS los overrides, así que siempre se manda la lista completa
- **Presupuestos: el vencimiento no es un estado.** El enum tiene `EXPIRED`
  pero ningún código lo escribe: el backend compara `expiresAt` contra su
  reloj y manda el flag `isExpired`. Un presupuesto vencido sigue en
  `ACTIVE`, así que la interfaz muestra estado y vencimiento por separado y
  no ofrece filtrar por «vencido»
- **`POST /api/quotes/:id/convert` recibe solo `{ registerId, payments, notes? }`**:
  los items y sus precios salen del presupuesto, no del body. Por eso la
  conversión es una pantalla propia y no el POS, que ni siquiera podría
  mandar su carrito
- **Convertir puede fallar por stock**: el presupuesto NO reserva mercadería.
  El backend hace todo en una transacción, así que ante el 409 el
  presupuesto sigue activo y se puede reintentar
- **`GET /api/products/:id` NO trae `defaultPrice` ni `availableStock`**: esos
  dos los agrega solo el listado, con consultas agregadas por página. Por eso
  la consulta de precios saca los precios por lista del detalle (`prices`) y
  el stock del listado, buscando por SKU
- **El listado de productos trae `defaultPrice` y `availableStock`**, los dos
  como `number` ya calculado (no son `Decimal`). `defaultPrice` es el precio
  en la lista por defecto y viene `null` si el producto no cotiza en ella;
  `availableStock` es la suma de `currentQty − reservedQty` de los lotes sin
  contar los de cuarentena, el mismo criterio que usa el POS
- **Los costos son de solo lectura en el catálogo.** `lastCost` y
  `averageCost` se actualizan desde las recepciones de compra; el formulario
  los muestra sin editarlos y solo con `products.view_cost`
- **`plantDetail` solo se manda si el producto es de tipo `PLANT`**: el
  backend devuelve 400 si llega en un producto convencional. Y el `kind` no
  viaja en el PATCH, porque su schema no lo acepta
- Los booleanos de la ficha son de **tres estados**: `true`, `false` y `null`
  («sin dato»). El formulario los distingue en vez de colapsarlos a un check
- **Las compras exigen `branchId`** en el alta y sale de la sucursal del
  usuario: quien no tenga una asignada no puede crear órdenes
- **Los estados de recepción no se ponen a mano.** Las transiciones manuales
  son DRAFT→REQUESTED→APPROVED→SENT (más cancelar); `PARTIALLY_RECEIVED` y
  `RECEIVED` los pone el backend al registrar una recepción
- **La orden solo se edita en DRAFT o REQUESTED**, y mandar `items` en el
  PATCH reemplaza todos los de la orden
- **`/api/dashboard/purchases` solo devuelve lo que está bajo mínimo.** No
  calcula cantidades a pedir, estacionalidad ni proveedores sugeridos, así
  que la pantalla se llama «Productos a reponer» y no promete otra cosa
