/**
 * Órdenes de trabajo de estación (OT-EB): estados, prioridades y el origen de una ejecución.
 * Ver DOCUMENTOS/CIVILWEB/ORDENES_TRABAJO_ESTACIONES.md.
 */
import { BADGE, IMPREVISTO } from './cronograma.js';

/** Color propio de las órdenes: distinto del semáforo y de la terracota de los imprevistos. */
export const ORDEN = { c: '#4146b8', bg: '#ecedfb' };

export const ORDEN_ESTADO = {
    ASIGNADA: { ...BADGE.warn, g: '●', l: 'Asignada', ayuda: 'En el móvil del operario' },
    POR_VERIFICAR: { c: ORDEN.c, bg: ORDEN.bg, g: '◐', l: 'Por verificar', ayuda: 'El operario ya registró el trabajo' },
    CERRADA: { ...BADGE.ok, g: '✓', l: 'Cerrada', ayuda: 'Verificada: el hallazgo quedó resuelto' },
    ANULADA: { ...BADGE.neu, g: '✕', l: 'Anulada', ayuda: 'No procede' },
};

export const PRIORIDAD = {
    ALTA: { ...BADGE.bad, l: 'Alta', dias: 7 },
    MEDIA: { ...BADGE.warn, l: 'Media', dias: 30 },
};

/** Prioridad sugerida: "Requiere intervención" es alta. */
export const prioridadSugerida = (resultado) => (resultado === 'REQUIERE_INTERVENCION' ? 'ALTA' : 'MEDIA');

/** Fecha límite sugerida (yyyy-mm-dd) según la prioridad, contada desde `hoy` (Date). */
export function fechaLimiteSugerida(prioridad, hoy = new Date()) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + (PRIORIDAD[prioridad]?.dias ?? 30));
    return isoLocal(d);
}

export function isoLocal(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * De dónde viene una ejecución: una cita del cronograma, una orden de trabajo o un imprevisto.
 * Las visitas de órdenes no son imprevistos (no tienen cita, pero estaban planeadas).
 */
export function origenEjecucion(e) {
    if (e?.orden) return { tipo: 'orden', l: `Orden ${e.orden.consecutivo}`, corto: 'Orden de trabajo', ...ORDEN };
    if (e?.esProgramada) return { tipo: 'cronograma', l: 'Cronograma', corto: 'Cronograma', c: '#52514e', bg: '#f0f0ee' };
    return { tipo: 'imprevisto', l: 'Imprevisto', corto: 'Imprevisto', c: IMPREVISTO.c, bg: IMPREVISTO.bg };
}

export const SEGUIMIENTO_COLOR = { ABIERTO: 'red', EN_PROCESO: 'yellow', RESUELTO: 'green' };
/** ABIERTO = nadie lo atiende todavía (sin orden); EN_PROCESO = tiene una orden de trabajo en curso. */
export const SEGUIMIENTO_LABEL = { ABIERTO: 'Sin atender', EN_PROCESO: 'En corrección', RESUELTO: 'Resuelto' };

/** "Sin atender", "En corrección · OT-EB-00003"… para la columna Seguimiento; null si es Conforme. */
export function seguimientoTexto(s) {
    if (!s) return null;
    const base = SEGUIMIENTO_LABEL[s.estado] ?? s.estado;
    return s.orden && s.estado !== 'RESUELTO' ? `${base} · ${s.orden.consecutivo}` : base;
}
