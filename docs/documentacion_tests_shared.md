# Documentación de Tests en Shared

Esta documentación describe todos los tests ubicados en la carpeta `__tests__/shared/`, escritos en español para facilitar la comprensión.

## DataGrid.test.js

**Descripción del componente:** Suite de pruebas para el componente DataGrid. Verifica el renderizado de la tabla, filtrado de datos, eventos de acción y aplicación de clases de estado.

### Tests:

- **renders table with data**: Verifica que la tabla se renderice correctamente con datos proporcionados, mostrando elementos como "Item 1" e "Item 2".

- **renders search input**: Verifica que se renderice el input de búsqueda con el placeholder "Buscar en toda la tabla...".

- **filters data based on search input**: Verifica que los datos se filtren correctamente basado en la entrada de búsqueda.

- **renders action buttons for action columns**: Verifica que se rendericen botones de acción (Editar y Eliminar) para columnas de acción.

- **dispatches action events when buttons are clicked**: Verifica que se despachen eventos de acción (edit, delete) cuando se hacen clic en los botones.

- **renders status buttons with correct classes**: Verifica que los botones de estado se rendericen con clases correctas, como "status-optimo".

- **dispatches cellContextMenu event on status button click**: Verifica que se despache el evento cellContextMenu al hacer clic en un botón de estado.

- **renders pagination controls**: Verifica que se rendericen controles de paginación, incluyendo texto de página y elementos mostrados.

- **dispatches pageChange event when navigation buttons are clicked**: Verifica que se despache el evento pageChange al hacer clic en botones de navegación.

- **dispatches sizeChange event when page size is changed**: Verifica que se despache el evento sizeChange al cambiar el tamaño de página.

- **handles sorting when sortable headers are clicked**: Verifica que se maneje el ordenamiento al hacer clic en encabezados ordenables.

- **renders record count correctly**: Verifica que se renderice correctamente el conteo de registros.

- **disables navigation buttons appropriately**: Verifica que los botones de navegación se deshabiliten apropiadamente (primera página).

- **renders special row classes**: Verifica que se rendericen clases de fila especiales para datos inesperados o órdenes pendientes.

- **handles conditional cell classes**: Verifica que se manejen clases de celda condicionales para orígenes y condiciones.

## ExecuteOrderModal.test.js

**Descripción del componente:** Suite de pruebas para el componente ExecuteOrderModal. Verifica el renderizado del modal, validación de formularios, eventos y funcionalidades.

### Tests:

- **renders modal with work order details**: Verifica que el modal se renderice con detalles de la orden de trabajo, incluyendo máquina y descripción.

- **parses work order description correctly**: Verifica que la descripción de la orden de trabajo se analice correctamente (Tipo, Sector, Estado, etc.).

- **validates form - incomplete form is invalid**: Verifica que el formulario sea inválido cuando esté incompleto.

- **renders form fields correctly**: Verifica que se rendericen correctamente los campos del formulario (tiempo empleado, descripción, contratista, etc.).

- **can add spare parts**: Verifica que se puedan agregar repuestos al formulario.

- **can add and remove spare parts**: Verifica que se puedan agregar y remover repuestos.

- **has cancel button**: Verifica que el modal tenga un botón de cancelar.

- **handles checkbox for same mechanic**: Verifica que se maneje correctamente el checkbox para el mismo mecánico.

- **renders info panel with correct data**: Verifica que se renderice el panel informativo con datos correctos.

## ImageCarouselModal.test.js

**Descripción del componente:** Suite de pruebas para el componente ImageCarouselModal. Verifica el renderizado, navegación, manejo de errores y limpieza de recursos.

### Tests:

- **renders loading state initially**: Verifica que se renderice el estado de carga inicialmente.

- **renders no images message when no images provided**: Verifica que se muestre un mensaje cuando no hay imágenes.

- **fetches and displays images**: Verifica que se obtengan y muestren imágenes correctamente.

- **handles fetch errors gracefully**: Verifica que se manejen errores de obtención de imágenes de manera elegante.

- **navigates to next image**: Verifica que se navegue a la siguiente imagen.

- **navigates to previous image**: Verifica que se navegue a la imagen anterior.

- **handles image error display**: Verifica que se maneje la visualización de errores de imagen.

- **closes modal and cleans up blobs**: Verifica que el modal se cierre y se limpien los blobs.

- **handles modal overlay click to close**: Verifica que se maneje el clic en el overlay para cerrar.

- **displays correct image counter**: Verifica que se muestre correctamente el contador de imágenes.

## Loader.test.js

**Descripción del componente:** Suite de pruebas para el componente Loader. Verifica el renderizado básico del spinner.

### Tests:

- **renders spinner element**: Verifica que se renderice el elemento spinner.

- **has correct CSS classes and styles**: Verifica que tenga las clases CSS correctas.

- **renders as a single element**: Verifica que se renderice como un solo elemento DIV.

## NotificationDropdown.test.js

**Descripción del componente:** Suite de pruebas para el componente NotificationDropdown. Verifica el renderizado de notificaciones, botones de eliminación y eventos.

### Tests:

- **renders empty state when no messages**: Verifica que se renderice el estado vacío cuando no hay mensajes.

- **renders messages when provided**: Verifica que se rendericen los mensajes proporcionados.

- **renders delete buttons for each message**: Verifica que se rendericen botones de eliminación para cada mensaje.

- **dispatches delete event when delete button is clicked**: Verifica que se despache el evento de eliminación al hacer clic en el botón.

- **applies correct CSS classes**: Verifica que se apliquen las clases CSS correctas.

- **renders multiple messages correctly**: Verifica que se rendericen múltiples mensajes correctamente.

## Sidebar.test.js

**Descripción del componente:** Suite de pruebas para el componente Sidebar. Verifica el renderizado de elementos de navegación, clases activas y eventos.

### Tests:

- **renders all navigation items**: Verifica que se rendericen todos los elementos de navegación (Dashboard, Usuarios, etc.).

- **renders navigation text elements**: Verifica que se rendericen los textos de navegación.

- **applies active class to current view**: Verifica que se aplique la clase activa a la vista actual.

- **dispatches navigate event when button is clicked**: Verifica que se despache el evento de navegación al hacer clic en un botón.

- **renders SVG icons for each navigation item**: Verifica que se rendericen íconos SVG para cada elemento.

- **has correct sidebar structure**: Verifica que tenga la estructura correcta de sidebar.

- **changes active view when different view is passed**: Verifica que cambie la vista activa cuando se pasa una diferente.

- **renders with default activeView**: Verifica que se renderice con la vista activa por defecto.

## WorkOrderModal.test.js

**Descripción del componente:** Suite de pruebas para el componente WorkOrderModal. Verifica el renderizado, validación, eventos y manejo de tipos de inspección.

### Tests:

- **renders modal with correct title**: Verifica que el modal se renderice con el título correcto "Crear Orden de Trabajo".

- **displays machine information correctly**: Verifica que se muestre correctamente la información de la máquina.

- **displays affected area information**: Verifica que se muestre la información del área afectada.

- **displays current user**: Verifica que se muestre el usuario actual.

- **shows confirmation dialog when form is submitted**: Verifica que se muestre el diálogo de confirmación al enviar el formulario.

- **dispatches createWorkOrder event when confirmed**: Verifica que se despache el evento createWorkOrder al confirmar.

- **cancels confirmation when cancel button is clicked**: Verifica que se cancele la confirmación al hacer clic en cancelar.

- **handles unexpected inspection type**: Verifica que se maneje el tipo de inspección inesperada.

- **applies correct status class to status badge**: Verifica que se aplique la clase correcta al badge de estado.

- **handles extinguisher date status**: Verifica que se maneje el estado de fecha de extintor.

- **has close button**: Verifica que tenga un botón de cerrar.

- **has modal overlay**: Verifica que tenga un overlay modal.

- **validates required fields**: Verifica que valide los campos requeridos.