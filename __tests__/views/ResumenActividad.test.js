import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('../../stores/ui.js', () => ({
  ui: { openImageModal: vi.fn(), setImageModalLoading: vi.fn(), setImageModalUrls: vi.fn() },
  addNotification: vi.fn(),
}));

vi.mock('../../stores/substationAdmin.js', () => ({
  substationAdmin: {
    resumenPorActividad: vi.fn(),
    listarActividades: vi.fn(),
    listarEstaciones: vi.fn(),
    obtenerCronograma: vi.fn(),
    ejecucionesDeActividad: vi.fn(),
    obtenerEjecucion: vi.fn(),
  },
}));

import ResumenActividad from '../../components/views/subestaciones/resumen/ResumenActividad.svelte';
import { substationAdmin } from '../../stores/substationAdmin.js';
import { detalleActividadId, detalleEstacionId, ejecucionesFiltroInicial, subestacionesActiveTab } from '../../stores/subestacionesFilters.js';

const fila = (id, nombre, extra = {}) => ({
  actividadId: id, actividadNombre: nombre, disciplina: 'CIVIL', programadoAnual: 8, ejecutadoAnual: 5,
  ejecutadoNoProgramado: 1, mantenimiento: 4, inspeccion: 2, ejecutadoTotal: 6, anio: 2026,
  vencidas: 6, ejecutadasVencidas: 3, porcentajeCumplimiento: 50.0, ...extra,
});
const cita = (id, estacionId, actividadId, mes, extra = {}) => ({
  id, estacionId, actividadId, mes, disciplina: 'CIVIL', estado: 'PUBLICADA', pendienteRetiro: false,
  tieneEjecucion: false, fechaEjecucion: null, ...extra,
});

describe('ResumenActividad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detalleActividadId.set(null);
    ejecucionesFiltroInicial.set(null);
    subestacionesActiveTab.set('resumenActividad');
    substationAdmin.resumenPorActividad.mockResolvedValue([
      fila(10, 'Pintura muros'),
      fila(11, 'Aseo de canales', { programadoAnual: 4, vencidas: 2, ejecutadasVencidas: 2, porcentajeCumplimiento: 100.0,
        ejecutadoTotal: 2, ejecutadoNoProgramado: 0 }),
      fila(12, 'Inspección presa', { programadoAnual: 0, vencidas: 0, ejecutadasVencidas: 0, porcentajeCumplimiento: null,
        ejecutadoTotal: 0, ejecutadoNoProgramado: 0 }),
    ]);
    substationAdmin.listarActividades.mockResolvedValue([
      { id: 10, nombre: 'Pintura muros', nombreCorto: 'Muros', disciplina: 'CIVIL', capturaMovilHabilitada: true, activa: true },
    ]);
    substationAdmin.listarEstaciones.mockResolvedValue([
      { id: 1, nombre: 'Ayalas', activa: true },
      { id: 2, nombre: 'CLAN', activa: true },
    ]);
    substationAdmin.obtenerCronograma.mockResolvedValue({
      anio: 2026, anioActual: 2026, mesActual: 9, borrador: { altas: 0, bajas: 0 }, citas: [
        cita(1, 1, 10, 2, { tieneEjecucion: true, fechaEjecucion: '2026-02-10' }),
        cita(2, 1, 10, 5),
        cita(3, 2, 10, 9),
        cita(4, 2, 10, 11, { estado: 'BORRADOR' }), // no publicada: no aparece
        cita(6, 2, 10, 12, { tieneEjecucion: true, fechaEjecucion: '2026-09-02' }), // futura ejecutada antes
        cita(5, 1, 11, 3),                          // otra actividad
      ],
    });
    substationAdmin.ejecucionesDeActividad.mockResolvedValue({
      totalElements: 21,
      content: [
        { id: 900, fecha: '2026-02-10', estacionNombre: 'Ayalas', tipoMantenimiento: 'PREVENTIVO', esProgramada: true,
          resultado: 'CON_HALLAZGOS', seguimiento: { estado: 'ABIERTO' }, evidencias: [{}, {}], responsable: 'J. Pérez' },
      ],
    });
  });

  it('tabla: una fila por actividad con programadas, ejecutadas de vencidas, registros y % con símbolo', async () => {
    render(ResumenActividad);
    expect(await screen.findByText('Pintura muros')).toBeTruthy();
    expect(screen.getByText('■ 50%')).toBeTruthy();
    expect(screen.getByText('▲ 100%')).toBeTruthy();
    // Sin citas vencidas: "—" en vez de un 0% engañoso.
    expect(screen.getAllByTitle('Sin citas vencidas')).toHaveLength(1);
    expect(screen.getByText('Total · 3 actividades')).toBeTruthy();
    expect(screen.getByText(/lo ejecutado en 2026/)).toBeTruthy();
  });

  it('buscar filtra filas y totales; "Menor cumplimiento" ordena con las "—" al final', async () => {
    const { container } = render(ResumenActividad);
    await screen.findByText('Pintura muros');

    await fireEvent.click(screen.getByText('Menor cumplimiento'));
    const nombres = [...container.querySelectorAll('.sub-tr.clickable .nombre')].map((n) => n.textContent);
    expect(nombres).toEqual(['Pintura muros', 'Aseo de canales', 'Inspección presa']);

    await fireEvent.input(screen.getByLabelText('Buscar actividad'), { target: { value: 'aseo' } });
    expect(screen.queryByText('Pintura muros')).toBeNull();
    expect(screen.getByText('Total · 1 actividad')).toBeTruthy();

    await fireEvent.input(screen.getByLabelText('Buscar actividad'), { target: { value: 'zzz' } });
    expect(screen.getByText('Ninguna actividad coincide con "zzz".')).toBeTruthy();
  });

  it('cambiar el año recarga el resumen de ese año', async () => {
    render(ResumenActividad);
    await screen.findByText('Pintura muros');
    await fireEvent.change(screen.getByLabelText('Año'), { target: { value: '2025' } });
    await waitFor(() => expect(substationAdmin.resumenPorActividad).toHaveBeenLastCalledWith(2025));
  });

  it('click en una actividad abre sus registros en la misma pestaña y "Volver" regresa', async () => {
    render(ResumenActividad);
    await fireEvent.click(await screen.findByText('Pintura muros'));
    expect(get(detalleActividadId)).toBe(10);

    expect(await screen.findByText('← Volver al Resumen')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Pintura muros' })).toBeTruthy();
    expect(substationAdmin.ejecucionesDeActividad).toHaveBeenCalledWith(10, 2026, 0, 20);

    await fireEvent.click(screen.getByText('← Volver al Resumen'));
    expect(get(detalleActividadId)).toBeNull();
    expect(await screen.findByText('Total · 3 actividades')).toBeTruthy();
  });

  it('detalle: KPIs, estaciones con sus meses (solo lo publicado) y registros del año', async () => {
    detalleActividadId.set(10);
    const { container } = render(ResumenActividad);
    expect(await screen.findByText('Registros del año')).toBeTruthy();
    expect(screen.getByText('4 mantenimiento · 2 inspección')).toBeTruthy();

    const estaciones = [...container.querySelectorAll('.est:not(.est-h) .est-n')].map((n) => n.textContent);
    expect(estaciones).toEqual(['Ayalas', 'CLAN']);
    expect(screen.getByTitle('Febrero · Ejecutada 10/02/2026')).toBeTruthy();
    expect(screen.getByTitle('Mayo · No ejecutada')).toBeTruthy();
    expect(screen.getByTitle('Septiembre · En curso')).toBeTruthy();
    expect(screen.queryByTitle(/Noviembre/)).toBeNull(); // la cita en borrador no se muestra
    // Ejecutadas por estación: solo meses cerrados, como el % del backend (la de diciembre
    // se ve ✓ pero todavía no cuenta).
    expect(screen.getByTitle('Diciembre · Ejecutada 02/09/2026 · aún no suma al %')).toBeTruthy();
    const ejec = [...container.querySelectorAll('.est:not(.est-h) .der')].map((n) => n.textContent.trim());
    expect(ejec).toEqual(['1 de 2', '0 de 0']);

    expect(screen.getByText('21 registros')).toBeTruthy();
    expect(screen.getByText('! Con hallazgos')).toBeTruthy();
    expect(screen.getByText('2 foto(s)')).toBeTruthy();
  });

  it('detalle: "Cargar más" trae la página siguiente y la agrega', async () => {
    detalleActividadId.set(10);
    render(ResumenActividad);
    await screen.findByText('Cargar más (1 de 21)');
    // La página 2 repite el 900 (se registró otra ejecución entre medio): no se duplica.
    substationAdmin.ejecucionesDeActividad.mockResolvedValueOnce({ totalElements: 22, content: [
      { id: 900, fecha: '2026-02-10', estacionNombre: 'Ayalas', resultado: 'CONFORME', evidencias: [] },
      { id: 901, fecha: '2026-01-20', estacionNombre: 'CLAN', resultado: 'CONFORME', evidencias: [] },
    ] });
    await fireEvent.click(screen.getByText('Cargar más (1 de 21)'));
    await waitFor(() => expect(substationAdmin.ejecucionesDeActividad).toHaveBeenLastCalledWith(10, 2026, 1, 20));
    expect(await screen.findByText('Cargar más (2 de 22)')).toBeTruthy();
  });

  it('detalle: click en un registro abre el modal con el detalle y las fotos', async () => {
    detalleActividadId.set(10);
    substationAdmin.obtenerEjecucion.mockResolvedValue({ id: 900, fecha: '2026-02-10', evidencias: [] });
    render(ResumenActividad);
    await fireEvent.click(await screen.findByText('J. Pérez'));
    await waitFor(() => expect(substationAdmin.obtenerEjecucion).toHaveBeenCalledWith(900));
  });

  it('detalle: "Ver en Ejecuciones y Hallazgos" filtra por la actividad y el año', async () => {
    detalleActividadId.set(10);
    render(ResumenActividad);
    await fireEvent.click(await screen.findByText('Ver en Ejecuciones y Hallazgos →'));
    expect(get(ejecucionesFiltroInicial)).toEqual({ actividadId: 10, fechaInicio: '2026-01-01', fechaFin: '2026-12-31' });
    expect(get(subestacionesActiveTab)).toBe('ejecuciones');
  });

  it('detalle: click en una estación abre su Detalle por estación en el Dashboard', async () => {
    detalleActividadId.set(10);
    detalleEstacionId.set(null);
    render(ResumenActividad);
    await fireEvent.click(await screen.findByTitle('Ver el detalle de CLAN'));
    expect(get(detalleEstacionId)).toBe(2);
    expect(get(subestacionesActiveTab)).toBe('dashboard');
  });

  it('si falla la carga muestra el error con "Reintentar"', async () => {
    substationAdmin.resumenPorActividad.mockRejectedValueOnce(new Error('Sin conexión'));
    render(ResumenActividad);
    expect(await screen.findByText(/Sin conexión/)).toBeTruthy();
    await fireEvent.click(screen.getByText('Reintentar'));
    expect(await screen.findByText('Pintura muros')).toBeTruthy();
  });
});
