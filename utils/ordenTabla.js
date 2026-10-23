/**
 * Orden por columna de las tablas propias del módulo de subestaciones (las grillas
 * .sub-th/.sub-tr, que no usan DataGrid). El orden es { campo, dir } o null (orden del servidor).
 */
const texto = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

/** Primer clic en una columna: su dirección natural; otro clic en la misma la invierte. */
export function alternarOrden(actual, campo, dirInicial = 'asc') {
    if (actual?.campo === campo) return { campo, dir: actual.dir === 'asc' ? 'desc' : 'asc' };
    return { campo, dir: dirInicial };
}

function comparar(a, b) {
    if (typeof a === 'string' || typeof b === 'string') return texto.compare(String(a), String(b));
    return Number(a) - Number(b);
}

/**
 * Copia de `filas` ordenada según `orden`. `valores[campo](fila)` da un número, texto o booleano;
 * null/undefined (p. ej. "sin citas") va siempre al final, en cualquier dirección. Los empates
 * se resuelven con `desempate(fila)` ascendente (normalmente el nombre).
 */
export function ordenarFilas(filas, orden, valores, desempate = null) {
    const valor = orden && valores[orden.campo];
    if (!valor) return filas;
    const signo = orden.dir === 'desc' ? -1 : 1;
    return [...filas].sort((x, y) => {
        const a = valor(x);
        const b = valor(y);
        const vaciaA = a == null || Number.isNaN(a);
        const vaciaB = b == null || Number.isNaN(b);
        if (vaciaA || vaciaB) {
            if (!(vaciaA && vaciaB)) return vaciaA ? 1 : -1;
        } else {
            const c = comparar(a, b);
            if (c) return c * signo;
        }
        return desempate ? comparar(desempate(x) ?? '', desempate(y) ?? '') : 0;
    });
}
