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
    listarConjuntos: vi.fn(),
    crearConjunto: vi.fn(),
    actualizarConjunto: vi.fn(),
    cambiarEstadoConjunto: vi.fn(),
    listarElementos: vi.fn(),
    crearElemento: vi.fn(),
    actualizarElemento: vi.fn(),
    cambiarEstadoElemento: vi.fn(),
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

const CONJUNTOS = [
  { id: 21, nombre: 'Gabinetes de control', disciplina: 'ELECTRICO', activa: true, enUso: true, icono: 'GABINETE' },
  { id: 22, nombre: 'Postes', disciplina: 'ELECTRICO', activa: false, enUso: false },
];
const ELEMENTOS = [
  { id: 31, nombre: 'Breaker', disciplina: 'ELECTRICO', activa: true, enUso: false },
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
    substationAdmin.listarConjuntos.mockResolvedValue(CONJUNTOS);
    substationAdmin.listarElementos.mockResolvedValue(ELEMENTOS);
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

  it('las tablas de estaciones y actividades se ordenan con clic en el encabezado', async () => {
    const { container } = render(SubestacionesConfiguracion);
    await screen.findByText('Ayalas');
    const primera = () => container.querySelector('.sub-tr.clickable span').textContent.trim();

    expect(primera()).toBe('Ayalas');
    await fireEvent.click(screen.getByRole('button', { name: /^Nombre/ }));
    await fireEvent.click(screen.getByRole('button', { name: /^Nombre/ }));
    expect(primera()).toBe('CLAN');
    await fireEvent.click(screen.getByRole('button', { name: /^Frecuencia base/ }));
    expect(primera()).toBe('Ayalas'); // trimestral antes que anual

    await fireEvent.click(screen.getByRole('tab', { name: 'Actividades' }));
    expect(primera()).toBe('Pintura muros estaciones (segun estado)');
    await fireEvent.click(screen.getByRole('button', { name: /^Nombre corto/ }));
    expect(primera()).toBe('Pintura muros estaciones (segun estado)'); // sin nombre corto, al final
    await fireEvent.click(screen.getByRole('button', { name: /^Citas 2026/ }));
    await fireEvent.click(screen.getByRole('button', { name: /^Citas 2026/ }));
    expect(primera()).toBe('Inspección infraestructura presa'); // 0 citas primero en ascendente
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

  it('pestaña Conjuntos: nombre, disciplina y estado (sin la columna "¿Ya se usó?")', async () => {
    render(SubestacionesConfiguracion);
    await screen.findByText('Ayalas');
    await fireEvent.click(screen.getByRole('tab', { name: 'Conjuntos' }));

    expect(screen.getByText('Gabinetes de control')).toBeTruthy();
    expect(screen.queryByText('¿Ya se usó?')).toBeNull();
    expect(screen.getByText('✓ Activo')).toBeTruthy();
    expect(screen.getByText('○ Inactivo')).toBeTruthy();
    expect(screen.getAllByText('Eléctrico').length).toBe(2);
  });

  it('Elementos: muchos se paginan de a 20 y el buscador filtra sin tildes', async () => {
    substationAdmin.listarElementos.mockResolvedValue(Array.from({ length: 45 }, (_, i) => ({
      id: 100 + i, nombre: `Elemento ${String(i + 1).padStart(2, '0')}`, disciplina: 'ELECTRICO', activa: true, enUso: false,
    })).concat({ id: 200, nombre: 'Bujía de encendido', disciplina: 'ELECTRICO', activa: true, enUso: false }));
    render(SubestacionesConfiguracion);
    await screen.findByText('Ayalas');
    await fireEvent.click(screen.getByRole('tab', { name: 'Elementos' }));

    expect(await screen.findByText('Mostrando 1–20 de 46')).toBeTruthy();
    expect(screen.getByText('Elemento 20')).toBeTruthy();
    expect(screen.queryByText('Elemento 21')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Siguiente ›' }));
    expect(screen.getByText('Mostrando 21–40 de 46')).toBeTruthy();
    expect(screen.getByText('Elemento 21')).toBeTruthy();

    // La cantidad por página se elige; al cambiarla vuelve a la página 1.
    await fireEvent.change(screen.getByLabelText('Filas por página'), { target: { value: '50' } });
    expect(screen.getByText('Mostrando 1–46 de 46')).toBeTruthy();
    expect(screen.getByText('Elemento 45')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Siguiente ›' }).disabled).toBe(true);

    // Buscar vuelve a la página 1; con una sola página no hay paginación.
    await fireEvent.input(screen.getByRole('searchbox', { name: 'Buscar elemento' }), { target: { value: 'BUJIA' } });
    expect(screen.getByText('Bujía de encendido')).toBeTruthy();
    expect(screen.queryByText('Elemento 01')).toBeNull();
    expect(screen.queryByText(/Mostrando/)).toBeNull();
    await fireEvent.input(screen.getByRole('searchbox', { name: 'Buscar elemento' }), { target: { value: 'zzz' } });
    expect(screen.getByText('Ningún elemento coincide con «zzz».')).toBeTruthy();
  });

  it('nuevo elemento: arranca en Eléctrico, guarda con nombre y disciplina y recarga', async () => {
    substationAdmin.crearElemento.mockResolvedValue({ id: 32 });
    render(SubestacionesConfiguracion);
    await screen.findByText('Ayalas');
    await fireEvent.click(screen.getByRole('tab', { name: 'Elementos' }));
    await fireEvent.click(screen.getByText('+ Nuevo elemento'));

    expect(screen.getByText('Nuevo elemento')).toBeTruthy();
    expect(screen.getByLabelText(/Disciplina/).value).toBe('ELECTRICO');
    expect(screen.queryByLabelText(/Nombre corto/)).toBeNull();
    await fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Celda de medida' } });
    await fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => expect(substationAdmin.crearElemento)
      .toHaveBeenCalledWith({ nombre: 'Celda de medida', disciplina: 'ELECTRICO' }));
    await waitFor(() => expect(substationAdmin.listarElementos).toHaveBeenCalledTimes(2));
  });

  it('conjunto en uso: no cambia de disciplina y se desactiva en un solo paso', async () => {
    substationAdmin.cambiarEstadoConjunto.mockResolvedValue({});
    render(SubestacionesConfiguracion);
    await screen.findByText('Ayalas');
    await fireEvent.click(screen.getByRole('tab', { name: 'Conjuntos' }));
    await fireEvent.click(screen.getByText('Gabinetes de control'));

    expect(screen.getByLabelText(/Disciplina/).disabled).toBe(true);
    expect(screen.getByText(/ya está marcado en visitas/)).toBeTruthy();
    await fireEvent.click(screen.getByText('Desactivar'));

    await waitFor(() => expect(substationAdmin.cambiarEstadoConjunto).toHaveBeenCalledWith(21, false));
    expect(get(subestacionesToast)?.text).toBe('Conjunto desactivado');
  });

  it('un conjunto inactivo se reactiva', async () => {
    substationAdmin.cambiarEstadoConjunto.mockResolvedValue({});
    render(SubestacionesConfiguracion);
    await screen.findByText('Ayalas');
    await fireEvent.click(screen.getByRole('tab', { name: 'Conjuntos' }));
    await fireEvent.click(screen.getByText('Postes'));

    await fireEvent.click(screen.getByText('Reactivar'));
    await waitFor(() => expect(substationAdmin.cambiarEstadoConjunto).toHaveBeenCalledWith(22, true));
  });

  it('conjunto: se elige el ícono del móvil; el genérico se guarda como null', async () => {
    substationAdmin.crearConjunto.mockResolvedValue({ id: 23 });
    substationAdmin.actualizarConjunto.mockResolvedValue({});
    render(SubestacionesConfiguracion);
    await screen.findByText('Ayalas');
    await fireEvent.click(screen.getByRole('tab', { name: 'Conjuntos' }));

    await fireEvent.click(screen.getByText('Gabinetes de control'));
    expect(screen.getByRole('radio', { name: 'Gabinete' }).getAttribute('aria-checked')).toBe('true');
    await fireEvent.click(screen.getByRole('radio', { name: 'Motor' }));
    await fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => expect(substationAdmin.actualizarConjunto)
      .toHaveBeenCalledWith(21, { nombre: 'Gabinetes de control', disciplina: 'ELECTRICO', icono: 'MOTOR' }));

    await fireEvent.click(await screen.findByText('+ Nuevo conjunto'));
    expect(screen.getByRole('radio', { name: 'Genérico' }).getAttribute('aria-checked')).toBe('true');
    await fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Tablero de bombas' } });
    await fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => expect(substationAdmin.crearConjunto)
      .toHaveBeenCalledWith({ nombre: 'Tablero de bombas', disciplina: 'ELECTRICO', icono: null }));
  });
});
