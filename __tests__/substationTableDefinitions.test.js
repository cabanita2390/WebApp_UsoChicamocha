import { describe, it, expect } from 'vitest';
import {
  resultadoBadge,
  tipoMantenimientoLabel,
  tipoActividadLabel,
  estacionTipoLabel,
  createEjecucionesColumns,
} from '../config/table-definitions/substation.js';

describe('resultadoBadge', () => {
  it('mapea los 3 resultados conocidos a su etiqueta y color', () => {
    expect(resultadoBadge('CONFORME')).toEqual({ label: 'Conforme', color: 'green' });
    expect(resultadoBadge('CON_HALLAZGOS')).toEqual({ label: 'Con hallazgos', color: 'yellow' });
    expect(resultadoBadge('REQUIERE_INTERVENCION')).toEqual({ label: 'Requiere intervención', color: 'red' });
  });

  it('cae a gray y muestra el valor crudo para un resultado desconocido', () => {
    expect(resultadoBadge('ALGO_NUEVO')).toEqual({ label: 'ALGO_NUEVO', color: 'gray' });
  });

  it('muestra guión para null/undefined', () => {
    expect(resultadoBadge(null)).toEqual({ label: '—', color: 'gray' });
    expect(resultadoBadge(undefined)).toEqual({ label: '—', color: 'gray' });
  });
});

describe('tipoMantenimientoLabel', () => {
  it('traduce los 4 valores del CHECK de la base de datos', () => {
    expect(tipoMantenimientoLabel('PREVENTIVO')).toBe('Preventivo');
    expect(tipoMantenimientoLabel('CORRECTIVO')).toBe('Correctivo');
    expect(tipoMantenimientoLabel('PREDICTIVO')).toBe('Predictivo');
    expect(tipoMantenimientoLabel('NO_PROGRAMADO')).toBe('No programado');
  });

  it('devuelve guión para valores nulos', () => {
    expect(tipoMantenimientoLabel(null)).toBe('—');
  });

  it('devuelve el valor crudo si no está en el mapa', () => {
    expect(tipoMantenimientoLabel('MIXTO')).toBe('MIXTO');
  });
});

describe('tipoActividadLabel', () => {
  it('incluye OTRO aunque Civil no lo use (lo necesitará Electromecánico)', () => {
    expect(tipoActividadLabel('INSPECCION')).toBe('Inspección');
    expect(tipoActividadLabel('MANTENIMIENTO')).toBe('Mantenimiento');
    expect(tipoActividadLabel('NO_PROGRAMADO')).toBe('No programado');
    expect(tipoActividadLabel('OTRO')).toBe('Otro');
  });
});

describe('estacionTipoLabel', () => {
  it('traduce BOMBEO y COMPLEMENTARIA', () => {
    expect(estacionTipoLabel('BOMBEO')).toBe('Bombeo');
    expect(estacionTipoLabel('COMPLEMENTARIA')).toBe('Complementaria');
  });

  it('devuelve guión para valores no reconocidos', () => {
    expect(estacionTipoLabel(null)).toBe('—');
    expect(estacionTipoLabel('OTRO_TIPO')).toBe('OTRO_TIPO');
  });
});

describe('definiciones de columnas', () => {
  it('ejecuciones muestra la descripción libre cuando no hay actividad de catálogo', () => {
    const columns = createEjecucionesColumns();
    const actCol = columns.find((c) => c.id === 'ej_actividad');
    expect(actCol.accessorFn({ actividadNombre: null, descripcionLibre: 'Trabajo puntual' })).toBe('Trabajo puntual');
    expect(actCol.accessorFn({ actividadNombre: 'Pintura muros', descripcionLibre: null })).toBe('Pintura muros');
  });

  it('ejecuciones solo marca badge de evidencia cuando evidenciaPendiente es true', () => {
    const columns = createEjecucionesColumns();
    const evCol = columns.find((c) => c.id === 'ej_evidencia');
    expect(evCol.meta.getBadge({ evidenciaPendiente: true })).toEqual({ label: 'Sin evidencia', color: 'yellow' });
    expect(evCol.meta.getBadge({ evidenciaPendiente: false })).toBeNull();
  });
});
