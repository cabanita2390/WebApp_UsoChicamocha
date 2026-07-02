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