import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import SubestacionesEjecuciones from '../../components/views/SubestacionesEjecuciones.svelte';

const filtrosDefault = {
  estacionId: undefined,
  actividadId: undefined,
  tipoMantenimiento: undefined,
  tipoActividad: undefined,
  resultado: undefined,
  esProgramada: undefined,
  fechaInicio: undefined,
  fechaFin: undefined,
  disciplina: undefined,
  sort: ["fecha,desc"],
};

let mockState = {
  substationEstaciones: [],
  substationActividades: [],
  substationEjecuciones: { data: [], totalPages: 0, totalElements: 0, currentPage: 0, pageSize: 20 },
  isLoading: false,
};

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn((callback) => {
      callback(mockState);
      return () => {};
    }),
    fetchSubstationEstaciones: vi.fn(),
    fetchSubstationActividades: vi.fn(),
    fetchSubstationEjecuciones: vi.fn(),
    fetchSubstationEjecucion: vi.fn(),
  },
}));

vi.mock('../../stores/ui.js', () => ({
  addNotification: vi.fn(),
}));

vi.mock('../../components/shared/DataGrid.svelte', async () => {
  const mod = await import('../__mocks__/DataGridStub.svelte');
  return { default: mod.default };
});

vi.mock('../../components/shared/SubestacionEjecucionDetalleModal.svelte', async () => {
  const mod = await import('../__mocks__/SubestacionEjecucionDetalleModalStub.svelte');
  return { default: mod.default };
});

import { data } from '../../stores/data.js';
import { addNotification } from '../../stores/ui.js';
import { ejecucionesFiltroInicial, disciplinaFiltro } from '../../stores/subestacionesFilters.js';

/** Ubica el <select>/<input> de un chip de filtro por su etiqueta visible. */
function chipControl(container, label) {
  const chip = [...container.querySelectorAll('.filter-chip')].find(
    (el) => el.querySelector('.chip-lab')?.textContent === label,
  );
  return chip.querySelector('select, input');
}

describe('SubestacionesEjecuciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disciplinaFiltro.set('');
    mockState = {
      substationEstaciones: [
        { id: 1, nombre: 'Duitama' },
        { id: 2, nombre: 'Holanda' },
      ],
      substationActividades: [{ id: 10, nombre: 'Pintura muros' }],
      substationEjecuciones: {
        data: [{ id: 100, estacionNombre: 'Duitama' }],
        totalPages: 1,
        totalElements: 1,
        currentPage: 0,
        pageSize: 20,
      },
      isLoading: false,
    };
  });

  // No hay test de "al montar, carga estaciones/actividades/ejecuciones":
  // @testing-library/svelte 5 sobre Svelte 4 no ejecuta los callbacks de
  // onMount durante `render()`, ni con un `tick()` después (comprobado con
  // un componente mínimo — mismo gotcha ya documentado en
  // FuelTrendChart.test.js para el ciclo de vida de gráficos). Todos los
  // tests de abajo alimentan `substationEstaciones`/`substationActividades`/
  // `substationEjecuciones` a través del store mockeado directamente, y
  // ejercitan `fetchSubstationEjecuciones` disparándolo con interacciones
  // reales (Filtrar, Limpiar, paginación) en vez de depender del montaje.

  it('arma el filtro correcto (estación + resultado) y resetea a la página 0 al filtrar', async () => {
    const { container } = render(SubestacionesEjecuciones);
    data.fetchSubstationEjecuciones.mockClear();

    await fireEvent.change(chipControl(container, 'Estación'), { target: { value: '2' } });
    await fireEvent.change(chipControl(container, 'Resultado'), { target: { value: 'CON_HALLAZGOS' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));

    expect(data.fetchSubstationEjecuciones).toHaveBeenCalledWith(0, 20, {
      ...filtrosDefault,
      estacionId: 2,
      resultado: ['CON_HALLAZGOS'],
    });
  });

  it('convierte "Origen" a booleano real, no a string', async () => {
    const { container } = render(SubestacionesEjecuciones);
    data.fetchSubstationEjecuciones.mockClear();

    await fireEvent.change(chipControl(container, 'Origen'), { target: { value: 'true' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));

    expect(data.fetchSubstationEjecuciones).toHaveBeenCalledWith(0, 20, { ...filtrosDefault, esProgramada: true });
  });

  it('tiene título y explicación, y la disciplina es la misma de las otras pestañas', async () => {
    mockState.substationActividades = [
      { id: 10, nombre: 'Pintura muros', disciplina: 'CIVIL' },
      { id: 20, nombre: 'Revisar tablero', disciplina: 'ELECTRICO' },
    ];
    disciplinaFiltro.set('CIVIL');
    const { container } = render(SubestacionesEjecuciones);
    expect(screen.getByRole('heading', { name: 'Ejecuciones y hallazgos' })).toBeTruthy();
    expect(screen.getByText(/Civil · todo lo que se registró/)).toBeTruthy();
    // Solo las actividades de la disciplina elegida
    const opciones = [...chipControl(container, 'Actividad').options].map((o) => o.textContent);
    expect(opciones).toEqual(['Todas', 'Civil · Pintura muros']);

    data.fetchSubstationEjecuciones.mockClear();
    await fireEvent.change(screen.getByLabelText('Disciplina'), { target: { value: 'ELECTRICO' } });
    expect(data.fetchSubstationEjecuciones).toHaveBeenCalledWith(0, 20, { ...filtrosDefault, disciplina: 'ELECTRICO' });
  });

  it('el botón Limpiar vacía todos los filtros y vuelve a consultar', async () => {
    const { container } = render(SubestacionesEjecuciones);
    await fireEvent.change(chipControl(container, 'Estación'), { target: { value: '2' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
    data.fetchSubstationEjecuciones.mockClear();

    await fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));

    expect(data.fetchSubstationEjecuciones).toHaveBeenCalledWith(0, 20, filtrosDefault);
    expect(chipControl(container, 'Estación').value).toBe('');
  });

  it('el preset "Solo hallazgos" filtra por CON_HALLAZGOS+REQUIERE_INTERVENCION y se puede desactivar', async () => {
    render(SubestacionesEjecuciones);
    data.fetchSubstationEjecuciones.mockClear();

    const preset = screen.getByRole('button', { name: /Solo hallazgos/ });
    await fireEvent.click(preset);
    expect(data.fetchSubstationEjecuciones).toHaveBeenCalledWith(0, 20, {
      ...filtrosDefault,
      resultado: ['CON_HALLAZGOS', 'REQUIERE_INTERVENCION'],
    });
    expect(preset.className).toContain('chip-preset--activo');

    await fireEvent.click(preset);
    expect(data.fetchSubstationEjecuciones).toHaveBeenLastCalledWith(0, 20, filtrosDefault);
    expect(preset.className).not.toContain('chip-preset--activo');
  });

  it('el preset "Solo imprevistos" filtra Origen = Imprevisto, se sincroniza con el select y combina con hallazgos', async () => {
    const { container } = render(SubestacionesEjecuciones);
    data.fetchSubstationEjecuciones.mockClear();

    const preset = screen.getByRole('button', { name: /Solo imprevistos/ });
    await fireEvent.click(preset);
    expect(data.fetchSubstationEjecuciones).toHaveBeenCalledWith(0, 20, { ...filtrosDefault, esProgramada: false });
    expect(preset.className).toContain('chip-preset--activo');
    expect(chipControl(container, 'Origen').value).toBe('false');

    // Se combina con "Solo hallazgos": imprevistos que dejaron hallazgos
    await fireEvent.click(screen.getByRole('button', { name: /Solo hallazgos/ }));
    expect(data.fetchSubstationEjecuciones).toHaveBeenLastCalledWith(0, 20, {
      ...filtrosDefault, esProgramada: false, resultado: ['CON_HALLAZGOS', 'REQUIERE_INTERVENCION'],
    });

    await fireEvent.click(preset);
    expect(preset.className).not.toContain('chip-preset--activo');
    expect(chipControl(container, 'Origen').value).toBe('');
  });

  it('los tipos de mantenimiento y de actividad ya no ofrecen "No programado" (eso lo dice Origen)', async () => {
    const { container } = render(SubestacionesEjecuciones);
    const opciones = (label) => [...chipControl(container, label).options].map((o) => o.textContent);
    expect(opciones('Tipo de mantenimiento')).toEqual(['Todos', 'Preventivo', 'Correctivo', 'Predictivo']);
    expect(opciones('Tipo de actividad')).toEqual(['Todos', 'Inspección', 'Mantenimiento']);
    expect(opciones('Origen')).toEqual(['Todos', 'Cronograma', 'Imprevisto']);
  });

  it('cambiar de página reconsulta manteniendo el filtro activo', async () => {
    const { container, getByTestId } = render(SubestacionesEjecuciones);
    await fireEvent.change(chipControl(container, 'Estación'), { target: { value: '2' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
    data.fetchSubstationEjecuciones.mockClear();

    await fireEvent.click(getByTestId('stub-page-change'));

    expect(data.fetchSubstationEjecuciones).toHaveBeenCalledWith(1, 20, { ...filtrosDefault, estacionId: 2 });
  });

  it('ordenar por una columna reconsulta en el servidor desde la página 0, con el filtro activo', async () => {
    const { container, getByTestId } = render(SubestacionesEjecuciones);
    expect(getByTestId('stub-sorting').textContent).toBe('[{"id":"ej_fecha","desc":true}]');
    await fireEvent.change(chipControl(container, 'Estación'), { target: { value: '2' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
    data.fetchSubstationEjecuciones.mockClear();

    await fireEvent.click(getByTestId('stub-sort-estacion'));

    expect(data.fetchSubstationEjecuciones).toHaveBeenCalledWith(0, 20, {
      ...filtrosDefault, estacionId: 2, sort: ['estacion.nombre,asc'],
    });
    expect(getByTestId('stub-sorting').textContent).toBe('[{"id":"ej_estacion","desc":false}]');
  });

  it('cambiar el tamaño de página vuelve a la página 0 con el nuevo tamaño', async () => {
    const { getByTestId } = render(SubestacionesEjecuciones);
    data.fetchSubstationEjecuciones.mockClear();

    await fireEvent.click(getByTestId('stub-size-change'));

    expect(data.fetchSubstationEjecuciones).toHaveBeenCalledWith(0, 50, filtrosDefault);
  });

  it('abre el modal de detalle con la ejecución cargada al pedir "ver detalle"', async () => {
    data.fetchSubstationEjecucion.mockResolvedValue({ id: 100, estacionNombre: 'Duitama' });
    const { getByTestId } = render(SubestacionesEjecuciones);

    await fireEvent.click(getByTestId('ver-detalle-100'));

    expect(data.fetchSubstationEjecucion).toHaveBeenCalledWith(100);
    await waitFor(() => expect(getByTestId('detalle-id').textContent).toBe('100'));
  });

  it('si falla la carga del detalle, notifica el error y no deja el modal abierto', async () => {
    data.fetchSubstationEjecucion.mockRejectedValue(new Error('Ejecución no encontrada'));
    const { getByTestId, queryByTestId } = render(SubestacionesEjecuciones);

    await fireEvent.click(getByTestId('ver-detalle-100'));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ text: 'Ejecución no encontrada' })));
    expect(queryByTestId('detalle-modal-stub')).toBeNull();
  });

  it('cerrar el modal de detalle lo desmonta', async () => {
    data.fetchSubstationEjecucion.mockResolvedValue({ id: 100, estacionNombre: 'Duitama' });
    const { getByTestId, queryByTestId } = render(SubestacionesEjecuciones);

    await fireEvent.click(getByTestId('ver-detalle-100'));
    await waitFor(() => expect(getByTestId('detalle-id')).toBeTruthy());

    await fireEvent.click(getByTestId('detalle-cerrar'));
    expect(queryByTestId('detalle-modal-stub')).toBeNull();
  });

  it('muestra el mensaje de "sin resultados" cuando la página viene vacía', () => {
    mockState.substationEjecuciones = { data: [], totalPages: 0, totalElements: 0, currentPage: 0, pageSize: 20 };
    render(SubestacionesEjecuciones);
    expect(screen.getByText('Sin ejecuciones para los filtros seleccionados.')).toBeTruthy();
  });

  it('llegando desde "Fuera de cronograma" del Detalle por estación filtra solo las no programadas del año', async () => {
    ejecucionesFiltroInicial.set({ estacionId: 1, esProgramada: false, fechaInicio: '2026-01-01', fechaFin: '2026-12-31' });
    const { container } = render(SubestacionesEjecuciones);
    expect(chipControl(container, 'Origen').value).toBe('false');

    await fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(data.fetchSubstationEjecuciones).toHaveBeenCalledWith(0, 20, {
      ...filtrosDefault, estacionId: 1, esProgramada: false, fechaInicio: '2026-01-01', fechaFin: '2026-12-31',
    });
  });
});
