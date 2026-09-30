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
    obtenerCronograma: vi.fn(),
    obtenerEjecucion: vi.fn(),
  },
}));

import DashboardEstaciones from '../../components/views/subestaciones/dashboard/DashboardEstaciones.svelte';
import { substationAdmin } from '../../stores/substationAdmin.js';
import { detalleEstacionId, ejecucionesFiltroInicial, subestacionesActiveTab } from '../../stores/subestacionesFilters.js';

const ind = (id, nombre, extra = {}) => ({
  estacionId: id, estacionNombre: nombre, estacionTipo: 'BOMBEO', programado: 4, cumple: 3, noCumple: 1,
  porcentajeCumplimiento: 75.0, anio: 2026, vencidas: 4, ejecutadasVencidas: 3, conHallazgos: 2, hallazgosAbiertos: 1,
  ejecutadoProgramado: 3, ejecutadoNoProgramado: 0, ejecutadoMantenimiento: 3, ejecutadoInspeccion: 0, ejecutadoTotal: 3, ...extra,
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

  it('tabla del mockup: estación, tipo, programadas, ejecutadas y % con símbolo; "—" sin vencidas', async () => {
    render(DashboardEstaciones);
    expect(await screen.findByText('Ayalas')).toBeTruthy();
    expect(screen.getByText('▲ 75%')).toBeTruthy();
    expect(screen.getByText('Complementaria')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('click en la fila abre el detalle en la misma pestaña y "Volver" regresa a la tabla', async () => {
    render(DashboardEstaciones);
    await fireEvent.click(await screen.findByText('Ayalas'));

    expect(get(detalleEstacionId)).toBe(1);
    expect(await screen.findByText('← Volver al Dashboard')).toBeTruthy();
    await fireEvent.click(screen.getByText('← Volver al Dashboard'));
    expect(get(detalleEstacionId)).toBeNull();
    expect(await screen.findByText('Programadas')).toBeTruthy();
  });

  it('detalle: cabecera, KPIs, tira de 12 meses solo con lo publicado, cita por cita, críticas y recientes', async () => {
    detalleEstacionId.set(1);
    const { container } = render(DashboardEstaciones);

    expect(await screen.findByText('Bombeo · Frecuencia base Trimestral')).toBeTruthy();
    expect(screen.getByText('Cumplimiento 2026')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByText('4 vencidas a la fecha')).toBeTruthy();
    expect(screen.getByText('de 4 vencidas')).toBeTruthy();
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
    await screen.findByText('Cumplimiento 2026');

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
});
