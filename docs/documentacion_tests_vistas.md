# Documentación de Tests de Vistas

Este documento describe qué se prueba en los archivos de tests unitarios para las vistas de la aplicación.

## __tests__/views/Dashboard.test.js

**Alcance**: Pruebas del componente Dashboard principal.

**Funciones probadas**:

### Estados de carga y datos
- **renders loading state when loading and no data**: Verifica que se muestre Loader cuando isLoading=true y no hay datos
- **renders dashboard data when not loading**: Verifica que se muestre la interfaz completa cuando hay datos

### Interacciones del usuario
- **calls fetchDashboardData when refresh button is clicked**: Verifica que el botón "Refrescar información" llame a la función de carga
- **passes correct props to DataGrid**: Verifica que se pasen correctamente las props de paginación al DataGrid

### Eventos del DataGrid
- **handles page change events**: Verifica manejo de cambios de página
- **handles size change events**: Verifica manejo de cambios de tamaño de página
- **handles cell context menu events**: Verifica manejo de menús contextuales

**Métricas de cobertura**:
- Estados de carga condicional
- Props del componente DataGrid
- Eventos de interacción del usuario
- Integración con store de datos

## __tests__/views/Login.test.js

**Alcance**: Pruebas del formulario de autenticación.

**Funciones probadas**:

### Renderizado de interfaz
- **renders login form with all elements**: Verifica presencia de todos los elementos del formulario (inputs, botón, logo)
- **requires username and password fields**: Verifica que los campos requeridos tengan atributo required

### Interacciones de formulario
- **updates username and password on input**: Verifica actualización de valores al escribir
- **handles form submission**: Verifica envío del formulario

### Lógica de autenticación
- **calls auth.login and data.fetchDashboardData on successful login**: Verifica llamadas correctas en login exitoso
- **shows error message on login failure**: Verifica display de errores
- **shows loading state during login**: Verifica estado de carga durante autenticación
- **handles login error from exception**: Verifica manejo de excepciones

**Métricas de cobertura**:
- Estados de carga del formulario
- Validación de campos requeridos
- Integración con stores de auth y data
- Manejo de errores de autenticación

## __tests__/views/MachineManagement.test.js

**Alcance**: Pruebas de gestión de maquinaria.

**Funciones probadas**:

### Estados de interfaz
- **renders loading state when loading and no machines**: Verifica estado de carga
- **renders machine management interface when not loading**: Verifica interfaz completa

### CRUD de máquinas
- **creates new machine successfully**: Verifica creación exitosa con validación de campos
- **handles machine creation failure**: Verifica manejo de errores en creación
- **validates required fields**: Verifica validación de campos obligatorios
- **resets form after successful creation**: Verifica reseteo del formulario

### Interacciones adicionales
- **calls fetchMachines when refresh button is clicked**: Verifica botón de refrescar
- **handles belongsTo selection**: Verifica selección de propietario
- **opens delete confirmation modal**: Verifica apertura de modal de eliminación

**Métricas de cobertura**:
- Formularios de creación/edición
- Validación de datos
- Estados de carga
- Interacciones con DataGrid

## __tests__/views/WorkOrderManagement.test.js

**Alcance**: Pruebas de gestión de órdenes de trabajo.

**Funciones probadas**:

### Estados y carga
- **renders loading state when loading and no work orders**: Verifica estado de carga
- **renders work order management interface when not loading**: Verifica interfaz completa

### Gestión de órdenes
- **calls fetchWorkOrders when refresh button is clicked**: Verifica refresco de datos
- **passes correct props to DataGrid**: Verifica props de paginación
- **opens execute modal when execute action is triggered**: Verifica apertura de modal de ejecución
- **executes work order successfully**: Verifica ejecución exitosa
- **closes execute modal after execution**: Verifica cierre de modal

### Notificaciones y errores
- **shows success notification after successful execution**: Verifica notificaciones de éxito
- **shows error notification on execution failure**: Verifica notificaciones de error

### Eventos de paginación
- **handles page change events**: Verifica cambios de página
- **handles size change events**: Verifica cambios de tamaño

**Métricas de cobertura**:
- Estados de ejecución de órdenes
- Sistema de notificaciones
- Interacciones modales
- Paginación y navegación

## __tests__/views/OilManagement.test.js

**Alcance**: Pruebas de gestión de aceites y lubricantes.

**Funciones probadas**:

### Interfaz y filtrado
- **renders oil management interface**: Verifica renderizado completo
- **filters oils by type correctly**: Verifica filtrado por tipo (hidráulico/motor)
- **displays empty sections when no oils of specific type**: Verifica secciones vacías

### CRUD de aceites
- **creates new oil successfully**: Verifica creación con validación
- **validates oil name is not empty**: Verifica validación de nombre
- **resets form after successful creation**: Verifica reseteo del formulario
- **shows server error when present**: Verifica display de errores del servidor

### Interacciones
- **calls fetchOils when refresh button is clicked**: Verifica botón de refrescar
- **handles type selection changes**: Verifica cambios de selección de tipo
- **shows loading message when loading oils**: Verifica mensaje de carga

### Modales
- **opens edit modal when edit action is triggered**: Verifica modal de edición
- **opens delete modal when delete action is triggered**: Verifica modal de eliminación

**Métricas de cobertura**:
- Filtrado y categorización
- Validación de formularios
- Estados de carga
- Manejo de errores del servidor

## __tests__/views/UserManagement.test.js

**Alcance**: Pruebas de gestión de usuarios del sistema.

**Funciones probadas**:

### Estados de interfaz
- **renders loading state when loading and no users**: Verifica estado de carga
- **renders user management interface when not loading**: Verifica interfaz completa
- **initializes with empty users array**: Verifica inicialización sin usuarios

### CRUD de usuarios
- **creates new user successfully**: Verifica creación con todos los campos
- **handles user creation failure**: Verifica manejo de errores
- **validates required fields in create form**: Verifica validación de campos requeridos
- **resets form after successful creation**: Verifica reseteo del formulario

### Interacciones específicas
- **calls fetchUsers when refresh button is clicked**: Verifica refresco
- **handles role selection changes**: Verifica cambios de rol
- **shows loading state during user creation**: Verifica estado de carga durante creación
- **has password input field**: Verifica campo de contraseña tipo password

**Métricas de cobertura**:
- Gestión de roles y permisos
- Campos de seguridad (password)
- Estados de carga durante operaciones
- Validación completa de formularios

## __tests__/views/Consolidado.test.js

**Alcance**: Pruebas de vista consolidada de maquinaria.

**Funciones probadas**:

### Estados de carga y error
- **renders loading state when loading and no data**: Verifica estado de carga
- **renders error message when there is an error**: Verifica display de errores
- **does not show loader when not loading**: Verifica ausencia de loader
- **does not show error when there is no error**: Verifica ausencia de errores

### Renderizado de datos
- **renders distrito data grid when distrito machines exist**: Verifica tabla de distrito
- **renders asociacion data grid when asociacion machines exist**: Verifica tabla de asociación
- **renders both data grids when both types of machines exist**: Verifica ambas tablas

### Interacciones
- **calls fetchConsolidadoData when refresh button is clicked**: Verifica botón de refrescar

**Métricas de cobertura**:
- Renderizado condicional por tipo
- Estados de error
- Integración con configuración de columnas
- Interacciones básicas de usuario

## __tests__/views/AssetFuelConfigManagement.test.js

**Alcance**: Pruebas del modal de configuración de rendimiento/consumo estándar por activo (vehículo, moto o máquina), guardado en `asset_fuel_config`.

**Funciones probadas**:

### Flujo del modal
- **el modal se muestra directo al montar, sin tabla ni botón intermedio**: Verifica que no hay paso previo.
- **"Tipo de activo" empieza sin preseleccionar nada**: Verifica el estado inicial.
- **al elegir un tipo, el input aparece con placeholder pero sin desplegar la lista todavía**: Verifica el comportamiento del buscador antes de enfocarlo.

### Buscador de activo
- **al enfocar el input, despliega la lista completa (con scroll) de ese tipo**: Verifica la lista al hacer foco.
- **filtra por cualquier campo del activo (no solo el que se muestra)**: Verifica filtrado por `tipoVehiculo` aunque no se muestre en pantalla.
- **al hacer click en un resultado, cierra la lista y deja el activo elegido escrito en el input**: Verifica selección.
- **al volver a enfocar el input después de elegir uno, reabre la lista completa**: Verifica que se puede cambiar la elección.
- **un click fuera del buscador lo cierra y el input vuelve a mostrar lo ya elegido**: Verifica que no se pierde la selección.
- **al cambiar el tipo de activo, limpia la selección anterior**: Verifica reseteo del buscador al cambiar tipo.
- **al elegir Vehículo, excluye las motos que vienen mezcladas en /vehicle**: Verifica que el frontend filtra lo que el backend no filtra.
- **al elegir Motocicleta/Máquina, el buscador despliega la lista correcta**: Verifica separación por tipo de activo.

### Unidad de consumo editable
- **sugiere la unidad automáticamente pero queda en un `<select>` editable**: Verifica sugerencia + edición manual.
- **permite cambiar manualmente la unidad sugerida**: Verifica override.
- **solo ofrece las 2 unidades válidas para el combustible elegido**: Verifica que no se ofrecen combinaciones físicamente inválidas.
- **la unidad elegida a mano no se pierde al interactuar con otros campos**: Verifica persistencia del override.
- **el envío usa la unidad elegida a mano, no la sugerida**: Verifica que el submit respeta el override.
- **al cambiar de verdad el combustible, vuelve a sugerir**: Verifica que el override se invalida ante un cambio real de familia de combustible.

### Envío del formulario
- **envía la configuración de vehículo/motocicleta/máquina seleccionada**: Verifica el payload exacto enviado a `updateAssetFuelConfigVehicle`/`updateAssetFuelConfigMachine` según el tipo (moto usa el mismo endpoint de vehículo).
- **no deja enviar el formulario sin elegir un activo de la lista**: Verifica validación.
- **no deja enviar el formulario con consumo estándar en 0 o menos**: Verifica validación numérica.
- **dispara el evento "close" al cancelar / tras guardar exitosamente**: Verifica comunicación con el contenedor.

**Métricas de cobertura**:
- Buscadores con filtro por campos ocultos
- Sugerencia automática de unidad con override manual persistente
- Payload exacto por tipo de activo (vehículo/moto comparten endpoint, máquina usa otro)
- Validaciones de formulario

## __tests__/views/ConsolidadoTabbed.test.js

**Alcance**: Pruebas del modal "Corregir Km" embebido en la vista de Consolidado con pestañas.

**Funciones probadas**:
- **click en "Corregir Km" abre el modal con el kilometraje actual precargado y guarda con `updateVehicle`**: Verifica precarga, edición y guardado, más el refresco posterior de `fetchVehicleMonitoring`.
- **un rol sin permiso (ni ADMIN ni SUPERVISOR_OPERATIVO) no ve el modal de Corregir Km aunque haga click**: Verifica restricción por rol.

**Métricas de cobertura**:
- Precarga de datos reales del vehículo (`getVehicleByPlaca`) antes de editar
- Control de acceso por rol

## __tests__/views/FuelFinancialDashboard.test.js

**Alcance**: Pruebas del dashboard financiero de combustible (KPIs, gráficos de tendencia, proyección presupuestal, descuentos mensuales).

**Funciones probadas**:

### KPIs y tablas
- **muestra los KPIs de gasto bruto, neto y ahorro con el valor completo**: Verifica formato sin notación compacta.
- **muestra la leyenda y cantidad por tipo de combustible** (galones para líquidos, m³ para gas natural).
- **muestra la tabla combinada de combustible con precio, cantidad y gasto**: Verifica que el precio/unidad se calcula solo sobre galones de BOMBA (con costo), no sobre el total bomba+almacén.
- **no muestra "Gasto bomba" ni "Precio promedio por galón comprado"**: Verifica que se ocultan tarjetas redundantes/sin sentido en el alcance actual (sin compras/inventario).
- **muestra discrepancias detectadas y alertas de rendimiento** por separado.

### Filtros y tendencia
- **vuelve a pedir el dashboard con los nuevos parámetros al filtrar**, y **"Limpiar filtro" vuelve al rango por defecto**.
- **muestra el delta vs. el periodo anterior** (no "mes anterior" fijo).
- **cambia el rango de meses de la tendencia** (botones preestablecidos y un input libre), **apila las gráficas verticalmente cuando el rango > 6 meses**, y **la tendencia termina en la fechaFin filtrada, no siempre en hoy**.
- **pasa timestamps reales al gráfico de tendencia** sin producir fechas inválidas (regresión de un bug de concatenación de fecha).

### Proyección presupuestal y descuentos
- **muestra la tabla de proyección con filas históricas y proyectadas etiquetadas**, **vive fuera de la tarjeta de KPIs reales**, y **no se renderiza si no hay filas**.
- **un OPERARIO no ve "+ Registrar descuento"**, **un ADMIN/SUPERVISOR_OPERATIVO sí** y puede registrar uno (`createMonthlyDiscount`), refrescando el dashboard.
- **muestra el descuento mensual junto al KPI de ahorro** cuando el backend lo trae.

**Métricas de cobertura**:
- Cálculo correcto de precio/unidad excluyendo galones sin costo (almacén)
- Formato de tendencia adaptativo y sin bugs de fecha
- Control de acceso por rol en la acción de descuentos

## __tests__/views/FuelHistory.test.js

**Alcance**: Pruebas del historial completo de tanqueos de un activo específico (a diferencia del resumen de Tanqueo y Distribución, que colapsa al más reciente).

**Funciones probadas**:
- **muestra todos los tanqueos del activo, incluida la fila más antigua que la tabla resumen colapsa**.
- **pide el reporte sin rango de fechas** (`'TODAS'`) — muestra todo el historial, no solo el filtro activo en la otra vista; para máquina pide el reporte agrupado `MAQUINARIA_MOTO`.
- **el botón Volver llama `pop()` del router**.
- **click en Editar precarga los valores del registro** (sin buscador de activo, ya fijo por la ruta) y **guardar llama a `updateRefueling`** con el id y el `vehicleId` fijo en el FormData.
- **click en Eliminar muestra confirmación y llama a `deleteRefueling`** con el id correcto.
- **Editar/Eliminar no se muestran para un rol no ADMIN**, pero **"Factura" sí es visible para cualquier rol**.
- **sin factura subida, la celda muestra "—"**.
- **el modal de edición tiene un enlace "Ver factura actual"** cuando ya existe una.
- **un ADMIN ve "Reintegrar", un OPERARIO no**, y **click en "Reintegrar" llama a `createFuelReintegration`** con el payload correcto (motivo vacío viaja como `null`, no cadena vacía).

**Métricas de cobertura**:
- Historial completo sin colapsar (vs. el resumen)
- Control de acceso por rol en acciones destructivas/sensibles
- Manejo de documentos adjuntos (factura)

## __tests__/views/FuelPerformanceHistory.test.js

**Alcance**: Pruebas del historial de rendimiento (proyectado vs. real) de un activo específico, con gráfico y filtro de rango.

**Funciones probadas**:
- **pide el histórico completo (rango amplio) en vez del mes actual por defecto del backend**.
- **muestra todos los tanqueos del activo, no solo el más reciente**, con los valores de horas formateados en es-CO.
- **marca con un asterisco la Alerta de un activo sin suficiente historial propio** (tolerancia general en vez de aprendida, vía `usaRangoAprendido`).
- **el resumen muestra total de registros, desviación promedio y cuántos tienen alerta**.
- **dibuja el gráfico Horas esperadas vs. ejecutadas con leyenda**.
- **la etiqueta de fecha se adapta según el rango**: día/mes abreviado si es menor a un año, mes/año si es mayor.
- **el selector de rango (1M/3M/6M/1A/Todo) filtra tabla, resumen y gráfico 100% client-side**, sin volver a pedir al backend.
- **si el rango elegido no tiene tanqueos, muestra el mensaje específico** (distinto del de "sin historial" general).
- **el botón Volver llama `pop()`**.
- **click en Editar precarga el tanqueo completo** (sin buscador de activo).
- **sin datos para el activo, muestra el mensaje de "sin historial"**.

**Métricas de cobertura**:
- Filtrado de rango 100% client-side (sin refetch)
- Formato adaptativo de fechas en el eje del gráfico
- Distinción entre alerta con tolerancia aprendida vs. general

## __tests__/views/FuelPerformance.test.js

**Alcance**: Pruebas de la vista de tarjetas de rendimiento (resumen por activo, colapsado al más reciente), con pestañas por tipo de activo.

**Funciones probadas**:
- **marca la tarjeta con `alerta=true` con el estado "Alerta" y el resaltado correspondiente**.
- **cada tarjeta muestra el combustible del tanqueo**.
- **vuelve a pedir los 3 tipos juntos (`fetchFuelPerformanceAllTipos`) con las fechas al filtrar**, y **"Limpiar filtro" vuelve al rango por defecto**.
- **cambia de sub-pestaña (Maquinaria/Vehículos/Motocicletas) sin volver a pedir datos**, porque los 3 tipos ya están cargados juntos.
- **las píldoras muestran el conteo de los 3 tipos siempre**, no solo el activo actual.
- **un ADMIN ve el botón de configurar consumo estándar, un SUPERVISOR_OPERATIVO no**.
- **colapsa a una sola tarjeta por activo**: la más reciente dentro del rango filtrado.
- **muestra el inventario completo apenas resuelven `fetchMachines`/`fetchVehicles`/`fetchMotos`**, sin necesidad de cambiar de pestaña (regresión de un bug donde el universo de activos solo se recalculaba al cambiar de pill).
- **click en una tarjeta navega a `/fuel-performance-history/:tipo/:id`**.

**Métricas de cobertura**:
- Carga conjunta de los 3 tipos de activo sin refetch al cambiar de pestaña
- Colapso a la fila más reciente por activo
- Reactividad del universo de activos ante inventario que llega tarde

## __tests__/views/FuelPurchaseManagement.test.js

**Alcance**: Pruebas del registro de compras de combustible para el almacén propio.

**Funciones probadas**:
- **el formulario está detrás de un modal, oculto hasta que se pide registrar**.
- **un usuario OPERARIO no ve el botón de registrar, SUPERVISOR_OPERATIVO sí**.
- **calcula el total estimado en vivo** a partir de cantidad, precio y descuento.
- **arma un FormData con las partes que espera el backend**, incluida la factura como `File`.
- **cambia la etiqueta de cantidad a m³** cuando el combustible elegido es gas natural vehicular.

**Métricas de cobertura**:
- Control de acceso por rol
- Cálculo en vivo del total estimado
- Envío multipart con archivo adjunto

## __tests__/views/FuelTabbed.test.js

**Alcance**: Pruebas del contenedor de pestañas del módulo de Combustibles (Dashboard Financiero, Rendimiento, Tanqueo y Distribución).

**Funciones probadas**:
- **muestra el Dashboard Financiero por defecto**.
- **cambia a cada pestaña y renderiza el componente correcto**.
- **no muestra las pestañas ocultas** de Suministro de Almacén ni Control de Almacén.
- **el rango de fechas filtrado en una pestaña se mantiene al cambiar a las otras dos** (estado compartido vía `stores/fuelFilters.js`).
- **la pestaña activa sobrevive a que el componente se desmonte y se vuelva a montar** (p. ej. al volver desde Historial de tanqueos).

**Métricas de cobertura**:
- Estado de filtros compartido entre pestañas
- Persistencia de la pestaña activa entre montajes

## __tests__/views/FuelTrendChart.test.js

**Alcance**: Pruebas del componente de gráfico de tendencia (ECharts) reutilizado por los dashboards de combustible.

**Funciones probadas**:
- **no inicializa ECharts y muestra "Sin datos suficientes"** cuando no hay valores.
- **inicializa ECharts con una sola serie** cuando no hay `values2`, y **agrega una segunda serie y leyenda** cuando sí se pasan `values2`/`label2`.
- **usa eje de tiempo real cuando `timestamps` coincide en longitud con `values`**, y **cae a eje de categorías (por índice)** cuando no se pasan timestamps.
- **destruye el chart cuando el componente se desmonta**, y **destruye el chart y vuelve al mensaje de "sin datos" si `values` pasa a estar vacío**.

**Métricas de cobertura**:
- Contrato de inicialización/destrucción de ECharts (mockeado, jsdom no tiene canvas 2D real)
- Selección de tipo de eje X según los props recibidos

## __tests__/views/FuelWarehouseControl.test.js

**Alcance**: Pruebas del control de saldos e histórico de movimientos del almacén propio de combustible.

**Funciones probadas**:
- **muestra los saldos de almacén separados por área de costo, sin sumarlos**.
- **muestra la conciliación con saldo inicial, entradas, salidas y saldo final**.
- **vuelve a pedir los movimientos con las nuevas fechas al filtrar**.
- **un usuario ALMACEN ve saldos pero no el botón de reintegro; SUPERVISOR_OPERATIVO sí lo ve**.
- **registra un reintegro y vuelve a pedir los saldos**.

**Métricas de cobertura**:
- Separación de saldos por área de costo (no agregados)
- Control de acceso por rol en la acción de reintegro

## __tests__/views/MachineOilHistory.test.js

**Alcance**: Pruebas del historial de cambios de aceite de una máquina específica (motor o hidráulico, según ruta).

**Funciones probadas**:
- **pide el historial de motor para la máquina indicada en params**.
- **un ADMIN ve las columnas Editar/Eliminar, un SUPERVISOR_OPERATIVO no**.
- **click en Editar abre el modal con los campos precargados y guarda con `updateMachineOilChange`**.
- **click en Eliminar muestra confirmación y llama a `deleteMachineOilChange`** con el id correcto.

**Métricas de cobertura**:
- Control de acceso por rol
- Precarga y edición de un registro histórico puntual

## __tests__/views/MotoInspections.test.js

**Alcance**: Pruebas de la tabla de inspecciones pre-operativas de motos.

**Funciones probadas**:
- **muestra el loader cuando está cargando y no hay datos**.
- **muestra los botones de acción (Refrescar, Exportar Excel) cuando hay datos**.
- **llama `fetchMotoInspections` al hacer clic en Refrescar**.
- **deduplica registros por placa mostrando solo el más reciente**.
- **muestra mensaje de error cuando existe**, y **no rompe con un array vacío de inspecciones**.

**Métricas de cobertura**:
- Deduplicación por placa (última inspección)
- Estados de carga y error

## __tests__/views/MotoManagement.test.js

**Alcance**: Pruebas de la gestión de motocicletas (espejo funcional de `VehicleManagement`).

**Funciones probadas**:
- **muestra el estado de carga sin motos**, y **la interfaz de gestión cuando hay motos**.
- **renderiza el formulario de registro de moto** y **llama `fetchMotos` al hacer clic en Refrescar**.
- **crea una nueva moto exitosamente**.
- **al crear una moto con combustible + consumo estándar, también guarda el consumo estándar del activo** — mismo endpoint (`updateAssetFuelConfigVehicle`) que vehículos, porque las motos viven en la misma tabla.
- **si no se elige combustible al crear, NO llama a guardar el consumo estándar** (es opcional).
- **el campo de placa es obligatorio**.
- **muestra el formulario aunque el store reporte error**, y **el botón Exportar Excel está disponible con datos**.

**Métricas de cobertura**:
- Reutilización del endpoint de configuración de combustible de vehículos para motos
- Validación de campos obligatorios

## __tests__/views/TanqueoDistribucion.test.js

**Alcance**: Pruebas de la vista principal de registro y resumen de tanqueos (la más extensa del módulo de combustible).

**Funciones probadas**:

### Tabla resumen y anomalías
- **la tabla resumen colapsa a una sola fila por activo**: la más reciente en el rango, con conteo correcto en el pie y controles de paginación.
- **marca como discrepancia y resalta la fila** en cuatro escenarios calculados por el backend: capacidad de tanque excedida, cantidad fuera del rango típico, precio fuera de rango vs. promedio reciente, y "Full" declarado con cantidad insuficiente — cada uno con su motivo y valor de referencia mostrados en la columna Discrepancia.

### Filtros y navegación
- **cambiar de píldora de tipo pide el reporte con el nuevo tipo**, y **filtrar por área/fechas vuelve a pedir el reporte** con esos parámetros; **"Limpiar filtro" vuelve al rango por defecto**.
- **click en "Ver historial" navega a la pantalla completa de historial del activo** (`/fuel-history/:tipo/:id`), visible para cualquier rol a diferencia de Editar/Eliminar (solo ADMIN).

### CRUD y acciones sobre un tanqueo
- **click en Editar precarga los campos del tanqueo más reciente**, y **guardar arma un FormData correcto** para `updateRefueling`.
- **click en Eliminar muestra confirmación y llama a `deleteRefueling`**.
- **click en "Factura" abre el documento subido**; sin factura, la celda muestra "—"; el modal de edición tiene un enlace "Ver factura actual".
- **un ADMIN y un SUPERVISOR_OPERATIVO ven "Reintegrar", un OPERARIO no**; **click en "Reintegrar" llama a `createFuelReintegration`** con el saldo disponible precargado.

### Formulario de registro
- **el formulario está detrás de un modal**, oculta/muestra precio unitario y factura según `lugar` (BOMBA vs. ALMACEN).
- **el buscador de elemento despliega la lista real al enfocarlo**, excluye motos al elegir tipo Vehículo, y deja el input con "nombre — marca" al seleccionar.
- **al elegir tipo de elemento, sugiere el `lugar`** (Vehículo→Bomba, Moto/Máquina→Almacén), pero sigue siendo editable a mano.
- **no deja registrar sin elegir un elemento de la lista**.
- **arma el FormData correcto para ALMACEN y para BOMBA**; **la factura es opcional al registrar** (a diferencia de versiones anteriores del flujo); **el label dice "Factura (opcional)"**.
- **edita un tanqueo de ALMACEN a BOMBA sin adjuntar factura** sin que eso bloquee el guardado.
- **el campo Origen sugiere orígenes ya usados** (datalist) pero permite escribir uno nuevo.
- **cambia la etiqueta de cantidad a m³** para gas natural vehicular.

### Exportación
- **"Exportar Excel" llama a `download` con el endpoint y filtros actuales**, se deshabilita mientras descarga, y **muestra una notificación de error en vez de romper la vista** si la descarga falla.

**Métricas de cobertura**:
- Las 4 reglas de detección de anomalías tal como las calcula el backend
- Ciclo completo de un tanqueo: crear, editar, eliminar, reintegrar, ver historial, exportar
- Comportamiento del formulario según lugar (BOMBA/ALMACEN) y tipo de elemento

## __tests__/views/VehicleInspections.test.js

**Alcance**: Pruebas de la tabla paginada de inspecciones pre-operativas de vehículos.

**Funciones probadas**:
- **muestra el loader cuando está cargando sin datos**.
- **muestra la barra de herramientas (Refrescar, Exportar Excel) cuando hay inspecciones**.
- **llama `fetchVehicleInspections` al hacer clic en Refrescar**, con `{ reload: true }`.
- **muestra error cuando el store reporta uno**.
- **renderiza correctamente con datos de paginación**, y **el botón Exportar Excel no está deshabilitado por defecto**.

**Métricas de cobertura**:
- Estados de carga, error y paginación
- Recarga forzada al refrescar manualmente

## __tests__/views/VehicleManagement.test.js

**Alcance**: Pruebas de la gestión de vehículos, incluida la integración con configuración de combustible.

**Funciones probadas**:
- **muestra el estado de carga**, y **la interfaz de gestión cuando hay vehículos**.
- **renderiza el formulario de creación** (placa obligatoria) y **llama `fetchVehicles` al hacer clic en Refrescar**.
- **crea un nuevo vehículo exitosamente**, y **maneja el fallo en creación** (p. ej. placa duplicada).
- **el formulario de creación incluye Combustible/Consumo estándar/Capacidad del tanque**, conectados a `asset_fuel_config`.
- **al crear con combustible + consumo estándar, también guarda el consumo estándar del activo** (`updateAssetFuelConfigVehicle`, incluida la capacidad del tanque).
- **si no se elige combustible al crear, NO llama a guardar el consumo estándar** (opcional).
- **muestra el formulario aunque el store reporte error**.

**Métricas de cobertura**:
- Integración de creación de vehículo con configuración de combustible en el mismo submit
- Manejo de errores del backend (placa duplicada)

## __tests__/views/VehicleOilHistory.test.js

**Alcance**: Pruebas del historial de cambios de aceite de un vehículo específico.

**Funciones probadas**:
- **un ADMIN ve las columnas Editar/Eliminar, un SUPERVISOR_OPERATIVO no**.
- **click en Editar abre el modal con los campos precargados y guarda con `updateVehicleOilChange`**.
- **click en Eliminar muestra confirmación y llama a `deleteVehicleOilChange`** con el id correcto.

**Métricas de cobertura**:
- Control de acceso por rol
- Precarga y edición de un registro histórico puntual

## __tests__/views/VehicleOrderManagement.test.js

**Alcance**: Pruebas de la tabla de órdenes de trabajo de vehículos/motos.

**Funciones probadas**:
- **muestra loader cuando está cargando**, y **la tabla de órdenes cuando hay datos**.
- **llama `fetchVehicleWorkOrders` al hacer clic en Refrescar**.
- **acepta `overrideData` como prop** para mostrar datos externos (reutilización embebida del componente).
- **renderiza sin órdenes sin lanzar errores**.

**Métricas de cobertura**:
- Reutilización del componente vía `overrideData`
- Estados de carga y vacío

## Cobertura General de Tests de Vistas

### Patrones Comunes
- **Estados de carga**: Verificación de Loaders en operaciones asíncronas
- **Estados de error**: Display de mensajes de error del servidor
- **Interacciones CRUD**: Crear, leer, actualizar, eliminar con validación
- **Interacciones de UI**: Botones de refrescar, cambios de selección
- **Integración con stores**: Llamadas correctas a funciones de data/ui
- **Validación de formularios**: Campos requeridos y tipos de input
- **Reset de formularios**: Limpieza después de operaciones exitosas

### Mocks Utilizados
- **Stores (data, ui)**: Control de estado y funciones
- **Componentes compartidos**: DataGrid, Loader, modals
- **Configuraciones**: Definiciones de tablas y columnas
- **Eventos**: Simulación de interacciones del usuario

### Enfoque de Testing
- **Renderizado condicional**: Estados de carga, datos, errores
- **Interacciones del usuario**: Clics, inputs, selecciones
- **Integración**: Comunicación entre componentes y stores
- **Validación**: Reglas de negocio y requerimientos de UI