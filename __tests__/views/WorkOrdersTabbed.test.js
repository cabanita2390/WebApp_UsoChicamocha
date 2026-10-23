import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import WorkOrdersTabbed from '../../components/views/WorkOrdersTabbed.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn((callback) => {
      callback({
        workOrders: { data: [], totalElements: 0, totalPages: 0, currentPage: 0, pageSize: 20 },
        vehicleWorkOrders: { data: [], totalElements: 0, totalPages: 0, currentPage: 0, pageSize: 20 },
        motoWorkOrders: { data: [], totalElements: 0, totalPages: 0, currentPage: 0, pageSize: 20 },
        isLoading: false,
        error: null,
      });
      return () => {};
    }),
    fetchWorkOrders: vi.fn(),
    fetchVehicleWorkOrders: vi.fn(),
    executeVehicleWorkOrder: vi.fn(),
    executeWorkOrder: vi.fn(),
  },
}));

vi.mock('../../stores/ui.js', () => ({
  addNotification: vi.fn(),
}));

vi.mock('../../config/table-definitions.js', () => ({
  workOrderColumns: [],
  vehicleWorkOrderColumns: [],
}));

import { data } from '../../stores/data.js';

describe('WorkOrdersTabbed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('al entrar a la pestaña Vehículos pide soloMotos=false (excluye motos)', async () => {
    render(WorkOrdersTabbed);

    await fireEvent.click(screen.getByRole('tab', { name: 'Vehículos' }));

    expect(data.fetchVehicleWorkOrders).toHaveBeenCalledWith(0, 20, false);
  });

  it('al entrar a la pestaña Motos pide soloMotos=true (solo motos)', async () => {
    render(WorkOrdersTabbed);

    await fireEvent.click(screen.getByRole('tab', { name: 'Motos' }));

    expect(data.fetchVehicleWorkOrders).toHaveBeenCalledWith(0, 20, true);
  });

  it('no filtra en memoria: Vehículos y Motos piden datos al backend por separado, no una sola página compartida', async () => {
    render(WorkOrdersTabbed);

    await fireEvent.click(screen.getByRole('tab', { name: 'Vehículos' }));
    await fireEvent.click(screen.getByRole('tab', { name: 'Motos' }));

    expect(data.fetchVehicleWorkOrders).toHaveBeenCalledTimes(2);
    expect(data.fetchVehicleWorkOrders).toHaveBeenNthCalledWith(1, 0, 20, false);
    expect(data.fetchVehicleWorkOrders).toHaveBeenNthCalledWith(2, 0, 20, true);
  });
});
