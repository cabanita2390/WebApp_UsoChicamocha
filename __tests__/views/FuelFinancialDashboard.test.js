import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FuelFinancialDashboard from '../../components/views/FuelFinancialDashboard.svelte';

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

  it('muestra los KPIs de gasto bruto, neto y ahorro formateados como moneda compacta', () => {
    render(FuelFinancialDashboard);
    // gastoBruto (1.200.000) y gastoNeto (1.150.000) deben distinguirse — no ambos "$1,2 M".
    expect(screen.getByText(/\$\s?1,2\s?M/)).toBeTruthy();
    expect(screen.getByText(/\$\s?1,15\s?M/)).toBeTruthy();
    expect(screen.getByText(/\$\s?50\s?k/i)).toBeTruthy();
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

  it('muestra la comparación almacén vs. bomba', () => {
    render(FuelFinancialDashboard);
    expect(screen.getByText('Compras almacén')).toBeTruthy();
    expect(screen.getByText('Tanqueos bomba')).toBeTruthy();
  });

  it('muestra el gasto por tipo de combustible en pesos', () => {
    render(FuelFinancialDashboard);
    expect(screen.getByText('Gasto por tipo de combustible')).toBeTruthy();
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

  it('muestra discrepancias detectadas y precio promedio por galón', () => {
    render(FuelFinancialDashboard);
    expect(screen.getByText('Discrepancias detectadas')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('Precio promedio por galón comprado')).toBeTruthy();
  });

  it('cambia el rango de meses de la tendencia al hacer click en el selector', async () => {
    render(FuelFinancialDashboard);

    await fireEvent.click(screen.getByRole('button', { name: '24m' }));

    expect(data.fetchFuelTrend).toHaveBeenLastCalledWith(24, undefined);
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
});
