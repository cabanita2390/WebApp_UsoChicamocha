import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('../../stores/ui.js', () => ({
  ui: { openImageModal: vi.fn(), setImageModalLoading: vi.fn(), setImageModalUrls: vi.fn() },
  addNotification: vi.fn(),
}));
vi.mock('../../stores/substationAdmin.js', () => ({
  substationAdmin: {
    listarEstaciones: vi.fn(),
    listarOrdenes: vi.fn(),
    obtenerOrden: vi.fn(),
    cerrarOrden: vi.fn(),
    devolverOrden: vi.fn(),
    anularOrden: vi.fn(),
    editarOrden: vi.fn(),
    operarios: vi.fn(),
  },
}));

import OrdenesTrabajo from '../../components/views/subestaciones/ordenes/OrdenesTrabajo.svelte';
import { substationAdmin } from '../../stores/substationAdmin.js';
import { ordenDetalleId, disciplinaFiltro } from '../../stores/subestacionesFilters.js';
import { subestacionesToast } from '../../stores/subestacionesToast.js';

const resumen = (extra = {}) => ({
  id: 2, consecutivo: 'OT-EB-00002', estado: 'POR_VERIFICAR', prioridad: 'ALTA', fechaLimite: '2026-10-19', vencida: false,
  diasAbierta: 1, estacionId: 11, estacionNombre: 'Duitama', disciplina: 'CIVIL', actividadId: 1,
  actividadNombre: 'Corrección hallazgos', asignadoAId: 3, asignadoANombre: 'Orlando Operario',
  instrucciones: 'Sellar la fisura con mortero epóxico.', creadoPor: 'Carlos Rivas', creadoEn: '2026-10-18T15:53:00',
  hallazgoEjecucionId: 7, hallazgoFecha: '2026-10-12', hallazgoResultado: 'REQUIERE_INTERVENCION',
  hallazgoObservaciones: 'Fisura de 1,2 m en el muro norte.', ...extra,
});
const visita = (id, obs, resultado, extra = {}) => ({
  id, fecha: '2026-10-18', responsable: 'op.ot', resultado, observaciones: obs, evidencias: [], estacionNombre: 'Duitama',
  mesEjecucion: 10, semanaEjecucion: 3, esProgramada: false, ediciones: [], ...extra,
});
const detalle = (extra = {}) => ({
  orden: resumen(), hallazgo: visita(7, 'Fisura de 1,2 m en el muro norte.', 'REQUIERE_INTERVENCION'),
  ejecucion: visita(9, 'Se selló con mortero epóxico.', 'CONFORME'), observacionCierre: null, verificadoPor: null,
  verificadoEn: null, motivoAnulacion: null,
  eventos: [
    { id: 1, tipo: 'CREADA', comentario: 'Asignada a Orlando Operario', usuario: 'Carlos Rivas', creadoEn: '2026-10-18T15:53:00' },
    { id: 2, tipo: 'EJECUTADA', comentario: 'Registrada desde el móvil', usuario: 'Orlando Operario', creadoEn: '2026-10-18T16:10:00' },
  ],
  ...extra,
});
const pagina = (content) => ({ content, totalElements: content.length, totalPages: 1 });

describe('OrdenesTrabajo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ordenDetalleId.set(null);
    disciplinaFiltro.set('');
    substationAdmin.listarEstaciones.mockResolvedValue([{ id: 11, nombre: 'Duitama', activa: true }]);
    substationAdmin.listarOrdenes.mockImplementation(async (f, page, size) =>
      size === 1 ? { content: [], totalElements: f.vencidas ? 0 : 1, totalPages: 1 } : pagina([resumen()]));
    substationAdmin.obtenerOrden.mockResolvedValue(detalle());
  });

  it('lista las pendientes por defecto con prioridad, asignado, plazo y estado', async () => {
    render(OrdenesTrabajo);

    expect(await screen.findByText('OT-EB-00002')).toBeTruthy();
    expect(substationAdmin.listarOrdenes).toHaveBeenCalledWith(
      expect.objectContaining({ estado: ['ASIGNADA', 'POR_VERIFICAR'] }), 0, 20);
    expect(screen.getByText('Duitama', { selector: 'strong' })).toBeTruthy();
    expect(screen.getByText('Orlando Operario')).toBeTruthy();
    expect(screen.getByText('◐ Por verificar')).toBeTruthy();
    expect(screen.getByText('19/10/2026')).toBeTruthy();
  });

  it('la vista "Vencidas" pide solo las vencidas', async () => {
    render(OrdenesTrabajo);
    await screen.findByText('OT-EB-00002');

    await fireEvent.click(screen.getByRole('tab', { name: /Vencidas/ }));

    await waitFor(() => expect(substationAdmin.listarOrdenes).toHaveBeenCalledWith(
      expect.objectContaining({ estado: [], vencidas: true }), 0, 20));
  });

  it('los filtros van en el panel: se aplican con "Aplicar", quedan como chips y el × los quita', async () => {
    render(OrdenesTrabajo);
    await screen.findByText('OT-EB-00002');

    await fireEvent.click(screen.getByRole('button', { name: /^Filtros/ }));
    const panel = screen.getByRole('dialog', { name: 'Filtros' });
    const [estacion, prioridad] = panel.querySelectorAll('select');
    await fireEvent.change(estacion, { target: { value: '11' } });
    await fireEvent.change(prioridad, { target: { value: 'ALTA' } });
    // Sin aplicar todavía no se pide nada con esos filtros.
    expect(substationAdmin.listarOrdenes).not.toHaveBeenCalledWith(expect.objectContaining({ estacionId: '11' }), 0, 20);
    await fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() => expect(substationAdmin.listarOrdenes).toHaveBeenCalledWith(
      expect.objectContaining({ estacionId: '11', prioridad: 'ALTA' }), 0, 20));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: /^Filtros/ }).textContent).toContain('2');

    await fireEvent.click(screen.getByText('Prioridad alta').closest('button'));
    await waitFor(() => expect(substationAdmin.listarOrdenes).toHaveBeenLastCalledWith(
      expect.objectContaining({ estacionId: '11', prioridad: '' }), 0, expect.any(Number)));
    expect(screen.queryByText('Prioridad alta')).toBeNull();
  });

  it('el detalle muestra antes y después, y verificar la cierra con la observación', async () => {
    substationAdmin.cerrarOrden.mockResolvedValue(resumen({ estado: 'CERRADA' }));
    render(OrdenesTrabajo);
    await fireEvent.click(await screen.findByText('OT-EB-00002'));

    expect(await screen.findByText('Antes · el hallazgo')).toBeTruthy();
    expect(screen.getByText('Después · la corrección')).toBeTruthy();
    expect(screen.getByText('Se selló con mortero epóxico.')).toBeTruthy();
    expect(screen.getByText('El operario registró el trabajo')).toBeTruthy();

    await fireEvent.click(screen.getByText('✓ Verificar y cerrar'));
    const cerrar = screen.getByRole('button', { name: 'Verificar y cerrar' });
    expect(cerrar.disabled).toBe(true); // sin observación no se puede
    await fireEvent.input(screen.getByPlaceholderText(/revisado en sitio/), { target: { value: 'Quedó sellada.' } });
    await fireEvent.click(cerrar);

    await waitFor(() => expect(substationAdmin.cerrarOrden).toHaveBeenCalledWith(2, 'Quedó sellada.'));
    expect(get(subestacionesToast)?.text).toContain('OT-EB-00002 cerrada');
  });

  it('una orden asignada se puede devolver solo cuando está por verificar; asignada se edita o anula', async () => {
    substationAdmin.obtenerOrden.mockResolvedValue(detalle({ orden: resumen({ estado: 'ASIGNADA' }), ejecucion: null }));
    substationAdmin.anularOrden.mockResolvedValue(resumen({ estado: 'ANULADA' }));
    ordenDetalleId.set(2);
    render(OrdenesTrabajo);

    expect(await screen.findByText(/El operario todavía no registra el trabajo/)).toBeTruthy();
    expect(screen.queryByText('↺ Devolver al operario')).toBeNull();
    expect(screen.getByText('Editar')).toBeTruthy();

    await fireEvent.click(screen.getByText('Anular'));
    await fireEvent.input(screen.getByPlaceholderText(/contratista de la obra/), { target: { value: 'No procede' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Anular orden' }));
    await waitFor(() => expect(substationAdmin.anularOrden).toHaveBeenCalledWith(2, 'No procede'));
  });

  it('volver deja la lista', async () => {
    ordenDetalleId.set(2);
    render(OrdenesTrabajo);
    await fireEvent.click(await screen.findByText('← Órdenes de trabajo'));
    expect(get(ordenDetalleId)).toBeNull();
    expect(await screen.findByRole('tab', { name: /Pendientes/ })).toBeTruthy();
  });

  it('una orden para cualquier operario se ve así en la lista y en el detalle', async () => {
    const general = resumen({ id: 8, consecutivo: 'OT-EB-00008', estado: 'ASIGNADA', asignadoAId: null, asignadoANombre: null, paraCualquiera: true });
    substationAdmin.listarOrdenes.mockImplementation(async (f, page, size) =>
      size === 1 ? { content: [], totalElements: 0, totalPages: 1 } : pagina([general]));
    substationAdmin.obtenerOrden.mockResolvedValue(detalle({ orden: general, ejecucion: null }));
    render(OrdenesTrabajo);

    expect(await screen.findByText('Cualquier operario')).toBeTruthy();
    await fireEvent.click(screen.getByText('OT-EB-00008'));
    expect(await screen.findByText(/la ven todos; queda a nombre de quien la registre/)).toBeTruthy();
  });
});
