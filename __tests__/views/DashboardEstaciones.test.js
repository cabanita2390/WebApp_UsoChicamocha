import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
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
    ejecucionDeCita: vi.fn(),
  },
}));

import DashboardEstaciones from '../../components/views/subestaciones/dashboard/DashboardEstaciones.svelte';
import { substationAdmin } from '../../stores/substationAdmin.js';
import {
  detalleActividadId, detalleEstacionId, ejecucionesFiltroInicial, subestacionesActiveTab, disciplinaFiltro,
  anioDetalle, cronogramaAnioInicial, cronogramaSoloAtrasadas,
} from '../../stores/subestacionesFilters.js';
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
    anioDetalle.set(null);
    cronogramaSoloAtrasadas.set(false);
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

  it('vista Año: tarjetas resumen y por estación nombre+tipo, avance con barra neutra (sin semáforo), atrasadas e imprevistos', async () => {
    substationAdmin.indicadoresPorEstacion.mockResolvedValue([
      ind(1, 'Ayalas', { ejecutadoNoProgramado: 1, ejecutadoTotal: 4 }),
      ind(2, 'CLAN', { estacionTipo: 'COMPLEMENTARIA', programado: 0, cumple: 0, vencidas: 0, ejecutadasVencidas: 0 }),
    ]);
    const { container } = render(DashboardEstaciones);
    expect(await screen.findByRole('heading', { name: 'Avance por estación 2026' })).toBeTruthy();

    // Tarjetas: suma de todas las estaciones
    const tarjeta = (k) => container.querySelector(`[data-kpi="${k}"]`).textContent.replace(/\s+/g, ' ');
    expect(tarjeta('anio')).toContain('75%');
    expect(tarjeta('anio')).toContain('3 de 4 citas del año');
    expect(tarjeta('mes')).toContain('Septiembre · mes en curso');
    expect(tarjeta('atrasadas')).toContain('1');
    expect(tarjeta('imprevistos')).toContain('14% de 7 registros');

    const [ayalas, clan] = container.querySelectorAll('.sub-tr.clickable');
    expect(ayalas.children[0].textContent.replace(/\s+/g, ' ').trim()).toBe('Ayalas Bombeo');
    expect(clan.children[0].textContent).toContain('Complementaria');
    expect(ayalas.children[1].textContent.replace(/\s+/g, ' ').trim()).toBe('3 de 4 75%');
    expect(ayalas.querySelector('.sub-badge')).toBeNull(); // el año no lleva semáforo
    expect(ayalas.children[2].textContent.trim()).toBe('1'); // atrasada: 4 vencidas, 3 ejecutadas
    expect(ayalas.children[3].textContent.trim()).toBe('1 · 25% del total');
    expect(clan.children[1].textContent).toContain('Sin citas en 2026');
    expect(clan.children[3].textContent.trim()).toBe('—');
  });

  it('clic en el encabezado ordena la tabla; otro clic invierte; sin citas va siempre al final', async () => {
    substationAdmin.indicadoresPorEstacion.mockResolvedValue([
      ind(1, 'Ayalas', { programado: 4, cumple: 1, vencidas: 3, ejecutadasVencidas: 1 }),
      ind(2, 'CLAN', { programado: 0, cumple: 0, vencidas: 0, ejecutadasVencidas: 0 }),
      ind(3, 'Monquira', { programado: 4, cumple: 4, vencidas: 4, ejecutadasVencidas: 4 }),
    ]);
    const { container } = render(DashboardEstaciones);
    await screen.findByRole('heading', { name: 'Avance por estación 2026' });
    const nombres = () => [...container.querySelectorAll('.sub-tr.clickable .nombre')].map((n) => n.textContent.trim());
    const encabezado = (t) => within(container.querySelector('.sub-th')).getByRole('button', { name: new RegExp(`^${t}`) });

    expect(nombres()).toEqual(['Ayalas', 'CLAN', 'Monquira']);
    await fireEvent.click(encabezado('Atrasadas'));
    expect(nombres()).toEqual(['Ayalas', 'CLAN', 'Monquira']); // 2, 0, 0 → empate por nombre
    await fireEvent.click(encabezado('Avance del año'));
    expect(nombres()).toEqual(['Ayalas', 'Monquira', 'CLAN']); // 25%, 100%, sin citas al final
    await fireEvent.click(encabezado('Avance del año'));
    expect(nombres()).toEqual(['Monquira', 'Ayalas', 'CLAN']);
    await fireEvent.click(encabezado('Estación'));
    await fireEvent.click(encabezado('Estación'));
    expect(nombres()).toEqual(['Monquira', 'CLAN', 'Ayalas']);
  });

  it('vista Mes en curso: "x de y" del mes con semáforo contra el tiempo transcurrido e imprevistos del mes', async () => {
    substationAdmin.indicadoresPorEstacion.mockResolvedValue([
      ind(1, 'Ayalas', { programadoMes: 4, cumpleMes: 2, ejecutadoTotalMes: 3, ejecutadoNoProgramadoMes: 1 }), // 50% con 50% del mes
      ind(2, 'CLAN', { programadoMes: 10, cumpleMes: 1 }),                                                     // 10% con 50% del mes
      ind(3, 'Monquira', { programadoMes: 0, cumpleMes: 0 }),
    ]);
    const { container } = render(DashboardEstaciones);
    await fireEvent.click(await screen.findByText('Mes en curso'));

    expect(screen.getByRole('heading', { name: 'Avance por estación · Septiembre 2026' })).toBeTruthy();
    expect(screen.getByText(/semáforo compara lo ejecutado/)).toBeTruthy();
    const [ayalas, clan, monquira] = container.querySelectorAll('.sub-tr.clickable');
    expect(ayalas.querySelector('.sub-badge').textContent).toBe('▲ 50% · Al día');
    expect(ayalas.querySelector('.marca').style.left).toBe('50%'); // raya: cuánto del mes ha pasado
    expect(ayalas.children[3].textContent.trim()).toBe('2');        // pendientes del mes
    expect(ayalas.children[4].textContent.trim()).toBe('1 · 33% del total');
    expect(clan.querySelector('.sub-badge').textContent).toBe('▼ 10% · Atrasado');
    expect(monquira.children[1].textContent).toContain('Sin citas este mes');

    // Tarjetas propias del mes: 3 de 14 citas con la mitad del mes ya pasada (15 de 30 días)
    const tarjeta = (k) => container.querySelector(`[data-kpi="${k}"]`).textContent.replace(/\s+/g, ' ');
    expect(tarjeta('mes')).toContain('Avance de Septiembre');
    expect(tarjeta('mes')).toContain('■ 21% · Algo atrasado');
    expect(tarjeta('pendientes')).toContain('11 citas pendientes · quedan 15 días');
    expect(tarjeta('estaciones')).toContain('1 de 2'); // CLAN atrasada; Monquira no tiene citas
    expect(tarjeta('imprevistos')).toContain('33% de 3 registros del mes');
    expect(container.querySelector('[data-kpi="anio"]')).toBeNull();
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
    // El seguimiento de hallazgos (Abierto/En proceso) está oculto: todavía no tiene flujo.
    expect(screen.queryByText('Hallazgos abiertos')).toBeNull();

    // Cita por cita: 4 publicadas (sin la del borrador ni la de otra estación)
    expect(screen.getByText('✓ Ejecutada')).toBeTruthy();
    expect(screen.getByText('✕ No ejecutada')).toBeTruthy();
    expect(screen.getByText('⧗ En curso')).toBeTruthy();
    expect(screen.getByText('○ Programada')).toBeTruthy();

    // Actividades más intervenidas, de más a menos
    expect([...container.querySelectorAll('.crit-top strong')].map((n) => n.textContent)).toEqual(['4', '1']);
    // Actividad reciente
    expect(screen.getByText('12/08/2026')).toBeTruthy();
    expect(screen.getByText('! Con hallazgos')).toBeTruthy();
    expect(screen.queryByText('● Abierto')).toBeNull();
    expect(screen.getByText('J. Pérez')).toBeTruthy();
  });

  it('tira: la cita ejecutada abre su registro; las no ejecutadas no llevan a ningún lado', async () => {
    detalleEstacionId.set(1);
    substationAdmin.ejecucionDeCita.mockResolvedValue({ id: 900, fecha: '2026-02-10', evidencias: [] });
    const { container } = render(DashboardEstaciones);
    await screen.findByText('Avance 2026');

    // Chips de citas (los de imprevistos, en terracota, abren su registro y no cuentan aquí)
    const chips = [...container.querySelectorAll('.tira .chip')].filter((c) => !c.title.startsWith('Imprevisto'));
    expect(chips[0].tagName).toBe('BUTTON');               // febrero, ejecutada
    expect(chips.slice(1).every((c) => c.tagName === 'SPAN')).toBe(true);
    await fireEvent.click(chips[0]);
    expect(substationAdmin.ejecucionDeCita).toHaveBeenCalledWith(1);
    expect(get(subestacionesActiveTab)).not.toBe('ejecuciones'); // no salta a una lista del mes

    // "Cita por cita": la ejecutada también abre su registro
    await fireEvent.click(screen.getByTitle('Ver el registro'));
    expect(substationAdmin.ejecucionDeCita).toHaveBeenCalledTimes(2);
  });

  it('"Ver todas en Ejecuciones" filtra por la estación y el año del detalle', async () => {
    detalleEstacionId.set(1);
    render(DashboardEstaciones);
    await fireEvent.click(await screen.findByText('Ver todas en Ejecuciones →'));

    expect(get(ejecucionesFiltroInicial)).toEqual({ estacionId: 1, fechaInicio: '2026-01-01', fechaFin: '2026-12-31' });
  });

  it('detalle: recuerda el año al ir a otra pestaña y volver; "Volver" lo olvida', async () => {
    detalleEstacionId.set(1);
    const { unmount } = render(DashboardEstaciones);
    await screen.findByText('Avance 2026');
    await fireEvent.change(screen.getByLabelText('Año'), { target: { value: '2025' } });
    expect(get(anioDetalle)).toBe(2025);
    unmount();                                   // se va a otra pestaña
    render(DashboardEstaciones);                 // y vuelve
    await waitFor(() => expect(substationAdmin.indicadoresPorEstacion).toHaveBeenLastCalledWith(2025, ''));
    await fireEvent.click(await screen.findByText('← Volver al Dashboard'));
    expect(get(anioDetalle)).toBeNull();
  });

  it('tarjetas: "Atrasadas" abre el Cronograma con "Solo atrasadas" e "Imprevistos" abre Ejecuciones con "Solo imprevistos"', async () => {
    substationAdmin.indicadoresPorEstacion.mockResolvedValue([ind(1, 'Ayalas', { ejecutadoNoProgramado: 2, ejecutadoTotal: 5 })]);
    const { container } = render(DashboardEstaciones);
    await screen.findByText('Avance 2026');
    const atrasadas = container.querySelector('[data-kpi="atrasadas"]');
    expect(atrasadas.tagName).toBe('BUTTON');
    await fireEvent.click(atrasadas);
    expect(get(cronogramaSoloAtrasadas)).toBe(true);
    expect(get(cronogramaAnioInicial)).toBe(2026);
    expect(get(subestacionesActiveTab)).toBe('cronograma');

    subestacionesActiveTab.set('dashboard');
    await fireEvent.click(container.querySelector('[data-kpi="imprevistos"]'));
    expect(get(ejecucionesFiltroInicial)).toEqual({ esProgramada: false, fechaInicio: '2026-01-01', fechaFin: '2026-12-31' });
    expect(get(subestacionesActiveTab)).toBe('ejecuciones');
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
    await screen.findByText('Cita por cita');
    // Sep (mes en curso) ejecutada: suma al % de una vez, igual que el backend.
    expect(screen.queryByText('aún no suma al %')).toBeNull();
    expect(screen.getAllByText('✓ Ejecutada').length).toBeGreaterThan(0);
  });

  it('detalle: click en una actividad abre su detalle en Resumen por actividad', async () => {
    detalleEstacionId.set(1);
    detalleActividadId.set(null);
    render(DashboardEstaciones);
    await screen.findByText('Cita por cita');
    await fireEvent.click(screen.getAllByTitle('Ver la actividad en Resumen por actividad')[0]);
    expect(get(detalleActividadId)).toBe(10);
    expect(get(subestacionesActiveTab)).toBe('resumenActividad');
  });

  it('muestra todas las disciplinas por defecto y el selector filtra el dashboard', async () => {
    render(DashboardEstaciones);
    expect(await screen.findByText(/Todas las disciplinas · cuánto se ha hecho en cada estación/)).toBeTruthy();
    expect(substationAdmin.indicadoresPorEstacion).toHaveBeenLastCalledWith(undefined, '');

    await fireEvent.change(screen.getByLabelText('Disciplina'), { target: { value: 'ELECTRICO' } });
    await waitFor(() => expect(substationAdmin.indicadoresPorEstacion).toHaveBeenLastCalledWith(undefined, 'ELECTRICO'));
    expect(await screen.findByText(/Eléctrico · cuánto se ha hecho en cada estación/)).toBeTruthy();
    expect(get(disciplinaFiltro)).toBe('ELECTRICO');
  });

  it('detalle con una disciplina elegida: indicadores, criticidad y meses solo de esa disciplina', async () => {
    disciplinaFiltro.set('ELECTRICO');
    detalleEstacionId.set(1);
    render(DashboardEstaciones);
    await screen.findByText('Cita por cita');
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
    expect(substationAdmin.noProgramadasDeEstacion).toHaveBeenCalledWith(1, 2026, '');

    await fireEvent.click(screen.getByText('Ver en Ejecuciones →'));
    expect(get(ejecucionesFiltroInicial)).toEqual({
      estacionId: 1, esProgramada: false, fechaInicio: '2026-01-01', fechaFin: '2026-12-31',
    });
    expect(get(subestacionesActiveTab)).toBe('ejecuciones');
  });

  it('detalle: imprevistos y últimas ejecuciones se piden con el año y la disciplina del detalle', async () => {
    detalleEstacionId.set(1);
    disciplinaFiltro.set('CIVIL');
    render(DashboardEstaciones);
    await screen.findByText('Cita por cita');
    expect(substationAdmin.noProgramadasDeEstacion).toHaveBeenCalledWith(1, 2026, 'CIVIL');
    expect(substationAdmin.ultimasEjecuciones).toHaveBeenCalledWith(1, 2026, 'CIVIL');
    expect(screen.getByText('Últimas ejecuciones de 2026')).toBeTruthy();
  });

  it('detalle: si hay más imprevistos de los que trae la lista, lo dice y ofrece verlos todos', async () => {
    detalleEstacionId.set(1);
    substationAdmin.noProgramadasDeEstacion.mockResolvedValue({ totalElements: 63, content: [
      { id: 950, fecha: '2026-10-02', descripcionLibre: 'Limpieza de canal', tipoMantenimiento: 'CORRECTIVO', resultado: 'CONFORME', esProgramada: false },
    ] });
    render(DashboardEstaciones);
    expect(await screen.findByText(/Mostrando los 1 más recientes de 63/)).toBeTruthy();
    expect(screen.getByText(/· 2026 · 63 registros · no suman al avance/)).toBeTruthy();
  });
});
