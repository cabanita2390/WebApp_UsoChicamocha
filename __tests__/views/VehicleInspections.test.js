import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import VehicleInspections from '../../components/views/VehicleInspections.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchVehicleInspections: vi.fn(),
  },
}));

vi.mock('../../stores/ui.js', () => ({
  ui: { openVehicleWorkOrderModal: vi.fn() },
  addNotification: vi.fn(),
}));

vi.mock('../../config/table-definitions.js', () => ({
  vehicleInspectionReportColumns: [
    { accessorKey: 'placa', header: 'Placa' },
    { accessorKey: 'kilometrajeReportado', header: 'Km' },
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

describe('VehicleInspections', () => {
  let mockDataStore;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDataStore = {
      vehicleInspections: {
        data: [],
        totalElements: 0,
        totalPages: 0,
        currentPage: 0,
        pageSize: 20,
      },
      isLoading: false,
      error: null,
    };

    data.subscribe.mockImplementation((callback) => {
      callback(mockDataStore);
      return () => {};
    });
  });

  it('muestra el loader cuando está cargando sin datos', async () => {
    mockDataStore.isLoading = true;
    mockDataStore.vehicleInspections.data = [];

    render(VehicleInspections);
    await tick();

    expect(screen.getByText('Cargando inspecciones...')).toBeTruthy();
  });

  it('muestra la barra de herramientas cuando hay inspecciones', async () => {
    mockDataStore.vehicleInspections.data = [
      { idInspeccion: 1, placa: 'VEH001', kilometrajeReportado: 500 },
    ];

    render(VehicleInspections);
    await tick();

    expect(screen.getByText('Refrescar')).toBeTruthy();
    expect(screen.getByText('Exportar Excel')).toBeTruthy();
  });

  it('llama fetchVehicleInspections al hacer clic en Refrescar', async () => {
    mockDataStore.vehicleInspections.data = [
      { idInspeccion: 1, placa: 'VEH001', kilometrajeReportado: 500 },
    ];
    data.fetchVehicleInspections.mockResolvedValue();

    render(VehicleInspections);
    await tick();

    await fireEvent.click(screen.getByText('Refrescar'));

    expect(data.fetchVehicleInspections).toHaveBeenCalled();
  });

  it('llama fetchVehicleInspections con recarga al refrescar', async () => {
    mockDataStore.vehicleInspections = {
      data: [{ idInspeccion: 1, placa: 'VEH001' }],
      totalElements: 1,
      totalPages: 1,
      currentPage: 0,
      pageSize: 20,
    };
    data.fetchVehicleInspections.mockResolvedValue();

    render(VehicleInspections);
    await tick();

    await fireEvent.click(screen.getByText('Refrescar'));

    expect(data.fetchVehicleInspections).toHaveBeenCalledWith(0, 20, { reload: true });
  });

  it('muestra error cuando el store reporta un error', async () => {
    mockDataStore.vehicleInspections.data = [];
    mockDataStore.error = 'Error al cargar inspecciones';

    render(VehicleInspections);
    await tick();

    expect(screen.getByText('Error al cargar inspecciones')).toBeTruthy();
  });

  it('renderiza correctamente con datos de paginación', async () => {
    mockDataStore.vehicleInspections = {
      data: [
        { idInspeccion: 1, placa: 'VEH001' },
        { idInspeccion: 2, placa: 'VEH002' },
      ],
      totalElements: 2,
      totalPages: 1,
      currentPage: 0,
      pageSize: 20,
    };

    render(VehicleInspections);
    await tick();

    expect(screen.getByText('Refrescar')).toBeTruthy();
  });

  it('el botón Exportar Excel no está deshabilitado por defecto', async () => {
    mockDataStore.vehicleInspections.data = [{ idInspeccion: 1, placa: 'VEH001' }];

    render(VehicleInspections);
    await tick();

    const exportBtn = screen.getByText('Exportar Excel');
    expect(exportBtn.disabled).toBe(false);
  });
});
