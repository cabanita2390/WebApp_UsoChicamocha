import { describe, it, expect, vi } from 'vitest';
import {
  asignacionDeActivo,
  cambiarCantidadPersonalizada,
  cambiarDistribucion,
  cambiarModo,
  construirPayloadPerfil,
  detectarDistribucion,
  DISTRIBUCIONES,
  ejesParaDibujo,
  esMoto,
  estadoPresion,
  formatRango,
  formularioNuevo,
  perfilAFormulario,
  resumenCeldaPresion,
  resumenRangos,
  sincronizarPerfilLlantas,
} from '../../lib/presionLlantas.js';

const rango = (psiMin, psiMax, psiObjetivo = '') => ({ psiMin, psiMax, psiObjetivo });

describe('formulario de configuración', () => {
  it('"igual para todas" aplica el mismo rango a las 4 llantas', () => {
    const form = { ...formularioNuevo('VEHICULO'), nombre: ' Camioneta ', rangoTodas: rango('28', '33', '30') };
    const { error, payload } = construirPayloadPerfil(form);
    expect(error).toBeUndefined();
    expect(payload.nombre).toBe('Camioneta');
    expect(payload.descripcion).toBeNull();
    expect(payload.posiciones.map((p) => p.codigo)).toEqual(['DI', 'DD', 'TI', 'TD']);
    expect(payload.posiciones.every((p) => p.psiMin === 28 && p.psiMax === 33 && p.psiObjetivo === 30)).toBe(true);
    expect(payload.posiciones.map((p) => p.orden)).toEqual([1, 2, 3, 4]);
  });

  it('"delanteras y traseras distintas" arranca con el rango de todas y se puede cambiar por grupo', () => {
    let form = { ...formularioNuevo('VEHICULO'), nombre: 'Volqueta', rangoTodas: rango('90', '100') };
    form = cambiarDistribucion(form, 'volqueta10');
    form = cambiarModo(form, 'grupos');
    expect(Object.keys(form.rangosGrupo)).toEqual(['Delanteras', 'Traseras']);
    expect(form.rangosGrupo.Traseras).toEqual(rango('90', '100'));
    form.rangosGrupo.Traseras = rango('100', '110');
    const { payload } = construirPayloadPerfil(form);
    expect(payload.posiciones).toHaveLength(10);
    expect(payload.posiciones.filter((p) => p.psiMin === 100)).toHaveLength(8);
  });

  it('"una por una" copia el rango que había a cada llanta', () => {
    let form = { ...formularioNuevo('MOTOCICLETA'), nombre: 'Moto', rangoTodas: rango('28', '33') };
    expect(form.distribucion).toBe('moto2');
    form = cambiarModo(form, 'llanta');
    expect(form.llantas.map((l) => l.psiMin)).toEqual(['28', '28']);
    form.llantas[1] = { ...form.llantas[1], psiMin: '32', psiMax: '36' };
    const { payload } = construirPayloadPerfil(form);
    expect(payload.posiciones.map((p) => [p.codigo, p.psiMin, p.psiMax])).toEqual([['DEL', 28, 33], ['TRA', 32, 36]]);
  });

  it('una moto no ofrece "delanteras y traseras" sino una por una (cada grupo tiene una llanta)', () => {
    const form = cambiarModo(formularioNuevo('MOTOCICLETA'), 'grupos');
    expect(form.modo).toBe('grupos');
    expect(Object.keys(form.rangosGrupo)).toEqual(['Delantera', 'Trasera']);
  });

  it('otra cantidad genera códigos únicos y respeta los nombres digitados', () => {
    let form = cambiarDistribucion({ ...formularioNuevo('MAQUINARIA'), nombre: 'Rara' }, 'personalizada');
    form = cambiarCantidadPersonalizada(form, 6);
    expect(form.llantas.map((l) => l.codigo)).toEqual(['DI', 'DD', 'TI', 'TD', 'L1', 'L2']);
    form = cambiarCantidadPersonalizada(form, 2);
    expect(form.llantas.map((l) => l.codigo)).toEqual(['DI', 'DD']);
    form.rangoTodas = rango('20', '25');
    expect(construirPayloadPerfil(form).error).toBeUndefined();
  });

  it.each([
    [{ nombre: '' }, /nombre/],
    [{ rangoTodas: rango('', '33') }, /falta la presión mínima o la máxima/],
    [{ rangoTodas: rango('abc', '33') }, /deben ser números/],
    [{ rangoTodas: rango('0', '33') }, /mayor que 0/],
    [{ rangoTodas: rango('40', '30') }, /mínima no puede ser mayor/],
    [{ rangoTodas: rango('30', '301') }, /300 PSI/],
    [{ rangoTodas: rango('28', '33', '40') }, /ideal debe estar entre/],
  ])('rechaza %o con un mensaje entendible', (over, mensaje) => {
    const form = { ...formularioNuevo('VEHICULO'), nombre: 'X', rangoTodas: rango('28', '33'), ...over };
    expect(construirPayloadPerfil(form).error).toMatch(mensaje);
  });

  it('perfilAFormulario elige el modo más simple que representa la configuración', () => {
    const pos = (codigo, min, max) => ({ codigo, etiqueta: codigo, orden: 0, psiMin: min, psiObjetivo: null, psiMax: max });
    const todas = perfilAFormulario({ nombre: 'a', aplicaA: 'VEHICULO', posiciones: ['DI', 'DD', 'TI', 'TD'].map((c) => pos(c, 28, 33)) });
    expect(todas.modo).toBe('todas');
    expect(todas.distribucion).toBe('auto4');
    expect(todas.rangoTodas).toEqual({ psiMin: '28', psiObjetivo: '', psiMax: '33' });

    const grupos = perfilAFormulario({
      nombre: 'b', aplicaA: 'VEHICULO',
      posiciones: [pos('DI', 28, 33), pos('DD', 28, 33), pos('TI', 30, 35), pos('TD', 30, 35)],
    });
    expect(grupos.modo).toBe('grupos');
    expect(grupos.rangosGrupo.Traseras.psiMin).toBe('30');

    const llanta = perfilAFormulario({
      nombre: 'c', aplicaA: 'MAQUINARIA',
      posiciones: [pos('L1', 20, 25), pos('L2', 22, 26), pos('L3', 20, 25)],
    });
    expect(llanta.modo).toBe('llanta');
    expect(llanta.distribucion).toBe('personalizada');

    expect(resumenRangos({ posiciones: grupos.llantas.map((l, i) => ({ ...l, orden: i })) })).toEqual([
      { titulo: 'Delanteras', rango: '28 – 33 PSI' },
      { titulo: 'Traseras', rango: '30 – 35 PSI' },
    ]);
  });

  it('cada distribución tiene códigos únicos y se reconoce a sí misma', () => {
    for (const d of DISTRIBUCIONES) {
      const codigos = d.ejes.flat().map((l) => l.codigo);
      expect(new Set(codigos).size, d.id).toBe(codigos.length);
      expect(detectarDistribucion([...codigos].reverse())?.id).toBe(d.id);
    }
  });
});

describe('dibujo y reporte', () => {
  it('ejesParaDibujo numera según el orden recibido y arma ejes de a dos si no reconoce la distribución', () => {
    const ejes = ejesParaDibujo([{ codigo: 'TD' }, { codigo: 'DI' }, { codigo: 'DD' }, { codigo: 'TI' }]);
    expect(ejes.map((e) => e.map((l) => [l.codigo, l.numero]))).toEqual([[['DI', 2], ['DD', 3]], [['TI', 4], ['TD', 1]]]);
    const raros = ejesParaDibujo([{ codigo: 'A' }, { codigo: 'B' }, { codigo: 'C' }]);
    expect(raros.map((e) => e.map((l) => l.lado))).toEqual([['I', 'D'], ['C']]);
  });

  it('resumenCeldaPresion cuenta las llantas fuera de rango', () => {
    const insp = (estado, resultados) => ({ presionLlantasEstado: estado, presionesLlantas: resultados.map((resultado) => ({ resultado })) });
    expect(resumenCeldaPresion(insp('BAJA', ['BAJA', 'OK', 'BAJA'])).label).toBe('2 bajas');
    expect(resumenCeldaPresion(insp('ALTA', ['ALTA', 'OK'])).label).toBe('1 alta');
    expect(resumenCeldaPresion(insp('OK', ['OK'])).label).toBe('OK');
    // Una baja y una alta en la misma inspección (caso real de SDZ53F): se ven las dos.
    expect(resumenCeldaPresion(insp('BAJA', ['BAJA', 'ALTA'])).label).toBe('1 baja · 1 alta');
    expect(resumenCeldaPresion(insp(null, []))).toBeNull();
  });

  it('estadoPresion y formatRango', () => {
    expect(estadoPresion('BAJA')).toMatchObject({ label: 'Baja', tono: 'bad', statusClass: 'status-malo' });
    expect(estadoPresion(null)).toBeNull();
    expect(formatRango(28, 33, 30)).toBe('28 – 33 PSI (ideal 30)');
    expect(formatRango(null, 33)).toBe('Sin rango');
  });

  it('esMoto reconoce el tipo como texto o como objeto', () => {
    expect(esMoto({ tipoVehiculo: 'MOTOCICLETA' })).toBe(true);
    expect(esMoto({ tipoVehiculo: { nombreTipo: 'Moto' } })).toBe(true);
    expect(esMoto({ tipoVehiculo: 'CAMIONETA' })).toBe(false);
  });
});

describe('asignaciones', () => {
  it('asignacionDeActivo distingue vehículo y máquina con el mismo id', () => {
    const asignaciones = [{ vehicleId: 5, machineId: null, perfilId: 1 }, { vehicleId: null, machineId: 5, perfilId: 2 }];
    expect(asignacionDeActivo(asignaciones, { vehicleId: 5 }).perfilId).toBe(1);
    expect(asignacionDeActivo(asignaciones, { machineId: 5 }).perfilId).toBe(2);
    expect(asignacionDeActivo(null, { vehicleId: 5 })).toBeNull();
  });

  it('sincronizarPerfilLlantas solo llama al backend si cambió', async () => {
    const acciones = { assignTireProfileVehicle: vi.fn(), assignTireProfileMachine: vi.fn() };
    expect(await sincronizarPerfilLlantas(acciones, { vehicleId: 5 }, '3', '3')).toBe(false);
    await sincronizarPerfilLlantas(acciones, { vehicleId: 5 }, '3', '');
    expect(acciones.assignTireProfileVehicle).toHaveBeenCalledWith(5, 3);
    await sincronizarPerfilLlantas(acciones, { machineId: 8 }, '', '2');
    expect(acciones.assignTireProfileMachine).toHaveBeenCalledWith(8, null);
  });
});
