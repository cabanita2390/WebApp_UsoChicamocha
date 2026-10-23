import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';

vi.mock('../../stores/substationAdmin.js', () => ({
  substationAdmin: { asignar: vi.fn() },
}));

import AsignacionMasiva from '../../components/views/subestaciones/cronograma/AsignacionMasiva.svelte';
import { substationAdmin } from '../../stores/substationAdmin.js';

const ACTIVIDADES = [
  { id: 1, nombre: 'Pintura muros', disciplina: 'CIVIL', capturaMovilHabilitada: true },
  { id: 2, nombre: 'Pintura puertas', disciplina: 'CIVIL', capturaMovilHabilitada: true },
  { id: 3, nombre: 'Compuertas', disciplina: 'CIVIL', capturaMovilHabilitada: false },
  { id: 4, nombre: 'Inspección eléctrica', disciplina: 'ELECTRICO', capturaMovilHabilitada: true },
];
const ESTACIONES = [
  { id: 10, nombre: 'Ayalas', tipo: 'BOMBEO', frecuenciaBase: 'TRIMESTRAL' },
  { id: 11, nombre: 'Duitama', tipo: 'BOMBEO', frecuenciaBase: 'TRIMESTRAL' },
];
const HOY = { anioActual: 2026, mesActual: 10 };

function montar(inicial = {}, citasVigentes = []) {
  return render(AsignacionMasiva, {
    props: { anio: 2026, hoy: HOY, actividades: ACTIVIDADES, estaciones: ESTACIONES, citasVigentes, inicial },
  });
}
const boton = (nombre) => screen.getByRole('button', { name: nombre });
const titulos = (container) => [...container.querySelectorAll('.sec > span:first-child')].map((s) => s.textContent.trim());

describe('AsignacionMasiva', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    substationAdmin.asignar.mockImplementation(async (b) => ({
      creadas: b.estacionIds.length * b.meses.length, omitidasDuplicadas: 0, omitidasMesCerrado: 0, omitidasEstacionInactiva: 0,
    }));
  });

  it('por actividad (por defecto): actividad, estaciones y meses, en ese orden; una sola actividad', async () => {
    const { container } = montar();
    expect(titulos(container)).toEqual(['1 · Disciplina y actividad', '2 · Estaciones', '3 · Meses']);
    await fireEvent.click(boton(/Pintura muros/));
    await fireEvent.click(boton(/Pintura puertas/));
    expect(container.querySelectorAll('.act.on')).toHaveLength(1); // elegir otra reemplaza
  });

  it('por estación: estaciones primero y varias actividades, que se asignan una llamada por actividad', async () => {
    const { container, component } = montar({ modo: 'estacion' });
    const asignado = vi.fn();
    component.$on('asignado', (e) => asignado(e.detail));
    expect(titulos(container)).toEqual(['1 · Estaciones', '2 · Actividades', '3 · Meses']);

    await fireEvent.click(screen.getByLabelText('Ayalas'));
    await fireEvent.click(boton(/Pintura muros/));
    await fireEvent.click(boton(/Compuertas/));
    await fireEvent.click(boton(/^Eléctrico/));
    await fireEvent.click(boton(/Inspección eléctrica/));
    // Ayalas es trimestral: preseleccionó oct (los meses cerrados no); se deja solo octubre.
    for (const b of container.querySelectorAll('.mes.on')) if (b.textContent !== 'Oct') await fireEvent.click(b);

    expect(screen.getByText('Ayalas · 3 actividades × 1 mes')).toBeTruthy();
    expect(screen.getByText(/no tiene captura móvil/)).toBeTruthy(); // Compuertas
    await fireEvent.click(boton('Asignar 3 citas'));

    await waitFor(() => expect(asignado).toHaveBeenCalled());
    expect(substationAdmin.asignar.mock.calls.map(([b]) => b)).toEqual([
      { anio: 2026, actividadId: 1, estacionIds: [10], meses: [10] },
      { anio: 2026, actividadId: 3, estacionIds: [10], meses: [10] },
      { anio: 2026, actividadId: 4, estacionIds: [10], meses: [10] },
    ]);
    expect(asignado.mock.calls[0][0].resultado.creadas).toBe(3);
    expect(asignado.mock.calls[0][0].actividad).toBeNull();
    expect(asignado.mock.calls[0][0].actividades.map((a) => a.id)).toEqual([1, 3, 4]);
  });

  it('por estación: cuenta aparte lo que ya estaba en el cronograma', async () => {
    montar({ modo: 'estacion', estacionIds: [10], meses: [10], actividadIds: [1, 2] }, [
      { actividadId: 1, estacionId: 10, mes: 10 },
    ]);
    expect(screen.getByText('1 ya existían en el cronograma y se omiten.')).toBeTruthy();
    await fireEvent.click(boton('Asignar 1 cita'));
    await waitFor(() => expect(substationAdmin.asignar).toHaveBeenCalledTimes(1)); // la completa no se envía
    expect(substationAdmin.asignar.mock.calls[0][0].actividadId).toBe(2);
  });

  it('"Marcar todas" marca y desmarca las actividades de la disciplina visible', async () => {
    const { container } = montar({ modo: 'estacion' });
    await fireEvent.click(boton('Marcar todas'));
    expect(container.querySelectorAll('.act.on')).toHaveLength(3);
    await fireEvent.click(boton('Desmarcar todas'));
    expect(container.querySelectorAll('.act.on')).toHaveLength(0);
  });

  it('cambiar de modo conserva estaciones, meses y la actividad elegida', async () => {
    const { container } = montar({ estacionIds: [10], meses: [11] });
    await fireEvent.click(boton(/Pintura muros/));
    await fireEvent.click(boton('Por estación'));
    expect(titulos(container)[0]).toBe('1 · Estaciones');
    expect(screen.getByText('Ayalas · 1 actividad × 1 mes')).toBeTruthy();
    await fireEvent.click(boton(/Compuertas/));
    await fireEvent.click(boton('Por actividad'));
    expect(container.querySelectorAll('.act.on')).toHaveLength(0); // con dos marcadas no adivina cuál
  });

  it('si falla una actividad a mitad, dice cuántas se asignaron y avisa para recargar', async () => {
    substationAdmin.asignar
      .mockResolvedValueOnce({ creadas: 1, omitidasDuplicadas: 0, omitidasMesCerrado: 0, omitidasEstacionInactiva: 0 })
      .mockRejectedValueOnce(new Error('Sin conexión'));
    const { component } = montar({ modo: 'estacion', estacionIds: [10], meses: [10], actividadIds: [1, 2] });
    const parcial = vi.fn();
    const asignado = vi.fn();
    component.$on('parcial', parcial);
    component.$on('asignado', asignado);

    await fireEvent.click(boton('Asignar 2 citas'));

    expect(await screen.findByRole('alert')).toHaveProperty('textContent',
      'Se asignaron 1 de 2 actividades; falló “Pintura puertas”: Sin conexión. Vuelva a intentar: lo ya asignado no se duplica.');
    expect(parcial).toHaveBeenCalled();
    expect(asignado).not.toHaveBeenCalled();
  });
});
