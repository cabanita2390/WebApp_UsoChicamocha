import { describe, it, expect } from 'vitest';
import { claseEstado } from '../../utils/claseEstado.js';
import { vehicleInspectionReportColumns } from '../../config/table-definitions/vehicle-inspections.js';

const columna = (id) => vehicleInspectionReportColumns.find((c) => c.id === id);

describe('color del estado según el sentido de la pregunta', () => {
  it('en casi todas lo bueno es el SÍ', () => {
    expect(claseEstado('SÍ', columna('vi_sob'))).toBe('status-optimo'); // sobrio
    expect(claseEstado('NO', columna('vi_sob'))).toBe('status-malo');
    expect(claseEstado('SÍ', columna('vi_cond'))).toBe('status-optimo'); // apto para conducir
  });

  it('en Medicamentos se invierte: "NO" (no consume) en verde y "SÍ" en rojo', () => {
    expect(columna('vi_med').meta.siEsMalo).toBe(true);
    expect(claseEstado('NO', columna('vi_med'))).toBe('status-optimo');
    expect(claseEstado('SÍ', columna('vi_med'))).toBe('status-malo');
    expect(claseEstado('N/A', columna('vi_med'))).toBe('status-unknown');
  });

  it('las demás respuestas no cambian', () => {
    expect(claseEstado('Bueno')).toBe('status-optimo');
    expect(claseEstado('Regular')).toBe('status-regular');
    expect(claseEstado('Malo')).toBe('status-malo');
    expect(claseEstado('Vencido')).toBe('status-malo');
    expect(claseEstado('SI, NO')).toBe('status-regular');
    expect(claseEstado('')).toBe('status-unknown');
    expect(claseEstado(null)).toBe('status-unknown');
  });

  it('solo Medicamentos tiene el SÍ como respuesta mala', () => {
    expect(vehicleInspectionReportColumns.filter((c) => c.meta?.siEsMalo).map((c) => c.id)).toEqual(['vi_med']);
  });
});
