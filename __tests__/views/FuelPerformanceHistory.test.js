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
    fetchFuelPerformanceAllTipos: vi.fn(),
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
        fuelPerformance: { MAQUINARIA: mockPerformanceMaquinaria, VEHICULO: [], MOTOCICLETA: [] },
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
    expect(data.fetchFuelPerformanceAllTipos).toHaveBeenCalledWith('2000-01-01', expect.any(String));
  });

  it('muestra todos los tanqueos del activo, no solo el más reciente', () => {
    render(FuelPerformanceHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });
    const filas = screen.getAllByRole('row');
    // 3 registros del activo + 1 fila de encabezado.
    expect(filas.some((r) => r.textContent.includes('0.05'))).toBe(true);
    expect(filas.some((r) => r.textContent.includes('38.67'))).toBe(true);
  });

  it('el resumen muestra el total de registros y cuántos tienen alerta', () => {
    const { container } = render(FuelPerformanceHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });
    const valores = [...container.querySelectorAll('.summary-value')].map((el) => el.textContent.trim());
    expect(valores[0]).toBe('3'); // Total registros
    expect(valores[2]).toBe('1 / 3'); // Con alerta
  });

  it('dibuja el gráfico Proyectado vs Real con leyenda', () => {
    const { container } = render(FuelPerformanceHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });
    const chart = container.querySelector('.ph-chart');
    expect(within(chart).getByText('Proyectado')).toBeTruthy();
    expect(within(chart).getByText('Real')).toBeTruthy();
    expect(chart.querySelectorAll('polyline').length).toBe(2);
  });

  it('con un rango de hasta un año, la etiqueta muestra día arriba y mes abreviado abajo', () => {
    // Los 3 registros del mock caen en julio de 2026 (rango de 10 días) — bien
    // por debajo del año, así que el día es el dato útil.
    const { container } = render(FuelPerformanceHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });

    const etiquetas = [...container.querySelectorAll('.trend-month')].map((el) => el.textContent);
    expect(etiquetas).toEqual(['10\njul', '15\njul', '20\njul']);
  });

  it('con un rango mayor a un año (histórico que ya creció varios años), la etiqueta cambia a mes abreviado arriba y año abajo', () => {
    // Mismo activo, pero ahora con tanqueos en 2024, 2025 y 2026 — a esa escala
    // el día exacto ya no aporta, el año sí.
    const variosAniosMock = [
      { ...mockPerformanceMaquinaria[0], fechaRegistro: '2024-01-10T10:00:00' },
      { ...mockPerformanceMaquinaria[1], fechaRegistro: '2025-06-15T10:00:00' },
      { ...mockPerformanceMaquinaria[2], fechaRegistro: '2026-07-20T10:00:00' },
    ];
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelPerformance: { MAQUINARIA: variosAniosMock, VEHICULO: [], MOTOCICLETA: [] },
        fuelAssetConfig: [],
        fuelTypes: [{ id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' }],
        fuelRefuelingReport: [mockFullRefueling],
        isLoading: false,
      });
      return () => {};
    });

    const { container } = render(FuelPerformanceHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });

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
        fuelPerformance: { MAQUINARIA: mockRango, VEHICULO: [], MOTOCICLETA: [] },
        fuelAssetConfig: [],
        fuelTypes: [{ id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' }],
        fuelRefuelingReport: [mockFullRefueling],
        isLoading: false,
      });
      return () => {};
    });

    const { container } = render(FuelPerformanceHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });

    // "Todo" (default): se ven los 2 registros.
    expect(container.querySelector('.summary-value').textContent.trim()).toBe('2');

    await fireEvent.click(screen.getByRole('button', { name: '1M' }));

    // Filtrado 100% client-side: no dispara un fetch nuevo al backend.
    expect(data.fetchFuelPerformanceAllTipos).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.summary-value').textContent.trim()).toBe('1');
  });

  it('si el rango elegido no tiene tanqueos, muestra el mensaje específico (no el de "sin historial" general)', async () => {
    // Un registro muy viejo (2 años atrás respecto a "ahora" real) queda fuera
    // de cualquier preset de rango salvo "Todo".
    const muyViejo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelPerformance: { MAQUINARIA: [{ ...mockPerformanceMaquinaria[0], fechaRegistro: muyViejo }], VEHICULO: [], MOTOCICLETA: [] },
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
    const filaMasReciente = screen.getAllByRole('row').find((r) => r.textContent.includes('38.67'));

    await fireEvent.click(within(filaMasReciente).getByRole('button', { name: /^editar$/i }));

    expect(data.fetchRefuelingReport).toHaveBeenCalledWith('MAQUINARIA_MOTO', 'TODAS');
    expect(await screen.findByLabelText(/cantidad/i)).toHaveValue(40);
    expect(screen.queryByLabelText(/buscar/i)).toBeNull();
  });

  it('sin datos para el activo, muestra el mensaje de "sin historial"', () => {
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelPerformance: { MAQUINARIA: [], VEHICULO: [], MOTOCICLETA: [] },
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
