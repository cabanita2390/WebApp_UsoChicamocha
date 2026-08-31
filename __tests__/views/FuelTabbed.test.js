import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FuelTabbed from '../../components/views/FuelTabbed.svelte';
import { fuelDateRange, fuelActiveTab } from '../../stores/fuelFilters.js';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn((callback) => {
      callback({
        fuelDashboard: null,
        fuelTrend: [],
        fuelWarehouseBalance: [],
        fuelWarehouseMovements: null,
        fuelPerformance: { MAQUINARIA: [], VEHICULO: [], MOTOCICLETA: [] },
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
    fetchFuelPerformanceAllTipos: vi.fn(),
    fetchFuelDistribution: vi.fn(),
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

describe('FuelTabbed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fuelDateRange.set({ fechaInicio: '', fechaFin: '' });
    fuelActiveTab.set('dashboard');
  });

  it('muestra el Dashboard Financiero por defecto', () => {
    const { container } = render(FuelTabbed);
    expect(container.querySelector('#dashFechaInicio')).toBeTruthy();
  });

  it('cambia a cada pestaña y renderiza el componente correcto', async () => {
    const { container } = render(FuelTabbed);

    await fireEvent.click(screen.getByRole('tab', { name: 'Rendimiento' }));
    expect(screen.getByRole('button', { name: /^vehículos/i })).toBeTruthy();

    await fireEvent.click(screen.getByRole('tab', { name: 'Tanqueo y Distribución' }));
    expect(container.querySelector('#tdArea')).toBeTruthy();
    expect(screen.getByRole('button', { name: /\+ registrar tanqueo/i })).toBeTruthy();

    await fireEvent.click(screen.getByRole('tab', { name: 'Dashboard Financiero' }));
    expect(container.querySelector('#dashFechaInicio')).toBeTruthy();
  });

  it('no muestra las pestañas ocultas de Suministro de Almacén ni Control de Almacén', () => {
    render(FuelTabbed);
    expect(screen.queryByRole('tab', { name: 'Suministro de Almacén' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Control de Almacén' })).toBeNull();
  });

  it('el rango de fechas filtrado en una pestaña se mantiene al cambiar a las otras dos', async () => {
    const { container } = render(FuelTabbed);

    await fireEvent.input(container.querySelector('#dashFechaInicio'), { target: { value: '2026-07-01' } });
    await fireEvent.input(container.querySelector('#dashFechaFin'), { target: { value: '2026-07-31' } });

    await fireEvent.click(screen.getByRole('tab', { name: 'Rendimiento' }));
    expect(container.querySelector('#perfFechaInicio').value).toBe('2026-07-01');
    expect(container.querySelector('#perfFechaFin').value).toBe('2026-07-31');

    await fireEvent.click(screen.getByRole('tab', { name: 'Tanqueo y Distribución' }));
    expect(container.querySelector('#tdFechaInicio').value).toBe('2026-07-01');
    expect(container.querySelector('#tdFechaFin').value).toBe('2026-07-31');

    await fireEvent.click(screen.getByRole('tab', { name: 'Dashboard Financiero' }));
    expect(container.querySelector('#dashFechaInicio').value).toBe('2026-07-01');
    expect(container.querySelector('#dashFechaFin').value).toBe('2026-07-31');
  });

  it('la pestaña activa sobrevive a que el componente se desmonte y se vuelva a montar (volver desde Historial de tanqueos)', async () => {
    const { unmount } = render(FuelTabbed);
    await fireEvent.click(screen.getByRole('tab', { name: 'Tanqueo y Distribución' }));
    unmount();

    render(FuelTabbed);
    expect(screen.getByRole('button', { name: /\+ registrar tanqueo/i })).toBeTruthy();
  });
});
