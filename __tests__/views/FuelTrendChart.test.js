import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import FuelTrendChart from '../../components/views/FuelTrendChart.svelte';

// FuelTrendChart ahora delega el renderizado a ECharts (ver plan: reemplazo
// del SVG manual). jsdom no implementa un canvas 2D real, así que estos tests
// mockean 'echarts/core' y verifican el contrato del componente (cuándo se
// inicializa/destruye el chart, y qué le pasa a `setOption`) en vez de
// inspeccionar nodos <polyline> como hacía la versión anterior. `onMount`
// dispara el primer render de forma asíncrona (se resuelve en el siguiente
// tick de Svelte), así que cada test espera un `tick()` antes de mirar las
// llamadas al mock.
let mockChart;

vi.mock('echarts/core', () => ({
  use: vi.fn(),
  init: vi.fn(() => mockChart),
}));

import * as echarts from 'echarts/core';

beforeEach(() => {
  mockChart = { setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn() };
  echarts.init.mockClear();
});

describe('FuelTrendChart', () => {
  it('no inicializa ECharts y muestra el mensaje de "sin datos" cuando no hay valores', async () => {
    const { getByText } = render(FuelTrendChart, {
      props: { label: 'Consumo mensual (galones)', months: [], values: [] },
    });
    await tick();

    expect(getByText('Sin datos suficientes.')).toBeTruthy();
    expect(echarts.init).not.toHaveBeenCalled();
  });

  it('inicializa ECharts con una sola serie cuando no hay values2', async () => {
    render(FuelTrendChart, {
      props: {
        label: 'Consumo mensual (galones)',
        months: ['02/26', '03/26', '04/26'],
        values: [10, 20, 15],
      },
    });
    await tick();

    expect(echarts.init).toHaveBeenCalledTimes(1);
    const opcion = mockChart.setOption.mock.calls.at(-1)[0];
    expect(opcion.series).toHaveLength(1);
    expect(opcion.series[0].name).toBe('Consumo mensual (galones)');
    expect(opcion.legend).toBeUndefined();
  });

  it('agrega una segunda serie y leyenda cuando se pasa values2/label2', async () => {
    render(FuelTrendChart, {
      props: {
        label: 'Horas esperadas (H)',
        label2: 'Horas ejecutadas (D)',
        months: ['02/26', '03/26'],
        values: [10, 12],
        values2: [8, 11],
      },
    });
    await tick();

    const opcion = mockChart.setOption.mock.calls.at(-1)[0];
    expect(opcion.series).toHaveLength(2);
    expect(opcion.series.map((s) => s.name)).toEqual(['Horas esperadas (H)', 'Horas ejecutadas (D)']);
    expect(opcion.legend).toBeTruthy();
  });

  it('usa eje de tiempo real cuando `timestamps` coincide en longitud con `values`', async () => {
    render(FuelTrendChart, {
      props: {
        label: 'Gasto neto mensual',
        months: ['02/26', '03/26'],
        values: [100, 200],
        timestamps: ['2026-02-01', '2026-03-01'],
      },
    });
    await tick();

    const opcion = mockChart.setOption.mock.calls.at(-1)[0];
    expect(opcion.xAxis.type).toBe('time');
  });

  it('cae a eje de categorías (por índice) cuando no se pasan timestamps', async () => {
    render(FuelTrendChart, {
      props: {
        label: 'Gasto neto mensual',
        months: ['02/26', '03/26'],
        values: [100, 200],
      },
    });
    await tick();

    const opcion = mockChart.setOption.mock.calls.at(-1)[0];
    expect(opcion.xAxis.type).toBe('category');
    expect(opcion.xAxis.data).toEqual(['02/26', '03/26']);
  });

  it('destruye el chart cuando el componente se desmonta', async () => {
    const { component } = render(FuelTrendChart, {
      props: { label: 'Consumo mensual (galones)', months: ['02/26'], values: [10] },
    });
    await tick();

    component.$destroy();

    expect(mockChart.dispose).toHaveBeenCalledTimes(1);
  });

  it('destruye el chart y vuelve al mensaje de "sin datos" si `values` pasa a estar vacío', async () => {
    const { component, getByText } = render(FuelTrendChart, {
      props: { label: 'Consumo mensual (galones)', months: ['02/26'], values: [10] },
    });
    await tick();

    component.$set({ months: [], values: [] });
    await tick();

    expect(mockChart.dispose).toHaveBeenCalledTimes(1);
    expect(getByText('Sin datos suficientes.')).toBeTruthy();
  });
});
