import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/svelte';
import MachineOilHistory from '../../components/views/MachineOilHistory.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    fetchMachineOilHistory: vi.fn(),
    getMachineById: vi.fn(),
    fetchOils: vi.fn(),
    updateMachineOilChange: vi.fn().mockResolvedValue(undefined),
    deleteMachineOilChange: vi.fn().mockResolvedValue(undefined),
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
  { id: 20, dateStamp: '2026-07-01T09:00:00', oilType: 'MOTOR', brandId: 2, brandName: 'Mobil', quantity: 4, hourMeter: 300, averageHoursChange: 250 },
  { id: 15, dateStamp: '2026-04-01T09:00:00', oilType: 'MOTOR', brandId: 1, brandName: 'Castrol', quantity: 3.5, hourMeter: 50, averageHoursChange: 250 },
];

const OILS = [
  { id: 1, name: 'Castrol' },
  { id: 2, name: 'Mobil' },
];

const MACHINE = { id: 8, name: 'Excavadora' };

describe('MachineOilHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    data.fetchMachineOilHistory.mockResolvedValue(HISTORIAL);
    data.getMachineById.mockResolvedValue(MACHINE);
    data.fetchOils.mockResolvedValue(OILS);
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Test Admin', role: 'ADMIN' }, isRefreshing: false });
      return () => {};
    });
  });

  it('pide el historial de motor para la máquina indicada en params', async () => {
    render(MachineOilHistory, { props: { params: { machineId: '8', tipo: 'MOTOR' } } });

    await waitFor(() => expect(data.fetchMachineOilHistory).toHaveBeenCalledWith(8, 'MOTOR'));
    expect((await screen.findAllByText('Mobil')).length).toBeGreaterThan(0);
  });

  it('un ADMIN ve las columnas Editar/Eliminar, un SUPERVISOR_OPERATIVO no', async () => {
    const { unmount: unmountAdmin } = render(MachineOilHistory, { props: { params: { machineId: '8', tipo: 'MOTOR' } } });
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^editar$/i }).length).toBeGreaterThan(0));
    expect(screen.getAllByRole('button', { name: /^eliminar$/i }).length).toBeGreaterThan(0);
    unmountAdmin();

    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Sup', role: 'SUPERVISOR_OPERATIVO' }, isRefreshing: false });
      return () => {};
    });
    render(MachineOilHistory, { props: { params: { machineId: '8', tipo: 'MOTOR' } } });
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(1));
    expect(screen.queryByRole('button', { name: /^editar$/i })).toBeNull();
  });

  it('click en Editar abre el modal con los campos precargados y guarda con updateMachineOilChange', async () => {
    render(MachineOilHistory, { props: { params: { machineId: '8', tipo: 'MOTOR' } } });
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^editar$/i }).length).toBeGreaterThan(0));

    await fireEvent.click(screen.getAllByRole('button', { name: /^editar$/i })[0]);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText(/horómetro del cambio/i).value).toBe('300');

    await fireEvent.input(within(dialog).getByLabelText(/horómetro del cambio/i), { target: { value: '320' } });
    await fireEvent.click(within(dialog).getByRole('button', { name: /guardar/i }));

    await waitFor(() => expect(data.updateMachineOilChange).toHaveBeenCalledTimes(1));
    const [id, payload] = data.updateMachineOilChange.mock.calls[0];
    expect(id).toBe(20);
    expect(payload.currentHourMeter).toBe(320);
    expect(payload.machineId).toBe(8);
  });

  it('click en Eliminar muestra confirmación, y confirmar llama a deleteMachineOilChange con el id correcto', async () => {
    render(MachineOilHistory, { props: { params: { machineId: '8', tipo: 'MOTOR' } } });
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^eliminar$/i }).length).toBeGreaterThan(0));

    await fireEvent.click(screen.getAllByRole('button', { name: /^eliminar$/i })[0]);

    const dialog = screen.getByRole('dialog', { name: /eliminar cambio de aceite/i });
    expect(within(dialog).getByText(/¿está seguro/i)).toBeTruthy();

    await fireEvent.click(within(dialog).getByRole('button', { name: /^eliminar$/i }));

    await waitFor(() => expect(data.deleteMachineOilChange).toHaveBeenCalledWith(20));
  });
});
