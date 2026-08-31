import { formatLocalDate, formatHoras } from './helpers.js';

export const machineColumns = [
    { accessorKey: "name", header: "Nombre", size: 150 },
    { accessorKey: "brand", header: "Marca", size: 100 },
    { accessorKey: "model", header: "Modelo", size: 100 },
    { accessorKey: "numInterIdentification", header: "Núm. Identificación", size: 150 },
    { accessorKey: "numEngine", header: "Núm. Motor", size: 120 },
    {
        accessorFn: (row) => (row.belongsTo === 'distrito' ? 'Distrito' : 'Asociación'),
        id: "belongsTo",
        header: "Pertenece a",
        size: 100,
    },
    {
        accessorFn: (row) => formatLocalDate(row.soat),
        id: "soat",
        header: "SOAT",
        size: 100,
        meta: { isDateStatus: true },
    },
    {
        accessorFn: (row) => formatLocalDate(row.runt),
        id: "runt",
        header: "Seguro todo riesgo",
        size: 100,
        meta: { isDateStatus: true },
    },
    {
        id: "curriculum",
        header: "Hoja de Vida",
        size: 120,
        meta: { isCvAction: true }, // Identificador para el nuevo botón
    },
    {
        id: "actions",
        header: "Acciones",
        size: 120,
        meta: { isAction: true },
    },
];

/** Inspecciones preoperacionales de máquinas. */
export const machineInspectionColumns = [
    {
        header: 'Fecha',
        accessorFn: (row) => {
            if (!row.dateStamp) return 'N/A';
            const d = new Date(row.dateStamp);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        },
        id: 'insp_fecha',
        size: 100,
    },
    {
        header: 'Horas',
        accessorFn: (row) => (row.hourMeter != null ? formatHoras(row.hourMeter) : 'N/A'),
        id: 'insp_horas',
        size: 80,
    },
    { header: 'Fugas', accessorKey: 'leakStatus', id: 'insp_fugas', size: 80 },
    { header: 'Frenos', accessorKey: 'brakeStatus', id: 'insp_frenos', size: 80 },
    { header: 'Correas/Poleas', accessorKey: 'beltsPulleysStatus', id: 'insp_correas', size: 100 },
    { header: 'Carriles Llantas', accessorKey: 'tireLanesStatus', id: 'insp_llantas', size: 100 },
    { header: 'Encendido', accessorKey: 'carIgnitionStatus', id: 'insp_encendido', size: 80 },
    { header: 'Eléctrico', accessorKey: 'electricalStatus', id: 'insp_electrico', size: 80 },
    { header: 'Mecánico', accessorKey: 'mechanicalStatus', id: 'insp_mecanico', size: 80 },
    { header: 'Temperatura', accessorKey: 'temperatureStatus', id: 'insp_temp', size: 90 },
    { header: 'Aceite Motor', accessorKey: 'oilStatus', id: 'insp_aceite', size: 90 },
    { header: 'Hidráulico', accessorKey: 'hydraulicStatus', id: 'insp_hidraulico', size: 90 },
    { header: 'Refrigerante', accessorKey: 'coolantStatus', id: 'insp_refrigerante', size: 90 },
    { header: 'Estructura', accessorKey: 'structuralStatus', id: 'insp_estructura', size: 80 },
    {
        header: 'Observaciones',
        accessorKey: 'observations',
        id: 'insp_obs',
        size: 300,
        meta: { isMultiline: true }
    },
];

