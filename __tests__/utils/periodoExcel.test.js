import { describe, it, expect } from 'vitest';
import { rangoDePreset } from '../../utils/periodoExcel.js';

describe('periodos de las descargas a Excel', () => {
  const hoy = new Date(2026, 10, 23); // 23 nov 2026

  it('atajos', () => {
    expect(rangoDePreset('mes', hoy)).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' });
    expect(rangoDePreset('mesAnterior', hoy)).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
    expect(rangoDePreset('anio', hoy)).toEqual({ desde: '2026-01-01', hasta: '2026-12-31' });
    expect(rangoDePreset('anioAnterior', hoy)).toEqual({ desde: '2025-01-01', hasta: '2025-12-31' });
    expect(rangoDePreset('ultimos12', hoy)).toEqual({ desde: '2025-12-01', hasta: '2026-11-23' });
    expect(rangoDePreset('mesAnterior', new Date(2026, 0, 15))).toEqual({ desde: '2025-12-01', hasta: '2025-12-31' });
  });
});
