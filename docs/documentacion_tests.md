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