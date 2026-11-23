/** Lo que responde GET /substation/disciplinas con los datos de V53 (fixture de los tests). */
export const DISCIPLINAS_FIXTURE = [
    { codigo: 'CIVIL', nombre: 'Civil', sigla: 'C', orden: 1, capturaMovil: true, conjuntos: 'NO', usaElementos: false, usaEquipos: false, usaControles: false },
    { codigo: 'ELECTRICO', nombre: 'Eléctrico', sigla: 'E', orden: 2, capturaMovil: true, conjuntos: 'OPCIONAL', usaElementos: true, usaEquipos: false, usaControles: false },
    { codigo: 'ELECTROMECANICO', nombre: 'Electromecánico', sigla: 'M', orden: 3, capturaMovil: false, conjuntos: 'OBLIGATORIO', usaElementos: true, usaEquipos: false, usaControles: false },
];
