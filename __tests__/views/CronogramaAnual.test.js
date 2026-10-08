import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { writable, get } from 'svelte/store';

const authStore = writable({ currentUser: { name: 'admin', role: 'ADMIN' } });
vi.mock('../../stores/auth.js', () => ({ auth: { subscribe: (fn) => authStore.subscribe(fn) } }));

vi.mock('../../stores/substationAdmin.js', () => ({
  substationAdmin: {
    listarEstaciones: vi.fn(),
    listarActividades: vi.fn(),
    obtenerCronograma: vi.fn(),
    asignar: vi.fn(),
    quitar: vi.fn(),
    restaurar: vi.fn(),
    descartarBorrador: vi.fn(),
    resumenBorrador: vi.fn(),
    publicar: vi.fn(),
    deshacerPublicacion: vi.fn(),
    copiarAnio: vi.fn(),
  },
}));

import CronogramaAnual from '../../components/views/subestaciones/cronograma/CronogramaAnual.svelte';
import { substationAdmin } from '../../stores/substationAdmin.js';
import {
  cronogramaAnioInicial, subestacionesActiveTab, ejecucionesFiltroInicial, detalleEstacionId, disciplinaFiltro,
} from '../../stores/subestacionesFilters.js';
import { subestacionesToast } from '../../stores/subestacionesToast.js';

const ESTACIONES = [
  { id: 1, nombre: 'Ayalas', tipo: 'BOMBEO', frecuenciaBase: 'TRIMESTRAL', activa: true },
  { id: 2, nombre: 'CLAN', tipo: 'COMPLEMENTARIA', frecuenciaBase: 'ANUAL', activa: true },
  { id: 3, nombre: 'Inactiva', tipo: 'BOMBEO', frecuenciaBase: 'ANUAL', activa: false },
];
const ACTIVIDADES = [
  { id: 10, nombre: 'Pintura puertas/ventanas', nombreCorto: 'Pintura puertas', disciplina: 'CIVIL', capturaMovilHabilitada: true, activa: true },
  { id: 11, nombre: 'Pintura muros', nombreCorto: 'Muros', disciplina: 'CIVIL', capturaMovilHabilitada: false, activa: true },
];
const cita = (id, estacionId, actividadId, mes, extra = {}) => ({
  id, estacionId, actividadId, mes, disciplina: 'CIVIL', estado: 'PUBLICADA', pendienteRetiro: false,
  tieneEjecucion: false, fechaEjecucion: null, ...extra,
});
function cronograma(extra = {}) {
  return {
    anio: 2026, anioActual: 2026, mesActual: 9,
    ultimaPublicacion: { id: 1, publicadoEn: '2026-09-20T16:05:00', usuario: 'Carga inicial', altas: 3, bajas: 0, inicial: true },
    borrador: { altas: 0, bajas: 0 },
    puedeDeshacer: false,
    citas: [
      cita(100, 1, 10, 2, { tieneEjecucion: true, fechaEjecucion: '2026-02-10' }),
      cita(101, 1, 11, 3),
      cita(102, 2, 10, 10),
    ],
    ...extra,
  };
}

describe('CronogramaAnual', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStore.set({ currentUser: { name: 'admin', role: 'ADMIN' } });
    cronogramaAnioInicial.set(null);
    subestacionesActiveTab.set('cronograma');
    ejecucionesFiltroInicial.set(null);
    detalleEstacionId.set(null);
    disciplinaFiltro.set('');
    substationAdmin.listarEstaciones.mockResolvedValue(ESTACIONES);
    substationAdmin.listarActividades.mockResolvedValue(ACTIVIDADES);
    substationAdmin.obtenerCronograma.mockResolvedValue(cronograma());
  });

  it('muestra la grilla con estaciones activas, chips con nombre corto, % y estado publicado', async () => {
    render(CronogramaAnual);

    expect(await screen.findByText('Ayalas')).toBeTruthy();
    expect(screen.queryByText('Inactiva')).toBeNull();
    expect(screen.getByText(/2 estaciones · 3 citas en 2026 · todas las disciplinas/)).toBeTruthy();
    expect(screen.getAllByText('Pintura puertas', { selector: '.corto' })).toHaveLength(2);
    expect(screen.getByText('Muros', { selector: '.corto' })).toBeTruthy();
    expect(screen.getByText('1 de 2 · 50%')).toBeTruthy(); // Ayalas: avance del año, como el Dashboard
    expect(screen.getByText(/Publicado a móvil · 20\/09\/2026 16:05 · sin cambios pendientes/)).toBeTruthy();
    expect(screen.getByText(/Solo atrasadas · 1/)).toBeTruthy();
    expect(screen.queryByText('↶ Deshacer última publicación')).toBeNull();
  });

  it('barra BORRADOR con el conteo y "Revisar y publicar a móvil"', async () => {
    substationAdmin.obtenerCronograma.mockResolvedValue(cronograma({
      borrador: { altas: 2, bajas: 1 },
      citas: [cita(200, 1, 10, 11, { estado: 'BORRADOR' }), cita(201, 2, 10, 10, { pendienteRetiro: true })],
    }));
    render(CronogramaAnual);

    expect(await screen.findByText('BORRADOR')).toBeTruthy();
    expect(screen.getByText('3 cambios sin publicar')).toBeTruthy();
    expect(screen.getByText(/\(\+2 nuevas · −1 quitadas\)/)).toBeTruthy();
    expect(screen.getByText('Revisar y publicar a móvil')).toBeTruthy();
  });

  it('descartar el borrador pide confirmación, llama al backend y recarga', async () => {
    substationAdmin.obtenerCronograma.mockResolvedValue(cronograma({ borrador: { altas: 1, bajas: 0 },
      citas: [cita(200, 1, 10, 11, { estado: 'BORRADOR' })] }));
    substationAdmin.descartarBorrador.mockResolvedValue(null);
    render(CronogramaAnual);

    await fireEvent.click(await screen.findByText('Descartar'));
    // Descartar no se puede deshacer: el primer clic solo pide confirmación.
    expect(substationAdmin.descartarBorrador).not.toHaveBeenCalled();
    expect(screen.getByText('¿Descartar 1 cambio? No se puede deshacer.')).toBeTruthy();
    await fireEvent.click(screen.getByText('Sí, descartar'));
    await waitFor(() => expect(substationAdmin.descartarBorrador).toHaveBeenCalledWith(2026));
    await waitFor(() => expect(substationAdmin.obtenerCronograma).toHaveBeenCalledTimes(2));
  });

  it('"Deshacer última publicación" solo con puedeDeshacer', async () => {
    substationAdmin.obtenerCronograma.mockResolvedValue(cronograma({ puedeDeshacer: true,
      ultimaPublicacion: { id: 4, publicadoEn: '2026-09-24T10:48:00', usuario: 'Admin', altas: 1, bajas: 0, inicial: false } }));
    substationAdmin.deshacerPublicacion.mockResolvedValue({ publicacionId: 4, altas: 1, bajas: 0, noAplicadas: [] });
    render(CronogramaAnual);

    await fireEvent.click(await screen.findByText('↶ Deshacer última publicación'));
    await waitFor(() => expect(substationAdmin.deshacerPublicacion).toHaveBeenCalledWith(2026));
  });

  it('el Supervisor ve el candado y no las acciones de ADMIN', async () => {
    authStore.set({ currentUser: { name: 'sup', role: 'SUPERVISOR_OPERATIVO' } });
    substationAdmin.obtenerCronograma.mockResolvedValue(cronograma({ borrador: { altas: 1, bajas: 0 },
      citas: [cita(200, 1, 10, 11, { estado: 'BORRADOR' })] }));
    render(CronogramaAnual);

    expect(await screen.findByText('Asignar · solo ADMIN')).toBeTruthy();
    expect(screen.queryByText('Asignación masiva')).toBeNull();
    expect(screen.queryByText('Revisar y publicar a móvil')).toBeNull();
    expect(screen.queryByText('Descartar')).toBeNull();
  });

  it('"Solo atrasadas" deja solo las filas con citas no ejecutadas de meses cerrados', async () => {
    render(CronogramaAnual);
    await screen.findByText('Ayalas');

    await fireEvent.click(screen.getByText(/Solo atrasadas/));

    expect(screen.getByText('Ayalas')).toBeTruthy();
    expect(screen.queryByText('CLAN')).toBeNull();
    expect(screen.getByText(/2 estaciones · 1 citas en 2026/)).toBeTruthy();
  });

  it('panel de celda: lista las citas y "Ver ejecuciones de este mes" abre Ejecuciones filtrada', async () => {
    const { container } = render(CronogramaAnual);
    await screen.findByText('Ayalas');

    const celdaFeb = container.querySelectorAll('.fila')[0].querySelectorAll('.celda')[1];
    await fireEvent.click(celdaFeb);

    expect(screen.getByText('Febrero 2026 · 1 actividad')).toBeTruthy();
    expect(screen.getByText('✓ Ejecutada 10/02')).toBeTruthy();
    await fireEvent.click(screen.getByText('Ver ejecuciones de este mes →'));

    expect(get(ejecucionesFiltroInicial)).toEqual({ estacionId: 1, fechaInicio: '2026-02-01', fechaFin: '2026-02-28' });
    expect(get(subestacionesActiveTab)).toBe('ejecuciones');
  });

  it('panel de celda: quitar una cita futura y "Mes cerrado" en una pasada', async () => {
    substationAdmin.quitar.mockResolvedValue(null);
    const { container } = render(CronogramaAnual);
    await screen.findByText('Ayalas');

    // CLAN · octubre (futuro, sin ejecución) → se puede quitar
    await fireEvent.click(container.querySelectorAll('.fila')[1].querySelectorAll('.celda')[9]);
    await fireEvent.click(screen.getByText('Quitar'));
    await waitFor(() => expect(substationAdmin.quitar).toHaveBeenCalledWith(102));
    await fireEvent.keyDown(window, { key: 'Escape' });

    // Ayalas · marzo (cerrado, sin ejecución) → "Mes cerrado", sin Quitar
    await fireEvent.click(container.querySelectorAll('.fila')[0].querySelectorAll('.celda')[2]);
    expect(screen.getByText('Mes cerrado')).toBeTruthy();
    expect(screen.queryByText('Quitar')).toBeNull();
    expect(screen.getByText('Solo web · no se captura desde móvil')).toBeTruthy();
  });

  it('el nombre de la estación no es clickeable (su detalle ya está en el Dashboard)', async () => {
    const { container } = render(CronogramaAnual);
    await fireEvent.click(await screen.findByText('Ayalas'));

    expect(get(detalleEstacionId)).toBeNull();
    expect(get(subestacionesActiveTab)).not.toBe('dashboard');
    expect(container.querySelector('button.nombre-fila')).toBeNull();
  });

  it('en filas por actividad, el nombre de la actividad filtra la grilla por esa actividad', async () => {
    const { container } = render(CronogramaAnual);
    await screen.findByText('Ayalas');
    await fireEvent.click(screen.getByRole('button', { name: 'Actividades', exact: true }));
    const nombre = container.querySelector('button.nombre-fila');
    expect(nombre.title).toBe('Ver esta actividad por estación');
    await fireEvent.click(nombre);
    expect(container.querySelector('button.nombre-fila')).toBeNull(); // volvió a filas por estación
  });

  it('año sin cronograma: ofrece copiar el año anterior como borrador', async () => {
    cronogramaAnioInicial.set(2027);
    substationAdmin.obtenerCronograma.mockImplementation(async (anio) =>
      anio === 2027 ? cronograma({ anio: 2027, citas: [], ultimaPublicacion: null }) : cronograma());
    substationAdmin.copiarAnio.mockResolvedValue({ creadas: 3 });
    render(CronogramaAnual);

    expect(await screen.findByText('2027 todavía no tiene cronograma')).toBeTruthy();
    await fireEvent.click(screen.getByText('Copiar 2026 como borrador · 3 citas'));
    await waitFor(() => expect(substationAdmin.copiarAnio).toHaveBeenCalledWith(2026, 2027));
  });

  it('si falla la carga muestra el error con "Reintentar"', async () => {
    substationAdmin.obtenerCronograma.mockRejectedValueOnce(new Error('Servidor no disponible'));
    render(CronogramaAnual);

    expect(await screen.findByText('No se pudo cargar el cronograma')).toBeTruthy();
    expect(screen.getByText('Servidor no disponible')).toBeTruthy();
    await fireEvent.click(screen.getByText('Reintentar'));
    expect(await screen.findByText('Ayalas')).toBeTruthy();
  });

  it('las celdas se abren con el teclado (Enter)', async () => {
    const { container } = render(CronogramaAnual);
    await screen.findByText('Ayalas');

    const celdaFeb = container.querySelectorAll('.fila')[0].querySelectorAll('.celda')[1];
    expect(celdaFeb.getAttribute('aria-label')).toBe('Ayalas · Febrero · 1 cita');
    await fireEvent.keyDown(celdaFeb, { key: 'Enter' });
    expect(screen.getByText('Febrero 2026 · 1 actividad')).toBeTruthy();
  });

  it('la búsqueda también filtra el total de la grilla y el conteo de la cabecera', async () => {
    const { container } = render(CronogramaAnual);
    await screen.findByText('Ayalas');
    expect(screen.getByText(/2 estaciones · 3 citas en 2026/)).toBeTruthy();

    await fireEvent.input(screen.getByPlaceholderText('Buscar estación…'), { target: { value: 'clan' } });
    expect(screen.getByText(/1 estaciones · 1 citas en 2026/)).toBeTruthy();
    expect(container.querySelector('.pie-total').textContent).toBe('1');
  });

  it('al cambiar de año dos veces seguidas solo se aplica la última respuesta', async () => {
    const { container } = render(CronogramaAnual);
    await screen.findByText('Ayalas');

    let responder2027;
    substationAdmin.obtenerCronograma.mockImplementation((anio) =>
      anio === 2027
        ? new Promise((r) => { responder2027 = r; })
        : Promise.resolve(cronograma()));
    const select = screen.getByLabelText('Año');
    await fireEvent.change(select, { target: { value: '2027' } });
    await fireEvent.change(select, { target: { value: '2026' } });
    await waitFor(() => expect(container.querySelector('.pie-total').textContent).toBe('3'));

    // La respuesta lenta de 2027 llega después: no debe pisar la de 2026.
    responder2027(cronograma({ anio: 2027, citas: [cita(900, 1, 10, 5)] }));
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('.pie-total').textContent).toBe('3');
    expect((select).value).toBe('2026');
  });

  it('descartar avisa cuántas citas se conservaron por tener ejecución', async () => {
    substationAdmin.obtenerCronograma.mockResolvedValue(cronograma({ borrador: { altas: 1, bajas: 0 },
      citas: [cita(200, 1, 10, 11, { estado: 'BORRADOR' })] }));
    substationAdmin.descartarBorrador.mockResolvedValue({ altasDescartadas: 0, retirosAnulados: 0, conservadasConEjecucion: 1 });
    render(CronogramaAnual);

    await fireEvent.click(await screen.findByText('Descartar'));
    await fireEvent.click(screen.getByText('Sí, descartar'));
    await waitFor(() => expect(get(subestacionesToast)?.text)
      .toBe('Borrador descartado · 1 cita(s) se conservan porque ya tienen ejecución registrada'));
  });
});
