import { describe, it, expect } from 'vitest';
import {
    origenEjecucion, seguimientoTexto, prioridadSugerida, fechaLimiteSugerida,
} from '../../utils/ordenes.js';

describe('utils/ordenes', () => {
    it('origen: una visita de orden de trabajo no es imprevisto aunque no tenga cita', () => {
        expect(origenEjecucion({ esProgramada: true }).tipo).toBe('cronograma');
        expect(origenEjecucion({ esProgramada: false }).tipo).toBe('imprevisto');
        const ot = origenEjecucion({ esProgramada: false, orden: { id: 4, consecutivo: 'OT-EB-00004', estado: 'POR_VERIFICAR' } });
        expect(ot.tipo).toBe('orden');
        expect(ot.l).toBe('Orden OT-EB-00004');
    });

    it('seguimiento: muestra la orden mientras no esté resuelto', () => {
        expect(seguimientoTexto(null)).toBeNull();
        expect(seguimientoTexto({ estado: 'ABIERTO' })).toBe('Sin atender');
        expect(seguimientoTexto({ estado: 'EN_PROCESO', orden: { consecutivo: 'OT-EB-00003' } })).toBe('En corrección · OT-EB-00003');
        expect(seguimientoTexto({ estado: 'RESUELTO', orden: { consecutivo: 'OT-EB-00003' } })).toBe('Resuelto');
    });

    it('prioridad y plazo sugeridos: requiere intervención es alta, 7 días; lo demás media, 30', () => {
        expect(prioridadSugerida('REQUIERE_INTERVENCION')).toBe('ALTA');
        expect(prioridadSugerida('CON_HALLAZGOS')).toBe('MEDIA');
        const hoy = new Date(2026, 9, 28);
        expect(fechaLimiteSugerida('ALTA', hoy)).toBe('2026-11-04');
        expect(fechaLimiteSugerida('MEDIA', hoy)).toBe('2026-11-27');
    });
});
