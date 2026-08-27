import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { fuelDateRange, fuelActiveTab, defaultFuelDateRange, resetFuelDateRange } from '../stores/fuelFilters.js';

function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

describe('fuelFilters store', () => {
  it('defaultFuelDateRange() devuelve el primer día del mes actual como inicio y hoy como fin', () => {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const rango = defaultFuelDateRange();

    expect(rango.fechaInicio).toBe(toIsoDate(inicioMes));
    expect(rango.fechaFin).toBe(toIsoDate(hoy));
  });

  it('fuelDateRange arranca con el rango por defecto, no vacío, para que los inputs muestren las fechas reales usadas al filtrar', () => {
    expect(get(fuelDateRange)).toEqual(defaultFuelDateRange());
  });

  it('resetFuelDateRange() vuelve al rango por defecto tras haber sido modificado', () => {
    fuelDateRange.set({ fechaInicio: '2020-01-01', fechaFin: '2020-01-31' });

    resetFuelDateRange();

    expect(get(fuelDateRange)).toEqual(defaultFuelDateRange());
  });

  it('fuelActiveTab arranca en "dashboard"', () => {
    expect(get(fuelActiveTab)).toBe('dashboard');
  });
});
