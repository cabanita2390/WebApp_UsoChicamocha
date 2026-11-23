import { writable, derived, get } from 'svelte/store';

/**
 * Disciplinas de Subestaciones y lo que hace cada una (GET /substation/disciplinas). El back es
 * la única fuente: la web no tiene nombres ni reglas de disciplina escritos en su código.
 * Cada disciplina: { codigo, nombre, sigla, orden, capturaMovil, conjuntos (NO | OPCIONAL |
 * OBLIGATORIO), usaElementos, usaEquipos, usaControles }.
 */
export const disciplinas = writable([]);

/** true cuando ya se leyeron del back: las pantallas de Estaciones esperan a esto para dibujarse. */
export const disciplinasListas = writable(false);

/** Para los <select> y filtros: [{ value, label }] en el orden del back. */
export const opcionesDisciplina = derived(disciplinas, (l) => l.map((d) => ({ value: d.codigo, label: d.nombre })));

let carga = null;

/** Lee las disciplinas una vez por carga de la página; si falla, se puede reintentar. */
export function cargarDisciplinas() {
    if (get(disciplinasListas)) {
        return Promise.resolve();
    }
    if (!carga) {
        // api.js se carga aquí y no arriba: las utilidades puras (cronograma, filtros) usan los
        // nombres de este módulo sin arrastrar la sesión.
        carga = import('./api.js')
            .then(({ default: fetchWithAuth }) => fetchWithAuth('substation/disciplinas'))
            .then((lista) => {
                disciplinas.set([...(lista ?? [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
                disciplinasListas.set(true);
            })
            // Lista o fallida, la próxima vez decide disciplinasListas (si falló, se reintenta).
            .finally(() => {
                carga = null;
            });
    }
    return carga;
}

/** La disciplina con ese código, o undefined. */
export const disciplinaDe = (codigo) => get(disciplinas).find((d) => d.codigo === codigo);

/** Nombre visible de la disciplina; el código si el back no la conoce. */
export const disciplinaLabel = (codigo) => disciplinaDe(codigo)?.nombre ?? codigo ?? '';

/** Sigla corta para las celdas del cronograma ("C", "E", "M"). */
export const disciplinaSigla = (codigo) => disciplinaDe(codigo)?.sigla ?? '';

/** La disciplina marca conjuntos en "¿Qué se intervino?". */
export const usaConjuntos = (codigo) => {
    const c = disciplinaDe(codigo)?.conjuntos;
    return c === 'OPCIONAL' || c === 'OBLIGATORIO';
};

/** La disciplina marca elementos en "¿Qué se intervino?". */
export const usaElementos = (codigo) => disciplinaDe(codigo)?.usaElementos === true;

/** Posición en el orden del back (las desconocidas al final). */
export const ordenDisciplina = (codigo) => {
    const i = get(disciplinas).findIndex((d) => d.codigo === codigo);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
};
