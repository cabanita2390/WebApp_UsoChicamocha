import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('../../stores/ui.js', () => ({
  ui: { openImageModal: vi.fn(), setImageModalLoading: vi.fn(), setImageModalUrls: vi.fn() },
  addNotification: vi.fn(),
}));

vi.mock('../../stores/substationAdmin.js', () => ({
  substationAdmin: {
    indicadoresPorEstacion: vi.fn(),
    listarEstaciones: vi.fn(),
    listarActividades: vi.fn(),
    criticidad: vi.fn(),
    ultimasEjecuciones: vi.fn(),
    noProgramadasDeEstacion: vi.fn(),
    obtenerCronograma: vi.fn(),
    obtenerEjecucion: vi.fn(),
  },
}));

import DashboardEstaciones from '../../components/views/subestaciones/dashboard/DashboardEstaciones.svelte';
import { substationAdmin } from '../../stores/substationAdmin.js';
import { detalleActividadId, detalleEstacionId, ejecucionesFiltroInicial, subestacionesActiveTab, disciplinaFiltro } from '../../stores/subestacionesFilters.js';
import { ejecucionCambio } from '../../stores/subestacionesEventos.js';

const ind = (id, nombre, extra = {}) => ({
  estacionId: id, estacionNombre: nombre, estacionTipo: 'BOMBEO', programado: 4, cumple: 3, noCumple: 1,
  porcentajeCumplimiento: 75.0, anio: 2026, vencidas: 4, ejecutadasVencidas: 3, conHallazgos: 2, hallazgosAbiertos: 1,
  ejecutadoProgramado: 3, ejecutadoNoProgramado: 0, ejecutadoMantenimiento: 3, ejecutadoInspeccion: 0, ejecutadoTotal: 3,
  mes: 9, programadoMes: 2, cumpleMes: 0, ejecutadoTotalMes: 0, ejecutadoNoProgramadoMes: 0, porcentajeMesTranscurrido: 50.0,
  ...extra,
});
const cita = (id, actividadId, mes, extra = {}) => ({
  id, estacionId: 1, actividadId, mes, disciplina: 'CIVIL', estado: 'PUBLICADA', pendienteRetiro: false,
  tieneEjecucion: false, fechaEjecucion: null, ...extra,
});

describe('DashboardEstaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detalleEstacionId.set(null);
    ejecucionesFiltroInicial.set(null);
    disciplinaFiltro.set('');
    subestacionesActiveTab.set('dashboard');
    substationAdmin.indicadoresPorEstacion.mockResolvedValue([
      ind(1, 'Ayalas'),
      ind(2, 'CLAN', { estacionTipo: 'COMPLEMENTARIA', porcentajeCumplimiento: null, vencidas: 0, ejecutadasVencidas: 0, hallazgosAbiertos: 0 }),
    ]);
    substationAdmin.listarEstaciones.mockResolvedValue([
      { id: 1, nombre: 'Ayalas', tipo: 'BOMBEO', frecuenciaBase: 'TRIMESTRAL', activa: true },
    ]);
    substationAdmin.listarActividades.mockResolvedValue([
      { id: 10, nombre: 'Pintura puertas/ventanas', nombreCorto: 'Pintura puertas', disciplina: 'CIVIL', activa: true },
      { id: 11, nombre: 'Pintura muros', nombreCorto: 'Muros', disciplina: 'CIVIL', activa: true },
    ]);
    substationAdmin.criticidad.mockResolvedValue([
      { actividadId: 11, actividadNombre: 'Pintura muros', nombreCorto: 'Muros', intervenciones: 4 },
      { actividadId: 10, actividadNombre: 'Pintura puertas/ventanas', nombreCorto: 'Pintura puertas', intervenciones: 1 },
    ]);
    substationAdmin.ultimasEjecuciones.mockResolvedValue({ content: [
      { id: 900, fecha: '2026-08-12', actividadNombre: 'Pintura muros', tipoMantenimiento: 'PREVENTIVO',
        resultado: 'CON_HALLAZGOS', seguimiento: { estado: 'ABIERTO' }, responsable: 'J. Pérez' },
    ] });
    substationAdmin.noProgramadasDeEstacion.mockResolvedValue({ content: [
      { id: 950, fecha: '2026-10-02', actividadNombre: null, descripcionLibre: 'Limpieza de canal', disciplina: 'CIVIL',
        tipoMantenimiento: 'CORRECTIVO', resultado: 'CONFORME', esProgramada: false, responsable: 'L. Rojas' },
      { id: 951, fecha: '2026-09-20', actividadNombre: 'Cambio de breaker', disciplina: 'ELECTRICO',
        tipoMantenimiento: 'CORRECTIVO', resultado: 'CONFORME', esProgramada: false, responsable: 'A. Gómez' },
    ] });
    substationAdmin.obtenerCronograma.mockResolvedValue({
      anio: 2026, anioActual: 2026, mesActual: 9, borrador: { altas: 0, bajas: 0 }, ultimaPublicacion: null, puedeDeshacer: false,
      citas: [
        cita(1, 10, 2, { tieneEjecucion: true, fechaEjecucion: '2026-02-10' }),
        cita(2, 11, 3),
        cita(3, 10, 9),
        cita(4, 11, 11),
        cita(5, 10, 12, { estado: 'BORRADOR' }), // no publicada: no aparece
        { ...cita(6, 10, 5), estacionId: 2 },     // otra estación
      ],
    });
  });

  it('una estación desactivada que tuvo citas en el año sale marcada como Inactiva', async () => {
    substationAdmin.indicadoresPorEstacion.mockResolvedValue([
      ind(1, 'Ayalas', { activa: true }),
      ind(3, 'Monquira', { activa: false }),
    ]);
    render(DashboardEstaciones);

    expect(await screen.findByText('Monquira')).toBeTruthy();
    expect(screen.getAllByText('Inactiva')).toHaveLength(1);
  });

  it('vista Año: avance "x de y" con barra neutra (sin semáforo), atrasadas e imprevistos; fila Total', async () => {
    substationAdmin.indicadoresPorEstacion.mockResolvedValue([
      ind(1, 'Ayalas', { ejecutadoNoProgramado: 1, ejecutadoTotal: 4 }),
      ind(2, 'CLAN', { estacionTipo: 'COMPLEMENTARIA', programado: 0, cumple: 0, vencidas: 0, ejecutadasVencidas: 0 }),
    ]);
    const { container } = render(DashboardEstaciones);
    expect(await screen.findByText('Avance 2026')).toBeTruthy();
    expect(screen.getByText('Complementaria')).toBeTruthy();

    const [ayalas, clan] = container.querySelectorAll('.sub-tr.clickable');
    expect(ayalas.children[2].textContent.replace(/\s+/g, ' ').trim()).toBe('3 de 4 75%');
    expect(ayalas.querySelector('.sub-badge')).toBeNull(); // el año no lleva semáforo
    expect(ayalas.children[3].textContent.trim()).toBe('1'); // atrasada: 4 vencidas, 3 ejecutadas
    expect(ayalas.children[4].textContent.trim()).toBe('1 · 25% del total');
    expect(clan.children[2].textContent).toContain('Sin citas');
    expect(clan.children[4].textContent.trim()).toBe('—');

    const total = container.querySelector('.sub-tr.total');
    expect(total.children[0].textContent).toBe('Total · 2 estaciones');
    expect(total.children[2].textContent.replace(/\s+/g, ' ').trim()).toBe('3 de 4 75%');
  });

  it('vista Mes en curso: "x de y" del mes con semáforo contra el tiempo transcurrido e imprevistos del mes', async () => {
    substationAdmin.indicadoresPorEstacion.mockResolvedValue([
      ind(1, 'Ayalas', { programadoMes: 4, cumpleMes: 2, ejecutadoTotalMes: 3, ejecutadoNoProgramadoMes: 1 }), // 50% con 50% del mes
      ind(2, 'CLAN', { programadoMes: 10, cumpleMes: 1 }),                                                     // 10% con 50% del mes
      ind(3, 'Monquira', { programadoMes: 0, cumpleMes: 0 }),
    ]);
    const { container } = render(DashboardEstaciones);
    await fireEvent.click(await screen.findByText('Mes en curso'));

    expect(screen.getByText('Avance de Septiembre 2026')).toBeTruthy();
    expect(screen.getByText(/va el 50% del mes/)).toBeTruthy();
    const [ayalas, clan, monquira] = container.querySelectorAll('.sub-tr.clickable');
    expect(ayalas.querySelector('.sub-badge').textContent).toBe('▲ 50% · Al día');
    expect(ayalas.children[3].textContent.trim()).toBe('1 · 33% del total');
    expect(clan.querySelector('.sub-badge').textContent).toBe('▼ 10% · Atrasado');
    expect(monquira.children[2].textContent).toContain('Sin citas este mes');
  });

  it('otro año sin mes en curso: no ofrece la vista del mes', async () => {
    substationAdmin.indicadoresPorEstacion.mockResolvedValue([ind(1, 'Ayalas', { mes: null, porcentajeMesTranscurrido: null })]);
    render(DashboardEstaciones);
    expect(await screen.findByText('Ayalas')).toBeTruthy();
    expect(screen.queryByText('Mes en curso')).toBeNull();
  });

  it('llega una ejecución por WebSocket: recarga el dashboard sin que el usuario refresque', async () => {
    vi.useFakeTimers();
    try {
      render(DashboardEstaciones);
      await vi.waitFor(() => expect(screen.getByText('Ayalas')).toBeTruthy());
      expect(substationAdmin.indicadoresPorEstacion).toHaveBeenCalledTimes(1);

      ejecucionCambio.set({ estacionId: 1, ejecucionId: 5, tipo: 'REGISTRADA', recibido: 1 });
      ejecucionCambio.set({ estacionId: 2, ejecucionId: 6, tipo: 'REGISTRADA', recibido: 2 }); // ráfaga: una sola recarga
      await vi.advanceTimersByTimeAsync(1000);
      expect(substationAdmin.indicadoresPorEstacion).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('click en la fila abre el detalle en la misma pestaña y "Volver" regresa a la tabla', async () => {
    render(DashboardEstaciones);
    await fireEvent.click(await screen.findByText('Ayalas'));

    expect(get(detalleEstacionId)).toBe(1);
    expect(await screen.findByText('← Volver al Dashboard')).toBeTruthy();
    await fireEvent.click(screen.getByText('← Volver al Dashboard'));
    expect(get(detalleEstacionId)).toBeNull();
    expect(await screen.findByText('Avance del año')).toBeTruthy();
  });

  it('detalle: cabecera, KPIs, tira de 12 meses solo con lo publicado, cita por cita, críticas y recientes', async () => {
    detalleEstacionId.set(1);
    const { container } = render(DashboardEstaciones);

    expect(await screen.findByText(/Bombeo · Frecuencia base Trimestral ·\s+Todas las disciplinas/)).toBeTruthy();
    expect(screen.getByText('Avance 2026')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByText('3 de 4 citas')).toBeTruthy();
    expect(screen.getByText('3 de 4')).toBeTruthy();
    expect(screen.getByText('1 atrasada de meses cerrados')).toBeTruthy();
    // Mes en curso con semáforo: 0 de 2 con la mitad del mes ya pasada
    expect(screen.getByText('Septiembre (mes en curso)')).toBeTruthy();
    expect(screen.getByText('0 de 2')).toBeTruthy();
    expect(screen.getByText('▼ 0% · Atrasado')).toBeTruthy();
    expect(screen.getByText('requieren seguimiento')).toBeTruthy();

    // Cita por cita: 4 publicadas (sin la del borrador ni la de otra estación)
    expect(screen.getByText('✓ Cumple')).toBeTruthy();
    expect(screen.getByText('✕ No cumple')).toBeTruthy();
    expect(screen.getByText('◐ En curso')).toBeTruthy();
    expect(screen.getByText('○ Programada')).toBeTruthy();

    // Actividades más críticas, de más a menos
    expect([...container.querySelectorAll('.crit-top strong')].map((n) => n.textContent)).toEqual(['4', '1']);
    // Actividad reciente
    expect(screen.getByText('12/08/2026')).toBeTruthy();
    expect(screen.getByText('! Con hallazgos')).toBeTruthy();
    expect(screen.getByText('● Abierto')).toBeTruthy();
    expect(screen.getByText('J. Pérez')).toBeTruthy();
  });

  it('click en un chip de la tira abre Ejecuciones filtrada por estación y mes', async () => {
    detalleEstacionId.set(1);
    const { container } = render(DashboardEstaciones);
    await screen.findByText('Avance 2026');

    await fireEvent.click(container.querySelectorAll('.tira .chip')[0]);

    expect(get(ejecucionesFiltroInicial)).toEqual({ estacionId: 1, fechaInicio: '2026-02-01', fechaFin: '2026-02-28' });
    expect(get(subestacionesActiveTab)).toBe('ejecuciones');
  });

  it('"Ver todas en Ejecuciones" filtra solo por estación', async () => {
    detalleEstacionId.set(1);
    render(DashboardEstaciones);
    await fireEvent.click(await screen.findByText('Ver todas en Ejecuciones →'));

    expect(get(ejecucionesFiltroInicial)).toEqual({ estacionId: 1 });
  });

  it('click en una ejecución reciente abre el modal de detalle', async () => {
    substationAdmin.obtenerEjecucion.mockResolvedValue({ id: 900, resultado: 'CON_HALLAZGOS', evidencias: [], ediciones: [] });
    detalleEstacionId.set(1);
    render(DashboardEstaciones);
    await fireEvent.click(await screen.findByText('J. Pérez'));

    await waitFor(() => expect(substationAdmin.obtenerEjecucion).toHaveBeenCalledWith(900));
  });

  it('si falla la carga muestra el error con "Reintentar"', async () => {
    substationAdmin.indicadoresPorEstacion.mockRejectedValueOnce(new Error('Sin conexión'));
    render(DashboardEstaciones);

    expect(await screen.findByText('No se pudo cargar el dashboard')).toBeTruthy();
    await fireEvent.click(screen.getByText('Reintentar'));
    expect(await screen.findByText('Ayalas')).toBeTruthy();
  });

  it('detalle: al cambiar de año dos veces seguidas solo se aplica la última respuesta', async () => {
    detalleEstacionId.set(1);
    render(DashboardEstaciones);
    expect(await screen.findByText('Avance 2026')).toBeTruthy();

    let responder2025;
    const actual = substationAdmin.indicadoresPorEstacion.getMockImplementation();
    substationAdmin.indicadoresPorEstacion.mockImplementation((anio) =>
      anio === 2025 ? new Promise((r) => { responder2025 = r; }) : actual(anio));
    const select = screen.getByLabelText('Año');
    await fireEvent.change(select, { target: { value: '2025' } });
    await fireEvent.change(select, { target: { value: '2026' } });
    await waitFor(() => expect(substationAdmin.indicadoresPorEstacion).toHaveBeenLastCalledWith(2026, ''));

    // La respuesta lenta de 2025 llega al final: no debe pisar la de 2026.
    responder2025([ind(1, 'Ayalas', { anio: 2025, cumple: 1, programado: 10 })]);
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText('Avance 2026')).toBeTruthy();
    expect(screen.queryByText('10%')).toBeNull();
  });


  it('detalle: una cita ejecutada en un mes abierto se ve cumplida, sin aviso de que no suma', async () => {
    detalleEstacionId.set(1);
    const cron = await substationAdmin.obtenerCronograma();
    substationAdmin.obtenerCronograma.mockResolvedValue({
      ...cron,
      citas: cron.citas.map((c) => (c.id === 3 ? { ...c, tieneEjecucion: true, fechaEjecucion: '2026-09-02' } : c)),
    });
    render(DashboardEstaciones);
    await screen.findByText('Cumplimiento cita por cita');
    // Sep (mes en curso) ejecutada: suma al % de una vez, igual que el backend.
    expect(screen.queryByText('aún no suma al %')).toBeNull();
    expect(screen.getAllByText('✓ Cumple').length).toBeGreaterThan(0);
  });

  it('detalle: click en una actividad abre su detalle en Resumen por actividad', async () => {
    detalleEstacionId.set(1);
    detalleActividadId.set(null);
    render(DashboardEstaciones);
    await screen.findByText('Cumplimiento cita por cita');
    await fireEvent.click(screen.getAllByTitle('Ver la actividad en Resumen por actividad')[0]);
    expect(get(detalleActividadId)).toBe(10);
    expect(get(subestacionesActiveTab)).toBe('resumenActividad');
  });

  it('muestra todas las disciplinas por defecto y el selector filtra el dashboard', async () => {
    render(DashboardEstaciones);
    expect(await screen.findByText(/Todas las disciplinas · citas ejecutadas/)).toBeTruthy();
    expect(substationAdmin.indicadoresPorEstacion).toHaveBeenLastCalledWith(undefined, '');

    await fireEvent.change(screen.getByLabelText('Disciplina'), { target: { value: 'ELECTRICO' } });
    await waitFor(() => expect(substationAdmin.indicadoresPorEstacion).toHaveBeenLastCalledWith(undefined, 'ELECTRICO'));
    expect(await screen.findByText(/Eléctrico · citas ejecutadas/)).toBeTruthy();
    expect(get(disciplinaFiltro)).toBe('ELECTRICO');
  });

  it('detalle con una disciplina elegida: indicadores, criticidad y meses solo de esa disciplina', async () => {
    disciplinaFiltro.set('ELECTRICO');
    detalleEstacionId.set(1);
    render(DashboardEstaciones);
    await screen.findByText('Cumplimiento cita por cita');
    expect(substationAdmin.indicadoresPorEstacion).toHaveBeenCalledWith(null, 'ELECTRICO');
    expect(substationAdmin.criticidad).toHaveBeenCalledWith(1, 'ELECTRICO');
    // Las citas del fixture son todas civiles: con Eléctrico no queda ninguna.
    expect(screen.getByText('Sin citas publicadas en 2026.')).toBeTruthy();
  });

  it('detalle: KPI "Imprevistos", chips en la tira y lista; el enlace abre Ejecuciones filtrado a no programadas del año', async () => {
    detalleEstacionId.set(1);
    substationAdmin.indicadoresPorEstacion.mockResolvedValue([
      ind(1, 'Ayalas', { ejecutadoNoProgramado: 2, ejecutadoTotal: 5, ejecutadoNoProgramadoMes: 1 }),
    ]);
    const { container } = render(DashboardEstaciones);
    expect(await screen.findByText('Imprevistos')).toBeTruthy();
    expect(screen.getByText('40% de 5 registros · 1 este mes')).toBeTruthy();
    // Lista y tira (octubre y septiembre, por la fecha del registro)
    expect(screen.getAllByText('Limpieza de canal')).toHaveLength(2);
    expect(screen.getAllByText('Cambio de breaker')).toHaveLength(2);
    const meses = [...container.querySelectorAll('.tira .mes-col')];
    expect(meses[9].textContent).toContain('Limpieza de canal');
    expect(meses[8].textContent).toContain('Cambio de breaker');
    expect(substationAdmin.noProgramadasDeEstacion).toHaveBeenCalledWith(1, 2026);

    await fireEvent.click(screen.getByText('Ver en Ejecuciones →'));
    expect(get(ejecucionesFiltroInicial)).toEqual({
      estacionId: 1, esProgramada: false, fechaInicio: '2026-01-01', fechaFin: '2026-12-31',
    });
    expect(get(subestacionesActiveTab)).toBe('ejecuciones');
  });

  it('detalle: con una disciplina elegida, "Fuera de cronograma" solo lista los de esa disciplina', async () => {
    detalleEstacionId.set(1);
    disciplinaFiltro.set('CIVIL');
    render(DashboardEstaciones);
    expect((await screen.findAllByText('Limpieza de canal')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Cambio de breaker')).toBeNull();
  });
});
