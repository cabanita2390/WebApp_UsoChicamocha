import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

vi.mock('../stores/api.js', () => ({ default: vi.fn() }));

import fetchWithAuth from '../stores/api.js';
import {
    disciplinas, disciplinasListas, opcionesDisciplina, cargarDisciplinas,
    disciplinaLabel, disciplinaSigla, usaConjuntos, usaElementos, ordenDisciplina,
} from '../stores/disciplinas.js';
import { DISCIPLINAS_FIXTURE } from './__mocks__/disciplinas.js';

describe('stores/disciplinas', () => {
    beforeEach(() => {
        disciplinas.set(DISCIPLINAS_FIXTURE);
        disciplinasListas.set(true);
        fetchWithAuth.mockReset();
    });

    it('nombres, siglas y reglas salen de lo que manda el back', () => {
        expect(disciplinaLabel('ELECTRICO')).toBe('Eléctrico');
        expect(disciplinaSigla('ELECTROMECANICO')).toBe('M');
        expect(usaConjuntos('CIVIL')).toBe(false);
        expect(usaConjuntos('ELECTRICO')).toBe(true);
        expect(usaConjuntos('ELECTROMECANICO')).toBe(true);
        expect(usaElementos('CIVIL')).toBe(false);
        expect(usaElementos('ELECTRICO')).toBe(true);
        expect(get(opcionesDisciplina)[0]).toEqual({ value: 'CIVIL', label: 'Civil' });
    });

    it('una disciplina que el back no conoce se muestra con su código y no usa nada', () => {
        expect(disciplinaLabel('NUEVA')).toBe('NUEVA');
        expect(disciplinaSigla('NUEVA')).toBe('');
        expect(usaElementos('NUEVA')).toBe(false);
        expect(ordenDisciplina('NUEVA')).toBeGreaterThan(ordenDisciplina('ELECTROMECANICO'));
    });

    it('las pide al back una sola vez, en el orden que trae cada una', async () => {
        disciplinas.set([]);
        disciplinasListas.set(false);
        fetchWithAuth.mockResolvedValue([DISCIPLINAS_FIXTURE[1], DISCIPLINAS_FIXTURE[0]]);

        await cargarDisciplinas();
        await cargarDisciplinas();

        expect(fetchWithAuth).toHaveBeenCalledTimes(1);
        expect(fetchWithAuth).toHaveBeenCalledWith('substation/disciplinas');
        expect(get(disciplinas).map((d) => d.codigo)).toEqual(['CIVIL', 'ELECTRICO']);
        expect(get(disciplinasListas)).toBe(true);
    });

    it('si falla, se puede reintentar', async () => {
        disciplinas.set([]);
        disciplinasListas.set(false);
        fetchWithAuth.mockRejectedValueOnce(new Error('sin red')).mockResolvedValueOnce(DISCIPLINAS_FIXTURE);

        await expect(cargarDisciplinas()).rejects.toThrow('sin red');
        expect(get(disciplinasListas)).toBe(false);
        await cargarDisciplinas();
        expect(get(disciplinasListas)).toBe(true);
    });
});
