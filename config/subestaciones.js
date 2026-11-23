/**
 * Etiquetas del módulo Subestaciones. Los valores son los códigos de la BD (en MAYÚSCULAS);
 * la web muestra estas etiquetas. Las disciplinas no están aquí: las sirve el back
 * (GET /substation/disciplinas, ver stores/disciplinas.js).
 */
export const TIPOS_ESTACION = [
    { value: 'BOMBEO', label: 'Bombeo' },
    { value: 'COMPLEMENTARIA', label: 'Complementaria' },
];

export const FRECUENCIAS = [
    { value: 'MENSUAL', label: 'Mensual' },
    { value: 'BIMESTRAL', label: 'Bimestral' },
    { value: 'TRIMESTRAL', label: 'Trimestral' },
    { value: 'SEMESTRAL', label: 'Semestral' },
    { value: 'ANUAL', label: 'Anual' },
];

export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto',
    'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const etiqueta = (lista) => (valor) => lista.find((o) => o.value === valor)?.label ?? valor ?? '';
export const tipoLabel = etiqueta(TIPOS_ESTACION);
export const frecuenciaLabel = etiqueta(FRECUENCIAS);
// Las disciplinas vienen del back (stores/disciplinas.js); se re-exporta para no cambiar los imports.
export { disciplinaLabel } from '../stores/disciplinas.js';
