import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('../../stores/substationAdmin.js', () => ({
  substationAdmin: {
    obtenerEjecucion: vi.fn(),
    operarios: vi.fn(),
    listarActividades: vi.fn(),
    crearOrden: vi.fn(),
    resolverHallazgo: vi.fn(),
    visitasPosteriores: vi.fn(),
  },
}));

import SeguimientoHallazgo from '../../components/views/subestaciones/ordenes/SeguimientoHallazgo.svelte';
import { substationAdmin } from '../../stores/substationAdmin.js';
import { ordenDetalleId, subestacionesActiveTab } from '../../stores/subestacionesFilters.js';

const hallazgo = (seguimiento) => ({
  id: 7, fecha: '2026-10-12', estacionId: 11, estacionNombre: 'Duitama', disciplina: 'CIVIL', actividadId: null,
  descripcionLibre: 'Revisión', resultado: 'REQUIERE_INTERVENCION', observaciones: 'Fisura en el muro norte',
  responsable: 'op.ot', evidencias: [], seguimiento,
});

describe('SeguimientoHallazgo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ordenDetalleId.set(null);
    subestacionesActiveTab.set('ejecuciones');
    substationAdmin.operarios.mockResolvedValue([{ id: 3, nombre: 'Orlando Operario', username: 'op.ot' }]);
    substationAdmin.listarActividades.mockResolvedValue([
      { id: 1, nombre: 'Corrección hallazgos civiles', disciplina: 'CIVIL', activa: true },
      { id: 20, nombre: 'Termografía', disciplina: 'ELECTRICO', activa: true },
    ]);
    substationAdmin.obtenerEjecucion.mockResolvedValue(hallazgo({ estado: 'EN_PROCESO', orden: { id: 5, consecutivo: 'OT-EB-00005', estado: 'ASIGNADA' } }));
  });

  it('una visita conforme no muestra nada', () => {
    const { container } = render(SeguimientoHallazgo, { ejecucion: { ...hallazgo(null), resultado: 'CONFORME' } });
    expect(container.textContent.trim()).toBe('');
  });

  it('crear orden: sugiere prioridad alta, el único operario y una actividad de la misma disciplina', async () => {
    substationAdmin.crearOrden.mockResolvedValue({ id: 5, consecutivo: 'OT-EB-00005' });
    const { component } = render(SeguimientoHallazgo, { ejecucion: hallazgo({ estado: 'ABIERTO' }) });
    const cambio = vi.fn();
    component.$on('cambio', cambio);

    await fireEvent.click(screen.getByText('Crear orden de trabajo'));
    await screen.findByRole('option', { name: 'Orlando Operario' });
    expect(screen.queryByRole('option', { name: 'Termografía' })).toBeNull();
    const crear = screen.getByRole('button', { name: 'Crear orden' });
    expect(crear.disabled).toBe(true); // faltan instrucciones
    await fireEvent.input(screen.getByPlaceholderText(/Qué hay que hacer/), { target: { value: 'Sellar la fisura' } });
    await fireEvent.click(crear);

    await waitFor(() => expect(substationAdmin.crearOrden).toHaveBeenCalledWith(expect.objectContaining({
      ejecucionOrigenId: 7, prioridad: 'ALTA', asignadoAId: 3, paraCualquiera: false, actividadId: 1, instrucciones: 'Sellar la fisura',
    })));
    await waitFor(() => expect(cambio).toHaveBeenCalled());
  });

  it('resolver sin orden: en la misma visita', async () => {
    substationAdmin.visitasPosteriores.mockResolvedValue({ content: [] });
    substationAdmin.resolverHallazgo.mockResolvedValue({ estado: 'RESUELTO' });
    render(SeguimientoHallazgo, { ejecucion: hallazgo({ estado: 'ABIERTO' }) });

    await fireEvent.click(screen.getByText('Resolver sin orden'));
    await fireEvent.input(await screen.findByPlaceholderText(/se selló/), { target: { value: 'Se corrigió en sitio' } });
    await fireEvent.click(screen.getByLabelText(/misma visita/));
    await fireEvent.click(screen.getByRole('button', { name: 'Marcar resuelto' }));

    await waitFor(() => expect(substationAdmin.resolverHallazgo).toHaveBeenCalledWith(7, {
      observacionesCierre: 'Se corrigió en sitio', resueltoMismaVisita: true, resueltoEnEjecucionId: null,
    }));
  });

  it('con orden en curso no ofrece crear otra; "Ver orden" abre la pestaña de órdenes', async () => {
    render(SeguimientoHallazgo, { ejecucion: hallazgo({ estado: 'EN_PROCESO', orden: { id: 5, consecutivo: 'OT-EB-00005', estado: 'ASIGNADA' } }) });

    expect(screen.getByText('OT-EB-00005')).toBeTruthy();
    expect(screen.queryByText('Crear orden de trabajo')).toBeNull();
    await fireEvent.click(screen.getByText('Ver orden →'));
    expect(get(ordenDetalleId)).toBe(5);
    expect(get(subestacionesActiveTab)).toBe('ordenes');
  });

  it('resuelto: quién, cuándo y dónde', () => {
    render(SeguimientoHallazgo, { ejecucion: hallazgo({
      estado: 'RESUELTO', cerradoPor: 'Carlos Rivas', cerradoEn: '2026-10-18T16:00:00', observacionesCierre: 'OT-EB-00005: sellada',
      resueltoEnEjecucionId: 9, resueltoEnEjecucionFecha: '2026-10-18', resueltoMismaVisita: false,
    }) });
    expect(screen.getByText('Carlos Rivas')).toBeTruthy();
    expect(screen.getByText(/en la visita del 18\/10\/2026/)).toBeTruthy();
    expect(screen.getByText('"OT-EB-00005: sellada"')).toBeTruthy();
  });

  it('crear orden para cualquier operario: sin asignado y con paraCualquiera', async () => {
    substationAdmin.operarios.mockResolvedValue([
      { id: 3, nombre: 'Orlando Operario', username: 'op.ot' }, { id: 4, nombre: 'Ana Operaria', username: 'ana' },
    ]);
    substationAdmin.crearOrden.mockResolvedValue({ id: 6, consecutivo: 'OT-EB-00006' });
    const { container } = render(SeguimientoHallazgo, { ejecucion: hallazgo({ estado: 'ABIERTO' }) });

    await fireEvent.click(screen.getByText('Crear orden de trabajo'));
    await screen.findByRole('option', { name: 'Ana Operaria' });
    const asignar = container.ownerDocument.querySelectorAll('[aria-label="Crear orden de trabajo"] select')[0];
    await fireEvent.change(asignar, { target: { value: 'cualquiera' } });
    expect(screen.getByText(/queda a nombre de quien la registre/)).toBeTruthy();
    await fireEvent.input(screen.getByPlaceholderText(/Qué hay que hacer/), { target: { value: 'Revisar' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Crear orden' }));

    await waitFor(() => expect(substationAdmin.crearOrden).toHaveBeenCalledWith(expect.objectContaining({
      asignadoAId: null, paraCualquiera: true,
    })));
  });
});
