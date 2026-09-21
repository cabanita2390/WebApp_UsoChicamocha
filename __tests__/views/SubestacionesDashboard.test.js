import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SubestacionesDashboard from '../../components/views/SubestacionesDashboard.svelte';

let mockState = {
  substationIndicadoresPorEstacion: [],
  isLoading: false,
};

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn((callback) => {
      callback(mockState);
      return () => {};
    }),
    fetchSubstationIndicadoresPorEstacion: vi.fn(),
  },
}));

// EstacionCumplimientoChart usa ECharts sobre un <canvas> real — no aplica a
// este archivo (que solo verifica los KPIs y la tabla), así que se reemplaza
// por un stub simple, mismo patrón que FuelTrendChartStub.svelte.
vi.mock('../../components/views/EstacionCumplimientoChart.svelte', async () => {
  const mod = await import('../__mocks__/EstacionCumplimientoChartStub.svelte');
  return { default: mod.default };
});

vi.mock('../../components/shared/DataGrid.svelte', async () => {
  const mod = await import('../__mocks__/DataGridStub.svelte');
  return { default: mod.default };
});

describe('SubestacionesDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = { substationIndicadoresPorEstacion: [], isLoading: false };
  });

  // No hay test de "dispara el fetch al montar": @testing-library/svelte 5
  // sobre Svelte 4 no ejecuta los callbacks de onMount durante `render()` (ni
  // siquiera con un `tick()` después) — mismo gotcha ya documentado en
  // FuelTrendChart.test.js. El resto de los tests de este archivo evitan
  // depender de eso alimentando `substationIndicadoresPorEstacion` a través
  // del store mockeado directamente.

  it('muestra el loader mientras carga y no hay datos previos', () => {
    mockState = { substationIndicadoresPorEstacion: [], isLoading: true };
    render(SubestacionesDashboard);
    expect(screen.queryByText('Estaciones activas')).toBeNull();
  });

  it('calcula el % de cumplimiento global y el semáforo a partir de las estaciones', () => {
    mockState = {
      isLoading: false,
      substationIndicadoresPorEstacion: [
        { estacionId: 1, estacionNombre: 'Duitama', estacionTipo: 'BOMBEO', programado: 10, cumple: 8, noCumple: 2, porcentajeCumplimiento: 80, ejecutadoNoProgramado: 1 },
        { estacionId: 2, estacionNombre: 'Holanda', estacionTipo: 'BOMBEO', programado: 10, cumple: 2, noCumple: 8, porcentajeCumplimiento: 20, ejecutadoNoProgramado: 0 },
      ],
    };
    const { container } = render(SubestacionesDashboard);

    const values = [...container.querySelectorAll('.kpi-value')];
    expect(values[0].textContent).toBe('2'); // Estaciones activas
    // (8+2)/(10+10) = 50% -> amarillo, dentro del rango 36-55
    expect(values[1].textContent).toBe('50%');
    expect(values[2].textContent).toBe('20 / 10'); // totalProgramado / totalCumple
    expect(values[3].textContent).toBe('1'); // total no programadas
  });

  it('muestra el mensaje de "sin estaciones" cuando la lista viene vacía', () => {
    mockState = { substationIndicadoresPorEstacion: [], isLoading: false };
    render(SubestacionesDashboard);
    expect(screen.getByText('Sin estaciones registradas.')).toBeTruthy();
  });
});
