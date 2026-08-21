import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import FuelPerformanceHistory from '../../components/views/FuelPerformanceHistory.svelte';

vi.mock('svelte-spa-router', () => ({
  pop: vi.fn(),
}));

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchFuelTypes: vi.fn(),
    fetchAssetFuelConfig: vi.fn(),
    fetchFuelPerformanceHistory: vi.fn(),
    fetchRefuelingReport: vi.fn().mockResolvedValue(undefined),
    updateRefueling: vi.fn().mockResolvedValue({ id: 1 }),
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

vi.mock('../shared/Loader.svelte', () => ({
  default: vi.fn().mockImplementation(() => ({
    $$: { on_mount: [], on_destroy: [] },
    $set: vi.fn(),
    $destroy: vi.fn(),
  })),
}));

import { data } from '../../stores/data.js';
import { auth } from '../../stores/auth.js';
import { pop } from 'svelte-spa-router';

const mockFullRefueling = {
  id: 200, vehicleId: null, machineId: 8, lugar: 'ALMACEN', areaCosto: 'DISTRITO', fuelTypeId: 1,
  cantidadGalones: 40, horometroKm: 150, esFull: true, precioUnitario: null, descuento: null,
  totalIngresado: null, totalCalculado: null, urlFactura: null, origen: 'Bodega central',
  responsableId: 1, fechaRegistro: '2026-07-20T10:00:00',
};

// machineId=8: 3 tanqueos con proyectado/real y alerta variados, para verificar
// que se ven todos (no solo el más reciente, a diferencia de la tabla resumen de
// Rendimiento) y que la línea de tiempo del gráfico va de más viejo a más nuevo.
const mockPerformanceMaquinaria = [
  {
    refuelingId: 198, vehicleId: null, machineId: 8, fuelTypeId: 1, fechaRegistro: '2026-07-10T10:00:00',
    horometroAnterior: 50, horometroActual: 80, ejecutado: 30, consumoEstandar: 30,
    galonesProyectados: 1, galonesReal: 1, diferencia: 0, alerta: false, identificacionActivo: 'Excavadora CAT326dl',
  },
  {
    refuelingId: 199, vehicleId: null, machineId: 8, fuelTypeId: 1, fechaRegistro: '2026-07-15T10:00:00',
    horometroAnterior: 80, horometroActual: 110, ejecutado: 30, consumoEstandar: 30,
    galonesProyectados: 1, galonesReal: 1.05, diferencia: 0.05, alerta: false, identificacionActivo: 'Excavadora CAT326dl',
  },
  {
    refuelingId: 200, vehicleId: null, machineId: 8, fuelTypeId: 1, fechaRegistro: '2026-07-20T10:00:00',
    horometroAnterior: 110, horometroActual: 150, ejecutado: 40, consumoEstandar: 30,
    galonesProyectados: 1.33, galonesReal: 40, diferencia: 38.67, alerta: true, identificacionActivo: 'Excavadora CAT326dl',
  },
];

describe('FuelPerformanceHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Test Admin', role: 'ADMIN' }, isRefreshing: false });
      return () => {};
    });
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelPerformanceHistory: { MAQUINARIA: mockPerformanceMaquinaria, VEHICULO: [], MOTOCICLETA: [] },
        fuelAssetConfig: [],
        fuelTypes: [{ id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' }],
        fuelRefuelingReport: [mockFullRefueling],
        isLoading: false,
      });
      return () => {};
    });
  });

  it('pide el histórico completo (rango amplio, no el mes actual por defecto del backend)', () => {
    render(FuelPerformanceHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });
    expect(data.fetchFuelPerformanceHistory).toHaveBeenCalledWith('2000-01-01', expect.any(String));
  });

  it('muestra todos los tanqueos del activo, no solo el más reciente', async () => {
    // Default es "1M" (último mes) — se pasa a "Todo" para verlos los 3 sin
    // depender de qué tan lejos esté "ahora" real de las fechas fijas de julio
    // 2026 del fixture.
    render(FuelPerformanceHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });
    await fireEvent.click(screen.getByRole('button', { name: 'Todo' }));

    const filas = screen.getAllByRole('row');
    // 3 registros del activo + 1 fila de encabezado. Horas esperadas (H = F×A,
    // ver createFuelPerformanceColumns): fila 199 → 1.05×30 = 31,50; fila 200 →
    // 40×30 = 1.200,00 (valores formateados es-CO: coma decimal, punto de miles).
    expect(filas.some((r) => r.textContent.includes('31,50'))).toBe(true);
    expect(filas.some((r) => r.textContent.includes('1.200,00'))).toBe(true);
  });

  it('marca con un asterisco la Alerta de un activo sin suficiente historial propio (tolerancia general, no aprendida)', async () => {
    // Default es "1M" — los registros del mock (2026-07-10/15) pueden caer fuera
    // del último mes según la fecha real de hoy, así que se pasa a "Todo".
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelPerformanceHistory: {
          MAQUINARIA: [
            { ...mockPerformanceMaquinaria[0], alerta: true, usaRangoAprendido: false },
            { ...mockPerformanceMaquinaria[1], alerta: false, usaRangoAprendido: true },
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

    render(FuelPerformanceHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });
    await fireEvent.click(screen.getByRole('button', { name: 'Todo' }));

    expect(screen.getByText('SÍ *')).toBeTruthy();
    expect(screen.getByText('NO')).toBeTruthy();
  });

  it('el resumen muestra el total de registros, la desviación promedio y cuántos tienen alerta', async () => {
    // Default es "1M" (último mes) — se pasa a "Todo" para contar los 3
    // registros del mock sin depender de qué tan lejos esté "ahora" real de
    // las fechas fijas de julio 2026 del fixture.
    const { container } = render(FuelPerformanceHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });
    await fireEvent.click(screen.getByRole('button', { name: 'Todo' }));

    const valores = [...container.querySelectorAll('.summary-value')].map((el) => el.textContent.trim());
    expect(valores[0]).toBe('3'); // Total registros
    expect(valores[2]).toMatch(/%$/); // Desviación promedio
    expect(valores[3]).toBe('1 / 3'); // Con alerta
  });

  it('dibuja el gráfico Horas esperadas vs ejecutadas con leyenda', async () => {
    const { container } = render(FuelPerformanceHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });
    await fireEvent.click(screen.getByRole('button', { name: 'Todo' }));

    const chart = container.querySelector('.ph-chart');
    expect(within(chart).getByText(/Horas esperadas/i)).toBeTruthy();
    expect(within(chart).getByText(/Horas ejecutadas/i)).toBeTruthy();
    expect(chart.querySelectorAll('polyline').length).toBe(2);
  });

  it('con un rango de hasta un año, la etiqueta muestra día arriba y mes abreviado abajo', async () => {
    // Los 3 registros del mock caen en julio de 2026 (rango de 10 días) — bien
    // por debajo del año, así que el día es el dato útil. Se pasa a "Todo"
    // (default es "1M") para verlos los 3 sin depender de la fecha real de hoy.
    const { container } = render(FuelPerformanceHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });
    await fireEvent.click(screen.getByRole('button', { name: 'Todo' }));

    const etiquetas = [...container.querySelectorAll('.trend-month')].map((el) => el.textContent);
    expect(etiquetas).toEqual(['10\njul', '15\njul', '20\njul']);
  });

  it('con un rango mayor a un año (histórico que ya creció varios años), la etiqueta cambia a mes abreviado arriba y año abajo', async () => {
    // Mismo activo, pero ahora con tanqueos en 2024, 2025 y 2026 — a esa escala
    // el día exacto ya no aporta, el año sí.
    const variosAniosMock = [
      { ...mockPerformanceMaquinaria[0], fechaRegistro: '2024-01-10T10:00:00' },
      { ...mockPerformanceMaquinaria[1], fechaRegistro: '2025-06-15T10:00:00' },
      { ...mockPerformanceMaquinaria[2], fechaRegistro: '2026-07-20T10:00:00' },
    ];
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelPerformanceHistory: { MAQUINARIA: variosAniosMock, VEHICULO: [], MOTOCICLETA: [] },
        fuelAssetConfig: [],
        fuelTypes: [{ id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' }],
        fuelRefuelingReport: [mockFullRefueling],
        isLoading: false,
      });
      return () => {};
    });

    // Default es "1M" — se pasa a "Todo" para ver los 3 años completos.
    const { container } = render(FuelPerformanceHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });
    await fireEvent.click(screen.getByRole('button', { name: 'Todo' }));

    const etiquetas = [...container.querySelectorAll('.trend-month')].map((el) => el.textContent);
    expect(etiquetas).toEqual(['ene\n2024', 'jun\n2025', 'jul\n2026']);
  });

  it('el selector de rango (1M/3M/6M/1A/Todo) filtra tabla, resumen y gráfico sin volver a pedir al backend', async () => {
    const ahora = Date.now();
    const reciente = new Date(ahora - 5 * 24 * 60 * 60 * 1000).toISOString(); // hace 5 días
    const viejo = new Date(ahora - 200 * 24 * 60 * 60 * 1000).toISOString(); // hace ~6.5 meses, fuera de 1M/3M/6M... no, dentro de 6M/1A pero fuera de 1M/3M
    const mockRango = [
      { ...mockPerformanceMaquinaria[0], refuelingId: 300, fechaRegistro: viejo, alerta: true },
      { ...mockPerformanceMaquinaria[1], refuelingId: 301, fechaRegistro: reciente, alerta: false },
    ];
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelPerformanceHistory: { MAQUINARIA: mockRango, VEHICULO: [], MOTOCICLETA: [] },
        fuelAssetConfig: [],
        fuelTypes: [{ id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' }],
        fuelRefuelingReport: [mockFullRefueling],
        isLoading: false,
      });
      return () => {};
    });

    const { container } = render(FuelPerformanceHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });

    // "1M" (default): solo "reciente" (hace 5 días) cae dentro del rango; "viejo" (hace ~6.5 meses) queda fuera.
    expect(container.querySelector('.summary-value').textContent.trim()).toBe('1');

    await fireEvent.click(screen.getByRole('button', { name: 'Todo' }));

    // Filtrado 100% client-side: no dispara un fetch nuevo al backend.
    expect(data.fetchFuelPerformanceHistory).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.summary-value').textContent.trim()).toBe('2');
  });

  it('si el rango elegido no tiene tanqueos, muestra el mensaje específico (no el de "sin historial" general)', async () => {
    // Un registro muy viejo (2 años atrás respecto a "ahora" real) queda fuera
    // de cualquier preset de rango salvo "Todo".
    const muyViejo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelPerformanceHistory: { MAQUINARIA: [{ ...mockPerformanceMaquinaria[0], fechaRegistro: muyViejo }], VEHICULO: [], MOTOCICLETA: [] },
        fuelAssetConfig: [],
        fuelTypes: [{ id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' }],
        fuelRefuelingReport: [mockFullRefueling],
        isLoading: false,
      });
      return () => {};
    });

    render(FuelPerformanceHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });
    await fireEvent.click(screen.getByRole('button', { name: '1M' }));

    expect(screen.getByText(/sin tanqueos en el rango seleccionado/i)).toBeTruthy();
  });

  it('el botón Volver llama pop() del router', async () => {
    render(FuelPerformanceHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });
    await fireEvent.click(screen.getByRole('button', { name: /volver/i }));
    expect(pop).toHaveBeenCalled();
  });

  it('click en Editar precarga el tanqueo completo (sin buscador de activo, fijo por la ruta)', async () => {
    render(FuelPerformanceHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });
    // refuelingId=200 — con el rango por defecto "1M", todos los registros del
    // mock quedan fuera (están en julio 2026, hace más de 30 días respecto a la
    // fecha real de hoy 2026-08-21), así que pasamos a "Todo" para verlo.
    await fireEvent.click(screen.getByRole('button', { name: 'Todo' }));
    const filaMasReciente = screen.getAllByRole('row').find((r) => r.textContent.includes('20/07/2026'));

    await fireEvent.click(within(filaMasReciente).getByRole('button', { name: /^editar$/i }));

    expect(data.fetchRefuelingReport).toHaveBeenCalledWith('MAQUINARIA_MOTO', 'TODAS');
    expect(await screen.findByLabelText(/cantidad/i)).toHaveValue(40);
    expect(screen.queryByLabelText(/buscar/i)).toBeNull();
  });

  it('sin datos para el activo, muestra el mensaje de "sin historial"', () => {
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelPerformanceHistory: { MAQUINARIA: [], VEHICULO: [], MOTOCICLETA: [] },
        fuelAssetConfig: [],
        fuelTypes: [],
        fuelRefuelingReport: [],
        isLoading: false,
      });
      return () => {};
    });
    render(FuelPerformanceHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '999' } } });
    expect(screen.getByText(/sin historial de rendimiento/i)).toBeTruthy();
  });
});
