import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/svelte';
import VehicleOilHistory from '../../components/views/VehicleOilHistory.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    fetchVehicleOilHistory: vi.fn(),
    fetchOils: vi.fn(),
    updateVehicleOilChange: vi.fn().mockResolvedValue(undefined),
    deleteVehicleOilChange: vi.fn().mockResolvedValue(undefined),
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

vi.mock('svelte-spa-router', () => ({
  pop: vi.fn(),
}));

import { data } from '../../stores/data.js';
import { auth } from '../../stores/auth.js';

const HISTORIAL = [
  {
    id: 10, dateStamp: '2026-07-20T09:00:00', oilType: 'MOTOR', brandId: 2, brandName: 'Mobil',
    quantity: 4.0, kmAtChange: 15000, intervalKm: 5000, airFilterChanged: true,
  },
  {
    id: 9, dateStamp: '2026-06-01T09:00:00', oilType: 'MOTOR', brandId: 1, brandName: 'Castrol',
    quantity: 3.5, kmAtChange: 10000, intervalKm: 5000, airFilterChanged: false,
  },
];

const OILS = [
  { id: 1, name: 'Castrol' },
  { id: 2, name: 'Mobil' },
];

describe('VehicleOilHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    data.fetchVehicleOilHistory.mockResolvedValue(HISTORIAL);
    data.fetchOils.mockResolvedValue(OILS);
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Test Admin', role: 'ADMIN' }, isRefreshing: false });
      return () => {};
    });
  });

  it('un ADMIN ve las columnas Editar/Eliminar, un SUPERVISOR_OPERATIVO no', async () => {
    const { unmount: unmountAdmin } = render(VehicleOilHistory, { props: { params: { placa: 'ABC123' } } });
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^editar$/i }).length).toBeGreaterThan(0));
    expect(screen.getAllByRole('button', { name: /^eliminar$/i }).length).toBeGreaterThan(0);
    unmountAdmin();

    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Sup', role: 'SUPERVISOR_OPERATIVO' }, isRefreshing: false });
      return () => {};
    });
    render(VehicleOilHistory, { props: { params: { placa: 'ABC123' } } });
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(1));
    expect(screen.queryByRole('button', { name: /^editar$/i })).toBeNull();
  });

  it('click en Editar abre el modal con los campos precargados y guarda con updateVehicleOilChange', async () => {
    render(VehicleOilHistory, { props: { params: { placa: 'ABC123' } } });
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^editar$/i }).length).toBeGreaterThan(0));

    await fireEvent.click(screen.getAllByRole('button', { name: /^editar$/i })[0]);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText(/km en cambio/i).value).toBe('15000');

    await fireEvent.input(within(dialog).getByLabelText(/km en cambio/i), { target: { value: '16000' } });
    await fireEvent.click(within(dialog).getByRole('button', { name: /guardar/i }));

    await waitFor(() => expect(data.updateVehicleOilChange).toHaveBeenCalledTimes(1));
    const [id, payload] = data.updateVehicleOilChange.mock.calls[0];
    expect(id).toBe(10);
    expect(payload.kmAtChange).toBe(16000);
    expect(payload.brandId).toBe(2);
  });

  it('click en Eliminar muestra confirmación, y confirmar llama a deleteVehicleOilChange con el id correcto', async () => {
    render(VehicleOilHistory, { props: { params: { placa: 'ABC123' } } });
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^eliminar$/i }).length).toBeGreaterThan(0));

    await fireEvent.click(screen.getAllByRole('button', { name: /^eliminar$/i })[0]);

    const dialog = screen.getByRole('dialog', { name: /eliminar cambio de aceite/i });
    expect(within(dialog).getByText(/¿está seguro/i)).toBeTruthy();

    await fireEvent.click(within(dialog).getByRole('button', { name: /^eliminar$/i }));

    await waitFor(() => expect(data.deleteVehicleOilChange).toHaveBeenCalledWith(10));
  });
});
