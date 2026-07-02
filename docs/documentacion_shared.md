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

## Arquitectura de Componentes Compartidos

### Principios de Diseño
- **Reutilización**: Componentes utilizados en múltiples vistas
- **Consistencia**: Tema visual unificado
- **Modularidad**: Funcionalidades independientes
- **Eventos**: Comunicación mediante dispatch de eventos

### Patrón de Comunicación
- Props para datos de entrada
- Eventos para comunicación con padres
- Stores Svelte para estado compartido

### Tema Visual
- Inspirado en Windows 95/98
- Gradientes y bordes 3D
- Paleta de colores limitada
- Tipografía consistente

### Testing
- Tests unitarios para cada componente
- Mocks de stores y dependencias
- Verificación de renderizado y eventos
- Cobertura de estados y interacciones