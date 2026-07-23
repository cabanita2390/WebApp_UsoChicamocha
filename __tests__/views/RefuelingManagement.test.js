import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import RefuelingManagement from '../../components/views/RefuelingManagement.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchRefueling: vi.fn(),
    fetchFuelTypes: vi.fn(),
    createRefueling: vi.fn().mockResolvedValue({ id: 1 }),
  },
}));

vi.mock('../../stores/auth.js', () => ({
  auth: {
    subscribe: vi.fn((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Test User', role: 'ADMIN' }, isRefreshing: false });
      return () => {};
    }),
  },
}));

vi.mock('../../config/table-definitions.js', () => ({
  createRefuelingColumns: vi.fn(() => []),
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

describe('RefuelingManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelRefueling: { data: [], totalPages: 0, totalElements: 0, currentPage: 0, pageSize: 20 },
        fuelTypes: [
          { id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' },
          { id: 4, codigo: 'GAS', nombre: 'Gas natural vehicular', unidadMedida: 'M3' },
        ],
        machines: [],
        vehicles: [],
        isLoading: false,
      });
      return () => {};
    });
  });

  it('el formulario está detrás de un modal, oculto hasta que se pide registrar', () => {
    render(RefuelingManagement);
    expect(screen.queryByLabelText(/^lugar$/i)).toBeNull();
    expect(screen.getByRole('button', { name: /registrar tanqueo/i })).toBeTruthy();
  });

  it('oculta precio unitario y factura cuando el lugar es ALMACEN', async () => {
    render(RefuelingManagement);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));

    const lugarSelect = screen.getByLabelText(/lugar/i);
    await fireEvent.change(lugarSelect, { target: { value: 'ALMACEN' } });

    expect(screen.queryByLabelText(/precio unitario/i)).toBeNull();
    expect(screen.queryByLabelText(/factura/i)).toBeNull();
  });

  it('muestra precio unitario y factura cuando el lugar es BOMBA', async () => {
    render(RefuelingManagement);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));

    const lugarSelect = screen.getByLabelText(/lugar/i);
    await fireEvent.change(lugarSelect, { target: { value: 'BOMBA' } });

    expect(screen.getByLabelText(/precio unitario/i)).toBeTruthy();
    expect(screen.getByLabelText(/factura/i)).toBeTruthy();
  });

  it('arma un FormData con las partes que espera el backend al enviar un tanqueo ALMACEN', async () => {
    render(RefuelingManagement);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));

    await fireEvent.change(screen.getByLabelText(/lugar/i), { target: { value: 'ALMACEN' } });
    await fireEvent.change(screen.getByLabelText(/área de costo/i), { target: { value: 'DISTRITO' } });
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });
    await fireEvent.input(screen.getByLabelText(/galones/i), { target: { value: '30' } });
    await fireEvent.input(screen.getByLabelText(/horómetro/i), { target: { value: '500' } });
    await fireEvent.input(screen.getByLabelText(/máquina/i), { target: { value: '10' } });

    await fireEvent.submit(screen.getByRole('form'));

    expect(data.createRefueling).toHaveBeenCalledTimes(1);
    const formData = data.createRefueling.mock.calls[0][0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('lugar')).toBe('ALMACEN');
    expect(formData.get('areaCosto')).toBe('DISTRITO');
    expect(formData.get('fuelTypeId')).toBe('1');
    expect(formData.get('cantidadGalones')).toBe('30');
    expect(formData.get('horometroKm')).toBe('500');
    expect(formData.get('machineId')).toBe('10');
    expect(formData.has('precioUnitario')).toBe(false);
  });

  it('cambia la etiqueta de cantidad a m³ cuando el combustible seleccionado es gas natural vehicular', async () => {
    render(RefuelingManagement);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));

    expect(screen.getByText('Cantidad (galones)')).toBeTruthy();

    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '4' } });

    expect(screen.getByText('Cantidad (m³)')).toBeTruthy();
  });
});
