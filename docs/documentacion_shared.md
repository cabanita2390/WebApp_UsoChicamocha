# Documentación de Componentes Compartidos

Este documento describe los componentes compartidos utilizados en múltiples vistas de la aplicación.

## DataGrid.svelte

**Ubicación**: `components/shared/DataGrid.svelte`

**Funcionalidad**:
Componente de tabla avanzada construido con TanStack Table v8, proporciona funcionalidades completas de gestión de datos tabulares.

**Props principales**:
- `columns`: Definición de columnas con headers, accessors y metadatos
- `data`: Array de datos a mostrar
- `totalPages`, `currentPage`, `pageSize`, `totalElements`: Información de paginación

**Características**:

### Filtrado y búsqueda
- Campo de búsqueda global que filtra en todas las columnas
- Filtrado en tiempo real mientras se escribe

### Ordenamiento
- Clic en headers para ordenar ascendente/descendente
- Indicadores visuales de ordenamiento (▲ ▼)
- Ordenamiento múltiple soportado

### Paginación
- Controles de navegación (Primero, Anterior, Siguiente, Último)
- Selector de tamaño de página (10, 20, 30, 50, 100, 250)
- Indicador de página actual y total de registros

### Celdas especiales

#### Celdas de acción
- `isAction`: Botones Editar/Eliminar
- `isExecuteAction`: Botón Ejecutar (órdenes de trabajo)
- `isCvAction`: Ver Hoja de Vida
- `isImageAction`: Ver imágenes

#### Celdas de estado
- `isStatus`: Estados con colores (óptimo/regular/malo)
- `isDateStatus`: Estados basados en fechas de expiración
- Clic en celdas de estado dispara eventos de menú contextual

#### Celdas condicionales
- `isOrigin`: Coloreado basado en origen (inspección/imprevisto)
- `isCondition`: Coloreado basado en condición

### Eventos emitidos
- `action`: Acciones de fila (edit, delete, execute, etc.)
- `cellContextMenu`: Clic en celdas de estado
- `pageChange`: Cambio de página
- `sizeChange`: Cambio de tamaño de página

### Layout
- Soporte para layout fijo o automático
- Scroll interno para tablas grandes
- Diseño responsive con contenedores flex

### Estilos
- Tema Windows 95/98 consistente
- Colores semánticos para estados
- Bordes inset/outset
- Tipografía MS Sans Serif

## Loader.svelte

**Ubicación**: `components/shared/Loader.svelte`

**Funcionalidad**:
Indicador visual de carga simple con animación de spinner.

**Características**:
- Spinner circular con borde azul animado
- Animación CSS infinita de rotación
- Tamaño fijo de 36x36px
- Diseño minimalista y consistente

**Uso**:
Se utiliza en estados de carga de operaciones asíncronas como fetch de datos, envío de formularios, etc.

## NotificationDropdown.svelte

**Ubicación**: `components/shared/NotificationDropdown.svelte`

**Funcionalidad**:
Dropdown desplegable para mostrar notificaciones del sistema con capacidad de eliminación individual.

**Props**:
- `messages`: Array de objetos de notificación con `id` y `text`

**Características**:

### Estados
- Lista de notificaciones con texto descriptivo
- Estado vacío: "No hay notificaciones"
- Scroll automático para listas largas (max-height: 400px)

### Interacciones
- Botón de eliminar (×) por notificación
- Prevención de propagación de clics para evitar cerrar dropdown
- Evento `delete` emitido con ID de notificación

### Posicionamiento
- Posición absoluta relativa al botón padre
- Alineación derecha con offset
- Z-index alto para superponer otros elementos

### Estilos
- Tema Windows 95/98
- Bordes y sombras consistentes
- Colores diferenciados para estado vacío

## Sidebar.svelte

**Ubicación**: `components/shared/Sidebar.svelte`

**Funcionalidad**:
Barra lateral de navegación con iconos y texto expandible.

**Props**:
- `activeView`: Vista actualmente activa para resaltar

**Características**:

### Navegación
- Botones para cada vista principal
- Iconos SVG representativos
- Texto descriptivo oculto por defecto

### Interacciones
- Hover para expandir barra lateral
- Clic para cambiar vista
- Estados activos visuales

### Vistas disponibles
- Dashboard
- Usuarios
- Máquinas
- Órdenes de Trabajo
- Consolidado
- Gestión de Aceites

### Diseño
- Ancho fijo de 60px, expande a 200px en hover
- Posición fixed en lado izquierdo
- Z-index alto para permanecer visible

## WorkOrderModal.svelte

**Ubicación**: `components/shared/WorkOrderModal.svelte`

**Funcionalidad**:
Modal para crear y gestionar órdenes de trabajo.

**Props**:
- `rowData`: Datos de la fila que originó la orden
- `columnDef`: Definición de columna (para contexto de estado)
- `currentUser`: Usuario actual para asignación

**Características**:

### Formulario
- Campos para descripción, asignación, prioridad
- Validación de campos requeridos
- Estados de carga durante envío

### Estados
- Creación de nuevas órdenes
- Edición de órdenes existentes
- Visualización de detalles

### Eventos
- `createWorkOrder`: Emite datos para crear orden
- `cancel`: Cierra modal sin guardar

## ExecuteOrderModal.svelte

**Ubicación**: `components/shared/ExecuteOrderModal.svelte`

**Funcionalidad**:
Modal especializado para la ejecución de órdenes de trabajo completadas.

**Props**:
- Datos de la orden a ejecutar
- Información del usuario actual

**Características**:
- Formulario de confirmación de ejecución
- Registro de resultados y observaciones
- Actualización de estado de orden

## ImageCarouselModal.svelte

**Ubicación**: `components/shared/ImageCarouselModal.svelte`

**Funcionalidad**:
Modal para visualización de imágenes en carrusel.

**Props**:
- `imageUrls`: Array de URLs de imágenes
- `isLoading`: Estado de carga de imágenes

**Características**:

### Navegación
- Controles anterior/siguiente
- Indicadores de posición
- Navegación por teclado

### Estados
- Carga de imágenes
- Estado vacío si no hay imágenes
- Overlay modal con cierre por clic externo

### Interacciones
- `close`: Evento emitido al cerrar modal

## AssetFuelConfigQuickModal.svelte

**Ubicación**: `components/shared/AssetFuelConfigQuickModal.svelte`

**Usado en**: `FuelPerformanceHistory.svelte`

**Funcionalidad**:
Modal "Ajustar consumo estándar" contextual — misma lógica de unidades y mismo payload que `AssetFuelConfigManagement.svelte` (panel admin masivo), pero sin buscador de activo: el activo ya viene fijo porque se abre desde el detalle de Rendimiento de ESE activo. Escribe directo contra `asset_fuel_config` vía `data.updateAssetFuelConfigMachine`/`updateAssetFuelConfigVehicle`.

**Props**:
- `tipoElemento`: `'MAQUINARIA' | 'VEHICULO' | 'MOTOCICLETA'`
- `activoId`, `activoLabel`: identifica y rotula el activo fijo
- `fuelTypes`: catálogo de combustibles
- `currentConfig`: configuración ya existente del activo, o `null` si no tiene una

**Características**:
- La unidad de consumo se deriva automáticamente del combustible elegido (galón → Km/Gl u H/Gl; m³ → Km/M3 u H/M3), usando "por hora" para maquinaria y "por km" para vehículo/moto — mismo criterio que `AssetFuelConfigManagement`.
- Si el usuario cambia de combustible, la unidad se resugiere para la nueva familia física sin pisar una elección manual previa mientras el combustible no cambie.
- Campo de capacidad del tanque opcional.

**Eventos**: `success` (guardado ok), `close`.

## CurriculumModal.svelte

**Ubicación**: `components/shared/CurriculumModal.svelte`

**Usado en**: `VehicleManagement.svelte`, `MotoManagement.svelte`

**Funcionalidad**:
Modal de "Hoja de Vida" de un activo — reutiliza `DataGrid` (con `curriculumColumns` de `config/table-definitions.js`) para listar su historial.

**Props**:
- `open`, `plate`, `loading`, `results` (filas del historial), `emptyMessage`

**Características**: estado de carga (`Loader`), tabla cuando hay resultados, mensaje vacío en caso contrario, cierre por Escape o clic en overlay.

**Eventos**: `close`.

## DocHistoryModal.svelte

**Ubicación**: `components/shared/DocHistoryModal.svelte`

**Usado en**: `VehicleManagement.svelte`, `MotoManagement.svelte`

**Funcionalidad**:
Modal de historial de documentación (SOAT, tecnomecánica, tarjeta de propiedad, extintor) de un vehículo/moto — muestra todas las versiones subidas, no solo la vigente.

**Props**:
- `open`, `plate`, `loading`, `history` (array de registros), `emptyMessage`

**Características**:
- Tabla con tipo de documento, fecha de vigencia, estado calculado (Vigente/Próximo a Vencer/Vencido, con color), si es la versión activa o fue reemplazada, fecha de registro, quién lo subió, y enlace al archivo.
- Filas coloreadas distinto según si el documento está vigente o fue reemplazado.

**Eventos**: `close`.

## DocumentErrorModal.svelte

**Ubicación**: `components/shared/DocumentErrorModal.svelte`

**Usado en**: `App.svelte` (montado globalmente, una sola instancia para toda la app)

**Funcionalidad**:
Modal de error ilustrado ("gotita triste" animada en SVG) que se muestra cuando un documento no se puede abrir (no cargado, eliminado/reemplazado, o falla temporal al recuperarlo). No recibe props — se controla enteramente por el store `documentErrorVisible` (`stores/ui.js`); cualquier vista lo dispara con `documentErrorVisible.set(true)`.

**Características**: mascota SVG animada (parpadeo, rebote, lágrima), cierre por Escape, clic fuera, o el botón "Cerrar".

## DocumentUpdateModal.svelte

**Ubicación**: `components/shared/DocumentUpdateModal.svelte`

**Funcionalidad**:
Formulario para renovar la documentación de un vehículo/moto (SOAT, tecnomecánica, tarjeta de propiedad, extintor), con carga de archivo.

**Props**:
- `placa`, `soatVencimiento`, `tecnoVencimiento`, `extintorVencimiento`, `isSubmitting`

**Características**:
- El selector de tipo de documento adapta el resto del formulario: fecha completa para SOAT/tecnomecánica, selector de mes para extintor (se guarda como el día 1 de ese mes), sin campo de fecha para tarjeta de propiedad (solo archivo).
- Muestra la fecha de vencimiento actual del documento seleccionado como referencia.
- Valida tamaño de archivo con `validateDocumentFileSize` antes de enviar.

**Eventos**: `submit` (con `{ tipoDocumento, fechaVencimiento, file }`), `cancel`.

## EditAssetModal.svelte

**Ubicación**: `components/shared/EditAssetModal.svelte`

**Usado en**: `VehicleManagement.svelte`, `MotoManagement.svelte`

**Funcionalidad**:
Modal genérico de edición de un activo (vehículo o moto) — placa, marca, kilometraje, pertenencia, ubicación y estado, más (si el usuario es admin) los campos de configuración de combustible embebidos vía `FuelConfigFields`. Usa un `<slot name="type-field">` para que cada llamador inserte su propio campo específico (p. ej. tipo de vehículo).

**Props principales**:
- `open`, `title`, `asset` (objeto editado por referencia con `bind`), `brands`, `locations`, `isAdmin`, `isSubmitting`, `errorMessage`, `submitDisabled`, `belongsToRequired`, `locationTitle`
- `fuelConfig`, `fuelTypes`: para la sección de combustible (solo visible si `isAdmin && fuelConfig`)

**Características**: botones "+ Añadir" junto a Marca y Ubicación que emiten `quickcatalog` para abrir `QuickCatalogModal` sin salir del formulario.

**Eventos**: `submit`, `close`, `quickcatalog` (con `'brand'` o `'location'`).

## FuelConfigFields.svelte

**Ubicación**: `components/shared/FuelConfigFields.svelte`

**Usado en**: `MachineManagement.svelte`, `VehicleManagement.svelte`, `MotoManagement.svelte` (embebido dentro de `EditAssetModal`/formularios propios)

**Funcionalidad**:
Fragmento reutilizable (no es un modal, se embebe dentro de otro formulario) de Combustible + Consumo estándar + Unidad + Capacidad del tanque, conectado a `asset_fuel_config` — permite cargar/editar esto sin salir del alta/edición del activo. Opcional: si no se elige combustible, el resto de campos queda deshabilitado.

**Props**:
- `fuelTypeDefaultId`, `consumoEstandar`, `unidadConsumo`, `tanqueCapacidadGal` (todos `bind:`)
- `fuelTypes`, `disabled`, `idPrefix` (para IDs únicos si se usa más de una vez en la misma página)
- `preferPorHora`: cuál de las 2 unidades válidas se sugiere primero (horómetro para maquinaria, km para vehículo/moto)

**Características**: la unidad disponible depende solo de la familia física del combustible (galón vs. m³), no del tipo de activo; se resetea automáticamente al cambiar de combustible.

## FuelPerformanceSparkline.svelte

**Ubicación**: `components/shared/FuelPerformanceSparkline.svelte`

**Usado en**: `FuelPerformance.svelte` (una por tarjeta de activo, potencialmente decenas a la vez)

**Funcionalidad**:
Mini-gráfica (ECharts) de esperado vs. ejecutado de los últimos 30 días de un activo, para dar un vistazo rápido dentro de su tarjeta antes de entrar al historial completo. Versión liviana de `FuelTrendChart` (sin ejes, leyenda ni zoom) porque se renderiza en grilla, muchas a la vez.

**Props**:
- `esperado`, `ejecutado`: arrays de la serie
- `unidad`, `colorEsperado` (default `#2a78d6`), `colorEjecutado` (default `#e67e22`) — mismos colores que el gráfico grande para que el usuario reconozca las series al pasar de la tarjeta al historial
- `height` (default `76`)

**Características**: sin animación ni renderizado si hay menos de 2 puntos; marca el último punto de cada serie con un círculo; tooltip al pasar el mouse.

## OilChangeAlertWidget.svelte

**Ubicación**: `components/shared/OilChangeAlertWidget.svelte`

**Funcionalidad**:
Widget de alertas de cambio de aceite en tiempo real — se suscribe al store `oilChangeAlerts` (alimentado vía STOMP, ver `documentacion_websocket_final.md`) y muestra el estado de conexión más una lista ordenada por severidad (ROJO/AMARILLO/AZUL/VERDE).

**Características**:
- Indicador de conexión ("Conectado a alertas en tiempo real" / "Desconectado").
- Por cada alerta: placa/nombre, tipo de activo, mensaje, % de uso del intervalo, distancia restante, hora del evento, y una barra de progreso.
- Resumen final con conteo de urgentes/próximos/programados.

No recibe props — depende de `composables/useOilChangeAlerts` y `stores/websocket`.

## QuickCatalogModal.svelte

**Ubicación**: `components/shared/QuickCatalogModal.svelte`

**Usado en**: `VehicleManagement.svelte`, `MotoManagement.svelte`

**Funcionalidad**:
Modal genérico para crear rápidamente un valor de catálogo (marca o ubicación) sin salir del formulario de alta/edición de un activo — se abre desde los botones "+ Añadir" de `EditAssetModal`. Se apila sobre el modal que lo invocó (z-index más alto).

**Props**: `open`, `title`, `placeholder`, `value` (bind), `error`, `submitting`

**Eventos**: `submit`, `close`.

## RefuelingFormModal.svelte

**Ubicación**: `components/shared/RefuelingFormModal.svelte`

**Usado en**: `FuelHistory.svelte`, `TanqueoDistribucion.svelte`, `FuelPerformanceHistory.svelte`

**Funcionalidad**:
Formulario de registro/edición de un tanqueo — extraído de `TanqueoDistribucion.svelte`, que tenía este mismo formulario duplicado (uno para crear, otro para editar). `initialRow` es lo único que distingue los dos modos: `null` = crear, objeto de tanqueo = editar (precarga los campos). El componente arma el `FormData` y delega el envío real al padre vía la prop `onSubmit` (así cada vista decide si llama a `createRefueling` o `updateRefueling`).

**Props principales**:
- `initialRow` (null = crear), `assetEditable` (false cuando el activo ya viene fijo por contexto, oculta el buscador), `titleSuffix`
- `fuelTypes`, `vehicles`, `motos`, `machines`, `origenesConocidos`, `elementosCargando`
- `onSubmit`: `async (FormData) => Promise` inyectado por el padre

**Características**:
- Buscador de activo con un solo input que filtra por placa/marca/nombre al escribir.
- Al seleccionar el activo, precarga el horómetro/km con la última lectura reportada.
- El lugar (Bomba/Almacén) se sugiere según el tipo de activo al cambiarlo, pero es editable.
- Campos de precio, total pagado y carga de factura solo aparecen cuando `lugar = BOMBA`.
- En modo edición, si el tanqueo ya tiene factura, muestra un enlace "Ver factura actual" (la nueva carga es opcional y reemplaza la existente).

**Eventos**: `success`, `close`.

## RegisterMonthlyDiscountModal.svelte

**Ubicación**: `components/shared/RegisterMonthlyDiscountModal.svelte`

**Usado en**: `FuelFinancialDashboard.svelte`

**Funcionalidad**:
Modal para registrar un descuento mensual del proveedor de combustible (rango de fechas + monto), vía `data.createMonthlyDiscount`.

**Características**: valida que la fecha fin no sea anterior a la fecha inicio y que el monto sea mayor a 0.

**Eventos**: `saved`, `close`.

## ReintegroModal.svelte

**Ubicación**: `components/shared/ReintegroModal.svelte`

**Usado en**: `FuelHistory.svelte`, `TanqueoDistribucion.svelte`

**Funcionalidad**:
Modal para reintegrar galones/m³ no usados de un tanqueo ya registrado. Muestra fecha, cantidad tanqueada, ya reintegrado y saldo disponible; valida en cliente que la cantidad a reintegrar no supere el saldo (mismo criterio que `FuelReintegrationService.registrar` en el backend, para dar el error sin esperar el viaje al servidor).

**Props**:
- `row`: el tanqueo a reintegrar (`{ id, cantidadGalones, cantidadReintegrada, fechaRegistro }`)
- `onSubmit`: `async ({ refuelingId, cantidadReintegrada, motivo }) => Promise` inyectado por el padre

**Eventos**: `success`, `close`.

## TabPanel.svelte

**Ubicación**: `components/shared/TabPanel.svelte`

**Usado en**: `DashboardTabbed.svelte`, `InventoryTabbed.svelte`, `FuelTabbed.svelte`, `WorkOrdersTabbed.svelte`, `ConsolidadoTabbed.svelte`

**Funcionalidad**:
Barra de pestañas genérica reutilizada por todas las vistas "...Tabbed" del sistema — no es un modal, es el layout de tabs en sí (estilo Windows 95/98). El contenido de cada pestaña se pasa vía slot con scope (`let:activeTab`), así el padre decide qué vista renderizar según la pestaña activa.

**Props**: `tabs` (`{ id, label }[]`), `activeTab`

**Eventos**: `tabChange` (con el `id` de la pestaña seleccionada).

## Arquitectura de Componentes Compartidos

### Principios de Diseño
- **Reutilización**: Componentes utilizados en múltiples vistas
- **Consistencia**: Tema visual unificado (con la excepción del módulo de combustible, ver abajo)
- **Modularidad**: Funcionalidades independientes
- **Eventos**: Comunicación mediante dispatch de eventos

### Patrón de Comunicación
- Props para datos de entrada
- Eventos para comunicación con padres
- Stores Svelte para estado compartido
- **Inyección de acción** (`onSubmit` como prop función): en los modales del módulo de combustible (`RefuelingFormModal`, `ReintegroModal`), el componente arma los datos pero el padre decide qué llamada de API hacer — permite reusar el mismo modal para crear y editar sin que el modal conozca el store.

### Tema Visual
- La mayoría de componentes (incluidos todos los documentados originalmente) siguen el tema Windows 95/98: gradientes, bordes inset/outset, paleta limitada, tipografía MS Sans Serif.
- Los modales del **módulo de combustible** (`AssetFuelConfigQuickModal`, `RefuelingFormModal`, `RegisterMonthlyDiscountModal`, `ReintegroModal`, `EditAssetModal`, `QuickCatalogModal`, `DocumentUpdateModal`) usan en cambio un estilo "moderno" (bordes redondeados, sombras suaves, tipografía de sistema) — es una decisión de diseño deliberada de esa fase del proyecto, no una inconsistencia accidental.

### Testing
- Tests unitarios para cada componente
- Mocks de stores y dependencias
- Verificación de renderizado y eventos
- Cobertura de estados y interacciones