# Documentación de Vistas

Este documento describe las funcionalidades y componentes de cada vista de la aplicación Maquinaria Dashboard.

## Vista de Login (Login.svelte)

**Ubicación**: `components/views/Login.svelte`

**Funcionalidad**:
- Formulario de autenticación con campos de usuario y contraseña
- Validación de credenciales contra el backend
- Manejo de errores de autenticación
- Interfaz visual retro con gradientes y estilos Windows 95
- Logo de Usochicamocha integrado

**Interacciones**:
- Submit del formulario llama a `auth.login()`
- Redirección automática al dashboard tras login exitoso
- Muestra errores de validación

## Vista de Dashboard (Dashboard.svelte)

**Ubicación**: `components/views/Dashboard.svelte`

**Funcionalidad**:
- Muestra tabla de inspecciones de maquinaria
- Paginación y filtrado de datos
- Botón de refrescar información
- Enlaces a imágenes de inspección
- Estados de carga con componente Loader

**Interacciones**:
- Clic en filas para ver imágenes
- Paginación y cambio de tamaño de página
- Acciones contextuales en celdas de estado

## Vista de Gestión de Usuarios (UserManagement.svelte)

**Ubicación**: `components/views/UserManagement.svelte`

**Funcionalidad**:
- Lista de usuarios del sistema
- CRUD completo de usuarios
- Gestión de roles (ADMIN, MECANIC)
- Tabla con paginación

**Interacciones**:
- Crear nuevos usuarios
- Editar información de usuarios existentes
- Eliminar usuarios
- Cambiar roles y permisos

## Vista de Gestión de Máquinas (MachineManagement.svelte)

**Ubicación**: `components/views/MachineManagement.svelte`

**Funcionalidad**:
- Inventario completo de maquinaria
- Información detallada de cada máquina
- Estados de mantenimiento
- Historial de inspecciones

**Interacciones**:
- Ver detalles de máquinas
- Programar mantenimientos
- Registrar nuevas máquinas
- Actualizar estados

## Vista de Gestión de Órdenes de Trabajo (WorkOrderManagement.svelte)

**Ubicación**: `components/views/WorkOrderManagement.svelte`

**Funcionalidad**:
- Lista de órdenes de trabajo activas
- Creación de nuevas órdenes
- Asignación a técnicos
- Seguimiento de progreso
- Historial de órdenes completadas

**Interacciones**:
- Crear órdenes desde inspecciones
- Asignar y reasignar técnicos
- Marcar órdenes como completadas
- Ver detalles e imágenes relacionadas

## Vista de Consolidado (Consolidado.svelte)

**Ubicación**: `components/views/Consolidado.svelte`

**Funcionalidad**:
- Vista consolidada de toda la maquinaria
- Reportes de mantenimiento
- Estadísticas generales
- Cambios de aceite programados

**Interacciones**:
- Filtrar por tipo de máquina
- Ver reportes detallados
- Programar mantenimientos preventivos

## Vista de Gestión de Aceites (OilManagement.svelte)

**Ubicación**: `components/views/OilManagement.svelte`

**Funcionalidad**:
- Inventario de aceites y lubricantes
- Registro de cambios de aceite
- Alertas de mantenimiento de aceite
- Historial de cambios

**Interacciones**:
- Registrar cambios de aceite
- Ver niveles de inventario
- Programar próximos cambios
- Alertas automáticas

## Vista de Gestión de Vehículos (VehicleManagement.svelte)

**Ubicación**: `components/views/VehicleManagement.svelte`

**Funcionalidad**:
- CRUD completo de vehículos (crear, editar, eliminar con soft-delete)
- Documentos con vencimiento (SOAT, Tecnomecánica, Extintor) con notificación de próximos a vencer
- Hoja de vida del vehículo (curriculum) en modal aparte
- Historial de documentos por vehículo
- Configuración de combustible por vehículo (`FuelConfigFields`, guardado vía `asset_fuel_config`)
- Catálogo rápido inline: crear marca, tipo o ubicación sin salir de la vista
- Exportar listado a Excel

**Interacciones**:
- Si se intenta crear con una placa que ya existe pero está soft-deleted (409), ofrece restaurarla o forzar creación de una distinta
- Menú contextual en celdas de estado (documentos vencidos) abre el modal de orden de trabajo
- Solo ADMIN ve ciertas acciones sensibles (según `$auth.currentUser.role`)

## Vista de Gestión de Motocicletas (MotoManagement.svelte)

**Ubicación**: `components/views/MotoManagement.svelte`

**Funcionalidad**:
- Espejo funcional de `VehicleManagement.svelte`, pero para motos (que viven en la misma tabla `vehiculos` del backend, diferenciadas por tipo)
- CRUD con soft-delete/restauración, documentos con vencimiento, hoja de vida, historial de documentos, configuración de combustible, catálogo rápido de marca/ubicación, export a Excel

**Interacciones**:
- Mismo flujo de recuperación de placa soft-deleted (409) que vehículos
- El tipo de vehículo se fuerza a "moto" al crear/editar, sin selector manual

## Vista de Inspecciones de Vehículos (VehicleInspections.svelte)

**Ubicación**: `components/views/VehicleInspections.svelte`

**Funcionalidad**:
- Tabla paginada de inspecciones pre-operativas de vehículos, con refresco manual y exportación a Excel

**Interacciones**:
- Menú contextual en celdas de estado/fecha abre el modal de orden de trabajo de vehículo
- Paginación y cambio de tamaño de página disparan nuevas cargas al store `data`

## Vista de Inspecciones de Motos (MotoInspections.svelte)

**Ubicación**: `components/views/MotoInspections.svelte`

**Funcionalidad**:
- Igual que `VehicleInspections.svelte` pero para motos — tabla paginada, refresco, exportación a Excel
- Carga inicial automática (`onMount`) si el store todavía no tiene datos

**Interacciones**:
- Menú contextual en celdas de estado/fecha abre el modal de orden de trabajo

## Vista de Órdenes de Trabajo de Vehículos/Motos (VehicleOrderManagement.svelte)

**Ubicación**: `components/views/VehicleOrderManagement.svelte`

**Funcionalidad**:
- Tabla de órdenes de trabajo generadas para vehículos o motos
- Acepta `overrideData` (para ser reutilizada embebida, filtrando ya sea vehículos o motos) y `soloMotos` (ajusta el endpoint/nombre del archivo exportado)
- Ejecutar una orden abre `ExecuteOrderModal`

**Interacciones**:
- Exportar a Excel usa una ruta distinta según `soloMotos`
- Al ejecutar una orden, notifica éxito con el consecutivo de la orden

## Historial de Aceite — Vehículo (VehicleOilHistory.svelte)

**Ubicación**: `components/views/VehicleOilHistory.svelte`

**Funcionalidad**:
- Historial de cambios de aceite de un vehículo específico, identificado por `params.placa` (ruta)
- Edición y eliminación de un registro ya guardado ("en caso de error") — **solo ADMIN**

**Interacciones**:
- Botón de volver (`pop` de `svelte-spa-router`) regresa a la vista anterior
- Acciones de editar/eliminar solo aparecen en la columna si el usuario es ADMIN

## Historial de Aceite — Maquinaria (MachineOilHistory.svelte)

**Ubicación**: `components/views/MachineOilHistory.svelte`

**Funcionalidad**:
- Historial de cambios de aceite de una máquina, identificada por `params.machineId` y `params.tipo` (MOTOR u HYDRAULIC, vía ruta)
- Edición y eliminación de un registro ya guardado — **solo ADMIN**

**Interacciones**:
- Mismo patrón que `VehicleOilHistory.svelte`: botón volver, acciones condicionadas a rol ADMIN

## Formulario de Cambio de Aceite — Moto (MotoCambioAceiteForm.svelte)

**Ubicación**: `components/views/MotoCambioAceiteForm.svelte`

**Funcionalidad**:
- Formulario para registrar un cambio de aceite de una moto: selección de moto, marca de aceite, tipo, kilometraje, intervalo (default 2500 km) y cantidad

**Interacciones**:
- Al enviar, notifica éxito/error y redirige de vuelta (`push`)

## Historial de Cambio de Aceite — Moto (MotoCambioAceiteHistorial.svelte)

**Ubicación**: `components/views/MotoCambioAceiteHistorial.svelte`

**Funcionalidad**:
- Historial de cambios de aceite de una moto puntual, identificada por `params.placa`

**Interacciones**:
- Botón de volver (`pop`) a la vista anterior

## Configuración de Combustible por Activo (AssetFuelConfigManagement.svelte)

**Ubicación**: `components/views/AssetFuelConfigManagement.svelte`

**Funcionalidad**:
- Formulario para configurar el rendimiento estándar y la unidad de medida de un activo (vehículo, moto o máquina) de cara al módulo de combustible
- Unidad de consumo depende del tipo de activo: vehículos usan `KM_POR_GALON`/`KM_POR_M3`, máquinas `HORA_POR_GALON`/`HORA_POR_M3`
- Buscador de activo con selección desde modal
- También se usa embebida dentro de `FuelPerformance.svelte` (botón "Configurar")

**Interacciones**:
- Nada se precarga hasta que el usuario elige un tipo de activo — evita cargar catálogos innecesarios
- Emite evento al componente padre tras guardar (`createEventDispatcher`)

## Dashboard Financiero de Combustible (FuelFinancialDashboard.svelte)

**Ubicación**: `components/views/FuelFinancialDashboard.svelte`

**Funcionalidad**:
- Tarjetas KPI: gasto neto, gasto bruto, ahorro por descuentos, discrepancias detectadas
- Gráfico de tendencia mensual (`FuelTrendChart`), con selector de meses a mostrar (2/3/6/12/24, o rango custom)
- Registro de descuentos mensuales (`RegisterMonthlyDiscountModal`)

**Interacciones**:
- Cambiar el rango de meses o aplicar un rango custom recarga los datos desde el store `fuelFilters`
- Registrar un descuento mensual refresca el dashboard

## Rendimiento de Combustible (FuelPerformance.svelte)

**Ubicación**: `components/views/FuelPerformance.svelte`

**Funcionalidad**:
- Tabla de rendimiento real vs. esperado por activo (vehículos/motos por km, maquinaria por horas), con sparkline de tendencia por fila
- Filtro por tipo de activo, texto libre, y por estado (Todos / En alerta / Con desviación)
- Botón para abrir `AssetFuelConfigManagement` embebida y configurar el rendimiento esperado de un activo
- Clic en una fila navega al historial de rendimiento de ese activo

**Interacciones**:
- Solo se calcula diferencia/alerta si el activo ya tiene línea base configurada en `asset_fuel_config`
- Visibilidad de ciertas acciones depende de `isAdmin`

## Historial de Rendimiento por Activo (FuelPerformanceHistory.svelte)

**Ubicación**: `components/views/FuelPerformanceHistory.svelte`

**Funcionalidad**:
- Historial completo de tanqueos y rendimiento de un activo puntual (`params`), con gráfico de tendencia y navegación al activo adyacente en el listado
- Selector de rango de fechas 100% client-side sobre el histórico ya cargado (el backend siempre trae todo el histórico para esta vista)
- Editar un tanqueo (`RefuelingFormModal`) o su configuración de rendimiento (`AssetFuelConfigQuickModal`)
- Exportar a Excel

**Interacciones**:
- Flechas de navegación (`irAAdyacente`) cambian de activo sin volver al listado

## Tanqueo y Distribución (TanqueoDistribucion.svelte)

**Ubicación**: `components/views/TanqueoDistribucion.svelte`

**Funcionalidad**:
- Vista principal para registrar tanqueos (Bomba para vehículos, Almacén para maquinaria/motos) vía `RefuelingFormModal`
- Resumen filtrable por tipo de activo y rango de fechas, con detección visual de anomalías (fila resaltada cuando excede capacidad de tanque o rango esperado)
- Editar/eliminar (soft-delete) un tanqueo, y reintegrar saldo sobrante (`ReintegroModal`) — según rol
- Exportar el reporte a Excel
- Clic en un activo abre su historial de rendimiento (`FuelPerformanceHistory`)

**Interacciones**:
- Menú de acciones en cada fila condicionado por rol (`isAdmin`/`isSupervisorOperativo`)
- Descarga/visualización de la factura adjunta a un tanqueo (`getFileUrl`, `openDocumentSafely`)

## Historial de Combustible por Activo (FuelHistory.svelte)

**Ubicación**: `components/views/FuelHistory.svelte`

**Funcionalidad**:
- Historial de tanqueos de un activo puntual (`params.tipoElemento`, `params.id`), agrupado igual que el reporte del backend (Bomba=Vehículos, Almacén=Maquinaria/Motos)
- Editar tanqueo y reintegrar saldo, igual que en `TanqueoDistribucion.svelte`

**Interacciones**:
- Menú contextual por fila, confirmación antes de eliminar un tanqueo

## Gráfico de Tendencia de Combustible (FuelTrendChart.svelte)

**Ubicación**: `components/views/FuelTrendChart.svelte`

**Funcionalidad**:
- Componente de gráfico de línea reutilizable (ECharts) para series de combustible — usado por `FuelFinancialDashboard` y `FuelPerformanceHistory`
- Soporta una o dos series simultáneas (`values`/`values2`), formateo custom de valores y etiquetas de eje adaptadas a rango temporal (mensual vs. multi-año)
- El ciclo de vida del chart vive en una Svelte action (`use:chartAction`), no en `onMount`, para que sí se monte bajo `@testing-library/svelte`

**Interacciones**:
- Puramente de presentación (props `label`, `months`/`timestamps`, `values`, `color`, `formatValue`) — no dispara llamadas al store

## Suministro de Almacén (FuelPurchaseManagement.svelte)

**Ubicación**: `components/views/FuelPurchaseManagement.svelte`

::: info Oculto en el rediseño actual
No se renderiza desde ninguna ruta activa (ver comentario en `FuelTabbed.svelte`) — el componente y el endpoint de backend siguen intactos por si se retoma.
:::

**Funcionalidad**:
- Formulario de compra/ingreso de combustible al almacén propio, con adjunto de factura
- Tabla de compras registradas por área de costo

**Interacciones**:
- Formatea el total en pesos colombianos (COP) en la tabla

## Control de Almacén (FuelWarehouseControl.svelte)

**Ubicación**: `components/views/FuelWarehouseControl.svelte`

::: info Oculto en el rediseño actual
No se renderiza desde ninguna ruta activa (ver comentario en `FuelTabbed.svelte`) — el componente y el endpoint de backend siguen intactos por si se retoma.
:::

**Funcionalidad**:
- Saldos de combustible por área de costo, filtrables por rango de fechas
- Reintegro de saldo sobrante de un tanqueo (`reintegroForm`)

**Interacciones**:
- Modal de confirmación para el reintegro

## Vista combinada — Dashboard (DashboardTabbed.svelte)

**Ubicación**: `components/views/DashboardTabbed.svelte`

**Funcionalidad**:
- Envuelve `Dashboard` (maquinaria), `VehicleInspections` y `MotoInspections` en pestañas (`TabPanel`), como una sola ruta de "Dashboard"

**Interacciones**:
- Cambiar de pestaña dispara la carga de datos de vehículos/motos si aún no se han pedido

## Vista combinada — Inventario (InventoryTabbed.svelte)

**Ubicación**: `components/views/InventoryTabbed.svelte`

**Funcionalidad**:
- Envuelve `MachineManagement`, `VehicleManagement` y `MotoManagement` en pestañas, como una sola ruta de "Inventario"

**Interacciones**:
- Cambiar de pestaña carga el catálogo correspondiente si aún está vacío

## Vista combinada — Consolidado (ConsolidadoTabbed.svelte)

**Ubicación**: `components/views/ConsolidadoTabbed.svelte`

**Funcionalidad**:
- Envuelve `Consolidado` (maquinaria) más tablas propias de monitoreo consolidado de vehículos y motos, en pestañas
- Corrección de kilometraje "en caso de error" (mismo patrón que corregir horómetro en maquinaria) — reutiliza el endpoint de edición de vehículo/moto existente, no requiere backend nuevo
- Exportar consolidado de vehículos o de motos a Excel

**Interacciones**:
- Clic en una fila puede abrir el historial de aceite del activo o el modal de corrección de kilometraje, según la columna

## Vista combinada — Órdenes de Trabajo (WorkOrdersTabbed.svelte)

**Ubicación**: `components/views/WorkOrdersTabbed.svelte`

**Funcionalidad**:
- Envuelve `WorkOrderManagement` (maquinaria) y `VehicleOrderManagement` (reutilizada dos veces: una filtrada a vehículos, otra a motos, distinguiendo por tipo de vehículo) en pestañas

**Interacciones**:
- Cambiar de pestaña carga las órdenes correspondientes si aún no se pidieron

## Vista combinada — Combustibles (FuelTabbed.svelte)

**Ubicación**: `components/views/FuelTabbed.svelte`

**Funcionalidad**:
- Envuelve `FuelFinancialDashboard`, `FuelPerformance` y `TanqueoDistribucion` en pestañas — es el punto de entrada real del módulo de combustible tras el rediseño (Suministro/Control de Almacén quedaron ocultos, ver arriba)

**Interacciones**:
- La pestaña activa se guarda en el store `fuelFilters` (`fuelActiveTab`), no en estado local — persiste entre navegaciones

## Componentes Compartidos

### Sidebar (Sidebar.svelte)

**Ubicación**: `components/shared/Sidebar.svelte`

**Funcionalidad**:
- Navegación principal entre vistas
- Iconos y texto descriptivo
- Estados activos por vista actual
- Efectos hover con expansión

**Interacciones**:
- Clic en botones para cambiar vista
- Navegación fluida con dispatch de eventos

### DataGrid (DataGrid.svelte)

**Ubicación**: `components/shared/DataGrid.svelte`

**Funcionalidad**:
- Tabla genérica con paginación
- Columnas configurables
- Acciones por fila
- Context menus

**Interacciones**:
- Paginación
- Ordenamiento
- Acciones personalizadas
- Menús contextuales

### WorkOrderModal (WorkOrderModal.svelte)

**Ubicación**: `components/shared/WorkOrderModal.svelte`

**Funcionalidad**:
- Modal para crear/editar órdenes de trabajo
- Formulario con campos requeridos
- Validación de datos
- Asignación de técnicos

**Interacciones**:
- Submit para crear orden
- Cancelar para cerrar modal
- Validación en tiempo real

### NotificationDropdown (NotificationDropdown.svelte)

**Ubicación**: `components/shared/NotificationDropdown.svelte`

**Funcionalidad**:
- Lista desplegable de notificaciones
- Marcado como leído
- Eliminación individual
- Contador de notificaciones

**Interacciones**:
- Clic para expandir/colapsar
- Eliminar notificaciones
- Auto-cierre al hacer clic fuera

### ImageCarouselModal (ImageCarouselModal.svelte)

**Ubicación**: `components/shared/ImageCarouselModal.svelte`

**Funcionalidad**:
- Carrusel de imágenes de inspecciones
- Navegación entre imágenes
- Carga asíncrona
- Overlay modal

**Interacciones**:
- Navegación con flechas
- Clic fuera para cerrar
- Indicadores de posición

### Loader (Loader.svelte)

**Ubicación**: `components/shared/Loader.svelte`

**Funcionalidad**:
- Indicador de carga animado
- Estados de carga para operaciones asíncronas
- Diseño consistente

**Interacciones**:
- Visual únicamente, sin interacciones

### ExecuteOrderModal (ExecuteOrderModal.svelte)

**Ubicación**: `components/shared/ExecuteOrderModal.svelte`

**Funcionalidad**:
- Modal para ejecutar órdenes de trabajo
- Formulario de ejecución
- Registro de resultados
- Actualización de estados

**Interacciones**:
- Submit para completar orden
- Campos dinámicos según tipo de orden