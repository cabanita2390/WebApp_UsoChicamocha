/**
 * Lógica del Cronograma Anual, portada 1:1 del mockup "Subestaciones Civil v2"
 * (renderVals / chip / bulkVals) como funciones puras. Diferencias con el mockup:
 *  - los meses van de 1 a 12 (el mockup usaba 0..11);
 *  - "hoy" (anioActual, mesActual) lo manda el servidor en GET /cronograma;
 *  - el borrador vive en el servidor: una cita es "nueva" si estado = BORRADOR y
 *    "se quitará" si pendienteRetiro = true.
 */
import { MESES_LARGOS } from '../config/subestaciones.js';

export const COLOR = { ok: '#006300', warn: '#c98500', bad: '#d03b3b' };
export const BADGE = {
    ok: { c: '#006300', bg: '#e8f1e8' },
    warn: { c: '#8a5b00', bg: '#faf1de' },
    bad: { c: '#d03b3b', bg: '#fbeaea' },
    neu: { c: '#52514e', bg: '#f0f0ee' },
};
/** Badges de ejecución (Detalle por estación y Resumen por actividad): símbolo + color. */
export const RESULTADO = {
    CONFORME: { ...BADGE.ok, g: '✓', l: 'Conforme' },
    CON_HALLAZGOS: { ...BADGE.warn, g: '!', l: 'Con hallazgos' },
    REQUIERE_INTERVENCION: { ...BADGE.bad, g: '✕', l: 'Requiere intervención' },
};
export const SEGUIMIENTO = {
    ABIERTO: { ...BADGE.bad, g: '●', l: 'Abierto' },
    EN_PROCESO: { ...BADGE.warn, g: '⧗', l: 'En proceso' },
    RESUELTO: { ...BADGE.ok, g: '✓', l: 'Resuelto' },
};
export const DISC_TAG = { CIVIL: 'C', ELECTRICO: 'E', ELECTROMECANICO: 'M' };
/**
 * Imprevistos (ejecuciones sin cita): terracota suave. Distinto del rojo del semáforo y de los
 * hallazgos: no es una alarma, es "ojo, esto no estaba planeado" para notar si se repite.
 */
export const IMPREVISTO = { c: '#a6532f', bg: '#f8ece4', fila: '#fbf3ee' };

/** Porcentaje entero (0-100) de parte sobre total; null si total es 0. */
export function porcentaje(parte, total) {
    return total ? Math.round((parte / total) * 100) : null;
}

/**
 * Semáforo del mes en curso: compara el avance de las citas del mes contra cuánto del mes ya
 * pasó. Al empezar el mes nadie sale en rojo; al final, ir en 10% sí. null si no hay citas.
 */
export function semaforoMes(cumple, programado, transcurrido) {
    if (!programado) return null;
    const avance = (cumple / programado) * 100;
    const pct = Math.round(avance);
    if (avance >= 100) return { ...BADGE.ok, color: COLOR.ok, g: '▲', l: 'Mes completo', pct };
    const diferencia = avance - Number(transcurrido ?? 0);
    if (diferencia >= -10) return { ...BADGE.ok, color: COLOR.ok, g: '▲', l: 'Al día', pct };
    if (diferencia >= -30) return { ...BADGE.warn, color: COLOR.warn, g: '■', l: 'Algo atrasado', pct };
    return { ...BADGE.bad, color: COLOR.bad, g: '▼', l: 'Atrasado', pct };
}

/** Densidad: actividades por celda, alto de fila y ancho mínimo de columna (vista por estación / por actividad). */
export const DENSIDAD = {
    est: { compacta: { max: 2, h: 46, w: 92 }, normal: { max: 3, h: 66, w: 104 }, amplia: { max: 5, h: 104, w: 132 } },
    act: { compacta: { max: 4, h: 50, w: 150 }, normal: { max: 6, h: 70, w: 172 }, amplia: { max: 10, h: 108, w: 190 } },
};

/** Mes cerrado = anterior al actual del año en curso; años pasados cerrados completos, futuros abiertos. */
export function mesCerrado(anio, mes, { anioActual, mesActual }) {
    return anio < anioActual || (anio === anioActual && mes < mesActual);
}

/** 'ok' ejecutada · 'bad' no ejecutada (mes cerrado) · 'pen' programada. */
export function estadoCita(cita, anio, hoy) {
    if (cita.tieneEjecucion) return 'ok';
    if (mesCerrado(anio, cita.mes, hoy)) return 'bad';
    return 'pen';
}

export const esNueva = (c) => c.estado === 'BORRADOR';
export const seQuita = (c) => !!c.pendienteRetiro;
export const esCambio = (c) => esNueva(c) || seQuita(c);

export function fechaCorta(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

/** "20/09/2026 16:05" */
export function fechaHora(iso) {
    if (!iso) return '';
    const [f, h = ''] = iso.split('T');
    return `${fechaCorta(f)} ${h.slice(0, 5)}`.trim();
}

/** Nombre que va en el chip: el nombre corto (P2) o el nombre completo (se recorta con CSS). */
export const nombreChip = (actividad) => actividad?.nombreCorto || actividad?.nombre || '';

/** Datos de un chip de cita (mockup: chip()). */
export function chip(cita, { anio, hoy, actividad, disciplinaFiltrada }) {
    const e = estadoCita(cita, anio, hoy);
    let st;
    if (e === 'ok') st = { bg: BADGE.ok.bg, c: BADGE.ok.c, g: '✓', bd: '0', t: `Ejecutada ${fechaCorta(cita.fechaEjecucion)}` };
    else if (e === 'bad') st = { bg: BADGE.bad.bg, c: BADGE.bad.c, g: '✕', bd: '0', t: 'No ejecutada' };
    // La pendiente del mes en curso se ve "En curso" igual que en los detalles (no como una futura).
    else if (anio === hoy.anioActual && cita.mes === hoy.mesActual) st = { bg: BADGE.warn.bg, c: BADGE.warn.c, g: '⧗', bd: '0', t: 'En curso' };
    else st = { bg: '#fff', c: '#52514e', g: '', bd: '1px solid rgba(11,11,11,0.14)', t: 'Programada' };
    if (esNueva(cita)) st = { ...st, bd: '1.5px solid #2a78d6', bg: '#dbe9fb', c: '#1f5fae', g: '+', t: 'Borrador · nueva' };
    return {
        id: cita.id,
        estado: e,
        g: st.g,
        c: st.c,
        bg: st.bg,
        bd: st.bd,
        tachada: seQuita(cita),
        dTag: disciplinaFiltrada ? '' : (DISC_TAG[cita.disciplina] ?? ''),
        short: nombreChip(actividad),
        title: `${actividad?.nombre ?? ''} · ${MESES_LARGOS[cita.mes - 1]} · ${st.t}`,
    };
}

/**
 * Citas visibles del año según los filtros (mockup: fC). Con "ver solo los cambios" se
 * ignoran los demás filtros.
 */
export function filtrarCitas(citas, { anio, hoy, disciplina, actividadId, soloVencidas, soloCambios }) {
    return citas.filter((c) => {
        if (soloCambios) return esCambio(c);
        if (disciplina && c.disciplina !== disciplina) return false;
        if (actividadId && c.actividadId !== actividadId) return false;
        if (soloVencidas && estadoCita(c, anio, hoy) !== 'bad') return false;
        return true;
    });
}

/** Las nuevas y las que se quitan van primero en la celda. */
const cambiosPrimero = (a, b) => (esCambio(b) ? 1 : 0) - (esCambio(a) ? 1 : 0);

function agrupar(citas, clave) {
    const idx = new Map();
    for (const c of citas) {
        const k = clave(c);
        if (!idx.has(k)) idx.set(k, []);
        idx.get(k).push(c);
    }
    for (const l of idx.values()) l.sort(cambiosPrimero);
    return idx;
}

/** Celda (mockup: cells.map): chips recortados por densidad, conteos para el modo Conteo. */
function celda(lista, m, { anio, hoy, max, seleccion, modoEdicion, chipDe }) {
    const chips = lista.map(chipDe);
    const n = lista.length;
    const ok = chips.filter((c) => c.estado === 'ok').length;
    const bad = chips.filter((c) => c.estado === 'bad').length;
    const hayCambios = lista.some(esCambio);
    const actual = anio === hoy.anioActual && m === hoy.mesActual;
    return {
        mes: m,
        n,
        okN: ok,
        badN: bad,
        // Citas que cuentan para el avance: las publicadas (un borrador todavía no es del cronograma).
        publicadasN: lista.filter((c) => !esNueva(c)).length,
        chips: chips.slice(0, n > max ? max - 1 : max),
        mas: n > max ? n - max + 1 : 0,
        mostrarMas: modoEdicion && n === 0,
        seleccionada: seleccion,
        hayCambios,
        actual,
        trimestre: (m - 1) % 3 === 0,
        wOk: n ? (ok / n) * 100 : 0,
        wBad: n ? (bad / n) * 100 : 0,
        wPen: n ? ((n - ok - bad) / n) * 100 : 0,
    };
}

/**
 * Avance del año de la fila, el mismo del Dashboard y del Resumen: citas ejecutadas de las
 * publicadas, neutro (sin semáforo). "—" si la fila no tiene citas publicadas.
 */
function pctFila(celdas) {
    const publicadas = celdas.reduce((x, c) => x + c.publicadasN, 0);
    const ejecutadas = celdas.reduce((x, c) => x + c.okN, 0);
    if (!publicadas) return { pct: null, pctL: '—', badge: { color: '#898781', g: '', l: 'Sin citas publicadas este año' } };
    const pct = porcentaje(ejecutadas, publicadas);
    return {
        pct,
        pctL: `${ejecutadas} de ${publicadas} · ${pct}%`,
        badge: { color: '#3d3c39', g: '', l: `Avance del año: ${ejecutadas} de ${publicadas} citas ejecutadas` },
    };
}

const MESES_1_12 = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * Filas de la grilla por estación (mockup: cronRows). `estaciones` ya viene filtrada
 * (activas + buscador); `citas` ya filtradas con filtrarCitas.
 */
export function filasPorEstacion({ estaciones, citas, actividadesPorId, anio, hoy, densidad, disciplinaFiltrada,
    celdaSeleccionada, modoEdicion, soloConCitas }) {
    const { max } = DENSIDAD.est[densidad];
    const idx = agrupar(citas, (c) => `${c.estacionId}-${c.mes}`);
    const filas = estaciones.map((s, ri) => {
        const celdas = MESES_1_12.map((m) => celda(idx.get(`${s.id}-${m}`) ?? [], m, {
            anio, hoy, max, modoEdicion,
            seleccion: celdaSeleccionada?.estacionId === s.id && celdaSeleccionada?.mes === m,
            chipDe: (c) => chip(c, { anio, hoy, actividad: actividadesPorId.get(c.actividadId), disciplinaFiltrada }),
        }));
        return {
            key: `est-${s.id}`,
            id: s.id,
            nombre: s.nombre,
            sub: s.tipo === 'BOMBEO' ? 'Bombeo' : 'Compl.',
            alterna: ri % 2 === 1,
            celdas,
            total: celdas.reduce((x, c) => x + c.n, 0),
            ...pctFila(celdas),
        };
    });
    return soloConCitas ? filas.filter((f) => f.total > 0) : filas;
}

/** Filas por actividad (mockup: cronBy === 'act'): chips con el nombre de la estación. */
export function filasPorActividad({ actividades, estacionesVisibles, citas, estacionesPorId, anio, hoy, densidad,
    celdaSeleccionada, modoEdicion, soloConCitas, disciplinaLabel }) {
    const { max } = DENSIDAD.act[densidad];
    const visibles = new Set(estacionesVisibles.map((s) => s.id));
    const idx = agrupar(citas.filter((c) => visibles.has(c.estacionId)), (c) => `${c.actividadId}-${c.mes}`);
    const filas = actividades.map((a, ri) => {
        const celdas = MESES_1_12.map((m) => celda(idx.get(`${a.id}-${m}`) ?? [], m, {
            anio, hoy, max, modoEdicion,
            seleccion: celdaSeleccionada?.actividadId === a.id && celdaSeleccionada?.mes === m,
            chipDe: (c) => {
                const ch = chip(c, { anio, hoy, actividad: a, disciplinaFiltrada: true });
                const est = estacionesPorId.get(c.estacionId)?.nombre ?? '';
                return { ...ch, short: est, title: `${est} · ${ch.title}` };
            },
        }));
        const nEst = new Set(citas.filter((c) => c.actividadId === a.id && visibles.has(c.estacionId)).map((c) => c.estacionId)).size;
        return {
            key: `act-${a.id}`,
            id: a.id,
            nombre: a.nombre,
            sub: `${disciplinaLabel(a.disciplina)} · ${nEst} ${nEst === 1 ? 'estación' : 'estaciones'}`,
            alterna: ri % 2 === 1,
            celdas,
            total: celdas.reduce((x, c) => x + c.n, 0),
            ...pctFila(celdas),
        };
    });
    return soloConCitas ? filas.filter((f) => f.total > 0) : filas;
}

/** Totales del pie "Citas por mes" (sobre las estaciones visibles). */
export function totalesPorMes(citas, estacionesVisibles) {
    const visibles = new Set(estacionesVisibles.map((s) => s.id));
    return MESES_1_12.map((m) => citas.filter((c) => c.mes === m && visibles.has(c.estacionId)).length);
}

/** Frecuencias de la Asignación masiva: cada cuántos meses. */
export const PRESETS = [
    ['Mensual', 1, 'MENSUAL'],
    ['Bimestral', 2, 'BIMESTRAL'],
    ['Trimestral', 3, 'TRIMESTRAL'],
    ['Semestral', 6, 'SEMESTRAL'],
    ['Anual', 12, 'ANUAL'],
];

/** Meses de una frecuencia desde un mes (1..12), sin los meses cerrados (mockup: applyPre). */
export function mesesDePreset(paso, desde, anio, hoy) {
    const meses = [];
    for (let m = desde; m <= 12; m += paso) {
        if (!mesCerrado(anio, m, hoy)) meses.push(m);
    }
    return meses;
}

/** Pares estación × mes nuevos y duplicados contra las citas vigentes del año (mockup: bulkVals). */
export function paresAsignacion(citasVigentes, actividadId, estacionIds, meses) {
    const existentes = new Set(citasVigentes.filter((c) => c.actividadId === actividadId)
        .map((c) => `${c.estacionId}-${c.mes}`));
    let nuevas = 0;
    let duplicadas = 0;
    for (const e of estacionIds) {
        for (const m of meses) {
            existentes.has(`${e}-${m}`) ? duplicadas++ : nuevas++;
        }
    }
    return { nuevas, duplicadas };
}
