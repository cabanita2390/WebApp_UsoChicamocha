import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SubestacionesTabbed from '../../components/views/SubestacionesTabbed.svelte';
import { subestacionesActiveTab } from '../../stores/subestacionesFilters.js';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn((callback) => {
      callback({
        substationIndicadoresPorEstacion: [],
        substationResumenPorActividad: [],
        substationEstaciones: [],
        substationActividades: [],
        substationEjecuciones: { data: [], totalPages: 0, totalElements: 0, currentPage: 0, pageSize: 20 },
        isLoading: false,
      });
      return () => {};
    }),
    fetchSubstationIndicadoresPorEstacion: vi.fn(),
    fetchSubstationResumenPorActividad: vi.fn(),
    fetchSubstationEstaciones: vi.fn(),
    fetchSubstationActividades: vi.fn(),
    fetchSubstationEjecuciones: vi.fn(),
    fetchSubstationEjecucion: vi.fn(),
  },
}));

vi.mock('../../stores/ui.js', () => ({
  ui: { openImageModal: vi.fn(), setImageModalLoading: vi.fn(), setImageModalUrls: vi.fn() },
  addNotification: vi.fn(),
}));

// Mismo motivo que FuelTrendChart.test.js: jsdom no tiene canvas 2D real.
vi.mock('echarts/core', () => ({ use: vi.fn(), init: vi.fn(() => ({ setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn() })) }));

describe('SubestacionesTabbed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subestacionesActiveTab.set('dashboard');
  });

  it('muestra el Dashboard de Estaciones por defecto', () => {
    render(SubestacionesTabbed);
    expect(screen.getByText('Estaciones activas')).toBeTruthy();
  });

  it('cambia a cada pestaña y renderiza el componente correcto', async () => {
    render(SubestacionesTabbed);

    await fireEvent.click(screen.getByRole('tab', { name: 'Resumen por Actividad' }));
    expect(screen.getByText('Civil (única habilitada)')).toBeTruthy();

    await fireEvent.click(screen.getByRole('tab', { name: 'Ejecuciones y Hallazgos' }));
    expect(screen.getByText('Solo hallazgos')).toBeTruthy();

    await fireEvent.click(screen.getByRole('tab', { name: 'Dashboard de Estaciones' }));
    expect(screen.getByText('Estaciones activas')).toBeTruthy();
  });

  it('la pestaña activa sobrevive a que el componente se desmonte y se vuelva a montar', async () => {
    const { unmount } = render(SubestacionesTabbed);
    await fireEvent.click(screen.getByRole('tab', { name: 'Ejecuciones y Hallazgos' }));
    unmount();

    render(SubestacionesTabbed);
    expect(screen.getByText('Solo hallazgos')).toBeTruthy();
  });
});
