import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Consolidado from '../../components/views/Consolidado.svelte';

/**
 * @fileoverview Suite de tests para el componente Consolidado.svelte.
 * @description Se verifica que el componente maneje correctamente los estados de carga,
 * error y la visualización de datos para 'distrito' y 'asociación'. También
 * se prueba la funcionalidad del botón de refresco.
 */

// Mock del store de datos.
// Se simula para poder controlar los datos que recibe el componente
// sin depender de llamadas reales a la API.
vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(), // Permite controlar el estado del store (loading, error, data).
    fetchConsolidadoData: vi.fn(), // Se espía para verificar si se llama al refrescar.
  },
}));

vi.mock('../../stores/auth.js', () => ({
  auth: {
    subscribe: vi.fn((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Test Admin', role: 'ADMIN' }, isRefreshing: false });
      return () => {};
    }),
  },
}));

// Mock de las definiciones de columnas de la tabla.
// Se simula para verificar que el componente solicita las columnas correctas
// ('Distrito', 'Asociación') sin depender de la implementación real.
vi.mock('../../config/table-definitions.js', () => ({
  createConsolidadoColumns: vi.fn(),
}));

// Mock de componentes hijos (shared components).
// Se reemplazan por componentes falsos para simplificar el test y enfocarse
// únicamente en la lógica de `Consolidado.svelte`.
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
import { createConsolidadoColumns } from '../../config/table-definitions.js';

// `describe` agrupa los tests para el componente Consolidado.
describe('Consolidado', () => {
  let mockDataStore; // Variable para mantener el estado del store simulado.

  // `beforeEach` se ejecuta antes de cada test (`it`).
  // Resetea todos los mocks y establece un estado inicial limpio para cada prueba.
  beforeEach(() => {
    vi.clearAllMocks();

    // Estado por defecto del store simulado.
    mockDataStore = {
      consolidated: { distrito: [], asociacion: [] },
      isLoading: false,
      error: null,
    };

    // Se simula la función `subscribe` del store. Al suscribirse, el componente
    // recibe inmediatamente el estado definido en `mockDataStore`.
    data.subscribe.mockImplementation((callback) => {
      callback(mockDataStore);
      return () => {}; // Devuelve una función de desuscripción vacía.
    });

    // Se simula la función que crea columnas para devolver una estructura básica.
    createConsolidadoColumns.mockImplementation((type) => [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'value', header: 'Value' },
    ]);
  });

  // --- Casos de Prueba ---

  /**
   * @test Muestra el estado de carga.
   * @description Verifica que el componente renderiza el mensaje de carga
   * cuando `isLoading` es `true` y aún no hay datos.
   */
  it('renders loading state when loading and no data', async () => {
    mockDataStore.isLoading = true;
    mockDataStore.consolidated = { distrito: [], asociacion: [] };

    render(Consolidado);
    await tick(); // Espera a que Svelte actualice el DOM.

    expect(screen.getByText('Cargando datos del consolidado...')).toBeTruthy();
  });

  /**
   * @test Muestra un mensaje de error.
   * @description Verifica que el componente renderiza el mensaje de error
   * cuando la propiedad `error` del store tiene un valor.
   */
  it('renders error message when there is an error', async () => {
    mockDataStore.error = 'Test error message';

    render(Consolidado);
    await tick();

    expect(screen.getByText('Se encontraron problemas al cargar los datos:')).toBeTruthy();
    expect(screen.getByText('Test error message')).toBeTruthy();
  });

  /**
   * @test Renderiza la tabla de datos de distrito.
   * @description Verifica que si hay datos en `consolidated.distrito`, se renderiza la
   * vista principal y se solicita la configuración de columnas para "Distrito".
   */
  it('renders distrito data grid when distrito machines exist', async () => {
    mockDataStore.consolidated.distrito = [{ id: 1, name: 'Machine 1' }];

    render(Consolidado);
    await tick();

    expect(createConsolidadoColumns).toHaveBeenCalledWith('Distrito');
    expect(screen.getByText('Refrescar')).toBeTruthy();
  });

  /**
   * @test Renderiza la tabla de datos de asociación.
   * @description Verifica que si hay datos en `consolidated.asociacion`, se renderiza la
   * vista principal y se solicita la configuración de columnas para "Asociación".
   */
  it('renders asociacion data grid when asociacion machines exist', async () => {
    mockDataStore.consolidated.asociacion = [{ id: 2, name: 'Machine 2' }];

    render(Consolidado);
    await tick();

    expect(createConsolidadoColumns).toHaveBeenCalledWith('Asociación');
    expect(screen.getByText('Refrescar')).toBeTruthy();
  });

  /**
   * @test Renderiza ambas tablas de datos.
   * @description Verifica que si existen datos para ambos tipos, se solicitan las
   * configuraciones de columnas para "Distrito" y "Asociación".
   */
  it('renders both data grids when both types of machines exist', async () => {
    mockDataStore.consolidated = {
      distrito: [{ id: 1, name: 'Machine 1' }],
      asociacion: [{ id: 2, name: 'Machine 2' }]
    };

    render(Consolidado);
    await tick();

    expect(createConsolidadoColumns).toHaveBeenCalledWith('Distrito');
    expect(createConsolidadoColumns).toHaveBeenCalledWith('Asociación');
  });

  /**
   * @test Llama a la función de refresco al hacer clic en el botón.
   * @description Simula un clic en el botón "Refrescar" y verifica
   * que se llama a la función `fetchConsolidadoData` del store.
   */
  it('calls fetchConsolidadoData when refresh button is clicked', async () => {
    render(Consolidado);
    await tick();

    const refreshButton = screen.getByText('Refrescar');
    await fireEvent.click(refreshButton);

    expect(data.fetchConsolidadoData).toHaveBeenCalled();
  });

  /**
   * @test No muestra el loader cuando no está cargando.
   * @description Caso de prueba negativo para asegurar que el mensaje de carga no
   * aparece cuando `isLoading` es `false`.
   */
  it('does not show loader when not loading', async () => {
    mockDataStore.isLoading = false;

    render(Consolidado);
    await tick();

    // `queryByText` devuelve `null` si no encuentra el elemento, ideal para probar ausencias.
    expect(screen.queryByText('Cargando datos del consolidado...')).toBeNull();
  });

  /**
   * @test No muestra el mensaje de error cuando no hay error.
   * @description Caso de prueba negativo que confirma que el bloque de error no se
   * renderiza si la propiedad `error` en el store es `null`.
   */
  it('does not show error when there is no error', async () => {
    mockDataStore.error = null;

    render(Consolidado);
    await tick();

    expect(screen.queryByText('Se encontraron problemas al cargar los datos:')).toBeNull();
  });
});
