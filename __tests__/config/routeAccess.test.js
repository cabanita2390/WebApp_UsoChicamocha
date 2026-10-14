import { describe, it, expect } from 'vitest';
import { puedeVerRuta, RUTAS_SOLO_ADMIN } from '../../config/route-access.js';

describe('puedeVerRuta', () => {
  it('las rutas solo ADMIN quedan cerradas para los demás roles', () => {
    for (const ruta of RUTAS_SOLO_ADMIN) {
      expect(puedeVerRuta(ruta, 'ADMIN')).toBe(true);
      expect(puedeVerRuta(ruta, 'SUPERVISOR_OPERATIVO')).toBe(false);
      expect(puedeVerRuta(ruta, undefined)).toBe(false);
    }
  });

  it('no se salta con query string ni con el hash', () => {
    expect(puedeVerRuta('/users?page=2', 'SUPERVISOR_OPERATIVO')).toBe(false);
    expect(puedeVerRuta('#/subestaciones/configuracion', 'SUPERVISOR_OPERATIVO')).toBe(false);
  });

  it('el resto de rutas sigue abierto para el supervisor', () => {
    expect(puedeVerRuta('/', 'SUPERVISOR_OPERATIVO')).toBe(true);
    expect(puedeVerRuta('/subestaciones', 'SUPERVISOR_OPERATIVO')).toBe(true);
    expect(puedeVerRuta('/fuel', 'SUPERVISOR_OPERATIVO')).toBe(true);
  });
});
