import { describe, it, expect } from 'vitest';
import {
    mesCerrado, estadoCita, chip, filtrarCitas, filasPorEstacion, filasPorActividad, totalesPorMes,
    mesesDePreset, paresAsignacion, fechaHora, semaforoMes, porcentaje,
} from '../../utils/cronograma.js';

const hoy = { anioActual: 2026, mesActual: 9 };
const cita = (id, estacionId, actividadId, mes, extra = {}) => ({
    id, estacionId, actividadId, mes, disciplina: 'CIVIL', estado: 'PUBLICADA', pendienteRetiro: false,
    tieneEjecucion: false, fechaEjecucion: null, ...extra,
});
const actividades = new Map([
    [10, { id: 10, nombre: 'Pintura puertas/ventanas/barandas estaciones', nombreCorto: 'Pintura puertas', disciplina: 'CIVIL' }],
    [11, { id: 11, nombre: 'Pintura muros estaciones', nombreCorto: null, disciplina: 'CIVIL' }],
]);
const estaciones = [{ id: 1, nombre: 'Ayalas', tipo: 'BOMBEO' }, { id: 2, nombre: 'CLAN', tipo: 'COMPLEMENTARIA' }];

describe('utils/cronograma', () => {
    it('mes cerrado: anteriores al actual; año pasado cerrado y futuro abierto', () => {
        expect(mesCerrado(2026, 8, hoy)).toBe(true);
        expect(mesCerrado(2026, 9, hoy)).toBe(false);
        expect(mesCerrado(2025, 12, hoy)).toBe(true);
        expect(mesCerrado(2027, 1, hoy)).toBe(false);
    });

    it('estado de la cita: ejecutada, no ejecutada (mes cerrado) o programada', () => {
        expect(estadoCita(cita(1, 1, 10, 3, { tieneEjecucion: true }), 2026, hoy)).toBe('ok');
        expect(estadoCita(cita(1, 1, 10, 3), 2026, hoy)).toBe('bad');
        expect(estadoCita(cita(1, 1, 10, 9), 2026, hoy)).toBe('pen'); // mes en curso
        expect(estadoCita(cita(1, 1, 10, 3), 2027, hoy)).toBe('pen');
    });

    it('chip: nombre corto, "Ejecutada dd/mm/aaaa", borrador en azul y tachada al quitar', () => {
        const ej = chip(cita(1, 1, 10, 3, { tieneEjecucion: true, fechaEjecucion: '2026-03-15' }),
            { anio: 2026, hoy, actividad: actividades.get(10), disciplinaFiltrada: false });
        expect(ej.short).toBe('Pintura puertas');
        expect(ej.g).toBe('✓');
        expect(ej.dTag).toBe('C');
        expect(ej.title).toContain('Ejecutada 15/03/2026');

        const nueva = chip(cita(2, 1, 11, 11, { estado: 'BORRADOR' }),
            { anio: 2026, hoy, actividad: actividades.get(11), disciplinaFiltrada: true });
        expect(nueva.g).toBe('+');
        expect(nueva.bg).toBe('#dbe9fb');
        expect(nueva.short).toBe('Pintura muros estaciones'); // sin nombre corto
        expect(nueva.dTag).toBe('');

        expect(chip(cita(3, 1, 10, 10, { pendienteRetiro: true }), { anio: 2026, hoy, actividad: actividades.get(10) }).tachada).toBe(true);
    });

    it('filtros: "solo cambios" ignora los demás; "solo vencidas" deja las no ejecutadas de meses cerrados', () => {
        const citas = [cita(1, 1, 10, 3), cita(2, 1, 11, 11, { estado: 'BORRADOR' }), cita(3, 2, 10, 4, { tieneEjecucion: true })];
        expect(filtrarCitas(citas, { anio: 2026, hoy, soloCambios: true, actividadId: 10 }).map((c) => c.id)).toEqual([2]);
        expect(filtrarCitas(citas, { anio: 2026, hoy, soloVencidas: true }).map((c) => c.id)).toEqual([1]);
        expect(filtrarCitas(citas, { anio: 2026, hoy, actividadId: 10 }).map((c) => c.id)).toEqual([1, 3]);
    });

    it('fila por estación: avance = ejecutadas / publicadas (como el Dashboard); "—" sin citas; cambios primero', () => {
        const citas = [
            cita(1, 1, 10, 3, { tieneEjecucion: true }), cita(2, 1, 10, 5), cita(3, 1, 11, 6, { tieneEjecucion: true }),
            cita(4, 1, 10, 10), cita(5, 1, 11, 10, { estado: 'BORRADOR' }), cita(6, 2, 10, 11),
        ];
        const filas = filasPorEstacion({ estaciones, citas, actividadesPorId: actividades, anio: 2026, hoy,
            densidad: 'normal', disciplinaFiltrada: true });
        expect(filas[0].pct).toBe(50); // 2 de 4 publicadas (el borrador de octubre no cuenta)
        expect(filas[0].pctL).toBe('2 de 4 · 50%');
        expect(filas[0].total).toBe(5);
        expect(filas[0].sub).toBe('Bombeo');
        expect(filas[0].celdas[9].chips.map((c) => c.id)).toEqual([5, 4]); // octubre: la nueva primero
        expect(filas[1].pctL).toBe('0 de 1 · 0%'); // la de noviembre ya es parte del año
        expect(filas[1].sub).toBe('Compl.');
    });

    it('fila por estación: las citas futuras cuentan en el total del año (avance, no "cumplimiento a la fecha")', () => {
        const citas = [cita(1, 1, 10, 9, { tieneEjecucion: true }), cita(2, 1, 11, 11)];
        const [fila] = filasPorEstacion({ estaciones: [estaciones[0]], citas, actividadesPorId: actividades, anio: 2026, hoy,
            densidad: 'normal', disciplinaFiltrada: true });
        expect(fila.pct).toBe(50); // 1 de 2: igual que el Dashboard
        expect(fila.badge.g).toBe(''); // sin semáforo en el año
    });

    it('chip: la pendiente del mes en curso se ve "En curso", no como una futura', () => {
        const ch = chip(cita(1, 1, 10, hoy.mesActual), { anio: hoy.anioActual, hoy, actividad: actividades.get(10) });
        expect(ch.g).toBe('⧗');
        expect(ch.title).toMatch(/En curso$/);
        expect(ch.estado).toBe('pen');
    });

    it('densidad: con más citas que el máximo muestra max-1 chips y "+N más"', () => {
        const citas = [1, 2, 3, 4].map((i) => cita(i, 1, i % 2 ? 10 : 11, 10));
        const [fila] = filasPorEstacion({ estaciones: [estaciones[0]], citas, actividadesPorId: actividades, anio: 2026,
            hoy, densidad: 'normal', disciplinaFiltrada: true });
        expect(fila.celdas[9].chips).toHaveLength(2);
        expect(fila.celdas[9].mas).toBe(2);
    });

    it('solo con citas: oculta las filas vacías (vencidas / solo cambios)', () => {
        const filas = filasPorEstacion({ estaciones, citas: [cita(1, 1, 10, 3)], actividadesPorId: actividades, anio: 2026,
            hoy, densidad: 'normal', soloConCitas: true });
        expect(filas.map((f) => f.id)).toEqual([1]);
    });

    it('fila por actividad: chips con el nombre de la estación y conteo de estaciones', () => {
        const citas = [cita(1, 1, 10, 3), cita(2, 2, 10, 3), cita(3, 1, 11, 4)];
        const filas = filasPorActividad({ actividades: [...actividades.values()], estacionesVisibles: estaciones, citas,
            estacionesPorId: new Map(estaciones.map((s) => [s.id, s])), anio: 2026, hoy, densidad: 'normal',
            disciplinaLabel: () => 'Civil' });
        expect(filas[0].sub).toBe('Civil · 2 estaciones');
        expect(filas[0].celdas[2].chips.map((c) => c.short)).toEqual(['Ayalas', 'CLAN']);
    });

    it('pie "Citas por mes" solo cuenta estaciones visibles', () => {
        const t = totalesPorMes([cita(1, 1, 10, 3), cita(2, 2, 10, 3), cita(3, 9, 10, 3)], estaciones);
        expect(t[2]).toBe(2);
    });

    it('presets de frecuencia desde un mes, sin meses cerrados', () => {
        expect(mesesDePreset(3, 1, 2026, hoy)).toEqual([10]);
        expect(mesesDePreset(1, 9, 2026, hoy)).toEqual([9, 10, 11, 12]);
        expect(mesesDePreset(6, 1, 2027, hoy)).toEqual([1, 7]);
    });

    it('asignación: cuenta nuevas y duplicadas (incluye borradores vigentes)', () => {
        const vigentes = [cita(1, 1, 10, 10), cita(2, 2, 10, 11, { estado: 'BORRADOR' }), cita(3, 1, 11, 10)];
        expect(paresAsignacion(vigentes, 10, [1, 2], [10, 11])).toEqual({ nuevas: 2, duplicadas: 2 });
    });

    it('formato de fecha de publicación', () => {
        expect(fechaHora('2026-09-29T14:21:51.374636')).toBe('29/09/2026 14:21');
    });

    it('semáforo del mes: compara el avance con lo que va del mes; null sin citas', () => {
        expect(semaforoMes(0, 10, 5).l).toBe('Al día');        // empieza el mes: nadie sale en rojo
        expect(semaforoMes(4, 10, 50).l).toBe('Al día');       // 40% con 50% del mes: dentro de 10 puntos
        expect(semaforoMes(3, 10, 50).l).toBe('Algo atrasado');
        expect(semaforoMes(1, 10, 90).l).toBe('Atrasado');     // final de mes en 10%
        expect(semaforoMes(15, 15, 20)).toMatchObject({ l: 'Mes completo', pct: 100 });
        expect(semaforoMes(0, 0, 50)).toBeNull();
        expect(porcentaje(1, 4)).toBe(25);
        expect(porcentaje(1, 0)).toBeNull();
    });
});
