/**
 * Opciones para SelectBuscable en los filtros de Estaciones: ordenadas por nombre, con las
 * actividades agrupadas por disciplina y lo inactivo al final, en su propio grupo.
 */
import { DISCIPLINAS, disciplinaLabel } from '../config/subestaciones.js';

const porNombre = (a, b) => String(a.nombre ?? '').localeCompare(String(b.nombre ?? ''), 'es', { sensitivity: 'base' });
const inactivo = (x) => x.activa === false;

/** Activos primero; si hay inactivos, cada parte va en su grupo. */
function conInactivos(lista, activos, inactivos) {
  const hay = lista.some(inactivo);
  return [...lista.filter((x) => !inactivo(x)), ...lista.filter(inactivo)].map((x) => ({
    value: x.id,
    label: x.nombre,
    grupo: hay ? (inactivo(x) ? inactivos : activos) : undefined,
  }));
}

export const opcionesEstaciones = (estaciones = []) =>
  conInactivos([...estaciones].sort(porNombre), 'Activas', 'Inactivas');

export const opcionesElementos = (elementos = []) =>
  conInactivos([...elementos].sort(porNombre), 'Activos', 'Inactivos');

export function opcionesActividades(actividades = []) {
  const orden = (d) => {
    const i = DISCIPLINAS.findIndex((x) => x.value === d);
    return i < 0 ? DISCIPLINAS.length : i;
  };
  return [...actividades]
    .sort((a, b) => orden(a.disciplina) - orden(b.disciplina) || porNombre(a, b))
    .map((a) => ({ value: a.id, label: inactivo(a) ? `${a.nombre} (inactiva)` : a.nombre, grupo: a.disciplina ? disciplinaLabel(a.disciplina) : undefined }));
}

/** Búsqueda sin tildes ni mayúsculas en uno o varios textos ("electrico" encuentra "Eléctrico"). */
const normal = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const coincideTexto = (textos, q) =>
  !q || [].concat(textos).some((t) => normal(t).includes(normal(q).trim()));
