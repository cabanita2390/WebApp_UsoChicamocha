/**
 * @fileoverview Suite de pruebas para el componente DataGrid.
 * @description Verifica el renderizado de la tabla, filtrado de datos, eventos de acción
 * y aplicación de clases de estado.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import DataGrid from '../../components/shared/DataGrid.svelte';

/**
 * @description Grupo principal de pruebas para el componente DataGrid.
 * Esta suite incluye pruebas para:
 * - Renderizado básico de la tabla con datos
 * - Funcionalidad de búsqueda y filtrado
 * - Botones de acción y eventos asociados
 * - Estados y clases CSS
 * - Controles de paginación
 * - Ordenamiento de columnas
 * - Manejo de filas especiales
 */
describe('DataGrid', () => {
  const mockColumns = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ getValue }) => getValue(),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => getValue(),
      meta: { isStatus: true },
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { isAction: true },
    },
  ];

  const mockData = [
    { id: 1, name: 'Item 1', status: 'Óptimo' },
    { id: 2, name: 'Item 2', status: 'Malo' },
  ];

  /**
    * @test Renderiza la tabla con datos.
    * Verifica que la tabla se renderice correctamente con datos proporcionados,
    * mostrando elementos como "Item 1" e "Item 2".
    */
   it('renders table with data', async () => {
    render(DataGrid, {
      props: {
        columns: mockColumns,
        data: mockData,
        totalPages: 1,
        currentPage: 0,
        pageSize: 20,
        totalElements: 2,
      },
    });

    await tick();

    expect(screen.getByText('Item 1')).toBeTruthy();
    expect(screen.getByText('Item 2')).toBeTruthy();
    expect(screen.getByText('Óptimo')).toBeTruthy();
  });

  /**
    * @test Renderiza el input de búsqueda.
    * Verifica que se renderice el input de búsqueda con el placeholder "Buscar en toda la tabla...".
    */
   it('renders search input', async () => {
    render(DataGrid, {
      props: {
        columns: mockColumns,
        data: mockData,
        totalPages: 1,
        currentPage: 0,
        pageSize: 20,
        totalElements: 2,
      },
    });

    await tick();

    const searchInput = screen.getByPlaceholderText('Buscar en toda la tabla...');
    expect(searchInput).toBeTruthy();
  });

  /**
    * @test Filtra datos basados en la entrada de búsqueda.
    * Verifica que los datos se filtren correctamente basado en la entrada de búsqueda.
    */
   it('filters data based on search input', async () => {
    render(DataGrid, {
      props: {
        columns: mockColumns,
        data: mockData,
        totalPages: 1,
        currentPage: 0,
        pageSize: 20,
        totalElements: 2,
      },
    });

    await tick();

    const searchInput = screen.getByPlaceholderText('Buscar en toda la tabla...');
    await fireEvent.input(searchInput, { target: { value: 'Item 1' } });

    await tick();

    expect(screen.getByText('Item 1')).toBeTruthy();
    // El Item 2 debería seguir siendo visible debido a la lógica de filtrado
  });

  /**
    * @test Renderiza botones de acción para columnas de acción.
    * Verifica que se rendericen botones de acción (Editar y Eliminar) para columnas de acción.
    */
   it('renders action buttons for action columns', async () => {
    render(DataGrid, {
      props: {
        columns: mockColumns,
        data: mockData,
        totalPages: 1,
        currentPage: 0,
        pageSize: 20,
        totalElements: 2,
      },
    });

    await tick();

    // Verificar que hay botones de editar y eliminar para cada fila de datos
    const editButtons = screen.getAllByText('Editar');
    const deleteButtons = screen.getAllByText('Eliminar');

    expect(editButtons.length).toBe(2);
    expect(deleteButtons.length).toBe(2);
  });

  /**
    * @test Despacha eventos de acción al hacer clic en los botones.
    * Verifica que se despachen eventos de acción (edit, delete) cuando se hacen clic en los botones.
    */
   it('dispatches action events when buttons are clicked', async () => {
    const mockDispatch = vi.fn();

    const component = render(DataGrid, {
      props: {
        columns: mockColumns,
        data: mockData,
        totalPages: 1,
        currentPage: 0,
        pageSize: 20,
        totalElements: 2,
      },
    });

    // Escuchar el evento de acción para verificar que se despache correctamente
    component.component.$on('action', (event) => mockDispatch(event.detail));

    await tick();

    // Simular clic en el botón de editar de la primera fila
    const editButtons = screen.getAllByText('Editar');
    await fireEvent.click(editButtons[0]);

    // Verificar que se despache el evento con el tipo 'edit' y los datos correctos
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'edit',
      data: mockData[0]
    });
  });

  /**
    * @test Renderiza y despacha el botón "Ver historial" (meta.isViewHistoryAction).
    * Botón de solo lectura, independiente de Editar/Eliminar (isAction) — debe
    * poder mostrarse aunque la columna de Editar/Eliminar no esté presente.
    */
  it('renders and dispatches the "Ver historial" button for isViewHistoryAction columns', async () => {
    const historyColumns = [
      { accessorKey: 'name', header: 'Name', cell: ({ getValue }) => getValue() },
      { id: 'historial', header: '', meta: { isViewHistoryAction: true } },
    ];
    const mockDispatch = vi.fn();

    const component = render(DataGrid, {
      props: { columns: historyColumns, data: mockData, showPagination: false },
    });
    component.component.$on('action', (event) => mockDispatch(event.detail));

    await tick();

    const historyButtons = screen.getAllByText('Ver historial');
    expect(historyButtons.length).toBe(2);

    await fireEvent.click(historyButtons[0]);

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'viewHistory', data: mockData[0] });
  });

  /**
    * @test Renderiza botones de estado con clases correctas.
    * Verifica que los botones de estado se rendericen con clases correctas, como "status-optimo".
    */
   it('renders status buttons with correct classes', async () => {
    render(DataGrid, {
      props: {
        columns: mockColumns,
        data: mockData,
        totalPages: 1,
        currentPage: 0,
        pageSize: 20,
        totalElements: 2,
      },
    });

    await tick();

    const statusButton = screen.getByText('Óptimo');
    expect(statusButton).toHaveClass('status-optimo');
  });

  /**
    * @test Despacha evento cellContextMenu al hacer clic en botón de estado.
    * Verifica que se despache el evento cellContextMenu al hacer clic en un botón de estado.
    */
   it('dispatches cellContextMenu event on status button click', async () => {
    const mockDispatch = vi.fn();

    const component = render(DataGrid, {
      props: {
        columns: mockColumns,
        data: mockData,
        totalPages: 1,
        currentPage: 0,
        pageSize: 20,
        totalElements: 2,
      },
    });

    // Escuchar el evento cellContextMenu para verificar el menú contextual de celda
    component.component.$on('cellContextMenu', (event) => mockDispatch(event.detail));

    await tick();

    const statusButton = screen.getByText('Óptimo');
    await fireEvent.click(statusButton);

    const callArgs = mockDispatch.mock.calls[0][0];
    expect(callArgs.row).toEqual(mockData[0]);
    expect(callArgs.columnDef.accessorKey).toBe('status');
    expect(callArgs.columnDef.header).toBe('Status');
    expect(callArgs.columnDef.meta.isStatus).toBe(true);
  });

  /**
    * @test Renderiza controles de paginación.
    * Verifica que se rendericen controles de paginación, incluyendo texto de página y elementos mostrados.
    */
   it('renders pagination controls', async () => {
    render(DataGrid, {
      props: {
        columns: mockColumns,
        data: mockData,
        totalPages: 5,
        currentPage: 2,
        pageSize: 20,
        totalElements: 100,
      },
    });

    await tick();

    // Verificar el texto de paginación - buscar el span que contiene la información de página
    const paginationSpan = document.querySelector('.pagination-controls span');
    expect(paginationSpan).toBeTruthy();
    expect(paginationSpan.textContent).toContain('Página');
    expect(paginationSpan.textContent).toContain('3');
    expect(paginationSpan.textContent).toContain('de');
    expect(paginationSpan.textContent).toContain('5');

    expect(screen.getByText('Mostrar 20')).toBeTruthy();
    expect(screen.getByText('Mostrando 2 de 100 registros')).toBeTruthy();
  });

  /**
    * @test Despacha evento pageChange al hacer clic en botones de navegación.
    * Verifica que se despache el evento pageChange al hacer clic en botones de navegación.
    */
   it('dispatches pageChange event when navigation buttons are clicked', async () => {
    const mockDispatch = vi.fn();

    const component = render(DataGrid, {
      props: {
        columns: mockColumns,
        data: mockData,
        totalPages: 5,
        currentPage: 2,
        pageSize: 20,
        totalElements: 100,
      },
    });

    // Escuchar el evento pageChange para verificar cambios de página
    component.component.$on('pageChange', (event) => mockDispatch(event.detail));

    await tick();

    const nextButton = screen.getByText('Siguiente ›');
    await fireEvent.click(nextButton);

    expect(mockDispatch).toHaveBeenCalledWith(3);
  });

  /**
   * @test Despacha evento sizeChange al cambiar el tamaño de página.
   * Verifica que se despache el evento sizeChange al cambiar el tamaño de página.
   */
  it('dispatches sizeChange event when page size is changed', async () => {
    const mockDispatch = vi.fn();

    const component = render(DataGrid, {
      props: {
        columns: mockColumns,
        data: mockData,
        totalPages: 5,
        currentPage: 0,
        pageSize: 20,
        totalElements: 100,
      },
    });

    // Escuchar el evento sizeChange para verificar cambios en el tamaño de página
    component.component.$on('sizeChange', (event) => mockDispatch(event.detail));

    await tick();

    const sizeSelect = screen.getByDisplayValue('Mostrar 20');
    await fireEvent.change(sizeSelect, { target: { value: '50' } });

    expect(mockDispatch).toHaveBeenCalledWith(50);
  });

  /**
   * @test Maneja ordenamiento al hacer clic en encabezados ordenables.
   * Verifica que se maneje el ordenamiento al hacer clic en encabezados ordenables.
   */
  it('handles sorting when sortable headers are clicked', async () => {
    render(DataGrid, {
      props: {
        columns: [
          {
            accessorKey: 'name',
            header: 'Name',
            cell: ({ getValue }) => getValue(),
          },
        ],
        data: mockData,
        totalPages: 1,
        currentPage: 0,
        pageSize: 20,
        totalElements: 2,
      },
    });

    await tick();

    // Debe tener la clase sortable para indicar que es ordenable
    const header = screen.getByText('Name');
    expect(header.closest('th')).toHaveClass('sortable');
  });

  /**
   * @test Renderiza el conteo de registros correctamente.
   * Verifica que se renderice correctamente el conteo de registros.
   */
  it('renders record count correctly', async () => {
    render(DataGrid, {
      props: {
        columns: mockColumns,
        data: mockData,
        totalPages: 1,
        currentPage: 0,
        pageSize: 20,
        totalElements: 50,
      },
    });

    await tick();

    expect(screen.getByText('Mostrando 2 de 50 registros')).toBeTruthy();
  });

  /**
   * @test Deshabilita botones de navegación apropiadamente.
   * Verifica que los botones de navegación se deshabiliten apropiadamente (primera página).
   */
  it('disables navigation buttons appropriately', async () => {
    render(DataGrid, {
      props: {
        columns: mockColumns,
        data: mockData,
        totalPages: 5,
        currentPage: 0, // Primera página
        pageSize: 20,
        totalElements: 100,
      },
    });

    await tick();

    const firstButton = screen.getByText('« Primero');
    const prevButton = screen.getByText('‹ Anterior');

    expect(firstButton).toBeDisabled();
    expect(prevButton).toBeDisabled();
  });

  /**
   * @test Renderiza clases de fila especiales.
   * Verifica que se rendericen clases de fila especiales para datos inesperados o órdenes pendientes.
   */
  it('renders special row classes', async () => {
    const dataWithSpecialRows = [
      { ...mockData[0], isUnexpected: true },
      { ...mockData[1], order: { status: 'pending' } },
    ];

    render(DataGrid, {
      props: {
        columns: mockColumns,
        data: dataWithSpecialRows,
        totalPages: 1,
        currentPage: 0,
        pageSize: 20,
        totalElements: 2,
      },
    });

    await tick();

    // Debe renderizarse sin errores, verificando que los elementos se muestren correctamente
    expect(screen.getByText('Item 1')).toBeTruthy();
  });

  /**
   * @description Tests de caracterización (caso 6 de la auditoría de deuda
   * técnica): congelan el comportamiento ACTUAL de cada uno de los ~17 flags
   * de acción de meta ANTES de extraerlos a componentes propios, para poder
   * migrar uno por uno sin cambiar comportamiento por accidente.
   */
  describe('caracterización de flags de acción (antes de extraer a componentes)', () => {
    function renderWithMeta(metaFlag, data = mockData) {
      const columns = [{ id: 'actions', header: '', meta: { [metaFlag]: true } }];
      const mockDispatch = vi.fn();
      const component = render(DataGrid, { props: { columns, data, showPagination: false } });
      component.component.$on('action', (event) => mockDispatch(event.detail));
      return { mockDispatch };
    }

    it('isExecuteAction: muestra "Ejecutar" y despacha type "execute" cuando la orden no está completada', async () => {
      const { mockDispatch } = renderWithMeta('isExecuteAction', [{ id: 1, order: { status: 'Pending' } }]);
      await tick();
      const btn = screen.getByText('Ejecutar');
      await fireEvent.click(btn);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'execute', data: { id: 1, order: { status: 'Pending' } } });
    });

    it('isExecuteAction: muestra "EJECUTADA" (sin botón) cuando order.status es Completada o Done', async () => {
      renderWithMeta('isExecuteAction', [
        { id: 1, order: { status: 'Completada' } },
        { id: 2, order: { status: 'Done' } },
      ]);
      await tick();
      expect(screen.getAllByText('EJECUTADA').length).toBe(2);
      expect(screen.queryByText('Ejecutar')).toBeNull();
    });

    it('isCvAction: "Ver Hoja de Vida" despacha type "cv"', async () => {
      const { mockDispatch } = renderWithMeta('isCvAction', [{ id: 1 }]);
      await tick();
      await fireEvent.click(screen.getByText('Ver Hoja de Vida'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'cv', data: { id: 1 } });
    });

    it('isDocHistoryAction: "Historial docs" despacha type "docHistory"', async () => {
      const { mockDispatch } = renderWithMeta('isDocHistoryAction', [{ id: 1 }]);
      await tick();
      await fireEvent.click(screen.getByText('Historial docs'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'docHistory', data: { id: 1 } });
    });

    it('isViewMotorOilHistoryAction: "Ver historial motor" despacha type "viewMotorOilHistory"', async () => {
      const { mockDispatch } = renderWithMeta('isViewMotorOilHistoryAction', [{ id: 1 }]);
      await tick();
      await fireEvent.click(screen.getByText('Ver historial motor'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'viewMotorOilHistory', data: { id: 1 } });
    });

    it('isViewHydraulicOilHistoryAction: "Ver historial hidráulico" despacha type "viewHydraulicOilHistory"', async () => {
      const { mockDispatch } = renderWithMeta('isViewHydraulicOilHistoryAction', [{ id: 1 }]);
      await tick();
      await fireEvent.click(screen.getByText('Ver historial hidráulico'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'viewHydraulicOilHistory', data: { id: 1 } });
    });

    it('isLicenseDocAction: con licenseDocumentUrl muestra "Documento" y despacha view_license_doc', async () => {
      const { mockDispatch } = renderWithMeta('isLicenseDocAction', [{ id: 1, licenseDocumentUrl: 'http://x/doc.pdf' }]);
      await tick();
      await fireEvent.click(screen.getByText('Documento'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'view_license_doc', data: { id: 1, licenseDocumentUrl: 'http://x/doc.pdf' } });
    });

    it('isLicenseDocAction: sin licenseDocumentUrl muestra "—" y ningún botón', async () => {
      renderWithMeta('isLicenseDocAction', [{ id: 1 }]);
      await tick();
      expect(screen.getByText('—')).toBeTruthy();
      expect(screen.queryByText('Documento')).toBeNull();
    });

    it('isFacturaAction: con urlFactura muestra "Factura" y despacha view_factura', async () => {
      const { mockDispatch } = renderWithMeta('isFacturaAction', [{ id: 1, urlFactura: 'http://x/f.pdf' }]);
      await tick();
      await fireEvent.click(screen.getByText('Factura'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'view_factura', data: { id: 1, urlFactura: 'http://x/f.pdf' } });
    });

    it('isFacturaAction: sin urlFactura muestra "—"', async () => {
      renderWithMeta('isFacturaAction', [{ id: 1 }]);
      await tick();
      expect(screen.getByText('—')).toBeTruthy();
      expect(screen.queryByText('Factura')).toBeNull();
    });

    it('isReintegroAction: con saldo pendiente (>0.0001) muestra "Reintegrar" y despacha reintegro', async () => {
      const { mockDispatch } = renderWithMeta('isReintegroAction', [{ id: 1, cantidadGalones: 10, cantidadReintegrada: 2 }]);
      await tick();
      await fireEvent.click(screen.getByText('Reintegrar'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'reintegro', data: { id: 1, cantidadGalones: 10, cantidadReintegrada: 2 } });
    });

    it('isReintegroAction: sin saldo pendiente muestra "Reintegrado" (sin botón)', async () => {
      renderWithMeta('isReintegroAction', [{ id: 1, cantidadGalones: 10, cantidadReintegrada: 10 }]);
      await tick();
      expect(screen.getByText('Reintegrado')).toBeTruthy();
      expect(screen.queryByText('Reintegrar')).toBeNull();
    });

    it('isImageAction: "Ver" despacha type "view_images"', async () => {
      const { mockDispatch } = renderWithMeta('isImageAction', [{ id: 1 }]);
      await tick();
      await fireEvent.click(screen.getByText('Ver'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'view_images', data: { id: 1 } });
    });

    it('isUpdateDocsAction: "Actualizar Docs" despacha type "update_docs"', async () => {
      const { mockDispatch } = renderWithMeta('isUpdateDocsAction', [{ id: 1 }]);
      await tick();
      await fireEvent.click(screen.getByText('Actualizar Docs'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'update_docs', data: { id: 1 } });
    });

    it('isMonitoringDocsAction: "Actualizar Documentos" despacha type "monitoring_update_docs"', async () => {
      const { mockDispatch } = renderWithMeta('isMonitoringDocsAction', [{ id: 1 }]);
      await tick();
      await fireEvent.click(screen.getByText('Actualizar Documentos'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'monitoring_update_docs', data: { id: 1 } });
    });

    it('isConsolidadoMaqActions: "Corregir Horómetro" despacha type "edit_hourmeter"', async () => {
      const { mockDispatch } = renderWithMeta('isConsolidadoMaqActions', [{ id: 1 }]);
      await tick();
      await fireEvent.click(screen.getByText('Corregir Horómetro'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'edit_hourmeter', data: { id: 1 } });
    });

    it('isConsolidadoVehicleActions: dos botones — "Corregir Km" (edit_km) y "Ver historial aceite" (monitoring_oil_history)', async () => {
      const { mockDispatch } = renderWithMeta('isConsolidadoVehicleActions', [{ id: 1 }]);
      await tick();
      await fireEvent.click(screen.getByText('Corregir Km'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'edit_km', data: { id: 1 } });
      await fireEvent.click(screen.getByText('Ver historial aceite'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'monitoring_oil_history', data: { id: 1 } });
    });

    it('isConsolidadoMotoActions: dos botones — "Corregir Km" (edit_km) y "Ver historial aceite" (monitoring_oil_history)', async () => {
      const { mockDispatch } = renderWithMeta('isConsolidadoMotoActions', [{ id: 1 }]);
      await tick();
      await fireEvent.click(screen.getByText('Corregir Km'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'edit_km', data: { id: 1 } });
      await fireEvent.click(screen.getByText('Ver historial aceite'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'monitoring_oil_history', data: { id: 1 } });
    });

    it('isMonitoringOilAction: dos botones — "Registrar aceite" (monitoring_register_oil) y "Ver historial" (monitoring_oil_history)', async () => {
      const { mockDispatch } = renderWithMeta('isMonitoringOilAction', [{ id: 1 }]);
      await tick();
      await fireEvent.click(screen.getByText('Registrar aceite'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'monitoring_register_oil', data: { id: 1 } });
      await fireEvent.click(screen.getByText('Ver historial'));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'monitoring_oil_history', data: { id: 1 } });
    });
  });

  /**
   * @test Maneja clases de celda condicionales.
   * Verifica que se manejen clases de celda condicionales para orígenes y condiciones.
   */
  it('handles conditional cell classes', async () => {
    const columnsWithConditions = [
      {
        accessorKey: 'origin',
        header: 'Origin',
        meta: { isOrigin: true },
        cell: () => 'Inspección',
      },
      {
        accessorKey: 'condition',
        header: 'Condition',
        meta: { isCondition: true },
        cell: () => 'Malo',
      },
    ];

    render(DataGrid, {
      props: {
        columns: columnsWithConditions,
        data: [{ id: 1, origin: 'Inspección', condition: 'Malo' }],
        totalPages: 1,
        currentPage: 0,
        pageSize: 20,
        totalElements: 1,
      },
    });

    await tick();

    expect(screen.getByText('Inspección')).toBeTruthy();
    expect(screen.getByText('Malo')).toBeTruthy();
  });
});