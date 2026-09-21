import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SubestacionesResumenActividad from '../../components/views/SubestacionesResumenActividad.svelte';

let mockState = {
  substationResumenPorActividad: [],
  isLoading: false,
};

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn((callback) => {
      callback(mockState);
      return () => {};
    }),
    fetchSubstationResumenPorActividad: vi.fn(),
  },
}));

vi.mock('../../components/shared/DataGrid.svelte', async () => {
  const mod = await import('../__mocks__/DataGridStub.svelte');
  return { default: mod.default };
});

describe('SubestacionesResumenActividad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = { substationResumenPorActividad: [], isLoading: false };
  });

  // No hay test de "carga el resumen al montar": @testing-library/svelte 5
  // sobre Svelte 4 no ejecuta los callbacks de onMount durante `render()`
  // (ver el mismo gotcha documentado en SubestacionesDashboard.test.js y en
  // FuelTrendChart.test.js). Los tests de abajo alimentan
  // `substationResumenPorActividad` a través del store mockeado directamente.

  it('muestra la disciplina como un selector bloqueado, no editable', () => {
    render(SubestacionesResumenActividad);
    expect(screen.getByText('Civil (única habilitada)')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('muestra el loader mientras carga y no hay datos previos', () => {
    mockState = { substationResumenPorActividad: [], isLoading: true };
    render(SubestacionesResumenActividad);
    expect(screen.queryByText('Actividades — disciplina Civil')).toBeNull();
  });

  it('muestra el mensaje de "sin actividades" cuando la lista viene vacía', () => {
    render(SubestacionesResumenActividad);
    expect(screen.getByText('Sin actividades registradas para esta disciplina.')).toBeTruthy();
  });

  it('renderiza la tabla cuando hay actividades', () => {
    mockState = {
      isLoading: false,
      substationResumenPorActividad: [
        { actividadNombre: 'Pintura muros', programadoAnual: 12, ejecutadoAnual: 5, ejecutadoNoProgramado: 1, mantenimiento: 3, inspeccion: 3, ejecutadoTotal: 6 },
      ],
    };
    const { getByTestId } = render(SubestacionesResumenActividad);
    expect(getByTestId('grid-row-count').textContent).toBe('1');
  });
});
