import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FuelPurchaseManagement from '../../components/views/FuelPurchaseManagement.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchFuelPurchases: vi.fn(),
    fetchFuelTypes: vi.fn(),
    createFuelPurchase: vi.fn().mockResolvedValue({ id: 1 }),
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
  createFuelPurchaseColumns: vi.fn(() => []),
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
import { auth } from '../../stores/auth.js';

describe('FuelPurchaseManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelPurchases: { data: [], totalPages: 0, totalElements: 0, currentPage: 0, pageSize: 20 },
        fuelTypes: [
          { id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' },
          { id: 4, codigo: 'GAS', nombre: 'Gas natural vehicular', unidadMedida: 'M3' },
        ],
        isLoading: false,
      });
      return () => {};
    });
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Test User', role: 'ADMIN' }, isRefreshing: false });
      return () => {};
    });
  });

  it('el formulario está detrás de un modal, oculto hasta que se pide registrar', () => {
    render(FuelPurchaseManagement);
    expect(screen.queryByLabelText(/área de costo/i)).toBeNull();
    expect(screen.getByRole('button', { name: /\+ registrar compra/i })).toBeTruthy();
  });

  it('un usuario con rol OPERARIO no ve el botón de registrar', () => {
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Op', role: 'OPERARIO' }, isRefreshing: false });
      return () => {};
    });
    render(FuelPurchaseManagement);
    expect(screen.queryByRole('button', { name: /\+ registrar compra/i })).toBeNull();
  });

  it('un usuario con rol SUPERVISOR_OPERATIVO sí ve el botón de registrar', () => {
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Sup', role: 'SUPERVISOR_OPERATIVO' }, isRefreshing: false });
      return () => {};
    });
    render(FuelPurchaseManagement);
    expect(screen.getByRole('button', { name: /\+ registrar compra/i })).toBeTruthy();
  });

  it('calcula el total estimado en vivo a partir de cantidad, precio y descuento', async () => {
    render(FuelPurchaseManagement);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar compra/i }));

    await fireEvent.input(screen.getByLabelText(/cantidad/i), { target: { value: '10' } });
    await fireEvent.input(screen.getByLabelText(/precio unitario/i), { target: { value: '10000' } });
    await fireEvent.input(screen.getByLabelText(/descuento/i), { target: { value: '5000' } });

    expect(screen.getByText(/95\.000|95000/)).toBeTruthy();
  });

  it('arma un FormData con las partes que espera el backend al enviar una compra', async () => {
    render(FuelPurchaseManagement);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar compra/i }));

    await fireEvent.change(screen.getByLabelText(/área de costo/i), { target: { value: 'DISTRITO' } });
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });
    await fireEvent.input(screen.getByLabelText(/cantidad/i), { target: { value: '10' } });
    await fireEvent.input(screen.getByLabelText(/precio unitario/i), { target: { value: '10000' } });
    await fireEvent.input(screen.getByLabelText(/total pagado/i), { target: { value: '100000' } });

    const facturaInput = screen.getByLabelText(/factura/i);
    const file = new File(['contenido'], 'factura.pdf', { type: 'application/pdf' });
    await fireEvent.change(facturaInput, { target: { files: [file] } });

    await fireEvent.submit(screen.getByRole('form'));

    expect(data.createFuelPurchase).toHaveBeenCalledTimes(1);
    const formData = data.createFuelPurchase.mock.calls[0][0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('areaCosto')).toBe('DISTRITO');
    expect(formData.get('fuelTypeId')).toBe('1');
    expect(formData.get('cantidad')).toBe('10');
    expect(formData.get('precioUnitario')).toBe('10000');
    expect(formData.get('totalIngresado')).toBe('100000');
    expect(formData.get('factura')).toBeInstanceOf(File);
  });

  it('cambia la etiqueta de cantidad a m³ cuando el combustible seleccionado es gas natural vehicular', async () => {
    render(FuelPurchaseManagement);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar compra/i }));

    expect(screen.getByText('Cantidad (galones)')).toBeTruthy();

    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '4' } });

    expect(screen.getByText('Cantidad (m³)')).toBeTruthy();
  });
});
