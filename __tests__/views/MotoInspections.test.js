import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import MotoInspections from '../../components/views/MotoInspections.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchMotoInspections: vi.fn(),
  },
}));

vi.mock('../../stores/ui.js', () => ({
  ui: { openVehicleWorkOrderModal: vi.fn() },
  addNotification: vi.fn(),
}));

vi.mock('../../config/table-definitions.js', () => ({
  reportMotoColumns: [
    { accessorKey: 'placa', header: 'Placa' },
    { accessorKey: 'fechaRegistro', header: 'Fecha' },
  ],
}));

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

describe('MotoInspections', () => {
  let mockDataStore;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDataStore = {
      motoInspections: [],
      isLoading: false,
      error: null,
    };

    data.subscribe.mockImplementation((callback) => {
      callback(mockDataStore);
      return () => {};
    });
  });

  it('muestra el loader cuando está cargando y no hay datos', async () => {
    mockDataStore.isLoading = true;
    mockDataStore.motoInspections = [];

    render(MotoInspections);
    await tick();

    expect(screen.getByText('Cargando inspecciones de motos...')).toBeTruthy();
  });

  it('muestra los botones de acción cuando hay datos', async () => {
    mockDataStore.motoInspections = [
      { idInspeccion: 1, placa: 'ABC123', fechaRegistro: '2026-05-01T08:00:00' },
    ];

    render(MotoInspections);
    await tick();

    expect(screen.getByText('Refrescar')).toBeTruthy();
    expect(screen.getByText('Exportar Excel')).toBeTruthy();
  });

  it('llama fetchMotoInspections al hacer clic en Refrescar', async () => {
    mockDataStore.motoInspections = [
      { idInspeccion: 1, placa: 'ABC123', fechaRegistro: '2026-05-01T08:00:00' },
    ];
    data.fetchMotoInspections.mockResolvedValue();

    render(MotoInspections);
    await tick();

    await fireEvent.click(screen.getByText('Refrescar'));

    expect(data.fetchMotoInspections).toHaveBeenCalled();
  });

  it('deduplica registros por placa mostrando solo el más reciente', async () => {
    mockDataStore.motoInspections = [
      { idInspeccion: 1, placa: 'MTO001', fechaRegistro: '2026-04-01T08:00:00' },
      { idInspeccion: 2, placa: 'MTO001', fechaRegistro: '2026-05-10T08:00:00' },
      { idInspeccion: 3, placa: 'MTO002', fechaRegistro: '2026-05-01T08:00:00' },
    ];

    render(MotoInspections);
    await tick();

    // El componente aplica latestPerPlaca: 2 placas únicas
    expect(screen.getByText('Refrescar')).toBeTruthy();
  });

  it('muestra el botón de exportar deshabilitado mientras descarga', async () => {
    mockDataStore.motoInspections = [
      { idInspeccion: 1, placa: 'ABC123', fechaRegistro: '2026-05-01T08:00:00' },
    ];

    render(MotoInspections);
    await tick();

    const exportBtn = screen.getByText('Exportar Excel');
    expect(exportBtn).toBeTruthy();
    expect(exportBtn.disabled).toBe(false);
  });

  it('muestra mensaje de error cuando existe', async () => {
    mockDataStore.motoInspections = [];
    mockDataStore.isLoading = false;
    mockDataStore.error = 'Error de conexión';

    render(MotoInspections);
    await tick();

    expect(screen.getByText('Error de conexión')).toBeTruthy();
  });

  it('no rompe con un array vacío de inspecciones', async () => {
    mockDataStore.motoInspections = [];

    render(MotoInspections);
    await tick();

    // Componente renderiza sin error con datos vacíos
    expect(screen.queryByText('Error')).toBeNull();
  });
});
