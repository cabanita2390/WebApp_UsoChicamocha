import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
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
    fetchFuelPerformanceTrend: vi.fn(),
    fetchMachines: vi.fn(),
    fetchVehicles: vi.fn(),
    fetchMotos: vi.fn(),
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

vi.mock('../../stores/api.js', () => ({
  download: vi.fn().mockResolvedValue(undefined),
}));

import { data } from '../../stores/data.js';
import { auth } from '../../stores/auth.js';
import { fuelDateRange, defaultFuelDateRange } from '../../stores/fuelFilters.js';
import { push } from 'svelte-spa-router';
import { download } from '../../stores/api.js';
import { addNotification } from '../../stores/ui.js';

// Los 3 tipos se piden y se guardan siempre juntos (fetchFuelPerformanceAllTipos) —
// MAQUINARIA es el tipo inicial de la vista, por eso sus filas son las que se ven
// sin necesidad de hacer click en ninguna pill.
const mockPerformance = {
  // La lista colapsa a 1 tarjeta por activo = la más reciente, ordenada desc por
  // fecha (mismo patrón que la tabla resumen de Tanqueo y Distribución) — como
  // vehicleId 5 y 6 son activos distintos, ninguno se colapsa entre sí, pero el
  // orden de renderizado sí cambia a más-reciente-primero.
  MAQUINARIA: [
    {
      refuelingId: 1, vehicleId: 5, machineId: null, fuelTypeId: 1, fechaRegistro: '2026-07-16T10:00:00', identificacionActivo: 'Excavadora 5',
      horometroAnterior: 100, horometroActual: 150, ejecutado: 50, consumoEstandar: 30,
      galonesProyectados: 1.67, galonesReal: 5, diferencia: 3.33, alerta: true,
    },
    {
      refuelingId: 2, vehicleId: 6, machineId: null, fuelTypeId: 1, fechaRegistro: '2026-07-15T10:00:00', identificacionActivo: 'Retro 6',
      horometroAnterior: 200, horometroActual: 230, ejecutado: 30, consumoEstandar: 30,
      galonesProyectados: 1, galonesReal: 1.1, diferencia: 0.1, alerta: false,
    },
  ],
  VEHICULO: [],
  MOTOCICLETA: [
    {
      refuelingId: 3, vehicleId: 7, machineId: null, fuelTypeId: 1, fechaRegistro: '2026-07-17T10:00:00', identificacionActivo: 'Moto 7',
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
        fuelPerformanceTrend: { MAQUINARIA: [], VEHICULO: [], MOTOCICLETA: [] },
        fuelAssetConfig: [],
        fuelTypes: [{ id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' }],
        // Inventario completo (independiente de si tanquearon en el rango) — las
        // píldoras ahora cuentan sobre esto, no sobre las filas del reporte.
        machines: [{ id: 101, name: 'Excavadora 101' }, { id: 102, name: 'Retro 102' }],
        vehicles: [],
        motos: [{ id: 201, placa: 'ABC123' }],
        isLoading: false,
      });
      return () => {};
    });
  });

  it('marca la tarjeta con alerta=true con el estado "Alerta" y el resaltado correspondiente', () => {
    const { container } = render(FuelPerformance);
    const cards = container.querySelectorAll('.fuel-card');
    expect(cards[0].classList.contains('fuel-card--alerta')).toBe(true);
    expect(cards[1].classList.contains('fuel-card--alerta')).toBe(false);
    expect(cards[0].querySelector('.fuel-card-estado').textContent.trim()).toBe('Alerta');
    expect(cards[1].querySelector('.fuel-card-estado').textContent.trim()).toBe('En rango');
  });

  it('cada tarjeta muestra el combustible del tanqueo', () => {
    render(FuelPerformance);
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
    // correcto sin refetch, debe verse el estado vacío al instante.
    await fireEvent.click(screen.getByRole('button', { name: /^vehículos/i }));

    expect(data.fetchFuelPerformanceAllTipos).not.toHaveBeenCalled();
    expect(screen.getByText(/ningún activo coincide/i)).toBeTruthy();
  });

  it('las píldoras muestran el conteo de los 3 tipos siempre, no solo el activo', () => {
    render(FuelPerformance);

    expect(screen.getByRole('button', { name: /^maquinaria 2$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^vehículos 0$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^motocicletas 1$/i })).toBeTruthy();
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

  // Editar un tanqueo ya no vive en la lista de tarjetas (el mockup no lo tiene
  // ahí) — la cobertura de esa capacidad quedó en FuelPerformanceHistory.test.js
  // ("click en Editar precarga el tanqueo completo"), a la que se llega haciendo
  // click en la tarjeta ("Ver historial").

  it('colapsa a una sola tarjeta por activo: la más reciente dentro del rango filtrado', () => {
    // Dos filas del mismo vehicleId=5: la lista debe mostrar solo una tarjeta con
    // los datos de la más nueva (07-20, real=9), no las dos mezcladas.
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelPerformance: {
          MAQUINARIA: [
            {
              refuelingId: 10, vehicleId: 5, machineId: null, fuelTypeId: 1, fechaRegistro: '2026-07-10T10:00:00', identificacionActivo: 'Excavadora 5',
              horometroAnterior: 50, horometroActual: 80, ejecutado: 30, consumoEstandar: 30,
              galonesProyectados: 1, galonesReal: 1, diferencia: 0, alerta: false,
            },
            {
              refuelingId: 11, vehicleId: 5, machineId: null, fuelTypeId: 1, fechaRegistro: '2026-07-20T10:00:00', identificacionActivo: 'Excavadora 5',
              horometroAnterior: 80, horometroActual: 120, ejecutado: 40, consumoEstandar: 30,
              galonesProyectados: 1.33, galonesReal: 9, diferencia: 7.67, alerta: true,
            },
          ],
          VEHICULO: [],
          MOTOCICLETA: [],
        },
        fuelPerformanceTrend: { MAQUINARIA: [], VEHICULO: [], MOTOCICLETA: [] },
        fuelAssetConfig: [],
        fuelTypes: [{ id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' }],
        isLoading: false,
      });
      return () => {};
    });

    const { container } = render(FuelPerformance);
    const cards = container.querySelectorAll('.fuel-card');
    expect(cards.length).toBe(1);
    // "9 gal" (galonesReal de la fila más nueva, refuelingId=11) identifica cuál quedó.
    expect(cards[0].querySelector('.fuel-card-metric-val').textContent).toContain('9');
  });

  it('muestra el inventario completo apenas resuelven fetchMachines/fetchVehicles/fetchMotos, sin tener que cambiar de pestaña', async () => {
    // Reproduce la carga real: al montar, fetchFuelTypes/fetchAssetFuelConfig/
    // fetchFuelPerformanceAllTipos/fetchMachines/etc. se disparan todos juntos y
    // resuelven en cualquier orden. Este test simula que el inventario
    // (machines/vehicles/motos) llega DESPUÉS del primer render, sin que el
    // usuario cambie de pill (`tipo` no cambia) — antes del fix, `universoTipo`
    // se calculaba una sola vez con los inventarios vacíos y nunca se refrescaba
    // sin ese cambio de pill.
    let capturedCallback;
    data.subscribe.mockImplementation((callback) => {
      capturedCallback = callback;
      callback({
        fuelPerformance: { MAQUINARIA: [], VEHICULO: [], MOTOCICLETA: [] },
        fuelPerformanceTrend: { MAQUINARIA: [], VEHICULO: [], MOTOCICLETA: [] },
        fuelAssetConfig: [],
        fuelTypes: [],
        machines: [],
        vehicles: [],
        motos: [],
        isLoading: false,
      });
      return () => {};
    });

    const { container } = render(FuelPerformance);
    expect(container.querySelectorAll('.fuel-card').length).toBe(0);

    // fetchMachines resuelve tarde: llega el inventario completo de MAQUINARIA
    // (la pestaña activa por defecto), sin ningún click en las pills.
    capturedCallback({
      fuelPerformance: { MAQUINARIA: [], VEHICULO: [], MOTOCICLETA: [] },
      fuelPerformanceTrend: { MAQUINARIA: [], VEHICULO: [], MOTOCICLETA: [] },
      fuelAssetConfig: [],
      fuelTypes: [],
      machines: [{ id: 101, name: 'Excavadora 101' }, { id: 102, name: 'Retro 102' }],
      vehicles: [],
      motos: [],
      isLoading: false,
    });

    await waitFor(() => {
      expect(container.querySelectorAll('.fuel-card').length).toBe(2);
    });
  });

  it('click en una tarjeta navega a /fuel-performance-history/:tipo/:id', async () => {
    const { container } = render(FuelPerformance);
    const primeraTarjeta = container.querySelector('.fuel-card');

    await fireEvent.click(primeraTarjeta);

    // Tipo MAQUINARIA es la pestaña activa por defecto; vehicleId=5 es el activo más reciente.
    expect(push).toHaveBeenCalledWith('/fuel-performance-history/MAQUINARIA/5');
  });

  describe('Exportar rendimiento mensual (modal)', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-07-15T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('"Exportar Excel" abre un modal (no descarga directo) con el mes en curso propuesto por defecto', async () => {
      const { container } = render(FuelPerformance);

      await fireEvent.click(screen.getByRole('button', { name: /exportar excel/i }));

      expect(download).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog', { name: /exportar rendimiento mensual/i })).not.toBeNull();
      expect(container.querySelector('#exportFechaInicio').value).toBe('2026-07-01');
      expect(container.querySelector('#exportFechaFin').value).toBe('2026-07-15');
    });

    it('"Cancelar" cierra el modal sin descargar', async () => {
      render(FuelPerformance);
      await fireEvent.click(screen.getByRole('button', { name: /exportar excel/i }));

      await fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

      expect(download).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog', { name: /exportar rendimiento mensual/i })).toBeNull();
    });

    it('"Descargar" con el rango por defecto (mes en curso) llama a download con esas fechas', async () => {
      render(FuelPerformance);
      await fireEvent.click(screen.getByRole('button', { name: /exportar excel/i }));

      await fireEvent.click(screen.getByRole('button', { name: /^descargar$/i }));

      expect(download).toHaveBeenCalledWith(
        'fuel/rendimiento/export-mensual?fechaInicio=2026-07-01&fechaFin=2026-07-15',
        'rendimiento_mensual.xlsx'
      );
    });

    it('"Descargar" con fechas elegidas en el modal las manda como query, independiente del filtro de pantalla', async () => {
      const { container } = render(FuelPerformance);
      await fireEvent.click(screen.getByRole('button', { name: /exportar excel/i }));

      await fireEvent.input(container.querySelector('#exportFechaInicio'), { target: { value: '2026-01-01' } });
      await fireEvent.input(container.querySelector('#exportFechaFin'), { target: { value: '2026-07-31' } });
      await fireEvent.click(screen.getByRole('button', { name: /^descargar$/i }));

      expect(download).toHaveBeenCalledWith(
        'fuel/rendimiento/export-mensual?fechaInicio=2026-01-01&fechaFin=2026-07-31',
        'rendimiento_mensual.xlsx'
      );
    });

    it('si la exportación mensual falla, muestra una notificación de error y deja el modal abierto', async () => {
      download.mockRejectedValueOnce(new Error('sin conexión'));

      render(FuelPerformance);
      await fireEvent.click(screen.getByRole('button', { name: /exportar excel/i }));
      await fireEvent.click(screen.getByRole('button', { name: /^descargar$/i }));

      await waitFor(() => {
        expect(addNotification).toHaveBeenCalledWith(
          expect.objectContaining({ text: expect.stringContaining('sin conexión') })
        );
      });
      expect(screen.getByRole('dialog', { name: /exportar rendimiento mensual/i })).not.toBeNull();
    });
  });
});
