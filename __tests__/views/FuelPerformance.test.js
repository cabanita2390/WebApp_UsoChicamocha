import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FuelPerformance from '../../components/views/FuelPerformance.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchFuelTypes: vi.fn(),
    fetchAssetFuelConfig: vi.fn(),
    fetchFuelPerformanceAllTipos: vi.fn(),
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
import { fuelDateRange } from '../../stores/fuelFilters.js';

// Los 3 tipos se piden y se guardan siempre juntos (fetchFuelPerformanceAllTipos) —
// MAQUINARIA es el tipo inicial de la vista, por eso sus filas son las que se ven
// sin necesidad de hacer click en ninguna pill.
const mockPerformance = {
  MAQUINARIA: [
    {
      refuelingId: 1, vehicleId: 5, machineId: null, fuelTypeId: 1, fechaRegistro: '2026-07-15T10:00:00',
      horometroAnterior: 100, horometroActual: 150, ejecutado: 50, consumoEstandar: 30,
      galonesProyectados: 1.67, galonesReal: 5, diferencia: 3.33, alerta: true,
    },
    {
      refuelingId: 2, vehicleId: 6, machineId: null, fuelTypeId: 1, fechaRegistro: '2026-07-16T10:00:00',
      horometroAnterior: 200, horometroActual: 230, ejecutado: 30, consumoEstandar: 30,
      galonesProyectados: 1, galonesReal: 1.1, diferencia: 0.1, alerta: false,
    },
  ],
  VEHICULO: [],
  MOTOCICLETA: [
    {
      refuelingId: 3, vehicleId: 7, machineId: null, fuelTypeId: 1, fechaRegistro: '2026-07-17T10:00:00',
      horometroAnterior: 10, horometroActual: 40, ejecutado: 30, consumoEstandar: 30,
      galonesProyectados: 1, galonesReal: 1, diferencia: 0, alerta: false,
    },
  ],
};

describe('FuelPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fuelDateRange.set({ fechaInicio: '', fechaFin: '' });
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

  it('muestra la columna Producto con el nombre del combustible del tanqueo', () => {
    render(FuelPerformance);
    expect(screen.getByText('Producto')).toBeTruthy();
    expect(screen.getAllByText('ACPM / Diésel').length).toBeGreaterThan(0);
  });

  it('vuelve a pedir los 3 tipos juntos con las fechas al filtrar', async () => {
    render(FuelPerformance);

    await fireEvent.input(screen.getByLabelText(/fecha inicio/i), { target: { value: '2026-07-01' } });
    await fireEvent.input(screen.getByLabelText(/fecha fin/i), { target: { value: '2026-07-22' } });
    await fireEvent.click(screen.getByRole('button', { name: /filtrar/i }));

    expect(data.fetchFuelPerformanceAllTipos).toHaveBeenLastCalledWith('2026-07-01', '2026-07-22');
  });

  it('cambia de sub-pestaña (Maquinaria/Vehículos/Motocicletas) sin volver a pedir datos, porque los 3 ya están cargados', async () => {
    render(FuelPerformance);
    data.fetchFuelPerformanceAllTipos.mockClear();

    // VEHICULO no tiene filas en el mock — si el cambio de pill leyera del bucket
    // correcto sin refetch, debe verse el mensaje de "sin datos" al instante.
    await fireEvent.click(screen.getByRole('button', { name: /^vehículos/i }));

    expect(data.fetchFuelPerformanceAllTipos).not.toHaveBeenCalled();
    expect(screen.getByText(/sin activos con línea base/i)).toBeTruthy();
  });

  it('las píldoras muestran el conteo de los 3 tipos siempre, no solo el activo', () => {
    render(FuelPerformance);

    expect(screen.getByRole('button', { name: /^maquinaria \(2\)/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^vehículos \(0\)/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^motocicletas \(1\)/i })).toBeTruthy();
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
