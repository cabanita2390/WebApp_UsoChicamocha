import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FuelPerformance from '../../components/views/FuelPerformance.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchFuelTypes: vi.fn(),
    fetchAssetFuelConfig: vi.fn(),
    fetchFuelPerformance: vi.fn(),
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

const mockPerformance = [
  {
    refuelingId: 1, vehicleId: 5, machineId: null, fechaRegistro: '2026-07-15T10:00:00',
    horometroAnterior: 100, horometroActual: 150, ejecutado: 50, consumoEstandar: 30,
    galonesProyectados: 1.67, galonesReal: 5, diferencia: 3.33, alerta: true,
  },
  {
    refuelingId: 2, vehicleId: 6, machineId: null, fechaRegistro: '2026-07-16T10:00:00',
    horometroAnterior: 200, horometroActual: 230, ejecutado: 30, consumoEstandar: 30,
    galonesProyectados: 1, galonesReal: 1.1, diferencia: 0.1, alerta: false,
  },
];

describe('FuelPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelPerformance: mockPerformance,
        fuelAssetConfig: [],
        fuelTypes: [{ id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' }],
        isLoading: false,
      });
      return () => {};
    });
  });

  it('marca las filas con alerta=true con el resaltado de anomalía del DataGrid', () => {
    const { container } = render(FuelPerformance);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0].classList.contains('anomaly-row')).toBe(true);
    expect(rows[1].classList.contains('anomaly-row')).toBe(false);
  });

  it('vuelve a pedir el rendimiento con el tipo y fechas al filtrar', async () => {
    render(FuelPerformance);

    await fireEvent.change(screen.getByLabelText(/tipo/i), { target: { value: 'VEHICULO' } });
    await fireEvent.input(screen.getByLabelText(/fecha inicio/i), { target: { value: '2026-07-01' } });
    await fireEvent.input(screen.getByLabelText(/fecha fin/i), { target: { value: '2026-07-22' } });
    await fireEvent.click(screen.getByRole('button', { name: /filtrar/i }));

    expect(data.fetchFuelPerformance).toHaveBeenLastCalledWith('VEHICULO', '2026-07-01', '2026-07-22');
  });

  it('un ADMIN ve el botón de configurar consumo estándar, un SUPERVISOR_OPERATIVO no', () => {
    const { unmount } = render(FuelPerformance);
    expect(screen.getByRole('button', { name: /configurar consumo estándar/i })).toBeTruthy();
    unmount();

    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Sup', role: 'SUPERVISOR_OPERATIVO' }, isRefreshing: false });
      return () => {};
    });
    render(FuelPerformance);
    expect(screen.queryByRole('button', { name: /configurar consumo estándar/i })).toBeNull();
  });
});
