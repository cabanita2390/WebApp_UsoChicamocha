import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FuelTabbed from '../../components/views/FuelTabbed.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn((callback) => {
      callback({
        fuelDashboard: null,
        fuelTrend: [],
        fuelWarehouseBalance: [],
        fuelWarehouseMovements: null,
        fuelPerformance: [],
        fuelAssetConfig: [],
        fuelDistribution: null,
        fuelTypes: [],
        fuelRefueling: { data: [] },
        fuelPurchases: { data: [] },
        isLoading: false,
      });
      return () => {};
    }),
    fetchFuelTypes: vi.fn(),
    fetchFuelDashboard: vi.fn(),
    fetchFuelTrend: vi.fn(),
    fetchRefueling: vi.fn(),
    fetchFuelPurchases: vi.fn(),
    fetchFuelWarehouseBalance: vi.fn(),
    fetchFuelWarehouseMovements: vi.fn(),
    fetchAssetFuelConfig: vi.fn(),
    fetchFuelPerformance: vi.fn(),
    fetchFuelDistribution: vi.fn(),
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

describe('FuelTabbed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el Dashboard Financiero por defecto', () => {
    const { container } = render(FuelTabbed);
    expect(container.querySelector('#dashFechaInicio')).toBeTruthy();
  });

  it('cambia a cada pestaña y renderiza el componente correcto', async () => {
    const { container } = render(FuelTabbed);

    await fireEvent.click(screen.getByRole('tab', { name: 'Tanqueo' }));
    expect(screen.getByRole('button', { name: /\+ registrar tanqueo/i })).toBeTruthy();

    await fireEvent.click(screen.getByRole('tab', { name: 'Suministro de Almacén' }));
    expect(screen.getByRole('button', { name: /\+ registrar compra/i })).toBeTruthy();

    await fireEvent.click(screen.getByRole('tab', { name: 'Control de Almacén' }));
    expect(container.querySelector('#almFechaInicio')).toBeTruthy();

    await fireEvent.click(screen.getByRole('tab', { name: 'Rendimiento' }));
    expect(container.querySelector('#perfTipo')).toBeTruthy();

    await fireEvent.click(screen.getByRole('tab', { name: 'Distribución' }));
    expect(container.querySelector('#distArea')).toBeTruthy();

    await fireEvent.click(screen.getByRole('tab', { name: 'Dashboard Financiero' }));
    expect(container.querySelector('#dashFechaInicio')).toBeTruthy();
  });
});
