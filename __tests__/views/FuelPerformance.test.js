import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import FuelPerformance from '../../components/views/FuelPerformance.svelte';

vi.mock('svelte-spa-router', () => ({
  push: vi.fn(),
}));

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchFuelTypes: vi.fn(),
    fetchAssetFuelConfig: vi.fn(),
    fetchFuelPerformanceAllTipos: vi.fn(),
    fetchRefuelingReport: vi.fn().mockResolvedValue(undefined),
    updateRefueling: vi.fn().mockResolvedValue({ id: 1 }),
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

vi.mock('../../stores/ui.js', () => ({
  addNotification: vi.fn(),
}));

import { data } from '../../stores/data.js';
import { auth } from '../../stores/auth.js';
import { fuelDateRange, defaultFuelDateRange } from '../../stores/fuelFilters.js';
import { push } from 'svelte-spa-router';

// Fila completa del reporte de Tanqueo y Distribución para refuelingId=1 — es lo
// que openEditModal busca en $data.fuelRefuelingReport (por id) porque la fila de
// Rendimiento no trae lugar/areaCosto, obligatorios para PUT /fuel/refueling.
const mockFullRefueling = {
  id: 1, vehicleId: 5, machineId: null, lugar: 'BOMBA', areaCosto: 'DISTRITO', fuelTypeId: 1,
  cantidadGalones: 5, horometroKm: 150, esFull: false, precioUnitario: 9500, descuento: null,
  totalIngresado: 47500, totalCalculado: 47500, urlFactura: null, origen: 'Estación Norte',
  responsableId: 1, fechaRegistro: '2026-07-15T10:00:00',
};

// Los 3 tipos se piden y se guardan siempre juntos (fetchFuelPerformanceAllTipos) —
// MAQUINARIA es el tipo inicial de la vista, por eso sus filas son las que se ven
// sin necesidad de hacer click en ninguna pill.
const mockPerformance = {
  // La tabla colapsa a 1 fila por activo = la más reciente, ordenada desc por
  // fecha (mismo patrón que la tabla resumen de Tanqueo y Distribución) — como
  // vehicleId 5 y 6 son activos distintos, ninguno se colapsa entre sí, pero el
  // orden de renderizado sí cambia a más-reciente-primero. refuelingId=1 lleva la
  // fecha más nueva para que siga siendo la primera fila (igual que antes del
  // colapso), sin tener que reescribir todas las aserciones de las demás pruebas.
  MAQUINARIA: [
    {
      refuelingId: 1, vehicleId: 5, machineId: null, fuelTypeId: 1, fechaRegistro: '2026-07-16T10:00:00',
      horometroAnterior: 100, horometroActual: 150, ejecutado: 50, consumoEstandar: 30,
      galonesProyectados: 1.67, galonesReal: 5, diferencia: 3.33, alerta: true,
    },
    {
      refuelingId: 2, vehicleId: 6, machineId: null, fuelTypeId: 1, fechaRegistro: '2026-07-15T10:00:00',
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
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Test User', role: 'ADMIN' }, isRefreshing: false });
      return () => {};
    });
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelPerformance: mockPerformance,
        fuelAssetConfig: [],
        fuelTypes: [{ id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' }],
        fuelRefuelingReport: [mockFullRefueling],
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

  it('marca con un asterisco la Alerta de un activo sin suficiente historial propio (tolerancia general, no aprendida)', () => {
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelPerformance: {
          MAQUINARIA: [
            { ...mockPerformance.MAQUINARIA[0], usaRangoAprendido: false },
            { ...mockPerformance.MAQUINARIA[1], usaRangoAprendido: true },
          ],
          VEHICULO: [],
          MOTOCICLETA: [],
        },
        fuelAssetConfig: [],
        fuelTypes: [{ id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' }],
        fuelRefuelingReport: [],
        isLoading: false,
      });
      return () => {};
    });

    render(FuelPerformance);

    expect(screen.getByText('SÍ *')).toBeTruthy();
    expect(screen.getByText('NO')).toBeTruthy();
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

  it('"Limpiar filtro" vuelve al rango por defecto (mes actual → hoy) y refiltra', async () => {
    render(FuelPerformance);

    await fireEvent.input(screen.getByLabelText(/fecha inicio/i), { target: { value: '2020-01-01' } });
    await fireEvent.input(screen.getByLabelText(/fecha fin/i), { target: { value: '2020-01-31' } });
    await fireEvent.click(screen.getByRole('button', { name: /limpiar filtro/i }));

    const esperado = defaultFuelDateRange();
    expect(screen.getByLabelText(/fecha inicio/i).value).toBe(esperado.fechaInicio);
    expect(screen.getByLabelText(/fecha fin/i).value).toBe(esperado.fechaFin);
    expect(data.fetchFuelPerformanceAllTipos).toHaveBeenLastCalledWith(esperado.fechaInicio, esperado.fechaFin);
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

  it('un ADMIN puede editar un tanqueo directamente desde Rendimiento sin salir de la vista', async () => {
    render(FuelPerformance);
    const filas = screen.getAllByRole('row').filter((r) => r.textContent.includes('2026'));
    const fila = filas[0];

    await fireEvent.click(within(fila).getByRole('button', { name: /^editar$/i }));

    // Pide el tanqueo completo (lugar/areaCosto no vienen en la fila de Rendimiento).
    expect(data.fetchRefuelingReport).toHaveBeenCalledWith('MAQUINARIA_MOTO', 'TODAS');
    expect(await screen.findByLabelText(/cantidad/i)).toHaveValue(5);

    await fireEvent.input(screen.getByLabelText(/horómetro/i), { target: { value: '160' } });
    await fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(data.updateRefueling).toHaveBeenCalledTimes(1);
    const [id, formData] = data.updateRefueling.mock.calls[0];
    expect(id).toBe(1);
    expect(formData.get('vehicleId')).toBe('5');
    expect(formData.get('horometroKm')).toBe('160');
    // Recalcula Ejecutado/Proyectado/Real/Diferencia con el valor corregido.
    expect(data.fetchFuelPerformanceAllTipos).toHaveBeenCalled();
  });

  it('un SUPERVISOR_OPERATIVO no ve el botón Editar en Rendimiento', () => {
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Sup', role: 'SUPERVISOR_OPERATIVO' }, isRefreshing: false });
      return () => {};
    });
    render(FuelPerformance);
    expect(screen.queryByRole('button', { name: /^editar$/i })).toBeNull();
  });

  it('colapsa a una sola fila por activo: la más reciente dentro del rango filtrado', () => {
    // Dos filas del mismo vehicleId=5: la tabla debe mostrar solo la más nueva
    // (07-20, diferencia=9), no las dos mezcladas.
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelPerformance: {
          MAQUINARIA: [
            {
              refuelingId: 10, vehicleId: 5, machineId: null, fuelTypeId: 1, fechaRegistro: '2026-07-10T10:00:00',
              horometroAnterior: 50, horometroActual: 80, ejecutado: 30, consumoEstandar: 30,
              galonesProyectados: 1, galonesReal: 1, diferencia: 0, alerta: false,
            },
            {
              refuelingId: 11, vehicleId: 5, machineId: null, fuelTypeId: 1, fechaRegistro: '2026-07-20T10:00:00',
              horometroAnterior: 80, horometroActual: 120, ejecutado: 40, consumoEstandar: 30,
              galonesProyectados: 1.33, galonesReal: 9, diferencia: 7.67, alerta: true,
            },
          ],
          VEHICULO: [],
          MOTOCICLETA: [],
        },
        fuelAssetConfig: [],
        fuelTypes: [{ id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' }],
        fuelRefuelingReport: [],
        isLoading: false,
      });
      return () => {};
    });

    const { container } = render(FuelPerformance);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    // 7,67 (diferencia de la fila más nueva, refuelingId=11, formateada es-CO) identifica cuál quedó.
    expect(rows[0].textContent).toContain('7,67');
  });

  it('click en "Ver historial" navega a /fuel-performance-history/:tipo/:id', async () => {
    render(FuelPerformance);
    const filas = screen.getAllByRole('row').filter((r) => r.textContent.includes('2026'));

    await fireEvent.click(within(filas[0]).getByRole('button', { name: /ver historial/i }));

    // Tipo MAQUINARIA es la pestaña activa por defecto; vehicleId=5 es el activo de la primera fila.
    expect(push).toHaveBeenCalledWith('/fuel-performance-history/MAQUINARIA/5');
  });
});
