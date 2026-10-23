# Documentación de Archivos Core

Este documento describe los archivos principales del sistema: stores, componentes principales y configuración.

## Stores (Estado Global)

### stores/auth.js

**Funcionalidad**:
- Gestión completa del estado de autenticación
- Login/logout con validación JWT
- Refresh automático de tokens expirados
- Persistencia de sesión en localStorage
- Validación de roles (ADMIN, MECANIC)

**Métodos principales**:
- `login(username, password)`: Autenticación contra API
- `logout()`: Limpieza de sesión
- `checkAuth()`: Validación de token actual
- `refreshToken()`: Renovación automática de tokens

**Estados**:
- `isAuthenticated`: Boolean de estado de login
- `currentUser`: Datos del usuario actual
- `isRefreshing`: Estado de renovación de token

### stores/data.js

**Funcionalidad**:
- Raíz de composición del store central de datos — ya NO contiene la lógica de negocio directamente, esa vive dividida por dominio en `stores/data/*.js` (un archivo por área, igual que los módulos del backend)
- Junta el estado inicial (`stores/data/core.js`) y las acciones de cada módulo de dominio en un único store reactivo `data`, preservando el mismo contrato público que consumen ~19 componentes (`data.subscribe`, `$data.vehicles`, `data.fetchVehicles()`, etc.)
- Le pasa a cada módulo un objeto `core` compartido (`update`, `get`, `subscribe`, `fetchWithAuth`, `setLoading`, `setError`, `fetchAll`, `fetchPaginated`, `unwrapEntityList`, `enrichVehicleUbicacionRow`) más un objeto `self` (el store final ya compuesto) para que una acción pueda llamar a una hermana — p. ej. `createWorkOrder` refresca la página actual llamando a su propio `fetchWorkOrders`

#### stores/data/core.js

- No expone acciones — define el `initialState` completo del store (dashboard, users, machines, workOrders, consolidated, monitoreo de vehículos/motos, inspecciones, catálogos de vehículo/moto, y todo el bloque de combustible: tipos, compras, tanqueos, dashboard financiero, tendencia, proyección de presupuesto, saldos/movimientos de almacén, rendimiento por tipo de activo, distribución)
- `createCore(...)` es la fábrica que arma los helpers compartidos: `fetchAll` (GET simple, desenvuelve `content`/`users`/array plano), `fetchPaginated` (GET con `page`/`size`, arma `{data, totalPages, totalElements, currentPage, pageSize}`), `setLoading`/`setError`
- `unwrapEntityList`: normaliza cualquier forma de respuesta (array plano, página Spring con `content`, o `{data}`) a un array
- `enrichVehicleUbicacionRow`: resuelve `idUbicacionBase`/`ubicacionBase` de un vehículo o moto cruzando con el catálogo de `locations`, acepta camelCase o snake_case y resuelve id↔nombre en cualquier dirección

#### stores/data/dashboard.js

- `fetchDashboardData(page, size)`: página de inspecciones para el Dashboard (`GET inspection`)
- `fetchInspectionImages(inspectionId)`: trae las imágenes de una inspección y les antepone `BASE_URL` para armar la URL completa

#### stores/data/users.js

- CRUD de usuarios (`fetchUsers`, `createUser`, `updateUser`, `deleteUser`, `restoreUser`)
- `changeUserPassword(userId, newPassword)`
- `uploadUserLicenseDocument(userId, file)`: valida tamaño de archivo y sube el documento de licencia (multipart)

#### stores/data/machines.js

- CRUD de máquinas (`fetchMachines`, `createMachine`, `getMachineById`, `updateMachine`, `deleteMachine`)
- `fetchMachineCurriculum(machineId)` / `fetchVehicleCurriculum(vehicleId)`: historial completo de un activo
- `updateInspectionHourMeter(machineId, newHourMeter)`
- `fetchMachineOilHistory`, `updateMachineOilChange`, `deleteMachineOilChange`: corrección de cambios de aceite ya registrados ("en caso de error"), cubre motor e hidráulico

#### stores/data/work-orders.js

- `fetchWorkOrders`/`fetchVehicleWorkOrders` (paginado) y `createWorkOrder`/`createVehicleWorkOrder` — al crear, refresca la página actual llamando a su propio fetch vía `self`
- `executeWorkOrder`/`executeVehicleWorkOrder`: registra el resultado de ejecución de una orden (`results/execute`) y refresca

#### stores/data/consolidado.js

- `fetchConsolidadoData()`: trae `oil-changes/consolidated` y separa el resultado en `distrito`/`asociacion` según `machine.belongsTo` (comparación normalizada, sin tildes/mayúsculas)

#### stores/data/oils.js

- CRUD de marcas de aceite (`fetchOils`, `createOil`, `updateOil`, `deleteOil`) sobre `oil/brand`

#### stores/data/vehicle-maintenance.js

- `registerVehicleOilChange`/`updateVehicleOilChange`/`deleteVehicleOilChange`: cambios de aceite de vehículo (normaliza placa y tipo de aceite antes de enviar)
- `fetchVehicleOilHistory`/`fetchMotoOilHistory`: mismo endpoint para ambos — las motos viven en la misma tabla `vehiculos`, no hay ruta separada en el backend
- `updateVehicleDocument`, `uploadVehicleDocumentFile` (multipart, valida tamaño), `getVehicleDocuments`, `getVehicleDocumentHistory`

#### stores/data/monitoring.js

- `fetchVehicleMonitoring`/`fetchMotoMonitoring`: consolidado de monitoreo
- `fetchVehicleInspections(page, size, {reload})`: el backend devuelve la lista completa de la última inspección por placa; la paginación se hace en cliente sobre una copia ordenada por fecha descendente, cacheada en `vehicleInspectionsFull` (solo vuelve a pedir si `reload` o si aún no hay datos)
- `getVehicleByPlaca`/`getMotoByPlaca`, `validateVehicleKilometraje`, `fetchMotoInspections` (paginado por servidor)

#### stores/data/vehicles.js

- CRUD de vehículos (`fetchVehicles`, `createVehicle`, `updateVehicle`, `deleteVehicle`, `restoreVehicle`) — cada respuesta pasa por `enrichVehicleUbicacionRow` antes de guardarse en el store

#### stores/data/motos.js

- Mismo patrón que `vehicles.js` pero contra `moto` (el backend fuerza `tipo = MOTOCICLETA` del lado servidor): `fetchMotos`, `createMoto`, `updateMoto`, `deleteMoto`, `restoreMoto`

#### stores/data/catalog.js

- Marcas de vehículo (`fetchVehicleBrands`, `createVehicleBrand`, `updateVehicleBrand`, `deleteVehicleBrand`), con normalización de texto (title case)
- `fetchVehicleTypes`, `fetchLocations` (además de guardar `locations`, re-enriquece `motos`/`vehicles` ya cargados con la ubicación resuelta)
- `deleteLocation`, y un trío genérico `createCatalogItem`/`updateCatalogItem`/`deleteCatalogItem` parametrizado por `type` (`location`/`type`) que resuelve endpoint y clave de estado con un mapa interno

#### stores/data/fuel.js

El módulo más grande — combustible completo (Fase 4/5):
- **Tanqueo**: `fetchRefueling`, `createRefueling`/`updateRefueling`/`deleteRefueling` (multipart vía `FormData`) — tras crear/editar, `refrescarActivoAfectado` refresca solo las listas ya cargadas del activo afectado (vehículos/motos/monitoreo o máquinas/consolidado), porque el backend actualiza `kilometrajeActual`/`horometroActual` pero esos valores están replicados en varios caches del store
- **Suministro de almacén**: `fetchFuelPurchases`, `createFuelPurchase`
- **Dashboard financiero**: `fetchFuelDashboard`, `fetchFuelTrend`, `fetchFuelBudgetProjection`, `createMonthlyDiscount`
- **Control de almacén**: `fetchFuelWarehouseBalance`, `fetchFuelWarehouseMovements`, `createFuelReintegration`
- **Configuración de rendimiento**: `fetchAssetFuelConfig`, `updateAssetFuelConfigVehicle`/`updateAssetFuelConfigMachine`
- **Rendimiento operativo**: `fetchFuelPerformanceAllTipos` (pide MAQUINARIA/VEHICULO/MOTOCICLETA en paralelo para que cambiar de pill sea instantáneo), `fetchFuelPerformanceHistory` (rango amplio, clave de estado separada para evitar parpadeo visual al abrir el detalle), `fetchFuelPerformanceTrend` (ventana fija de 90 días para los sparklines, no bloquea el loader si falla)
- **Distribución** (`fetchFuelDistribution`) y **reporte de tanqueos por tipo de activo** (`fetchRefuelingReport`, `fetchRefuelingRecordById`)
- Varias de estas funciones llevan un contador de petición (`requestId`) para descartar respuestas de peticiones viejas si el usuario cambia de filtro/pill mientras una petición anterior sigue en vuelo

### stores/websocket.js

**Funcionalidad**:
- Store (`stompClient`) que expone el cliente STOMP para que varios composables compartan la misma conexión WebSocket
- `connect(token, onConnect)`: arma la URL (`VITE_API_BASE_URL` + `/ws`), crea el cliente STOMP sobre SockJS con el JWT en `Authorization`, reconexión automática cada 5s y heartbeat de 30s, y lo guarda en el store al conectar

### stores/fuelFilters.js

**Funcionalidad**:
- Estado compartido entre las 3 pestañas de Combustibles (Dashboard Financiero, Rendimiento, Tanqueo y Distribución), para que un filtro aplicado en una se mantenga al cambiar de pestaña
- `fuelDateRange`: rango de fechas compartido, por defecto primer día del mes actual → hoy (mismo default que usa el backend cuando el rango llega vacío)
- `resetFuelDateRange()`: vuelve al rango por defecto (no lo deja vacío)
- `fuelActiveTab`: pestaña activa de `FuelTabbed` — vive en store (no en estado local del componente) para sobrevivir a que `svelte-spa-router` desmonte/remonte la ruta al navegar a un detalle y volver

### stores/ui.js

**Funcionalidad**:
- Estado de la interfaz de usuario
- Navegación entre vistas
- Gestión de modales
- Notificaciones del sistema

**Estados principales**:
- `currentView`: Vista activa actual
- `showWorkOrderModal`: Control de modal de órdenes
- `notificationCount`: Contador de notificaciones
- `notificationMessages`: Lista de notificaciones

**Métodos principales**:
- `setCurrentView(view)`: Cambiar vista activa
- `openWorkOrderModal()`, `closeWorkOrderModal()`: Control de modales
- `addNotification()`, `removeNotification()`: Gestión de notificaciones

## Componente Principal

### App.svelte

**Ubicación**: `App.svelte`

**Funcionalidad**:
- Componente raíz de la aplicación
- Routing condicional basado en autenticación
- Gestión de notificaciones en tiempo real
- Integración de Web Audio API para sonidos
- Conexión WebSocket (STOMP) para actualizaciones en tiempo real

**Secciones principales**:

#### Layout Autenticado
- Header con navegación, notificaciones y logout
- Sidebar de navegación
- Área de contenido dinámico
- Modales superpuestos

#### Layout No Autenticado
- Vista de login exclusiva

#### Funcionalidades Avanzadas
- **Streams en tiempo real**: Inspecciones, actualizaciones de datos, SOAT/RUNT, cambios de aceite
- **Notificaciones**: Sistema completo con sonidos y visuales
- **Audio**: Activación por interacción del usuario
- **Event handling**: Navegación, creación de órdenes, gestión de imágenes

**Eventos manejados**:
- `handleNavigation`: Cambio de vistas
- `handleCellContextMenu`: Menús contextuales en tablas
- `handleCreateWorkOrder`: Creación de órdenes de trabajo
- `openImageModal`: Visualización de imágenes

### components/layouts/MainLayout.svelte

**Ubicación**: `components/layouts/MainLayout.svelte`

**Funcionalidad**:
- Chrome/shell de la app autenticada: envuelve `<Sidebar>` + un header (título de página vía `getPageTitle($location)`, dropdown de notificaciones, toggle de auto-refresh) + un `<slot />` donde se renderiza la vista activa.
- Combina en un solo contador (`visibleAlertCount`) las notificaciones normales (`notificationMessages`) y las alertas preventivas (`preventiveAlerts`), suscribiéndose a ambos stores de `stores/ui.js`.
- Cierra el dropdown de notificaciones con click fuera o con `Escape` (`handleKeydown`).

**Props**: `isAutoRefreshEnabled`, `isAutoRefreshActive` (reflejan el estado de `composables/useAutoRefresh.js`, controlado por quien monta el layout).

**Eventos**: `toggleAutoRefresh` (dispatch al hacer click en el control correspondiente).

## Configuración

### config/table-definitions.js

Ya no contiene las definiciones directamente — es un *barrel* que reexporta desde `config/table-definitions/*.js` (un archivo por dominio), para que los ~19 componentes que importan de aquí no tengan que cambiar sus imports.

**Módulos que reexporta**:
- `helpers.js`: formateo compartido entre columnas (`formatDate`, `formatDateTime`, `formatCurrency`, `unidadConsumoLabel`, `calculatePercentageUsed`, etc.) — no exporta columnas, son utilidades que las demás usan.
- `dashboard.js`: columnas de inspecciones del Dashboard.
- `user.js`: columnas de gestión de usuarios.
- `machine.js`: columnas de maquinaria.
- `work-orders.js`: columnas de órdenes de trabajo.
- `consolidado.js`: columnas del Consolidado (`createConsolidadoColumns`) y del historial de aceite de máquina.
- `curriculum.js`: columnas de la hoja de vida (`curriculumColumns`).
- `vehicle-inspections.js`: columnas de inspecciones y monitoreo de vehículos/motos (documentos, aceite).
- `vehicle-management.js`: columnas de gestión de vehículos/motos e historial de aceite de vehículo.
- `fuel.js`: columnas del módulo de combustible (tanqueos, compras, configuración de rendimiento por activo, historial de rendimiento) — las más paramétricas, reciben catálogos (`fuelTypesById`, `vehiculosById`, etc.) como argumentos para resolver nombres en la tabla.

### config/page-titles.js

**Funcionalidad**:
- `normalizeAppPath(path)`: normaliza el path del router (modo hash, query string) a una ruta limpia empezando en `/`.
- `getPageTitle(rawPath)`: devuelve el título de encabezado/pestaña para una ruta, con match exacto contra un mapa `ROUTE_TITLES` y fallback por prefijo para rutas con segmentos dinámicos (ej. `/vehicle-oil-history/ABC123`). Si no matchea nada, devuelve `"Usochicamocha — Administración"`.

## API Layer

### stores/api.js

**Funcionalidad**:
- Cliente HTTP centralizado
- Interceptors para autenticación
- Manejo de errores consistente
- Configuración de base URL

**Características**:
- Headers automáticos con Bearer token
- Retry logic para requests fallidos
- Parsing de respuestas JSON
- Error handling unificado

## Utilidades

### main.js

**Funcionalidad**:
- Punto de entrada de la aplicación
- Inicialización de Svelte
- Configuración global
- Mounting del componente App

### vite.config.js

**Configuración de build**:
- Resolución de paths
- Plugins de Svelte
- Configuración de servidor de desarrollo
- Optimizaciones de build

### playwright.config.js

**Configuración de tests E2E**:
- Browsers objetivo (Chromium, Firefox, WebKit)
- Base URL para tests
- Configuración de servidor de desarrollo
- Reportes y retries

## Composables

### composables/useAlerts.js

**Funcionalidad**:
- Capa de acceso a la API de alertas preventivas (`alerts/*`), independiente del store `data`.
- `refreshAlertsOnServer()`: dispara `POST alerts/refresh` (recálculo en servidor); no bloquea — si falla, se usan las alertas ya guardadas.
- `fetchAllAlerts(page, size, filters)`, `fetchAlertsByPlaca(placa)`, `fetchAlertsSummary()`, `fetchCriticalAlerts()` (ROJO), `fetchWarningAlerts()` (AMARILLO), `fetchAlertById(id)`, `resolveAlert(id)`, `deleteAlert(id)`.
- `syncPreventiveAlertsFromServer(recalculate)`: sincroniza el store global `preventiveAlerts`/`preventiveAlertCount` (de `stores/ui.js`) con el servidor — se llama justo después de subir/editar un documento (SOAT, tecnomecánica, extintor, licencia) para que la alerta correspondiente desaparezca o se actualice de inmediato en la UI sin esperar un F5.
- Expone los stores `alertsLoading` y `alertsError` para reflejar estado de carga/error en la UI.

### composables/useAutoRefresh.js

**Funcionalidad**:
- Polling de respaldo cada 60s (`REFRESH_INTERVAL`) que refresca datos solo si: el auto-refresh está habilitado (`isAutoRefreshEnabled`), el usuario está autenticado, no hay una carga en curso, y la ruta actual es Dashboard (`/`) o Inventario (`/inventory`).
- En Dashboard refresca inspecciones (`fetchDashboardData`, `fetchVehicleInspections` con `reload: true`, `fetchMotoInspections`); en Inventario refresca `fetchVehicles`/`fetchMotos`.
- `startAutoRefresh()` / `stopAutoRefresh()` / `toggleAutoRefresh()`; expone `isAutoRefreshActive` para mostrar feedback visual mientras corre un ciclo.

### composables/useWebSocketNotifications.js

Documentado en detalle en [WebSocket — implementación actual](/documentacion_websocket_final) — es el composable que abre y mantiene la conexión STOMP sobre SockJS para notificaciones en tiempo real.

## Utilidades de negocio

### utils/alertSeverity.js

**Funcionalidad**:
- `SEVERITY_LEVELS` / `SEVERITY_ORDER`: mapeo entre el color de estado del backend (`ROJO`/`AMARILLO`/`VERDE`) y un nivel numérico de severidad (0 = más crítico).
- `getSeverityLevel(colorEstado)` / `getSeverityInfo(colorEstado)`: helpers de traducción color → nivel/info.
- `sortAlertsBySeverity(alerts)`: ordena alertas primero por tipo (documentos primero, luego aceite de vehículo, luego de maquinaria) y dentro de cada tipo por severidad.
- `sortNotificationsBySeverity(notifications)`: mismo criterio de orden pero para notificaciones del dropdown (`error` > `warning` > `success`/`info`).

## Estilos y Tema

La aplicación utiliza un tema retro inspirado en Windows 95/98:
- Gradientes en botones y headers
- Bordes inset/outset
- Paleta de colores azul y gris
- Tipografía MS Sans Serif
- Efectos 3D en elementos interactivos

## Arquitectura General

- **Frontend**: Svelte con stores Svelte
- **Estado**: Gestión centralizada con stores reactivos
- **API**: RESTful con autenticación JWT
- **Tiempo real**: WebSocket + STOMP (`stores/websocket.js`, sobre SockJS)
- **Tests**: Playwright para E2E, Vitest para unitarios
- **Build**: Vite con optimizaciones