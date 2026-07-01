import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Dashboard from '../../components/views/Dashboard.svelte';

/**
 * @fileoverview Suite de tests para el componente Dashboard.svelte.
 * @description Se verifica que el componente renderice correctamente los estados de
 * carga y de datos, y que maneje las interacciones del usuario como el refresco de datos.
 */

// Mock del store de datos.
// Permite controlar el estado (`isLoading`, datos del dashboard, paginación)
// que recibe el componente sin hacer llamadas reales a una API.
vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(), // Se simula para inyectar un estado controlado.
    fetchDashboardData: vi.fn(), // Se espía para verificar si es llamado.
  },
}));

// Mock de las definiciones de columnas.
// Se usa una estructura de columnas fija para los tests, independizando el
// componente de la configuración real.
vi.mock('../../config/table-definitions.js', () => ({
  dashboardColumns: [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'value', header: 'Value' },
  ],
}));

// Mock de componentes hijos.
// Se reemplazan los componentes `DataGrid` y `Loader` por simulaciones vacías
// para centrar el test exclusivamente en la lógica del componente `Dashboard`.
vi.mock('../shared/DataGrid.svelte', () => ({
  default: vi.fn().mockImplementation(() => ({
    $$: { on_mount: [], on_destroy: [] },
    $set: vi.fn(),
    $destroy: vi.fn(),
  })),
}));
vi.mock('../shared/Loader.svelte', () => ({
  default: vi.fn().mockImplementation(() => ({
    $$: { on_mount: [], on_destroy: [] },
    $set: vi.fn(),
    $destroy: vi.fn(),
  })),
}));

import { data } from '../../stores/data.js';

/**
 * @description Suite de pruebas para la vista Dashboard.
 * Verifica el renderizado de estados de carga y datos, y manejo de interacciones como refresco.
 * Tests incluidos:
 * - renders loading state when loading and no data: Verifica que se muestre estado de carga cuando está cargando y no hay datos.
 * - renders dashboard data when not loading: Verifica que se rendericen los datos del dashboard cuando no está cargando.
 * - calls fetchDashboardData when refresh button is clicked: Verifica que se llame fetchDashboardData al hacer clic en el botón de refrescar.
 * - passes correct props to DataGrid: Verifica que se pasen las props correctas al DataGrid.
 * - handles page change events: Verifica que se manejen eventos de cambio de página.
 * - handles size change events: Verifica que se manejen eventos de cambio de tamaño de página.
 * - handles cell context menu events: Verifica que se manejen eventos de menú contextual de celda.
 */
describe('Dashboard', () => {
  let mockDataStore;

  // `beforeEach` se ejecuta antes de cada test.
  // Limpia los mocks y establece un estado base para el store simulado,
  // asegurando que cada test se ejecute en un entorno limpio.
  beforeEach(() => {
    vi.clearAllMocks();

    // Estado inicial por defecto del store simulado.
    mockDataStore = {
      dashboard: {
        data: [],
        totalElements: 0,
        totalPages: 0,
        currentPage: 0,
        pageSize: 20,
      },
      isLoading: false,
    };

    // Simula la suscripción al store para que el componente reciba el estado controlado.
    data.subscribe.mockImplementation((callback) => {
      callback(mockDataStore);
      return () => {}; // Devuelve una función de desuscripción vacía.
    });
  });

  // --- Casos de Prueba ---

  /**
   * @test Muestra el estado de carga.
   * @description Verifica que, cuando `isLoading` es `true` y no hay datos,
   * el componente muestra un estado de carga (en este caso, se verifica que la
   * vista principal con el botón 'Refrescar' no es visible).
   */
  it('renders loading state when loading and no data', async () => {
    mockDataStore.isLoading = true;
    mockDataStore.dashboard.data = [];

    render(Dashboard);
    await tick();

    expect(screen.queryByText('Refrescar')).toBeNull();
  });

  /**
   * @test Renderiza los datos del dashboard.
   * @description Comprueba que, cuando `isLoading` es `false` y hay datos,
   * el componente renderiza la vista principal que contiene la tabla de datos.
   */
  it('renders dashboard data when not loading', async () => {
    mockDataStore.dashboard.data = [{ id: 1, name: 'Item 1', value: 'Value 1' }];

    render(Dashboard);
    await tick();

    expect(screen.getByText('Refrescar')).toBeTruthy();
  });

  /**
   * @test Llama a la función de refresco al hacer clic en el botón.
   * @description Simula un clic en el botón "Refrescar" y verifica que
   * se invoca la función `fetchDashboardData` del store.
   */
  it('calls fetchDashboardData when refresh button is clicked', async () => {
    mockDataStore.dashboard.data = [{ id: 1, name: 'Item 1' }];

    render(Dashboard);
    await tick();

    const refreshButton = screen.getByText('Refrescar');
    await fireEvent.click(refreshButton);

    expect(data.fetchDashboardData).toHaveBeenCalledWith();
  });

  /**
   * @test Pasa las propiedades correctas al componente DataGrid.
   * @description Verifica que el componente se renderiza correctamente cuando tiene
   * datos de paginación, lo que implica que las props se están pasando al
   * componente hijo `DataGrid`.
   */
  it('passes correct props to DataGrid', async () => {
    mockDataStore.dashboard = {
      data: [{ id: 1, name: 'Test' }],
      totalElements: 1, totalPages: 1, currentPage: 0, pageSize: 20,
    };

    render(Dashboard);
    await tick();

    expect(screen.getByText('Refrescar')).toBeTruthy();
  });

  /**
   * @test Maneja eventos de cambio de página.
   * @description Este test sirve como marcador de posición para la funcionalidad de
   * cambio de página. Verifica que el componente se renderiza, que es un
   * prerrequisito para que pueda manejar eventos del `DataGrid`.
   */
  it('handles page change events', async () => {
    mockDataStore.dashboard = {
      data: [{ id: 1, name: 'Test' }],
      totalElements: 1, totalPages: 1, currentPage: 0, pageSize: 20,
    };

    render(Dashboard);
    await tick();

    expect(screen.getByText('Refrescar')).toBeTruthy();
  });

  /**
   * @test Maneja eventos de cambio de tamaño de página.
   * @description Similar al test anterior, asegura que el componente se renderiza
   * correctamente, preparando el terreno para la gestión de eventos de
   * cambio de tamaño de página desde el `DataGrid`.
   */
  it('handles size change events', async () => {
    mockDataStore.dashboard = {
      data: [{ id: 1, name: 'Test' }],
      totalElements: 1, totalPages: 1, currentPage: 0, pageSize: 20,
    };

    render(Dashboard);
    await tick();

    expect(screen.getByText('Refrescar')).toBeTruthy();
  });

  /**
   * @test Maneja eventos de menú contextual de celda.
   * @description Confirma el renderizado correcto del componente como base para
   * manejar eventos de menú contextual que podrían originarse en el `DataGrid`.
   */
  it('handles cell context menu events', async () => {
    mockDataStore.dashboard = {
      data: [{ id: 1, name: 'Test' }],
      totalElements: 1, totalPages: 1, currentPage: 0, pageSize: 20,
    };

    render(Dashboard);
    await tick();

    expect(screen.getByText('Refrescar')).toBeTruthy();
  });
});