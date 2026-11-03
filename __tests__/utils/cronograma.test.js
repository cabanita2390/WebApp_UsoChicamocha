import { describe, it, expect } from 'vitest';
import {
    mesCerrado, estadoCita, estadoVisible, chip, filtrarCitas, filtrosVacios, filtrosActivos, recortarChips, capacidadCelda,
    altoParaChips, filasPorEstacion, filasPorActividad, totalesPorMes,
    mesesDePreset, paresAsignacion, fechaHora, aniosParaSelector, semaforoMes, porcentaje,
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

    it('filtros: "solo cambios" ignora los demás; cada filtro acepta varios valores', () => {
        const citas = [cita(1, 1, 10, 3), cita(2, 1, 11, 11, { estado: 'BORRADOR' }), cita(3, 2, 10, 4, { tieneEjecucion: true }),
            cita(4, 2, 11, 9, { disciplina: 'ELECTRICO' })];
        const f = (extra) => ({ ...filtrosVacios(), ...extra });
        const ids = (opts) => filtrarCitas(citas, { anio: 2026, hoy, estacionesPorId: new Map(estaciones.map((s) => [s.id, s])), ...opts })
            .map((c) => c.id);
        expect(ids({ soloCambios: true, filtros: f({ actividadIds: [10] }) })).toEqual([2]);
        expect(ids({ filtros: f({ estados: ['bad'] }) })).toEqual([1]);
        expect(ids({ filtros: f({ estados: ['bad', 'cur'] }) })).toEqual([1, 4]);
        expect(ids({ filtros: f({ estados: ['new'] }) })).toEqual([2]);
        expect(ids({ filtros: f({ actividadIds: [10] }) })).toEqual([1, 3]);
        expect(ids({ filtros: f({ disciplinas: ['ELECTRICO'] }) })).toEqual([4]);
        expect(ids({ filtros: f({ meses: [3, 4] }) })).toEqual([1, 3]);
        expect(ids({ filtros: f({ tipos: ['COMPLEMENTARIA'] }) })).toEqual([3, 4]);
        expect(ids({ filtros: f({ estacionIds: [1], disciplinas: ['CIVIL'] }) })).toEqual([1, 2]);
        expect(ids({})).toEqual([1, 2, 3, 4]);
        expect(filtrosActivos(f({ estados: ['bad'], meses: [1, 2] }))).toBe(2);
    });

    it('estado visible: borrador, ejecutada, no ejecutada, en curso y programada', () => {
        expect(estadoVisible(cita(1, 1, 10, 11, { estado: 'BORRADOR' }), 2026, hoy)).toBe('new');
        expect(estadoVisible(cita(1, 1, 10, 3, { tieneEjecucion: true }), 2026, hoy)).toBe('ok');
        expect(estadoVisible(cita(1, 1, 10, 3), 2026, hoy)).toBe('bad');
        expect(estadoVisible(cita(1, 1, 10, 9), 2026, hoy)).toBe('cur');
        expect(estadoVisible(cita(1, 1, 10, 10), 2026, hoy)).toBe('pen');
    });

    it('fila por estación: avance = ejecutadas / publicadas (como el Dashboard); "—" sin citas; cambios primero', () => {
        const citas = [
            cita(1, 1, 10, 3, { tieneEjecucion: true }), cita(2, 1, 10, 5), cita(3, 1, 11, 6, { tieneEjecucion: true }),
            cita(4, 1, 10, 10), cita(5, 1, 11, 10, { estado: 'BORRADOR' }), cita(6, 2, 10, 11),
        ];
        const filas = filasPorEstacion({ estaciones, citas, actividadesPorId: actividades, anio: 2026, hoy,
            disciplinaFiltrada: true });
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
            disciplinaFiltrada: true });
        expect(fila.pct).toBe(50); // 1 de 2: igual que el Dashboard
        expect(fila.badge.g).toBe(''); // sin semáforo en el año
    });

    it('chip: la pendiente del mes en curso se ve "En curso", no como una futura', () => {
        const ch = chip(cita(1, 1, 10, hoy.mesActual), { anio: hoy.anioActual, hoy, actividad: actividades.get(10) });
        expect(ch.g).toBe('⧗');
        expect(ch.title).toMatch(/En curso$/);
        expect(ch.estado).toBe('pen');
    });

    it('tamaño de celda: en el alto Normal caben 3 chips; con más, "+N más" ocupa el lugar de uno', () => {
        expect(capacidadCelda(66)).toBe(3); // por estación
        expect(capacidadCelda(70, 2)).toBe(6); // por actividad, dos columnas
        expect(altoParaChips(5)).toBe(101);
        expect(capacidadCelda(altoParaChips(5))).toBe(5);
        const chips = [1, 2, 3, 4].map((id) => ({ id }));
        expect(recortarChips(chips, 3)).toEqual({ chips: chips.slice(0, 2), mas: 2 });
        expect(recortarChips(chips, 4)).toEqual({ chips, mas: 0 });
    });

    it('solo con citas: oculta las filas vacías (vencidas / solo cambios)', () => {
        const filas = filasPorEstacion({ estaciones, citas: [cita(1, 1, 10, 3)], actividadesPorId: actividades, anio: 2026,
            hoy, soloConCitas: true });
        expect(filas.map((f) => f.id)).toEqual([1]);
    });

    it('fila por actividad: chips con el nombre de la estación y conteo de estaciones', () => {
        const citas = [cita(1, 1, 10, 3), cita(2, 2, 10, 3), cita(3, 1, 11, 4)];
        const filas = filasPorActividad({ actividades: [...actividades.values()], estacionesVisibles: estaciones, citas,
            estacionesPorId: new Map(estaciones.map((s) => [s.id, s])), anio: 2026, hoy,
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

    it('años del selector: el Cronograma ofrece el siguiente y los pasados con datos; la consulta, hasta el actual', () => {
        const info = { anioActual: 2027, programables: [2027, 2028], conDatos: [2027, 2026, 2025] };
        expect(aniosParaSelector(info, 2027, 'cronograma')).toEqual([2028, 2027, 2026, 2025]);
        expect(aniosParaSelector(info, 2027, 'consulta')).toEqual([2027, 2026, 2025]);
        // Año sin datos (recién empieza): igual aparece el actual; el elegido siempre está
        expect(aniosParaSelector({ anioActual: 2030, programables: [2030, 2031], conDatos: [] }, 2030, 'consulta')).toEqual([2030]);
        expect(aniosParaSelector(info, 2027, 'consulta', 2020)).toEqual([2027, 2026, 2025, 2020]);
        // Sin respuesta del servidor: lo de antes
        expect(aniosParaSelector(null, 2026, 'cronograma')).toEqual([2027, 2026, 2025]);
        expect(aniosParaSelector(null, 2026, 'consulta')).toEqual([2026, 2025]);
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
