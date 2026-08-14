# Changelog — TerraFlorOS frontend

## [0.9.0] — Clientes y selector de cliente en el POS

- **Padrón de clientes** con búsqueda por nombre, teléfono, email o CUIT, y
  filtros por segmento y estado. Las filas abren la ficha
- **Alta y edición** con los campos del modelo: nombre, teléfono, WhatsApp,
  email, CUIT, segmento, lista de precios asignada, límite de crédito, notas
  y estado. Validación con Zod espejando la del backend, errores por campo y
  `noValidate` para que el aviso del navegador no tape el mensaje propio
- **Ficha del cliente** con sus datos, direcciones, cuenta corriente y las
  ventas que se le hicieron
- **Direcciones**: alta y baja con barrio, localidad y referencia. La
  invariante «una sola principal» la resuelve el backend, así que la pantalla
  solo la explica: la primera queda principal aunque no se marque, y marcar
  una nueva desmarca la anterior
- **Cuenta corriente de solo lectura**: saldo (positivo = deuda), límite de
  crédito y los movimientos paginados. No hay botones de «registrar pago» ni
  «vender a crédito» porque esa funcionalidad todavía no existe en el
  backend; sin movimientos muestra saldo $ 0,00 y lo dice explícitamente
- **Baja lógica** con confirmación: el cliente deja de aparecer en el padrón
  y en el POS, y el historial de ventas se conserva

### En el POS

- **Selector de cliente** con typeahead sobre `/api/customers?search=`. Es
  opcional: se puede seguir vendiendo sin cliente, igual que antes. El
  elegido se muestra con su segmento y se puede quitar
- **Si el cliente tiene lista de precios asignada, el POS pasa a esa lista** y
  recalcula el carrito. El selector de lista queda fijo mientras ese cliente
  esté elegido, porque el backend factura con la suya: mandar precios de otra
  lista haría que rechace la venta por «vender por debajo del precio de lista»
- El comprobante de la venta muestra a quién se le facturó, y al empezar una
  venta nueva el cliente se limpia junto con el carrito

### Cambios internos

- `erroresPorCampo`, `textoAApi` y `numeroAApi` viven en `lib/forms.ts`:
  estaban duplicados en productos y proveedores, que ahora los reexportan
- `usePriceLists` acepta desactivarse: leer las listas exige `products.view`,
  así que el formulario de cliente no dispara un 403 evitable y muestra ese
  campo de solo lectura
- Nuevo hook `useSales` para listar ventas (`GET /api/sales`), que usa la
  ficha del cliente filtrando por `customerId`

## [0.8.0] — Precio y stock en la grilla + movimientos reales de caja

- **Grilla de productos con precio y stock.** El listado ahora devuelve
  `defaultPrice` y `availableStock`, así que la tabla dejó de esconder esas
  columnas. Si el producto no cotiza en la lista por defecto, la celda dice
  «Sin precio» en vez de mostrar un cero que no es cierto
- El stock disponible se pinta en ámbar cuando está en o por debajo del
  mínimo, con el mínimo como dato secundario en la misma celda. La columna
  «Mínimo» aparte desapareció: era la misma información en dos lugares
- **Movimientos de caja reales.** La tabla del turno sale de
  `GET /api/cash/sessions/:id/movements`, no de lo que se hubiera cargado en
  esta pantalla. Ahora se ven las ventas en efectivo y lo que registró otro
  cajero, con la columna «Usuario» para saber quién hizo cada cosa
- Los movimientos automáticos (`SALE_CASH`, `REFUND`) se distinguen de los
  cargados a mano por el color de la etiqueta
- Se fue la nota que aclaraba que solo se listaban los movimientos cargados
  desde la pantalla: ya no es cierta
- Al registrar un movimiento la lista se actualiza sola, porque la clave de
  caché cuelga de `["cash"]` y la mutación invalida esa rama entera

### Sobre el contrato del backend

- `defaultPrice` y `availableStock` llegan como `number` ya calculado, no
  como `Decimal` string: los calcula el backend con agregados
- `availableStock` es Σ(`currentQty` − `reservedQty`) de los lotes sin contar
  los de cuarentena, el mismo criterio con el que el POS arma el FIFO
- El endpoint de movimientos no pagina y ordena cronológicamente ascendente;
  leerlo pide `sales.create` o `cash.open`, igual que el resto de la caja

## [0.7.0] — Proveedores como pantalla propia

- **Padrón de proveedores** con búsqueda por razón social, nombre comercial
  o CUIT, y filtro por activo/inactivo. Las filas abren la ficha
- **Alta y edición** con todos los campos del modelo: razón social, nombre
  comercial, CUIT, contacto, teléfono, WhatsApp, email, dirección, días de
  entrega, mínimo de compra, condiciones de pago, notas y estado.
  Validación con Zod espejando la del backend, con errores por campo
- **Ficha del proveedor** con sus datos, su catálogo y las compras que se le
  hicieron. Las órdenes en borrador son los presupuestos todavía sin
  confirmar, y cada una muestra su estado con el color del módulo de compras
- **Catálogo del proveedor** (`supplier_products`, que el backend sí
  expone): cómo llama y presenta cada producto, con la equivalencia en
  unidades base y cuál es el preferido. El último costo aparece solo con
  `products.view_cost`
- **Baja lógica** con confirmación. Si el proveedor tiene compras sin
  finalizar, el 409 se traduce a cuántas son y qué hacer con ellas

### Cambios internos

- El hook de proveedores para los selectores vive ahora en el módulo de
  proveedores; compras lo reexporta con el nombre que ya usaba, así hay una
  sola implementación y el formulario de compra sigue igual
- El formulario de proveedor usa `noValidate`: con `type="email"` el
  navegador cortaba el envío con su propio aviso y el mensaje en castellano
  del formulario nunca llegaba a mostrarse

## [0.6.0] — Compras, recepción con generación de lotes y productos a reponer

- **Lista de compras** con filtros por estado, proveedor y rango de fechas.
  Cada estado tiene su color para reconocer la etapa de un vistazo
- **Alta y edición de órdenes**: proveedor, productos con cantidad y costo,
  descuento, impuestos, flete, otros costos, fecha esperada, condiciones de
  pago y notas. Al cargar un costo se compara con el último conocido y se
  resalta si supera el umbral configurado (`costIncreaseAlert`)
- **Detalle** con los ítems, lo recibido de cada uno y las recepciones
  hechas. Solo aparecen los botones de las transiciones que el backend
  acepta; si igual rechaza una, el 409 se traduce a «desde X solo se puede
  pasar a Y»
- **Recepción de mercadería**: lista los ítems pendientes con lo que falta y
  el costo de la orden por defecto, permite recibir parcialmente y bloquea
  las cantidades por encima de lo pendiente antes de mandar nada. Pide
  confirmación, porque genera stock real
- Al terminar, la recepción muestra **qué generó**: el código de cada lote,
  las cantidades y que los costos del producto quedaron actualizados
- **Productos a reponer** (`/reposicion`): los que están en o por debajo de
  su mínimo. Es deliberadamente simple — muestra disponible, mínimo y la
  resta entre ambos, y aclara que no es una cantidad sugerida de compra

### Sobre el contrato del backend

- Las compras exigen `branchId`, que sale de la sucursal del usuario; sin
  sucursal asignada no se pueden crear órdenes
- Los estados de recepción (`PARTIALLY_RECEIVED`, `RECEIVED`) no se ponen a
  mano: los pone el backend al registrar una recepción
- La orden solo se edita en DRAFT o REQUESTED, y mandar `items` en el PATCH
  reemplaza todos los de la orden
- `/api/dashboard/purchases` no calcula cantidades a pedir ni estacionalidad,
  así que la vista no lo promete

## [0.5.0] — Módulo de catálogo: productos, plantas, categorías y precios

- **Lista de productos** con búsqueda por nombre, SKU, código interno,
  código de barras y nombre científico, más filtros por tipo, categoría,
  estado y favoritos. Las filas abren la ficha. La columna de costo aparece
  solo con `products.view_cost`
- **Alta y edición de productos**: datos base, categoría del árbol, unidad,
  proveedor, parámetros de reposición y estado. El tipo se elige en el alta
  y después queda bloqueado, porque el PATCH del backend no lo acepta
- **Ficha botánica** para las plantas: más de treinta campos agrupados en
  secciones plegables (Identificación, Presentación, Cultivo y Notas), con
  Identificación abierta y el resto cerrado para no abrumar en el alta
- **Precios por lista** con guardado en lote (`PUT .../prices`) e historial
  de cambios. El margen sobre el costo promedio se muestra solo con
  `products.view_cost`, y editar precios requiere `prices.edit`
- **Códigos de barras**: alta y baja, con el 409 explicando a qué producto
  pertenece un código repetido
- **Categorías** en `/categorias`: árbol de dos niveles, alta, renombre y
  baja. El 409 al borrar dice cuántos productos y subcategorías lo impiden
- Validación con Zod en el formulario, espejo de la del backend, con errores
  por campo; los errores de validación que devuelve el servidor se muestran
  en el mismo lugar
- Componentes nuevos en `ui/`: `Collapsible`, `Textarea`, `Checkbox` y
  `TriStateSelect` (sí / no / sin dato, para no convertir «no sabemos» en «no»)

### Corregido

- El asterisco de campo obligatorio entraba en el nombre accesible del
  control («Nombre*»). Ahora va con `aria-hidden`: lo obligatorio ya lo
  comunica el atributo `required`

## [0.4.1] — El input de monto ya no pierde el foco

### Corregido

- **El campo «Efectivo contado» del arqueo perdía el foco con cada tecla**,
  así que había que volver a hacer clic para escribir cada dígito. No era un
  remontaje: el `useEffect` de `Modal` dependía de `[open, onClose]`, y
  `onClose` se redefine en cada render del que lo usa, así que el efecto se
  re-ejecutaba con cada tecla y su `panelRef.focus()` le robaba el foco al
  input. Ahora `onClose` vive en un ref y el efecto solo depende de `open`
- El foco inicial del modal, además, ya no pisa a un campo con `autoFocus`:
  solo entra al panel si el foco no está adentro
- Afectaba a cualquier formulario dentro de un `Modal`, no solo al arqueo
- **El monto de apertura de caja arrancaba en `"0"`**, así que tipear un
  importe lo anteponía (`12345` quedaba `012345`). Ahora arranca vacío con
  `0,00` de placeholder
- El formulario de movimientos no estaba afectado: no vive dentro de un modal

## [0.4.0] — Gestión de caja: movimientos y cierre con arqueo

- **Movimientos manuales** (requiere `cash.movement`, oculto con `<Can>`):
  alta de gasto, retiro o depósito con descripción obligatoria. Al
  registrarlo se refresca el resumen del turno, así que el efectivo esperado
  se actualiza en el momento
- **Cierre con arqueo** (requiere `cash.close`): diálogo en dos pasos —
  primero se declara el efectivo contado y se ve la diferencia contra lo
  esperado, y recién después se confirma. El cierre es irreversible, así que
  la confirmación es explícita
- La diferencia se muestra en vivo mientras se tipea: verde si cuadra,
  ámbar si hay faltante, celeste si hay sobrante. Sin dramatizar
- Al cerrar se muestra el resumen final (esperado, contado, diferencia) y la
  pantalla vuelve al estado «sin caja abierta»
- Un usuario con `sales.create` pero sin `cash.movement` ni `cash.close` ve
  el resumen del turno sin los botones de mover ni cerrar. La ruta `/caja` y
  su ítem de menú se abrieron a `sales.create` para reflejar lo que ya
  permite el backend en las lecturas

### Limitación del backend

- **No hay endpoint que liste los movimientos de una sesión.**
  `/sessions/current` devuelve solo `movementsCount`. La tabla lista los
  movimientos cargados desde esa pantalla y aclara el total del turno según
  el servidor, en vez de aparentar un historial completo

## [0.3.0] — POS alineado con los endpoints nuevos del backend

- `POST /api/cash/sessions` ahora manda **`registerId`** (antes
  `cashRegisterId`). El backend unificó el nombre y su schema es `.strict()`,
  así que el anterior devolvía 400
- **Métodos de pago reales:** el panel de cobro consume
  `GET /api/payment-methods`. Se quitó la degradación que deshabilitaba el
  cobro por falta del endpoint; ahora el cobro se habilita normalmente
- **Listas de precios del backend:** `GET /api/price-lists` devuelve las
  activas con la default primera, y el POS la usa como precio base en vez de
  deducirla de los precios cargados. Si hay más de una se puede elegir, y
  cambiarla recalcula todo el carrito
- **Un vendedor sin `cash.open` ya puede vender.** El backend pasó las
  lecturas de caja a `sales.create` O `cash.open`; el guard del POS exigía
  `cash.open` y habría anulado ese arreglo, dejando al vendedor sin poder
  facturar. Abrir la caja sigue requiriendo `cash.open`

## [0.2.0] — POS de ventas y apertura de caja

- **Apertura de caja** (`/caja`, y como primer paso del POS): elegir caja de
  la sucursal y declarar el saldo inicial. Las cajas ya abiertas se muestran
  deshabilitadas con quién y cuándo la abrió. Sin el permiso `cash.open` se
  explica que hay que pedírselo a un encargado
- **Estado del turno** en `/caja`: saldo inicial, ingresos, egresos, efectivo
  esperado y cobros por medio de pago, con el resumen en vivo del backend
- **POS de ventas** (`/ventas`, permiso `sales.create`), en dos zonas:
  - Un solo buscador que sirve para escanear y para buscar. Enter busca el
    código exacto por `/by-barcode/:code` y lo manda derecho al carrito; al
    tipear muestra resultados por nombre o SKU con debounce. Después de cada
    alta el foco vuelve al buscador: se carga una venta entera sin el mouse
  - Carrito con cantidad editable, precio unitario (bloqueado sin
    `sales.discount`), subtotal por línea y total grande
  - Panel de cobro con **pago mixto**: varias filas método + monto, con
    cuánto falta o sobra en vivo. Cobrar se habilita solo cuando la suma da
    exacta, que es lo que exige el backend
  - Errores por acción: el 409 de stock dice qué producto y cuánto hay; el
    409 de caja vuelve a la pantalla de apertura
  - Confirmación antes de vaciar el carrito
- Los ítems de menú **Ventas** y **Caja** dejaron de ser provisorios
- Nuevos componentes `Modal` y `ConfirmDialog` en `components/ui/`

### Diferencias con el contrato que encontramos en el backend

- `POST /api/cash/sessions` recibe **`cashRegisterId`**, no `registerId`, y su
  schema es `.strict()`: mandar el otro nombre devuelve 400. El resto de los
  endpoints sí usa `registerId`
- **`GET /api/payment-methods` no existe.** Sin él no se puede cobrar: el POS
  muestra el motivo y deja el botón deshabilitado, pero el carrito y los
  totales siguen funcionando. No se cablearon ids fijos a propósito, porque
  cobrar con el método equivocado sería un error silencioso en los datos
- **`GET /api/price-lists` no existe** y el detalle de producto no dice cuál
  es la lista por defecto. El POS deduce las listas de los precios de los
  productos cargados y, si hay más de una, deja elegir. Manda siempre el
  `unitPrice` para que su total sea idéntico al del backend
- **No hay endpoint de clientes**, así que la venta va sin cliente. El
  backend acepta `customerId` opcional, listo para cuando exista

### Corregido

- Choque de utilidades de Tailwind: los controles de `ui/` traen `w-full` y
  pasarles un `w-*` por `className` dejaba compitiendo dos anchos, con el
  selector de método de pago aplastado. Los anchos fijos ahora van en un
  contenedor

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
