import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import SubestacionEjecucionDetalleModal from '../../components/shared/SubestacionEjecucionDetalleModal.svelte';

vi.mock('../../stores/api.js', () => ({
  getFileUrl: vi.fn((path) => `http://api.test${path}`),
}));

vi.mock('../../stores/ui.js', () => ({
  ui: {
    openImageModal: vi.fn(),
    setImageModalLoading: vi.fn(),
    setImageModalUrls: vi.fn(),
  },
}));

import { ui } from '../../stores/ui.js';

const ejecucionBase = {
  id: 42,
  estacionNombre: 'Duitama',
  fecha: '2026-05-14',
  mesEjecucion: 5,
  semanaEjecucion: 2,
  tipoMantenimiento: 'PREVENTIVO',
  tipoActividad: 'INSPECCION',
  actividadNombre: 'Pintura muros',
  descripcionLibre: null,
  esProgramada: true,
  resultado: 'CON_HALLAZGOS',
  responsable: 'Juan Carlos Ochoa',
  observaciones: 'Se encontraron fisuras menores en el muro sur.',
  evidenciaPendiente: false,
  evidencias: [],
  ediciones: [],
};

describe('SubestacionEjecucionDetalleModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el loader mientras carga o si todavía no hay ejecución', () => {
    const { container } = render(SubestacionEjecucionDetalleModal, { props: { ejecucion: null, isLoading: true } });
    expect(container.querySelector('.modal-loading')).toBeTruthy();
    expect(screen.queryByText('Detalle de ejecución')).toBeNull();
  });

  it('muestra los datos principales de la ejecución', () => {
    render(SubestacionEjecucionDetalleModal, { props: { ejecucion: ejecucionBase, isLoading: false } });
    expect(screen.getByText('Detalle de ejecución')).toBeTruthy();
    expect(screen.getByText('Pintura muros')).toBeTruthy();
    expect(screen.getByText('Juan Carlos Ochoa')).toBeTruthy();
    expect(screen.getByText('Se encontraron fisuras menores en el muro sur.')).toBeTruthy();
    expect(screen.getByText('Con hallazgos')).toBeTruthy();
  });

  it('muestra la descripción libre cuando no hay actividad de catálogo (registro no programado)', () => {
    render(SubestacionEjecucionDetalleModal, {
      props: { ejecucion: { ...ejecucionBase, actividadNombre: null, descripcionLibre: 'Corrección de hallazgo puntual' }, isLoading: false },
    });
    expect(screen.getByText('Corrección de hallazgo puntual')).toBeTruthy();
  });

  it('muestra el aviso de evidencia pendiente solo cuando el backend lo marca', async () => {
    const { component } = render(SubestacionEjecucionDetalleModal, {
      props: { ejecucion: { ...ejecucionBase, evidenciaPendiente: true }, isLoading: false },
    });
    expect(screen.getByText(/todavía no tiene fotos de evidencia/)).toBeTruthy();

    component.$set({ ejecucion: { ...ejecucionBase, evidenciaPendiente: false } });
    await tick();
    expect(screen.queryByText(/todavía no tiene fotos de evidencia/)).toBeNull();
  });

  it('muestra "sin fotos"/"sin ediciones" cuando vienen vacías', () => {
    render(SubestacionEjecucionDetalleModal, { props: { ejecucion: ejecucionBase, isLoading: false } });
    expect(screen.getByText('Sin fotos de evidencia.')).toBeTruthy();
    expect(screen.getByText('Sin ediciones registradas.')).toBeTruthy();
  });

  it('renderiza la galería de evidencia y agrega el prefijo /uploads/ si la ruta no lo trae (compatibilidad con evidencia anterior a V40)', () => {
    render(SubestacionEjecucionDetalleModal, {
      props: {
        ejecucion: {
          ...ejecucionBase,
          evidencias: [
            { rutaArchivo: '/uploads/subestaciones/ejecuciones/42/a.jpg', nombreOriginal: 'a.jpg' },
            { rutaArchivo: 'subestaciones/ejecuciones/42/b.jpg', nombreOriginal: 'b.jpg' },
          ],
        },
        isLoading: false,
      },
    });

    const imgs = screen.getAllByRole('img');
    expect(imgs).toHaveLength(2);
    expect(imgs[0].src).toBe('http://api.test/uploads/subestaciones/ejecuciones/42/a.jpg');
    expect(imgs[1].src).toBe('http://api.test/uploads/subestaciones/ejecuciones/42/b.jpg');
  });

  it('abre la galería del visor de imágenes global al hacer clic en una miniatura', async () => {
    render(SubestacionEjecucionDetalleModal, {
      props: {
        ejecucion: { ...ejecucionBase, evidencias: [{ rutaArchivo: '/uploads/a.jpg', nombreOriginal: 'a.jpg' }] },
        isLoading: false,
      },
    });

    await fireEvent.click(screen.getByRole('img', { name: 'a.jpg' }).parentElement);

    expect(ui.openImageModal).toHaveBeenCalled();
    expect(ui.setImageModalUrls).toHaveBeenCalledWith([{ url: 'http://api.test/uploads/a.jpg', name: 'a.jpg' }]);
  });

  it('muestra el historial de ediciones cuando existen', () => {
    render(SubestacionEjecucionDetalleModal, {
      props: {
        ejecucion: { ...ejecucionBase, ediciones: [{ usuario: 'admin', motivo: 'Se corrigió el resultado tras revisión en campo', editadoEn: '2026-05-20T10:30:00' }] },
        isLoading: false,
      },
    });
    expect(screen.getByText('admin corrigió el registro')).toBeTruthy();
    expect(screen.getByText(/Se corrigió el resultado tras revisión en campo/)).toBeTruthy();
  });

  it('dispara el evento close al hacer clic en el botón cerrar del pie, en el overlay y con la tecla Escape', async () => {
    const { component, container } = render(SubestacionEjecucionDetalleModal, { props: { ejecucion: ejecucionBase, isLoading: false } });
    const onClose = vi.fn();
    component.$on('close', onClose);

    await fireEvent.click(container.querySelector('.btn-close'));
    expect(onClose).toHaveBeenCalledTimes(1);

    await fireEvent.click(container.querySelector('.overlay'));
    expect(onClose).toHaveBeenCalledTimes(2);

    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('el botón ✕ de la cabecera también cierra el modal', async () => {
    const { component, container } = render(SubestacionEjecucionDetalleModal, { props: { ejecucion: ejecucionBase, isLoading: false } });
    const onClose = vi.fn();
    component.$on('close', onClose);

    await fireEvent.click(container.querySelector('.close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('no cierra al hacer clic dentro del modal (solo el overlay debe cerrar)', async () => {
    const { component, container } = render(SubestacionEjecucionDetalleModal, { props: { ejecucion: ejecucionBase, isLoading: false } });
    const onClose = vi.fn();
    component.$on('close', onClose);

    await fireEvent.click(container.querySelector('.modal'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
