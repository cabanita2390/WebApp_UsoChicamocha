import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import EstacionCumplimientoChart from '../../components/views/EstacionCumplimientoChart.svelte';

// Mismo motivo que FuelTrendChart.test.js: jsdom no implementa un canvas 2D
// real, así que se mockea 'echarts/core' y se verifica el contrato del
// componente (opción pasada a `setOption`) en vez de inspeccionar el canvas.
// El ciclo de vida vive en `use:chartAction` (una action, no onMount), así
// que se aplica de forma síncrona al montar — sin necesidad de esperar tick()
// salvo cuando se reacciona a un cambio de props.
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

describe('EstacionCumplimientoChart', () => {
  it('no inicializa ECharts y muestra el mensaje de "sin datos" cuando no hay estaciones', () => {
    const { getByText } = render(EstacionCumplimientoChart, { props: { estaciones: [] } });
    expect(getByText('Sin estaciones para mostrar.')).toBeTruthy();
    expect(echarts.init).not.toHaveBeenCalled();
  });

  it('ordena las estaciones de peor a mejor cumplimiento (para que la peor quede arriba con yAxis.inverse)', () => {
    render(EstacionCumplimientoChart, {
      props: {
        estaciones: [
          { estacionNombre: 'Duitama', porcentajeCumplimiento: 80 },
          { estacionNombre: 'Holanda', porcentajeCumplimiento: 20 },
          { estacionNombre: 'Cuche', porcentajeCumplimiento: 50 },
        ],
      },
    });

    const opcion = mockChart.setOption.mock.calls.at(-1)[0];
    expect(opcion.yAxis.data).toEqual(['Holanda', 'Cuche', 'Duitama']);
    expect(opcion.yAxis.inverse).toBe(true);
  });

  it('colorea cada barra según el semáforo de cumplimiento', () => {
    render(EstacionCumplimientoChart, {
      props: {
        estaciones: [
          { estacionNombre: 'Verde', porcentajeCumplimiento: 90 },
          { estacionNombre: 'Amarilla', porcentajeCumplimiento: 40 },
          { estacionNombre: 'Roja', porcentajeCumplimiento: 10 },
        ],
      },
    });

    const opcion = mockChart.setOption.mock.calls.at(-1)[0];
    const [roja, amarilla, verde] = opcion.series[0].data; // ordenadas de peor a mejor
    expect(roja.itemStyle.color).toBe('#c62828');
    expect(amarilla.itemStyle.color).toBe('#e65100');
    expect(verde.itemStyle.color).toBe('#1b5e20');
  });

  it('infla visualmente una barra de 0% para que siga siendo interactiva, sin alterar el valor mostrado', () => {
    render(EstacionCumplimientoChart, {
      props: { estaciones: [{ estacionNombre: 'Sin ejecuciones', porcentajeCumplimiento: 0 }] },
    });

    const opcion = mockChart.setOption.mock.calls.at(-1)[0];
    const punto = opcion.series[0].data[0];
    expect(punto.value).toBeGreaterThan(0); // ancho mínimo visual, no el valor real
    expect(punto.realValor).toBe(0);
    expect(opcion.series[0].label.formatter({ data: punto })).toBe('0%');
    expect(opcion.tooltip.formatter({ name: 'Sin ejecuciones', data: punto })).toContain('0%');
  });

  it('destruye el chart cuando el componente se desmonta', () => {
    const { component } = render(EstacionCumplimientoChart, {
      props: { estaciones: [{ estacionNombre: 'Duitama', porcentajeCumplimiento: 80 }] },
    });

    component.$destroy();

    expect(mockChart.dispose).toHaveBeenCalledTimes(1);
  });

  it('destruye el chart y vuelve al mensaje de "sin datos" si `estaciones` pasa a estar vacío', async () => {
    const { component, getByText } = render(EstacionCumplimientoChart, {
      props: { estaciones: [{ estacionNombre: 'Duitama', porcentajeCumplimiento: 80 }] },
    });

    component.$set({ estaciones: [] });
    await tick();

    expect(mockChart.dispose).toHaveBeenCalledTimes(1);
    expect(getByText('Sin estaciones para mostrar.')).toBeTruthy();
  });
});
