import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SubestacionesTabbed from '../../components/views/SubestacionesTabbed.svelte';
import { subestacionesActiveTab, pantallaAmpliada, detalleEstacionId } from '../../stores/subestacionesFilters.js';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn((callback) => {
      callback({
        substationEstaciones: [],
        substationActividades: [],
        substationEjecuciones: { data: [], totalPages: 0, totalElements: 0, currentPage: 0, pageSize: 20 },
        isLoading: false,
      });
      return () => {};
    }),
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

vi.mock('../../stores/auth.js', () => ({
  auth: { subscribe: (fn) => { fn({ currentUser: { name: 'admin', role: 'ADMIN' } }); return () => {}; } },
}));

vi.mock('../../stores/substationAdmin.js', () => ({
  substationAdmin: {
    indicadoresPorEstacion: vi.fn(async () => []),
    resumenPorActividad: vi.fn(async () => []),
    listarEstaciones: vi.fn(async () => []),
    listarActividades: vi.fn(async () => []),
    obtenerCronograma: vi.fn(async () => ({
      anio: 2026, anioActual: 2026, mesActual: 9, citas: [], borrador: { altas: 0, bajas: 0 },
      ultimaPublicacion: null, puedeDeshacer: false,
    })),
  },
}));

describe('SubestacionesTabbed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subestacionesActiveTab.set('dashboard');
    pantallaAmpliada.set(false);
    detalleEstacionId.set(null);
  });

  it('muestra las 4 pestañas y el Dashboard de Estaciones por defecto', async () => {
    render(SubestacionesTabbed);
    expect(screen.getAllByRole('tab').map((t) => t.textContent.trim())).toEqual([
      'Dashboard de Estaciones', 'Resumen por Actividad', 'Ejecuciones y Hallazgos', 'Cronograma Anual',
    ]);
    expect(await screen.findByText('Programadas')).toBeTruthy();
  });

  it('cambia a cada pestaña y renderiza el componente correcto', async () => {
    render(SubestacionesTabbed);

    await fireEvent.click(screen.getByRole('tab', { name: 'Resumen por Actividad' }));
    expect(await screen.findByText('Resumen por actividad', { selector: 'h1' })).toBeTruthy();

    await fireEvent.click(screen.getByRole('tab', { name: 'Ejecuciones y Hallazgos' }));
    expect(screen.getByText('Solo hallazgos')).toBeTruthy();

    await fireEvent.click(screen.getByRole('tab', { name: 'Cronograma Anual' }));
    expect(await screen.findByText('Cronograma Anual', { selector: 'h1' })).toBeTruthy();

    await fireEvent.click(screen.getByRole('tab', { name: 'Dashboard de Estaciones' }));
    expect(await screen.findByText('Programadas')).toBeTruthy();
  });

  it('la pestaña activa sobrevive a que el componente se desmonte y se vuelva a montar', async () => {
    const { unmount } = render(SubestacionesTabbed);
    await fireEvent.click(screen.getByRole('tab', { name: 'Ejecuciones y Hallazgos' }));
    unmount();

    render(SubestacionesTabbed);
    expect(screen.getByText('Solo hallazgos')).toBeTruthy();
  });

  it('en vista ampliada del Cronograma se oculta la barra de pestañas', () => {
    pantallaAmpliada.set(true);
    render(SubestacionesTabbed);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });
});
