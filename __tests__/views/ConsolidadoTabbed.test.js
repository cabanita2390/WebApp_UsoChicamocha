import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import ConsolidadoTabbed from '../../components/views/ConsolidadoTabbed.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchConsolidadoData: vi.fn(),
    fetchVehicleMonitoring: vi.fn(),
    fetchMotoMonitoring: vi.fn(),
    getVehicleByPlaca: vi.fn(),
    getMotoByPlaca: vi.fn(),
    updateVehicle: vi.fn(),
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

vi.mock('../../stores/ui.js', () => ({
  addNotification: vi.fn(),
}));

vi.mock('../shared/Loader.svelte', () => ({
  default: vi.fn().mockImplementation(() => ({
    $$: { on_mount: [], on_destroy: [], after_update: [] },
    $set: vi.fn(),
    $destroy: vi.fn(),
  })),
}));

vi.mock('../../components/views/Consolidado.svelte', () => ({
  default: vi.fn().mockImplementation(() => ({
    $$: { on_mount: [], on_destroy: [], after_update: [] },
    $set: vi.fn(),
    $destroy: vi.fn(),
  })),
}));

import { data } from '../../stores/data.js';
import { auth } from '../../stores/auth.js';

const VEHICLE_ROW = { area: 'Distrito', placa: 'ABC123', kmActual: 15000, diasUltimoReporte: 2, fechaUltimoReporte: '2026-08-01T09:00:00' };
const FULL_VEHICLE = { id: 5, placa: 'ABC123', kilometrajeActual: 15000, idMarca: 1, idTipoVehiculo: 1, belongsTo: 'Distrito', activo: true };

describe('ConsolidadoTabbed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Test Admin', role: 'ADMIN' }, isRefreshing: false });
      return () => {};
    });
    data.subscribe.mockImplementation((callback) => {
      callback({
        vehicleMonitoring: [VEHICLE_ROW],
        motoMonitoring: [],
        consolidated: { distrito: [], asociacion: [] },
        isLoading: false,
      });
      return () => {};
    });
    data.getVehicleByPlaca.mockResolvedValue(FULL_VEHICLE);
    data.updateVehicle.mockResolvedValue(FULL_VEHICLE);
  });

  it('click en "Corregir Km" abre el modal con el kilometraje actual precargado y guarda con updateVehicle', async () => {
    render(ConsolidadoTabbed);

    await fireEvent.click(screen.getByRole('tab', { name: 'Vehículos' }));
    await fireEvent.click(screen.getByRole('button', { name: /corregir km/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/nuevo kilometraje/i).value).toBe('15000');

    await fireEvent.input(within(dialog).getByLabelText(/nuevo kilometraje/i), { target: { value: '16000' } });
    await fireEvent.click(within(dialog).getByRole('button', { name: /guardar/i }));

    expect(data.getVehicleByPlaca).toHaveBeenCalledWith('ABC123');
    await vi.waitFor(() => expect(data.updateVehicle).toHaveBeenCalledTimes(1));
    const [id, payload] = data.updateVehicle.mock.calls[0];
    expect(id).toBe(5);
    expect(payload.kilometrajeActual).toBe(16000);
    expect(data.fetchVehicleMonitoring).toHaveBeenCalled();
  });

  it('un rol sin permiso (ni ADMIN ni SUPERVISOR_OPERATIVO) no ve el modal de Corregir Km aunque haga click', async () => {
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Op', role: 'OPERARIO' }, isRefreshing: false });
      return () => {};
    });

    render(ConsolidadoTabbed);
    await fireEvent.click(screen.getByRole('tab', { name: 'Vehículos' }));
    await fireEvent.click(screen.getByRole('button', { name: /corregir km/i }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
