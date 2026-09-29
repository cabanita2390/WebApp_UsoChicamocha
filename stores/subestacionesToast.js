import { writable } from 'svelte/store';

/** Toast del módulo Subestaciones: mensaje temporal abajo al centro (~2 s), como el mockup. */
export const subestacionesToast = writable(null);

let timer;

/** @param {string} text @param {{ error?: boolean, ms?: number }} [opts] */
export function flash(text, { error = false, ms = 2200 } = {}) {
    subestacionesToast.set({ text, error });
    clearTimeout(timer);
    timer = setTimeout(() => subestacionesToast.set(null), error ? Math.max(ms, 4000) : ms);
}
