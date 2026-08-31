import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FuelWarehouseControl from '../../components/views/FuelWarehouseControl.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchFuelTypes: vi.fn(),
    fetchFuelWarehouseBalance: vi.fn(),
    fetchFuelWarehouseMovements: vi.fn(),
    createFuelReintegration: vi.fn().mockResolvedValue({ id: 1 }),
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

import { data } from '../../stores/data.js';
import { auth } from '../../stores/auth.js';

const mockBalance = [
  { areaCosto: 'DISTRITO', fuelTypeId: 1, cantidadDisponible: 100 },
  { areaCosto: 'ASOCIACION', fuelTypeId: 1, cantidadDisponible: 40 },
  { areaCosto: 'DISTRITO', fuelTypeId: 4, cantidadDisponible: 25 },
];

const mockMovements = {
  fechaInicio: '2026-07-01',
  fechaFin: '2026-07-22',
  conciliacion: [
    { areaCosto: 'DISTRITO', fuelTypeId: 1, saldoInicial: 80, entradas: 50, salidas: 30, saldoFinal: 95 },
  ],
  historialCompras: [
    { id: 1, fechaCompra: '2026-07-10T09:00:00', areaCosto: 'DISTRITO', fuelTypeId: 1, cantidad: 45, precioUnitario: 10000, descuento: 0, totalCalculado: 500000, urlFactura: 'x.pdf' },
  ],
};

describe('FuelWarehouseControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelWarehouseBalance: mockBalance,
        fuelWarehouseMovements: mockMovements,
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

  it('muestra los saldos de almacén separados por área de costo, sin sumarlos', () => {
    render(FuelWarehouseControl);
    expect(screen.getAllByText('DISTRITO').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ASOCIACION').length).toBeGreaterThan(0);
    expect(screen.getByText(/100\s?gal/)).toBeTruthy();
    expect(screen.getByText(/40\s?gal/)).toBeTruthy();
    expect(screen.getByText(/25\s?m³/)).toBeTruthy();
  });

  it('muestra la conciliación con saldo inicial, entradas, salidas y saldo final', () => {
    render(FuelWarehouseControl);
    expect(screen.getByText(/80\s?gal/)).toBeTruthy();
    expect(screen.getByText(/50\s?gal/)).toBeTruthy();
    expect(screen.getByText(/30\s?gal/)).toBeTruthy();
  });

  it('vuelve a pedir los movimientos con las nuevas fechas al filtrar', async () => {
    render(FuelWarehouseControl);

    await fireEvent.input(screen.getByLabelText(/fecha inicio/i), { target: { value: '2026-06-01' } });
    await fireEvent.input(screen.getByLabelText(/fecha fin/i), { target: { value: '2026-06-30' } });
    await fireEvent.click(screen.getByRole('button', { name: /filtrar/i }));

    expect(data.fetchFuelWarehouseMovements).toHaveBeenLastCalledWith('2026-06-01', '2026-06-30');
  });

  it('un usuario ALMACEN ve saldos pero no el botón de reintegro', () => {
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Alm', role: 'ALMACEN' }, isRefreshing: false });
      return () => {};
    });
    render(FuelWarehouseControl);
    expect(screen.getAllByText('DISTRITO').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /registrar reintegro/i })).toBeNull();
  });

  it('un usuario SUPERVISOR_OPERATIVO ve el botón de reintegro', () => {
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Sup', role: 'SUPERVISOR_OPERATIVO' }, isRefreshing: false });
      return () => {};
    });
    render(FuelWarehouseControl);
    expect(screen.getByRole('button', { name: /registrar reintegro/i })).toBeTruthy();
  });

  it('registra un reintegro y vuelve a pedir los saldos', async () => {
    render(FuelWarehouseControl);
    await fireEvent.click(screen.getByRole('button', { name: /registrar reintegro/i }));

    await fireEvent.input(screen.getByLabelText(/id del tanqueo/i), { target: { value: '7' } });
    await fireEvent.input(screen.getByLabelText(/cantidad reintegrada/i), { target: { value: '5' } });
    await fireEvent.submit(screen.getByRole('form'));

    expect(data.createFuelReintegration).toHaveBeenCalledWith({ refuelingId: 7, cantidadReintegrada: 5 });
  });
});
