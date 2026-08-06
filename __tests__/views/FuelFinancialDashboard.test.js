import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FuelFinancialDashboard from '../../components/views/FuelFinancialDashboard.svelte';
import { fuelDateRange } from '../../stores/fuelFilters.js';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchFuelDashboard: vi.fn(),
    fetchFuelTypes: vi.fn(),
    fetchFuelTrend: vi.fn(),
  },
}));

vi.mock('../shared/Loader.svelte', () => ({
  default: vi.fn().mockImplementation(() => ({
    $$: { on_mount: [], on_destroy: [] },
    $set: vi.fn(),
    $destroy: vi.fn(),
  })),
}));

import { data } from '../../stores/data.js';

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
});
