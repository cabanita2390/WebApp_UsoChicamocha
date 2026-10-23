# Documentación de Tests

Este documento describe qué se prueba en cada archivo de tests del proyecto Maquinaria Dashboard.

## Tests E2E (End-to-End)

### e2e/app.spec.js
Pruebas de integración completa de la aplicación desde el navegador.

- **should load the application**: Verifica que la aplicación se cargue correctamente (ya sea login o dashboard).
- **should display login form when not authenticated**: Verifica que se muestre el formulario de login cuando no hay autenticación.
- **should navigate between views**: Prueba la navegación entre diferentes vistas usando la sidebar (dashboard, users, machines, work-orders, consolidado).
- **should display dashboard data**: Verifica que se muestren los datos del dashboard y el header correcto.
- **should handle notifications**: Prueba la funcionalidad de la campana de notificaciones.
- **should logout**: Verifica que el proceso de cierre de sesión funcione correctamente.

### e2e/fuel/01-login-permisos.spec.js
Login y permisos por rol en el módulo de Combustibles, verificados contra las reglas reales del backend (`@PreAuthorize` en los controllers) y del frontend (`stores/auth.js`, `createRefuelingColumns`).

- **ADMIN inicia sesión y ve las 3 pestañas + acciones de administrador**: Verifica visibilidad de Dashboard Financiero, Rendimiento y Tanqueo y Distribución, más los botones de registrar/exportar.
- **SUPERVISOR_OPERATIVO inicia sesión y ve las 3 pestañas pero sin columna de Acciones (Editar/Eliminar)**: Verifica que puede registrar tanqueos pero no ve los botones de editar/eliminar (solo ADMIN).
- **ALMACEN inicia sesión y accede al panel**: Documenta que el link "Combustibles" del Sidebar no está restringido por rol; deja constancia de una anomalía real (`RefuelingReportController` declara `@PreAuthorize` para SUPERVISOR_OPERATIVO/ADMIN pero responde 200 a ALMACEN).
- **ALMACEN no ve datos en Dashboard Financiero ni en Rendimiento**: Verifica el comportamiento real ante el 403 del backend — ambas vistas quedan sin mensaje de error visible (pantalla vacía o "sin datos" genérico y engañoso).
- **OPERARIO no puede iniciar sesión en la web**: Verifica el mensaje "Acceso denegado. Usa la app móvil" y que nunca se renderiza `.app-container`.

### e2e/fuel/02-tanqueo-bomba.spec.js
Registro de un tanqueo tipo BOMBA para un vehículo (flujo `RefuelingFormModal` con `lugar` autoajustado a BOMBA al elegir tipo Vehículo).

- **ADMIN registra un tanqueo BOMBA para QAT001 y aparece en el resumen de Tanqueo y Distribución**: Cubre selección de activo por buscador, llenado del formulario completo (tipo de combustible, cantidad, horómetro/km, precio, total, origen), cierre del modal tras el submit, aparición de la fila en el resumen, y verificación del registro en el historial del activo.

### e2e/fuel/03-tanqueo-almacen.spec.js
Registro de un tanqueo tipo ALMACEN para una máquina (mismo modal que BOMBA, pero con `tipoElemento="MAQUINARIA"` y `lugar="ALMACEN"` por defecto, sin los campos exclusivos de BOMBA).

- **ADMIN registra un tanqueo ALMACEN para QA-MAQ-001 y aparece en el resumen de Almacén**: Verifica los valores por defecto del formulario, la ausencia en el DOM de los campos de precio/total (exclusivos de BOMBA), la selección del activo por nombre, y la aparición de la fila en la píldora "Almacén" del resumen.

### e2e/fuel/04-anomalia.spec.js
Detección de anomalías en la UI, con los umbrales confirmados directamente en el backend (`FuelAnomalyDetectionE2ETest.java`) y en `asset_fuel_config`.

- **un tanqueo BOMBA de 65 gal para QAT001 (tanque de 60 gal) queda marcado como anomalía en la UI**: Verifica que la fila del resumen queda resaltada (`tr.anomaly-row`) y que la columna Discrepancia lista los dos motivos simultáneos ("Capacidad excedida" y "Cantidad fuera de rango").

### e2e/fuel/05-editar-eliminar.spec.js
Edición y eliminación (soft-delete) de un tanqueo ya registrado — solo permitido a ADMIN tanto en backend (`@PreAuthorize("hasRole('ADMIN')")`) como en la UI (columna Acciones condicionada a `isAdmin`). El spec crea su propio tanqueo desechable para no depender de filas creadas por otros specs.

- **ADMIN edita la cantidad de un tanqueo y luego lo elimina (soft-delete) desde el resumen**: Cubre creación del tanqueo desechable, edición de la cantidad (10 → 12 gal) vía el modal "Editar tanqueo", confirmación de eliminación vía el modal "Eliminar tanqueo", y verificación de la notificación de éxito en el dropdown de la campana.

### e2e/fuel/06-dashboard-financiero.spec.js
Dashboard Financiero (`FuelFinancialDashboard.svelte`) con datos reales ya persistidos por los specs anteriores.

- **ADMIN ve las tarjetas KPI y la tabla de combustible con datos reales**: Verifica las 4 tarjetas KPI (gasto neto, gasto bruto, ahorro por descuentos, discrepancias detectadas) con valores reales (no "—"), la tabla "Combustible" con al menos una fila, y la presencia del gráfico de tendencia mensual.

### e2e/fuel/07-rendimiento.spec.js
Rendimiento (`FuelPerformance.svelte`) — la tabla solo muestra un activo si tiene línea base y consumo configurado en `asset_fuel_config` para el rango filtrado.

- **ADMIN abre Rendimiento y se documenta el estado real para los activos QA**: No fuerza un resultado fijo — verifica que la vista carga sin error para las pestañas Vehículos y Maquinaria, y deja constancia (vía `test.info().annotations`) de si cada activo QA ya tiene línea base suficiente para aparecer.

### e2e/fuel/08-reintegro.spec.js
Reintegro de saldo de un tanqueo ALMACEN — reutiliza el tanqueo de 80 gal del caso 3 (depende de correr después, por orden alfabético de archivo con `--workers=1`).

- **ADMIN reintegra el saldo completo de un tanqueo ALMACEN y el historial no re-valoriza la cantidad original**: Verifica el modal "Reintegrar tanqueo", la notificación de éxito, el estado terminal del botón (pasa de "Reintegrar" a "Reintegrado" cuando el saldo llega a 0), y que la columna "Cantidad" original no cambia por el reintegro.

### e2e/fuel/09-exportar-excel.spec.js
Exportación del reporte de Tanqueo y Distribución.

- **ADMIN exporta el reporte de Tanqueo y Distribución a Excel**: Verifica que el botón "Exportar Excel" dispara la descarga de `tanqueos_export.xlsx`.

## Tests Unitarios

### __tests__/api.test.js
Pruebas de la capa de API.

- Conexiones HTTP
- Manejo de respuestas
- Endpoints de autenticación
- Llamadas a servicios backend

### __tests__/auth.test.js
Pruebas del sistema de autenticación.

- Login/logout
- Validación de tokens JWT
- Estados de autenticación
- Manejo de sesiones

### __tests__/data.test.js
Pruebas del store de datos.

- Fetch de datos del dashboard
- Gestión de estado de carga
- Manejo de errores de API
- Actualización de datos

### __tests__/setup.js
Configuración común para tests.

- Configuración de entorno de testing
- Mocks globales
- Utilidades de setup

### __tests__/ui.test.js
Pruebas de la interfaz de usuario general.

- Estados de UI
- Interacciones básicas
- Renderizado de componentes

## Tests de Componentes Compartidos

### __tests__/shared/DataGrid.test.js
Pruebas del componente DataGrid.

- Renderizado de tablas
- Paginación
- Ordenamiento
- Acciones de fila

### __tests__/shared/ExecuteOrderModal.test.js
Pruebas del modal de ejecución de órdenes.

- Apertura y cierre del modal
- Formulario de ejecución
- Validación de datos
- Interacciones

### __tests__/shared/ImageCarouselModal.test.js
Pruebas del modal de carrusel de imágenes.

- Visualización de imágenes
- Navegación entre imágenes
- Cierre del modal

### __tests__/shared/Loader.test.js
Pruebas del componente Loader.

- Estados de carga
- Animaciones
- Renderizado condicional

### __tests__/shared/NotificationDropdown.test.js
Pruebas del dropdown de notificaciones.

- Lista de notificaciones
- Marcado como leído
- Eliminación de notificaciones

### __tests__/shared/Sidebar.test.js
Pruebas de la barra lateral de navegación.

- Navegación entre vistas
- Estados activos
- Hover effects
- Responsividad

### __tests__/shared/WorkOrderModal.test.js
Pruebas del modal de órdenes de trabajo.

- Creación de órdenes
- Edición de órdenes
- Validación de formularios

## Tests de Vistas

### __tests__/views/Consolidado.test.js
Pruebas de la vista de Consolidado.

- Carga de datos consolidados
- Filtros y búsquedas
- Exportación de datos

### __tests__/views/Dashboard.test.js
Pruebas de la vista Dashboard.

- Carga de datos del dashboard
- Gráficos y métricas
- Actualizaciones en tiempo real

### __tests__/views/Login.test.js
Pruebas de la vista de Login.

- Formulario de autenticación
- Validación de credenciales
- Manejo de errores
- Redirección post-login

### __tests__/views/MachineManagement.test.js
Pruebas de la gestión de máquinas.

- Lista de máquinas
- CRUD de máquinas
- Estados de máquina
- Mantenimiento

### __tests__/views/OilManagement.test.js
Pruebas de la gestión de aceites.

- Inventario de aceites
- Cambios de aceite
- Alertas de mantenimiento

### __tests__/views/UserManagement.test.js
Pruebas de la gestión de usuarios.

- Lista de usuarios
- Roles y permisos
- CRUD de usuarios

### __tests__/views/WorkOrderManagement.test.js
Pruebas de la gestión de órdenes de trabajo.

- Creación de órdenes
- Asignación de técnicos
- Seguimiento de progreso
- Historial de órdenes