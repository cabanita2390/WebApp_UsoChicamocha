import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { writable, get } from 'svelte/store';

const authStore = writable({ currentUser: { name: 'admin', role: 'ADMIN' } });
vi.mock('../../stores/auth.js', () => ({ auth: { subscribe: (fn) => authStore.subscribe(fn) } }));

const push = vi.fn();
vi.mock('svelte-spa-router', () => ({ push: (...a) => push(...a) }));

vi.mock('../../stores/substationAdmin.js', () => ({
  substationAdmin: {
    listarEstaciones: vi.fn(),
    listarActividades: vi.fn(),
    obtenerCronograma: vi.fn(),
    crearEstacion: vi.fn(),
    actualizarEstacion: vi.fn(),
    cambiarEstadoEstacion: vi.fn(),
    crearActividad: vi.fn(),
    actualizarActividad: vi.fn(),
    cambiarEstadoActividad: vi.fn(),
    copiarAnio: vi.fn(),
  },
}));

import SubestacionesConfiguracion from '../../components/views/subestaciones/SubestacionesConfiguracion.svelte';
import { substationAdmin } from '../../stores/substationAdmin.js';
import { configuracionTab, cronogramaAnioInicial, subestacionesActiveTab } from '../../stores/subestacionesFilters.js';
import { subestacionesToast } from '../../stores/subestacionesToast.js';

const ESTACIONES = [
  { id: 1, nombre: 'Ayalas', tipo: 'BOMBEO', frecuenciaBase: 'TRIMESTRAL', activa: true },
  { id: 2, nombre: 'CLAN', tipo: 'COMPLEMENTARIA', frecuenciaBase: 'ANUAL', activa: false },
];
const ACTIVIDADES = [
  { id: 11, nombre: 'Pintura muros estaciones (segun estado)', nombreCorto: 'Pintura muros', disciplina: 'CIVIL',
    capturaMovilHabilitada: true, citasPublicadasAnio: 12, enUso: true, activa: true },
  { id: 14, nombre: 'Inspección infraestructura presa', nombreCorto: null, disciplina: 'CIVIL',
    capturaMovilHabilitada: false, citasPublicadasAnio: 0, enUso: false, activa: true },
];

function cronograma(anio, citas) {
  return { anio, anioActual: 2026, mesActual: 9, citas, borrador: { altas: 0, bajas: 0 } };
}

describe('SubestacionesConfiguracion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStore.set({ currentUser: { name: 'admin', role: 'ADMIN' } });
    configuracionTab.set('est');
    cronogramaAnioInicial.set(null);
    subestacionesActiveTab.set('dashboard');
    substationAdmin.listarEstaciones.mockResolvedValue(ESTACIONES);
    substationAdmin.listarActividades.mockResolvedValue(ACTIVIDADES);
    substationAdmin.obtenerCronograma.mockImplementation(async (anio) =>
      anio === 2027 ? cronograma(2027, []) : cronograma(anio, [
        { id: 1, estado: 'PUBLICADA' }, { id: 2, estado: 'PUBLICADA' }, { id: 3, estado: 'BORRADOR' },
      ]));
  });

  it('un rol distinto de ADMIN ve el aviso y no carga nada', async () => {
    authStore.set({ currentUser: { name: 'sup', role: 'SUPERVISOR_OPERATIVO' } });
    render(SubestacionesConfiguracion);

    expect(screen.getByText('Configuración disponible solo para ADMIN')).toBeTruthy();
    expect(substationAdmin.listarEstaciones).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByText('Volver a Seguimiento'));
    expect(push).toHaveBeenCalledWith('/subestaciones');
  });

  it('lista las estaciones con su estado y sin columna Código', async () => {
    render(SubestacionesConfiguracion);

    expect(await screen.findByText('Ayalas')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy(); // contador
    expect(screen.getByText('✓ Activa')).toBeTruthy();
    expect(screen.getByText('○ Inactiva')).toBeTruthy();
    expect(screen.getByText('Trimestral')).toBeTruthy();
    expect(screen.queryByText('Código')).toBeNull();
  });

  it('pestaña Actividades: nombre corto, captura móvil y citas del año del servidor', async () => {
    render(SubestacionesConfiguracion);
    await screen.findByText('Ayalas');
    await fireEvent.click(screen.getByRole('tab', { name: 'Actividades' }));

    expect(screen.getByText('Pintura muros')).toBeTruthy();
    expect(screen.getByText('No — solo web')).toBeTruthy();
    expect(screen.getByText('Citas 2026')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('nueva estación: guarda y vuelve a cargar', async () => {
    substationAdmin.crearEstacion.mockResolvedValue({ id: 3 });
    render(SubestacionesConfiguracion);
    await screen.findByText('Ayalas');

    await fireEvent.click(screen.getByText('+ Nueva estación'));
    const nombre = screen.getByLabelText('Nombre');
    await fireEvent.input(nombre, { target: { value: 'Duitama' } });
    await fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => expect(substationAdmin.crearEstacion).toHaveBeenCalledWith(
      { nombre: 'Duitama', tipo: 'BOMBEO', frecuenciaBase: 'TRIMESTRAL' }));
    await waitFor(() => expect(substationAdmin.listarEstaciones).toHaveBeenCalledTimes(2));
  });

  it('desactivar una estación pide confirmación en dos pasos y avisa las citas futuras retiradas', async () => {
    substationAdmin.cambiarEstadoEstacion.mockResolvedValue({ id: 1, activa: false, citasRetiradas: 3 });
    render(SubestacionesConfiguracion);
    await fireEvent.click(await screen.findByText('Ayalas'));

    await fireEvent.click(screen.getByText('Desactivar'));
    expect(substationAdmin.cambiarEstadoEstacion).not.toHaveBeenCalled();
    expect(screen.getByText(/¿Confirmar\? Sus citas de los próximos meses quedan en borrador/)).toBeTruthy();

    await fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => expect(substationAdmin.cambiarEstadoEstacion).toHaveBeenCalledWith(1, false));
    expect(get(subestacionesToast)?.text)
      .toBe('Estación desactivada · 3 cita(s) futura(s) quedan en borrador para quitarse al publicar');
  });

  it('una estación inactiva se reactiva en un solo paso', async () => {
    substationAdmin.cambiarEstadoEstacion.mockResolvedValue({});
    render(SubestacionesConfiguracion);
    await fireEvent.click(await screen.findByText('CLAN'));

    await fireEvent.click(screen.getByText('Reactivar'));
    await waitFor(() => expect(substationAdmin.cambiarEstadoEstacion).toHaveBeenCalledWith(2, true));
  });

  it('actividad en uso: la disciplina queda bloqueada; sin uso se puede cambiar', async () => {
    render(SubestacionesConfiguracion);
    await screen.findByText('Ayalas');
    await fireEvent.click(screen.getByRole('tab', { name: 'Actividades' }));

    await fireEvent.click(screen.getByText('Pintura muros estaciones (segun estado)'));
    expect(screen.getByLabelText(/Disciplina/).disabled).toBe(true);
    expect(screen.getByText(/No se puede cambiar: la actividad ya tiene citas o ejecuciones/)).toBeTruthy();
    await fireEvent.click(screen.getByLabelText('Cerrar'));

    await fireEvent.click(screen.getByText('Inspección infraestructura presa'));
    expect(screen.getByLabelText(/Disciplina/).disabled).toBe(false);
  });

  it('actividad: un nombre corto de más de 24 caracteres deshabilita Guardar', async () => {
    render(SubestacionesConfiguracion);
    await screen.findByText('Ayalas');
    await fireEvent.click(screen.getByRole('tab', { name: 'Actividades' }));
    await fireEvent.click(screen.getByText('Pintura muros estaciones (segun estado)'));

    const corto = screen.getByLabelText(/Nombre corto/);
    await fireEvent.input(corto, { target: { value: 'x'.repeat(25) } });

    expect(screen.getByText('Guardar').disabled).toBe(true);
  });

  it('Programación: copia el año siguiente y abre el Cronograma en ese año', async () => {
    substationAdmin.copiarAnio.mockResolvedValue({ creadas: 2 });
    render(SubestacionesConfiguracion);
    await screen.findByText('Ayalas');
    await fireEvent.click(screen.getByRole('tab', { name: 'Programación' }));

    expect(screen.getByText('Preparar cronograma 2027')).toBeTruthy();
    expect(screen.getByText(/Omitir estaciones inactivas \(1\)/)).toBeTruthy();

    await fireEvent.click(screen.getByText('Copiar a 2027'));

    await waitFor(() => expect(substationAdmin.copiarAnio).toHaveBeenCalledWith(2026, 2027));
    expect(get(cronogramaAnioInicial)).toBe(2027);
    expect(get(subestacionesActiveTab)).toBe('cronograma');
    expect(push).toHaveBeenCalledWith('/subestaciones');
  });

  it('Programación: el origen cuenta solo las citas publicadas', async () => {
    render(SubestacionesConfiguracion);
    await screen.findByText('Ayalas');
    await fireEvent.click(screen.getByRole('tab', { name: 'Programación' }));

    expect(screen.getByText(/Copia las 2 citas de 2026 a 2027/)).toBeTruthy();
  });

  it('si falla la carga muestra el error con "Reintentar"', async () => {
    substationAdmin.listarEstaciones.mockRejectedValueOnce(new Error('Sin conexión'));
    render(SubestacionesConfiguracion);

    expect(await screen.findByText('No se pudo cargar la configuración')).toBeTruthy();
    await fireEvent.click(screen.getByText('Reintentar'));
    expect(await screen.findByText('Ayalas')).toBeTruthy();
  });

  it('en el modal, Enter guarda y el cursor empieza en "Nombre"', async () => {
    substationAdmin.crearEstacion.mockResolvedValue({ id: 3 });
    render(SubestacionesConfiguracion);
    await screen.findByText('Ayalas');
    await fireEvent.click(screen.getByText('+ Nueva estación'));

    const nombre = screen.getByLabelText('Nombre');
    expect(document.activeElement).toBe(nombre);
    await fireEvent.input(nombre, { target: { value: 'Tunja' } });
    await fireEvent.submit(nombre.closest('form'));
    await waitFor(() => expect(substationAdmin.crearEstacion).toHaveBeenCalled());
  });

  it('desactivar desde el modal no guarda el formulario por error', async () => {
    substationAdmin.cambiarEstadoEstacion.mockResolvedValue({});
    render(SubestacionesConfiguracion);
    await fireEvent.click(await screen.findByText('Ayalas'));
    await fireEvent.click(screen.getByText('Desactivar'));
    expect(substationAdmin.actualizarEstacion).not.toHaveBeenCalled();
  });
});
