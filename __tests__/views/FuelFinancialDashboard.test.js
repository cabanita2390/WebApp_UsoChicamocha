import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import FuelFinancialDashboard from '../../components/views/FuelFinancialDashboard.svelte';
import { fuelDateRange, defaultFuelDateRange } from '../../stores/fuelFilters.js';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchFuelDashboard: vi.fn(),
    fetchFuelTypes: vi.fn(),
    fetchFuelTrend: vi.fn(),
    fetchFuelBudgetProjection: vi.fn(),
    createMonthlyDiscount: vi.fn().mockResolvedValue({ id: 1 }),
  },
}));

vi.mock('../../stores/auth.js', () => ({
  auth: {
    subscribe: vi.fn((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Test User', role: 'OPERARIO' }, isRefreshing: false });
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

const mockDashboard = {
  fechaInicio: '2026-07-01',
  fechaFin: '2026-07-22',
  gastoBruto: 1200000,
  gastoNeto: 1150000,
  ahorro: 50000,
  totalComprasAlmacen: 1000000,
  totalTanqueosBomba: 200000,
  galonesPorTipo: [{ fuelTypeId: 1, cantidad: 45.5 }, { fuelTypeId: 4, cantidad: 12.3 }],
  gastoPorTipo: [{ fuelTypeId: 1, monto: 900000 }],
  // Solo 30 de los 45,5 galones totales del tipo 1 fueron en BOMBA — el resto fue
  // ALMACEN (sin costo). El precio/unidad debe usar este valor, no el total.
  galonesBombaPorTipo: [{ fuelTypeId: 1, cantidad: 30 }],
  discrepancias: 2,
  precioPromedioGalonComprado: 10000,
  comparacionAnterior: {
    fechaInicioAnterior: '2026-06-01',
    fechaFinAnterior: '2026-06-22',
    gastoBrutoAnterior: 1000000,
    gastoNetoAnterior: 950000,
    ahorroAnterior: 50000,
    deltaGastoBrutoPct: 20.0,
    deltaGastoNetoPct: 21.1,
    deltaAhorroPct: 0.0,
  },
};

describe('FuelFinancialDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fuelDateRange.set({ fechaInicio: '', fechaFin: '' });
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Test User', role: 'OPERARIO' }, isRefreshing: false });
      return () => {};
    });
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelDashboard: mockDashboard,
        fuelTypes: [
          { id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' },
          { id: 4, codigo: 'GAS', nombre: 'Gas natural vehicular', unidadMedida: 'M3' },
        ],
        fuelTrend: [
          { mes: '2026-06-01', gastoBruto: 400000, gastoNeto: 400000, galonesTotal: 20 },
          { mes: '2026-07-01', gastoBruto: 500000, gastoNeto: 500000, galonesTotal: 25 },
        ],
        fuelBudgetProjection: [],
        isLoading: false,
      });
      return () => {};
    });
  });

  it('muestra los KPIs de gasto bruto, neto y ahorro con el valor completo (no notación compacta)', () => {
    render(FuelFinancialDashboard);
    // Valor completo para evitar que montos distintos luzcan iguales (ej. "1,2 M" vs "1,15 M").
    expect(screen.getByText(/\$\s?1\.200\.000/)).toBeTruthy();
    expect(screen.getByText(/\$\s?1\.150\.000/)).toBeTruthy();
    expect(screen.getByText(/\$\s?50\.000/)).toBeTruthy();
  });

  it('muestra la leyenda y el nombre del tipo de combustible en el gráfico de galones', () => {
    render(FuelFinancialDashboard);
    expect(screen.getAllByText('ACPM / Diésel').length).toBeGreaterThan(0);
    expect(screen.getByText(/45,5\s?gal/)).toBeTruthy();
  });

  it('muestra la cantidad de gas natural vehicular en m³, no en galones', () => {
    render(FuelFinancialDashboard);
    expect(screen.getByText(/12,3\s?m³/)).toBeTruthy();
  });

  it('muestra la tabla combinada de combustible con precio, cantidad y gasto', () => {
    render(FuelFinancialDashboard);
    expect(screen.getAllByText('Combustible').length).toBeGreaterThan(0);
    // Cantidad mostrada sigue siendo el total (bomba+almacén): 45,5 gal.
    expect(screen.getByText(/45,5\s?gal/)).toBeTruthy();
    // Precio/unidad = gasto (900.000) ÷ SOLO galones de bomba (30) = 30.000/gal —
    // no ÷ 45,5 (el total), que diluiría el precio con galones de almacén sin costo.
    expect(screen.getByText(/30[.,]000\/gal/)).toBeTruthy();
  });

  it('muestra la tendencia mensual de consumo y gasto neto', () => {
    render(FuelFinancialDashboard);
    expect(screen.getByText('Consumo mensual (galones)')).toBeTruthy();
    expect(screen.getByText('Gasto neto mensual')).toBeTruthy();
    expect(screen.getAllByText('jul').length).toBeGreaterThan(0);
  });

  it('vuelve a pedir el dashboard con los nuevos parámetros al cambiar el filtro de fechas', async () => {
    render(FuelFinancialDashboard);

    await fireEvent.input(screen.getByLabelText(/fecha inicio/i), { target: { value: '2026-06-01' } });
    await fireEvent.input(screen.getByLabelText(/fecha fin/i), { target: { value: '2026-06-30' } });
    await fireEvent.click(screen.getByRole('button', { name: /filtrar/i }));

    expect(data.fetchFuelDashboard).toHaveBeenLastCalledWith('2026-06-01', '2026-06-30');
  });

  it('muestra el delta vs. el periodo anterior (no "mes anterior" fijo)', () => {
    render(FuelFinancialDashboard);
    expect(screen.getByText(/\+20% vs\. periodo anterior/)).toBeTruthy();
  });

  it('no muestra una tarjeta separada de "Gasto bomba" (redundante con Gasto bruto/neto dado el alcance sin compras)', () => {
    render(FuelFinancialDashboard);
    expect(screen.queryByText('Gasto bomba')).toBeNull();
  });

  it('muestra discrepancias detectadas', () => {
    render(FuelFinancialDashboard);
    expect(screen.getByText('Discrepancias detectadas')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('no muestra "Precio promedio por galón comprado" (sin compras/inventario en el alcance actual, siempre daría "—")', () => {
    render(FuelFinancialDashboard);
    expect(screen.queryByText('Precio promedio por galón comprado')).toBeNull();
  });

  it('cambia el rango de meses de la tendencia al hacer click en el selector', async () => {
    render(FuelFinancialDashboard);

    await fireEvent.click(screen.getByRole('button', { name: '24m' }));

    expect(data.fetchFuelTrend).toHaveBeenLastCalledWith(24, undefined);
  });

  it('apila las gráficas de tendencia verticalmente cuando el rango es mayor a 6 meses', async () => {
    const { container } = render(FuelFinancialDashboard);

    expect(container.querySelector('.chart-row--trend').classList.contains('chart-row--stacked')).toBe(false);

    await fireEvent.click(screen.getByRole('button', { name: '12m' }));

    expect(container.querySelector('.chart-row--trend').classList.contains('chart-row--stacked')).toBe(true);
  });

  it('permite elegir un número de meses libre para la tendencia', async () => {
    render(FuelFinancialDashboard);

    await fireEvent.input(screen.getByLabelText(/otro número de meses/i), { target: { value: '30' } });
    await fireEvent.click(screen.getByRole('button', { name: /aplicar/i }));

    expect(data.fetchFuelTrend).toHaveBeenLastCalledWith(30, undefined);
  });

  it('la tendencia termina en la fechaFin filtrada, no siempre en hoy', async () => {
    render(FuelFinancialDashboard);

    await fireEvent.input(screen.getByLabelText(/fecha fin/i), { target: { value: '2024-03-15' } });
    await fireEvent.click(screen.getByRole('button', { name: /filtrar/i }));

    expect(data.fetchFuelTrend).toHaveBeenLastCalledWith(6, '2024-03-15');
  });

  it('pasa timestamps reales (derivados de t.mes) al gráfico de tendencia, sin producir posiciones inválidas', () => {
    // t.mes ya viene como fecha completa ("2026-06-01", LocalDate serializado por
    // el backend) — un bug real habría sido tratarlo como "YYYY-MM" y concatenar
    // "-01" de más, produciendo "2026-06-01-01" (fecha inválida -> NaN).
    const { container } = render(FuelFinancialDashboard);

    const marcador = container.querySelector('.trend-marker');
    expect(marcador).toBeTruthy();
    expect(marcador.style.left).not.toBe('');
    expect(marcador.style.left.includes('NaN')).toBe(false);
    expect(marcador.style.top.includes('NaN')).toBe(false);
  });

  it('"Limpiar filtro" vuelve al rango por defecto (mes actual → hoy) y refiltra', async () => {
    render(FuelFinancialDashboard);

    await fireEvent.input(screen.getByLabelText(/fecha inicio/i), { target: { value: '2020-01-01' } });
    await fireEvent.input(screen.getByLabelText(/fecha fin/i), { target: { value: '2020-01-31' } });
    await fireEvent.click(screen.getByRole('button', { name: /limpiar filtro/i }));

    const esperado = defaultFuelDateRange();
    expect(screen.getByLabelText(/fecha inicio/i).value).toBe(esperado.fechaInicio);
    expect(screen.getByLabelText(/fecha fin/i).value).toBe(esperado.fechaFin);
    expect(data.fetchFuelDashboard).toHaveBeenLastCalledWith(esperado.fechaInicio, esperado.fechaFin);
  });

  it('muestra la tabla de proyección presupuestal con las filas históricas y proyectadas etiquetadas', () => {
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelDashboard: mockDashboard,
        fuelTypes: [{ id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' }],
        fuelTrend: [],
        fuelBudgetProjection: [
          { mes: '2026-06-01', gastoNeto: 400000, proyectado: false },
          { mes: '2026-07-01', gastoNeto: 500000, proyectado: false },
          { mes: '2026-08-01', gastoNeto: 450000, proyectado: true },
          { mes: '2026-09-01', gastoNeto: 450000, proyectado: true },
          { mes: '2026-10-01', gastoNeto: 450000, proyectado: true },
        ],
        isLoading: false,
      });
      return () => {};
    });

    render(FuelFinancialDashboard);

    expect(screen.getByText(/proyecci[oó]n presupuestal/i)).toBeTruthy();
    expect(screen.getAllByText('Histórico').length).toBe(2);
    expect(screen.getAllByText('Proyectado').length).toBe(3);
  });

  it('la proyección presupuestal vive fuera de la tarjeta de KPIs reales, para no confundirse con ellos', () => {
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelDashboard: mockDashboard,
        fuelTypes: [],
        fuelTrend: [],
        fuelBudgetProjection: [{ mes: '2026-09-01', gastoNeto: 450000, proyectado: true }],
        isLoading: false,
      });
      return () => {};
    });

    const { container } = render(FuelFinancialDashboard);

    const kpiCard = container.querySelector('.kpi-card');
    expect(kpiCard.textContent).not.toMatch(/proyecci[oó]n presupuestal/i);
  });

  it('no renderiza la sección de proyección si no hay filas (evita una tabla vacía confusa)', () => {
    render(FuelFinancialDashboard); // fuelBudgetProjection: [] por defecto en beforeEach

    expect(screen.queryByText(/proyecci[oó]n presupuestal/i)).toBeNull();
  });

  it('un OPERARIO no ve el botón "+ Registrar descuento"', () => {
    render(FuelFinancialDashboard);
    expect(screen.queryByRole('button', { name: /registrar descuento/i })).toBeNull();
  });

  it('un ADMIN sí ve el botón "+ Registrar descuento" y puede abrir el modal', async () => {
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Admin', role: 'ADMIN' }, isRefreshing: false });
      return () => {};
    });
    render(FuelFinancialDashboard);

    await fireEvent.click(screen.getByRole('button', { name: /registrar descuento/i }));

    expect(screen.getByLabelText(/monto del descuento/i)).toBeTruthy();
  });

  it('un SUPERVISOR_OPERATIVO registra un descuento mensual y el dashboard se refresca', async () => {
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Supervisor', role: 'SUPERVISOR_OPERATIVO' }, isRefreshing: false });
      return () => {};
    });
    render(FuelFinancialDashboard);

    await fireEvent.click(screen.getByRole('button', { name: /registrar descuento/i }));
    // El modal duplica los labels "Fecha inicio"/"Fecha fin" del filtro de la
    // página (mismo texto, distinto propósito) — se acota al diálogo para evitar
    // el "multiple elements" de getByLabelText.
    const dialogo = within(screen.getByRole('dialog'));
    await fireEvent.input(dialogo.getByLabelText(/fecha inicio/i), { target: { value: '2026-07-16' } });
    await fireEvent.input(dialogo.getByLabelText(/fecha fin/i), { target: { value: '2026-08-15' } });
    await fireEvent.input(dialogo.getByLabelText(/monto del descuento/i), { target: { value: '80000' } });
    await fireEvent.click(dialogo.getByRole('button', { name: /^registrar descuento$/i }));

    expect(data.createMonthlyDiscount).toHaveBeenCalledWith({
      fechaInicio: '2026-07-16', fechaFin: '2026-08-15', monto: 80000,
    });
    expect(data.fetchFuelDashboard).toHaveBeenCalled();
  });

  it('muestra el descuento mensual junto al KPI de ahorro cuando el backend lo trae', () => {
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelDashboard: { ...mockDashboard, descuentoMensual: 80000 },
        fuelTypes: [],
        fuelTrend: [],
        fuelBudgetProjection: [],
        isLoading: false,
      });
      return () => {};
    });

    render(FuelFinancialDashboard);

    expect(screen.getByText(/descuento mensual registrado/i)).toBeTruthy();
  });
});
