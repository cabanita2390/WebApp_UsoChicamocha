import { describe, it, expect } from 'vitest';
import { alternarOrden, ordenarFilas } from '../../utils/ordenTabla.js';

const filas = [
  { n: 'Tibasosa', avance: 50 },
  { n: 'ayalas', avance: null },
  { n: 'Ávila', avance: 80 },
  { n: 'Dren 10', avance: 50 },
  { n: 'Dren 9', avance: 10 },
];
const VALORES = { nombre: (f) => f.n, avance: (f) => f.avance };
const nombres = (xs) => xs.map((f) => f.n);

describe('alternarOrden', () => {
  it('el primer clic usa la dirección inicial de la columna y el segundo la invierte', () => {
    expect(alternarOrden(null, 'nombre')).toEqual({ campo: 'nombre', dir: 'asc' });
    expect(alternarOrden({ campo: 'nombre', dir: 'asc' }, 'nombre')).toEqual({ campo: 'nombre', dir: 'desc' });
    expect(alternarOrden({ campo: 'nombre', dir: 'desc' }, 'nombre')).toEqual({ campo: 'nombre', dir: 'asc' });
    expect(alternarOrden({ campo: 'nombre', dir: 'asc' }, 'avance', 'desc')).toEqual({ campo: 'avance', dir: 'desc' });
  });
});

describe('ordenarFilas', () => {
  it('sin orden devuelve las filas tal cual (orden del servidor)', () => {
    expect(ordenarFilas(filas, null, VALORES)).toBe(filas);
    expect(ordenarFilas(filas, { campo: 'otra', dir: 'asc' }, VALORES)).toBe(filas);
  });

  it('texto en español: sin distinguir mayúsculas ni tildes, y números dentro del texto en orden natural', () => {
    expect(nombres(ordenarFilas(filas, { campo: 'nombre', dir: 'asc' }, VALORES)))
      .toEqual(['Ávila', 'ayalas', 'Dren 9', 'Dren 10', 'Tibasosa']);
    expect(nombres(ordenarFilas(filas, { campo: 'nombre', dir: 'desc' }, VALORES)))
      .toEqual(['Tibasosa', 'Dren 10', 'Dren 9', 'ayalas', 'Ávila']);
  });

  it('los vacíos van al final en ambas direcciones y los empates se resuelven por el desempate', () => {
    const asc = ordenarFilas(filas, { campo: 'avance', dir: 'asc' }, VALORES, (f) => f.n);
    expect(nombres(asc)).toEqual(['Dren 9', 'Dren 10', 'Tibasosa', 'Ávila', 'ayalas']);
    const desc = ordenarFilas(filas, { campo: 'avance', dir: 'desc' }, VALORES, (f) => f.n);
    expect(nombres(desc)).toEqual(['Ávila', 'Dren 10', 'Tibasosa', 'Dren 9', 'ayalas']);
  });

  it('no modifica el arreglo original', () => {
    const copia = [...filas];
    ordenarFilas(filas, { campo: 'nombre', dir: 'desc' }, VALORES);
    expect(filas).toEqual(copia);
  });
});
