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
- Gestión centralizada de datos de la aplicación
- Conexión con API backend
- Estados de carga y error
- Caché de datos locales

**Módulos de datos**:
- `dashboard`: Inspecciones y métricas principales
- `users`: Gestión de usuarios
- `machines`: Inventario de maquinaria
- `workOrders`: Órdenes de trabajo
- `consolidated`: Datos consolidados
- `oils`: Gestión de aceites

**Métodos principales**:
- `fetchDashboardData()`: Carga datos del dashboard
- `fetchUsers()`, `fetchMachines()`, etc.: Carga de datos específicos
- `createWorkOrder()`: Creación de órdenes
- `fetchInspectionImages()`: Carga de imágenes

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
- Conexión a streams SSE para actualizaciones

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

## Configuración

### config/table-definitions.js

**Funcionalidad**:
- Definiciones de columnas para tablas DataGrid
- Configuración de tipos de datos y formatos
- Estados de colores para celdas
- Acciones disponibles por tabla

**Tablas configuradas**:
- Dashboard: Inspecciones con estados y fechas
- Users: Información de usuarios y roles
- Machines: Datos de maquinaria
- Work Orders: Órdenes con asignaciones
- Oils: Inventario de lubricantes

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
- **Tiempo real**: Server-Sent Events (SSE)
- **Tests**: Playwright para E2E, Vitest para unitarios
- **Build**: Vite con optimizaciones