import { describe, it, expect } from 'vitest';
import { validarPlaca } from '../../lib/textFormat.js';

describe('validarPlaca', () => {
  it.each(['ABC123', 'abc 12d', ' SDZ53F ', 'R-12345', 'CD1234'])('acepta %s', (placa) => {
    expect(validarPlaca(placa)).toBeNull();
  });

  it('rechaza símbolos que rompen la URL (el caso real fue "SDZ%#F")', () => {
    expect(validarPlaca('SDZ%#F')).toMatch(/solo puede tener letras, números y guion/);
    expect(validarPlaca('ABC/12')).toMatch(/solo puede tener/);
    expect(validarPlaca('ÑAB123')).toMatch(/solo puede tener/);
  });

  it('rechaza vacía y más de 10 caracteres', () => {
    expect(validarPlaca('   ')).toBe('La placa es obligatoria.');
    expect(validarPlaca('ABCDEFGHIJK')).toMatch(/máximo 10/);
  });
});
