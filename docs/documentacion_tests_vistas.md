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