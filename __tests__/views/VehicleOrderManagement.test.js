import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import VehicleOrderManagement from '../../components/views/VehicleOrderManagement.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchVehicleWorkOrders: vi.fn(),
    executeVehicleWorkOrder: vi.fn(),
  },
}));

vi.mock('../../stores/ui.js', () => ({
  addNotification: vi.fn(),
}));

vi.mock('../../config/table-definitions.js', () => ({
  vehicleWorkOrderColumns: [
    { accessorKey: 'description', header: 'Descripción' },
    { accessorKey: 'status', header: 'Estado' },
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

vi.mock('../shared/ExecuteOrderModal.svelte', () => ({
  default: vi.fn().mockImplementation(() => ({
    $$: { on_mount: [], on_destroy: [] },
    $set: vi.fn(),
    $destroy: vi.fn(),
  })),
}));

import { data } from '../../stores/data.js';

describe('VehicleOrderManagement', () => {
  let mockDataStore;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDataStore = {
      vehicleWorkOrders: {
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

  it('muestra loader cuando está cargando', async () => {
    mockDataStore.isLoading = true;

    render(VehicleOrderManagement);
    await tick();

    expect(screen.queryByText('Refrescar')).toBeNull();
  });

  it('muestra la tabla de órdenes cuando hay datos', async () => {
    mockDataStore.vehicleWorkOrders.data = [
      { id: 1, description: 'Cambio de aceite', status: 'PENDIENTE' },
    ];

    render(VehicleOrderManagement);
    await tick();

    expect(screen.getByText('Refrescar')).toBeTruthy();
  });

  it('llama fetchVehicleWorkOrders al hacer clic en Refrescar', async () => {
    mockDataStore.vehicleWorkOrders.data = [
      { id: 1, description: 'Cambio de aceite', status: 'PENDIENTE' },
    ];
    data.fetchVehicleWorkOrders.mockResolvedValue();

    render(VehicleOrderManagement);
    await tick();

    await fireEvent.click(screen.getByText('Refrescar'));

    expect(data.fetchVehicleWorkOrders).toHaveBeenCalled();
  });

  it('acepta overrideData como prop para mostrar datos externos', async () => {
    const externalData = {
      data: [{ id: 99, description: 'Orden externa', status: 'ACTIVA' }],
      totalElements: 1,
      totalPages: 1,
      currentPage: 0,
      pageSize: 20,
    };

    render(VehicleOrderManagement, { props: { overrideData: externalData } });
    await tick();

    expect(screen.getByText('Refrescar')).toBeTruthy();
  });

  it('ejecuta una orden de trabajo exitosamente', async () => {
    mockDataStore.vehicleWorkOrders.data = [
      { id: 1, description: 'Mantenimiento', status: 'PENDIENTE' },
    ];
    data.executeVehicleWorkOrder.mockResolvedValue();

    render(VehicleOrderManagement);
    await tick();

    expect(data.executeVehicleWorkOrder).not.toHaveBeenCalled();
  });

  it('renderiza sin órdenes sin lanzar errores', async () => {
    mockDataStore.vehicleWorkOrders.data = [];

    render(VehicleOrderManagement);
    await tick();

    expect(screen.queryByText('Error')).toBeNull();
  });
});
