import { formatHoras } from './helpers.js';

export const dashboardColumns = [
    {
        accessorFn: (row) => {
            const d = new Date(row.dateStamp + 'Z');
            const day = String(d.getUTCDate()).padStart(2, '0');
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const year = d.getUTCFullYear();
            return `${day}/${month}/${year}`;
        },
        id: "fecha",
        header: "Fecha",

    },
    {
        accessorFn: (row) => new Date(row.dateStamp + 'Z').toLocaleTimeString('en-GB', { timeZone: 'America/Bogota' }), // Formato 24h
        id: "hora",
        header: "Hora",

    },
    {
        accessorFn: (row) => `${row.machine.name} ${row.machine.model} ${row.machine.numInterIdentification}`,
        id: "maquina",
        header: "MÁQUINA",

    },
    { accessorFn: (row) => formatHoras(row.hourMeter), id: "hourMeter", header: "Horómetro", size: 80 },
    {
        accessorKey: "leakStatus",
        header: "Fugas Sistema",

        meta: { isStatus: true },
    },
    {
        accessorKey: "brakeStatus",
        header: "Sistema Frenos",

        meta: { isStatus: true },
    },
    {
        accessorKey: "beltsPulleysStatus",
        header: "Correas y Poleas",

        meta: { isStatus: true },
    },
    {
        accessorKey: "tireLanesStatus",
        header: "Llantas/ Carriles",

        meta: { isStatus: true },
    },
    {
        accessorKey: "carIgnitionStatus",
        header: "Sistema Encendido",

        meta: { isStatus: true },
    },
    {
        accessorKey: "electricalStatus",
        header: "Sistema Eléctrico",

        meta: { isStatus: true },
    },
    {
        accessorKey: "mechanicalStatus",
        header: "Sistema Mecánico",

        meta: { isStatus: true },
    },
    {
        accessorKey: "temperatureStatus",
        header: "Nivel Temperatura",

        meta: { isStatus: true },
    },
    {
        accessorKey: "oilStatus",
        header: "Nivel Aceite",

        meta: { isStatus: true },
    },
    {
        accessorKey: "hydraulicStatus",
        header: "Nivel Hidráulico",

        meta: { isStatus: true },
    },
    {
        accessorKey: "coolantStatus",
        header: "Nivel Refrigerante",

        meta: { isStatus: true },
    },
    {
        accessorKey: "structuralStatus",
        header: "Estado Estructural",

        meta: { isStatus: true },
    },
    {
        accessorKey: "expirationDateFireExtinguisher",
        header: "Vigencia Extintor",

        meta: { isDateStatus: true },
    },
    {
        accessorKey: "observations",
        header: "Observaciones/Detalles/Comentarios ",
        size: 200,
        meta: { isMultiline: true },
    },
    {
        accessorKey: "greasingAction",
        header: "Acción de Engrase",

    },
    {
        accessorKey: "greasingObservations",
        header: "Observaciones/Detalles/Comentarios de Engrase ",
        size: 350,
        meta: { isMultiline: true },
    },
    {
        accessorFn: (row) => row.user.fullName,
        id: "responsable",
        header: "Responsable",

    },

    {
        id: "view_images",
        header: "Imágenes",
        meta: { isImageAction: true },
    },
];


