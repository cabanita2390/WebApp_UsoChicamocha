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
    indicadoresPorEstacion: vi.fn(),
    listarActividades: vi.fn(),
    listarEstaciones: vi.fn(),
    obtenerCronograma: vi.fn(),
    ejecucionesDeActividad: vi.fn(),
    noProgramadasDeActividad: vi.fn(),
    obtenerEjecucion: vi.fn(),
    ejecucionDeCita: vi.fn(),
  },
}));

import ResumenActividad from '../../components/views/subestaciones/resumen/ResumenActividad.svelte';
import { substationAdmin } from '../../stores/substationAdmin.js';
import { detalleActividadId, detalleEstacionId, ejecucionesFiltroInicial, subestacionesActiveTab, disciplinaFiltro, anioDetalle } from '../../stores/subestacionesFilters.js';

const fila = (id, nombre, extra = {}) => ({
  actividadId: id, actividadNombre: nombre, disciplina: 'CIVIL', programadoAnual: 8, ejecutadoAnual: 5,
  ejecutadoNoProgramado: 1, mantenimiento: 4, inspeccion: 2, ejecutadoTotal: 6, anio: 2026,
  vencidas: 6, ejecutadasVencidas: 3, porcentajeCumplimiento: 50.0, cumple: 4, estaciones: 2,
  mes: 9, programadoMes: 2, cumpleMes: 0, ejecutadoTotalMes: 1, ejecutadoNoProgramadoMes: 1,
  porcentajeMesTranscurrido: 50.0, ...extra,
});
const cita = (id, estacionId, actividadId, mes, extra = {}) => ({
  id, estacionId, actividadId, mes, disciplina: 'CIVIL', estado: 'PUBLICADA', pendienteRetiro: false,
  tieneEjecucion: false, fechaEjecucion: null, ...extra,
});

describe('ResumenActividad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detalleActividadId.set(null);
    anioDetalle.set(null);
    ejecucionesFiltroInicial.set(null);
    disciplinaFiltro.set('');
    subestacionesActiveTab.set('resumenActividad');
    substationAdmin.resumenPorActividad.mockResolvedValue([
      fila(10, 'Pintura muros'),
      fila(11, 'Aseo de canales', { programadoAnual: 4, vencidas: 2, ejecutadasVencidas: 2, porcentajeCumplimiento: 100.0,
        ejecutadoTotal: 2, ejecutadoNoProgramado: 0, cumple: 2, estaciones: 1, programadoMes: 1, cumpleMes: 1,
        ejecutadoTotalMes: 1, ejecutadoNoProgramadoMes: 0 }),
      fila(12, 'Inspección presa', { programadoAnual: 0, vencidas: 0, ejecutadasVencidas: 0, porcentajeCumplimiento: null,
        ejecutadoTotal: 0, ejecutadoNoProgramado: 0, cumple: 0, estaciones: 0, programadoMes: 0, cumpleMes: 0,
        ejecutadoTotalMes: 0, ejecutadoNoProgramadoMes: 0 }),
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
    substationAdmin.noProgramadasDeActividad.mockResolvedValue({ totalElements: 0, content: [] });
    // Mismos registros que las actividades (6 + 2 + 0, y 1 + 1 en el mes): sin registros libres.
    substationAdmin.indicadoresPorEstacion.mockResolvedValue([{ estacionId: 1, ejecutadoTotal: 8, ejecutadoTotalMes: 2 }]);
    substationAdmin.ejecucionesDeActividad.mockResolvedValue({
      totalElements: 21,
      content: [
        { id: 900, fecha: '2026-02-10', estacionNombre: 'Ayalas', tipoMantenimiento: 'PREVENTIVO', esProgramada: true,
          resultado: 'CON_HALLAZGOS', seguimiento: { estado: 'ABIERTO' }, evidencias: [{}, {}], responsable: 'J. Pérez' },
      ],
    });
  });

  it('tabla: avance del año (x de y, barra neutra), atrasadas e imprevistos; tarjetas con el total', async () => {
    const { container } = render(ResumenActividad);
    expect(await screen.findByText('Pintura muros')).toBeTruthy();
    expect(screen.getByText(/en 2 estaciones/)).toBeTruthy();
    expect(container.querySelector('.sub-tr.clickable .pct').textContent).toBe('50%'); // Aseo de canales: 2 de 4
    expect(screen.getByText('1 · 17% del total')).toBeTruthy();     // imprevistos de Pintura muros
    // Tarjetas: 6 de 12 citas del año y 3 atrasadas de meses cerrados (3 + 0); imprevistos aparte.
    expect(container.querySelector('[data-kpi="anio"] .t-v').textContent).toBe('50%');
    expect(screen.getByText('6 de 12 citas del año')).toBeTruthy();
    expect(container.querySelector('[data-kpi="atrasadas"] .t-v').textContent).toBe('3');
    expect(screen.getByText(/sumando todas las estaciones/)).toBeTruthy();
    // Sin semáforo de cumplimiento en el año: el semáforo es solo del mes.
    expect(screen.queryByText(/Cumplimiento/)).toBeNull();
  });

  it('un backend sin los campos del avance nunca muestra "undefined"', async () => {
    const viejo = fila(10, 'Pintura muros');
    delete viejo.cumple;
    delete viejo.estaciones;
    substationAdmin.resumenPorActividad.mockResolvedValueOnce([viejo]);
    const { container } = render(ResumenActividad);
    await screen.findByText('Pintura muros');
    expect(container.textContent).not.toMatch(/undefined|NaN/);
  });

  it('imprevistos: aclara los registros sin actividad, que solo cuentan por estación (Dashboard ≠ Resumen)', async () => {
    const { container } = render(ResumenActividad);
    await screen.findByText('Pintura muros');
    expect(container.querySelector('.libres')).toBeNull(); // sin registros libres, nada que aclarar

    substationAdmin.indicadoresPorEstacion.mockResolvedValue([{ estacionId: 1, ejecutadoTotal: 12, ejecutadoTotalMes: 4 }]);
    await fireEvent.change(screen.getByLabelText('Año'), { target: { value: '2026' } });
    expect(await screen.findByText('+ 4 registros sin actividad (solo cuentan por estación)')).toBeTruthy();
    await fireEvent.click(screen.getByText('Mes en curso'));
    expect(screen.getByText('+ 2 registros sin actividad (solo cuentan por estación)')).toBeTruthy();
    // Con una búsqueda activa no aplica (las tarjetas suman solo lo que se ve)
    await fireEvent.input(screen.getByLabelText('Buscar actividad'), { target: { value: 'aseo' } });
    expect(container.querySelector('.libres')).toBeNull();
  });

  it('una actividad del catálogo sin citas ni registros no sale en la tabla, se cuenta al pie', async () => {
    render(ResumenActividad);
    await screen.findByText('Pintura muros');
    expect(screen.queryByText('Inspección presa')).toBeNull();
    expect(screen.getByText(/1 actividad del catálogo no tiene citas/)).toBeTruthy();
  });

  it('"Mes en curso": citas del mes con semáforo, pendientes y actividades atrasadas', async () => {
    const { container } = render(ResumenActividad);
    await screen.findByText('Pintura muros');
    await fireEvent.click(screen.getByText('Mes en curso'));
    expect(screen.getByRole('heading', { name: 'Avance por actividad · Septiembre 2026' })).toBeTruthy();
    expect(screen.getByText('▼ 0% · Atrasado')).toBeTruthy();       // Pintura muros: 0 de 2 a mitad de mes
    expect(screen.getByText('▲ 100% · Mes completo')).toBeTruthy(); // Aseo de canales: 1 de 1
    expect(container.querySelector('[data-kpi="actividades"] .t-v').textContent.trim()).toBe('1 de 2');
    expect(container.querySelector('[data-kpi="pendientes"] .t-v').textContent).toBe('2');
  });

  it('otro año (sin mes en curso) no muestra el selector Año | Mes en curso', async () => {
    substationAdmin.resumenPorActividad.mockResolvedValueOnce([
      fila(10, 'Pintura muros', { anio: 2025, mes: null, programadoMes: null, cumpleMes: null, porcentajeMesTranscurrido: null }),
    ]);
    render(ResumenActividad);
    await screen.findByText('Pintura muros');
    expect(screen.queryByText('Mes en curso')).toBeNull();
  });

  it('buscar filtra filas y tarjetas; "Más atrasadas primero" ordena por atraso', async () => {
    const { container } = render(ResumenActividad);
    await screen.findByText('Pintura muros');

    const nombres = () => [...container.querySelectorAll('.sub-tr.clickable .nombre')].map((n) => n.textContent.trim());
    expect(nombres()).toEqual(['Aseo de canales', 'Pintura muros']);
    await fireEvent.click(screen.getByText('Más atrasadas primero'));
    expect(nombres()).toEqual(['Pintura muros', 'Aseo de canales']);

    await fireEvent.input(screen.getByLabelText('Buscar actividad'), { target: { value: 'aseo' } });
    expect(screen.queryByText('Pintura muros')).toBeNull();
    expect(screen.getByText('2 de 4 citas del año')).toBeTruthy();

    await fireEvent.input(screen.getByLabelText('Buscar actividad'), { target: { value: 'zzz' } });
    expect(screen.getByText('Ninguna actividad coincide con "zzz".')).toBeTruthy();
  });

  it('cambiar el año recarga el resumen de ese año', async () => {
    render(ResumenActividad);
    await screen.findByText('Pintura muros');
    await fireEvent.change(screen.getByLabelText('Año'), { target: { value: '2025' } });
    await waitFor(() => expect(substationAdmin.resumenPorActividad).toHaveBeenLastCalledWith(2025, ''));
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
    expect(await screen.findByText('6 de 12 citas del año')).toBeTruthy();
  });

  it('detalle: KPIs, estaciones con sus meses (solo lo publicado) y registros del año', async () => {
    detalleActividadId.set(10);
    const { container } = render(ResumenActividad);
    expect(await screen.findByText('Registros del año')).toBeTruthy();
    expect(screen.getByText('4 mantenimiento · 2 inspección')).toBeTruthy();
    expect(screen.getByText('Avance 2026')).toBeTruthy();
    expect(screen.getByText('4 de 8 citas')).toBeTruthy();
    expect(screen.getByText('3 atrasadas de meses cerrados')).toBeTruthy();
    expect(screen.getByText('▼ 0% · Atrasado')).toBeTruthy();
    expect(screen.getByText('17% de 6 registros · 1 este mes')).toBeTruthy();

    const estaciones = [...container.querySelectorAll('.est:not(.est-h) .est-n')].map((n) => n.textContent);
    expect(estaciones).toEqual(['Ayalas', 'CLAN']);
    expect(screen.getByTitle('Febrero · Ejecutada 10/02/2026 · ver el registro')).toBeTruthy();
    expect(screen.getByTitle('Mayo · No ejecutada')).toBeTruthy();
    expect(screen.getByTitle('Septiembre · En curso')).toBeTruthy();
    expect(screen.queryByTitle(/Noviembre/)).toBeNull(); // la cita en borrador no se muestra
    // Avance por estación: ejecutadas de todas sus citas del año (la de diciembre, hecha por adelantado, suma).
    expect(screen.getByTitle('Diciembre · Ejecutada 02/09/2026 · ver el registro')).toBeTruthy();
    const ejec = [...container.querySelectorAll('.est:not(.est-h) .der')].map((n) => n.textContent.trim());
    expect(ejec).toEqual(['1 de 2', '1 de 2']);

    expect(screen.getByText('21 registros')).toBeTruthy();
    expect(screen.getByText('! Con hallazgos')).toBeTruthy();
    expect(screen.getByText('2 foto(s)')).toBeTruthy();
  });

  it('detalle: imprevistos de la actividad en la tira por estación (＋) y en su propia lista', async () => {
    detalleActividadId.set(10);
    substationAdmin.noProgramadasDeActividad.mockResolvedValue({ totalElements: 2, content: [
      { id: 950, fecha: '2026-05-20', estacionId: 1, estacionNombre: 'Ayalas', tipoMantenimiento: 'CORRECTIVO',
        esProgramada: false, resultado: 'CONFORME', evidencias: [{}], responsable: 'L. Gómez' },
      { id: 951, fecha: '2026-07-03', estacionId: 3, estacionNombre: 'Papuas', tipoMantenimiento: 'CORRECTIVO',
        esProgramada: false, resultado: 'CONFORME', evidencias: [], responsable: 'L. Gómez' },
    ] });
    substationAdmin.listarEstaciones.mockResolvedValue([
      { id: 1, nombre: 'Ayalas', activa: true }, { id: 2, nombre: 'CLAN', activa: true }, { id: 3, nombre: 'Papuas', activa: true },
    ]);
    substationAdmin.obtenerEjecucion.mockResolvedValue({ id: 950, fecha: '2026-05-20', evidencias: [] });
    const { container } = render(ResumenActividad);
    expect(await screen.findByText('Detalle por actividad')).toBeTruthy();
    expect(substationAdmin.noProgramadasDeActividad).toHaveBeenCalledWith(10, 2026);

    // Papuas no tiene citas de la actividad pero sí un imprevisto: sale, sin avance.
    const estaciones = [...container.querySelectorAll('.est:not(.est-h) .est-n')].map((n) => n.textContent);
    expect(estaciones).toEqual(['Ayalas', 'CLAN', 'Papuas']);
    expect(screen.getByText('sin citas')).toBeTruthy();
    expect(screen.getAllByTitle(/^Imprevisto · /)).toHaveLength(2);
    expect(screen.getByText('· 2026 · 2 registros · no suman al avance')).toBeTruthy();

    await fireEvent.click(screen.getByTitle('Imprevisto · 20/05/2026 · no suma al avance'));
    await waitFor(() => expect(substationAdmin.obtenerEjecucion).toHaveBeenCalledWith(950));

    await fireEvent.click(screen.getByText('Ver en Ejecuciones →'));
    expect(get(ejecucionesFiltroInicial)).toEqual({ actividadId: 10, fechaInicio: '2026-01-01', fechaFin: '2026-12-31', esProgramada: false });
  });

  it('detalle: sin el dato del mes en el año actual no dice "no es el año actual"; en otro año sí', async () => {
    detalleActividadId.set(10);
    substationAdmin.resumenPorActividad.mockResolvedValue([fila(10, 'Pintura muros', { mes: null, programadoMes: null })]);
    render(ResumenActividad);
    expect(await screen.findByText('sin datos del mes')).toBeTruthy();
    expect(screen.queryByText(/no es el año actual/)).toBeNull();

    substationAdmin.obtenerCronograma.mockResolvedValue({ anio: 2025, anioActual: 2026, mesActual: 9, citas: [] });
    await fireEvent.change(screen.getByLabelText('Año'), { target: { value: '2025' } });
    expect(await screen.findByText('2025 no es el año actual')).toBeTruthy();
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

  it('detalle: "Ver todas en Ejecuciones" filtra por la actividad y el año', async () => {
    detalleActividadId.set(10);
    render(ResumenActividad);
    await fireEvent.click(await screen.findByText('Ver todas en Ejecuciones →'));
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

  it('todas las disciplinas por defecto (con su etiqueta) y el selector filtra el resumen', async () => {
    render(ResumenActividad);
    expect(await screen.findByText(/Todas las disciplinas · cuánto se ha hecho/)).toBeTruthy();
    expect(screen.getByText(/Civil · en 2 estaciones/)).toBeTruthy();
    expect(substationAdmin.resumenPorActividad).toHaveBeenLastCalledWith(null, '');

    await fireEvent.change(screen.getByLabelText('Disciplina'), { target: { value: 'ELECTROMECANICO' } });
    await waitFor(() => expect(substationAdmin.resumenPorActividad).toHaveBeenLastCalledWith(2026, 'ELECTROMECANICO'));
    expect(await screen.findByText(/Electromecánico · cuánto se ha hecho/)).toBeTruthy();
    expect(screen.queryByText(/Civil · en/)).toBeNull();
  });
});
