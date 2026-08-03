import { formatLocalDate, formatKm, formatDateTime } from './helpers.js';

// --- GESTIÓN ADMINISTRATIVA ---

export const vehicleManagementColumns = [
    { header: 'Placa', accessorKey: 'placa', size: 100 },
    { header: 'Marca', accessorKey: 'marca', size: 150 },
    { header: 'Tipo', accessorKey: 'tipoVehiculo', size: 120 },
    {
        header: 'Km Base',
        accessorFn: row => formatKm(row.kilometrajeActual),
        id: 'km_actual',
        size: 100,
    },
    { header: 'Pertenece a', accessorKey: 'belongsTo', size: 150 },
    {
        header: 'Ubicación',
        accessorFn: row => (row.ubicacionBase != null && String(row.ubicacionBase).trim() !== '' ? String(row.ubicacionBase).trim() : '—'),
        id: 'veh_inv_ubic',
        size: 160,
    },
    {
        header: 'SOAT - Vencimiento',
        accessorFn: row => formatLocalDate(row.soat?.fechaVencimiento),
        id: 'veh_soat_venc',
        size: 100,
        meta: { isDateStatus: true },
    },
    {
        header: 'SOAT - Días',
        accessorFn: row => row.soat?.diasRestantes ?? 'N/A',
        id: 'veh_soat_dias',
        size: 85,
    },
    {
        header: 'Tecno - Vencimiento',
        accessorFn: row => formatLocalDate(row.tecno?.fechaVencimiento),
        id: 'veh_tecno_venc',
        size: 100,
        meta: { isDateStatus: true },
    },
    {
        header: 'Tecno - Días',
        accessorFn: row => row.tecno?.diasRestantes ?? 'N/A',
        id: 'veh_tecno_dias',
        size: 85,
    },
    {
        header: 'Extintor - Vencimiento',
        accessorFn: row => formatLocalDate(row.extintor?.fechaVencimiento),
        id: 'veh_extintor_venc',
        size: 100,
        meta: { isDateStatus: true },
    },
    {
        header: 'Extintor - Meses',
        accessorFn: row => row.extintor?.diasRestantes ?? 'N/A',
        id: 'veh_extintor_meses',
        size: 85,
    },
    {
        id: "curriculum",
        header: "Hoja de Vida",
        size: 110,
        meta: { isCvAction: true },
    },
    {
        id: "doc_history_action",
        header: "Historial Docs",
        size: 90,
        meta: { isDocHistoryAction: true },
    },
    {
        id: "update_docs_action",
        header: "Documentos",
        size: 90,
        meta: { isUpdateDocsAction: true },
    },
    {
        id: "actions",
        header: "Acciones",
        size: 100,
        meta: { isAction: true },
    }
];


/** Inventario motos — mismo {@link VehicleResponse} que vehículos; sin columna tipo (fijado en servidor). */
export const motoInventoryColumns = [
    { header: 'Placa', accessorKey: 'placa', size: 100 },
    { header: 'Marca', accessorKey: 'marca', size: 150 },
    {
        header: 'Km Base',
        accessorFn: (row) => formatKm(row.kilometrajeActual),
        id: 'moto_km_actual',
        size: 100,
    },
    { header: 'Pertenece a', accessorKey: 'belongsTo', size: 150 },
    {
        header: 'Ubicación',
        accessorFn: (row) => (row.ubicacionBase != null && String(row.ubicacionBase).trim() !== '' ? String(row.ubicacionBase).trim() : '—'),
        id: 'moto_inv_ubic',
        size: 160,
    },
    {
        header: 'SOAT - Vencimiento',
        accessorFn: row => formatLocalDate(row.soat?.fechaVencimiento),
        id: 'moto_soat_venc',
        size: 100,
        meta: { isDateStatus: true },
    },
    {
        header: 'SOAT - Días',
        accessorFn: row => row.soat?.diasRestantes ?? 'N/A',
        id: 'moto_soat_dias',
        size: 85,
    },
    {
        header: 'Tecno - Vencimiento',
        accessorFn: row => formatLocalDate(row.tecno?.fechaVencimiento),
        id: 'moto_tecno_venc',
        size: 100,
        meta: { isDateStatus: true },
    },
    {
        header: 'Tecno - Días',
        accessorFn: row => row.tecno?.diasRestantes ?? 'N/A',
        id: 'moto_tecno_dias',
        size: 85,
    },
    {
        id: 'curriculum',
        header: 'Hoja de Vida',
        size: 110,
        meta: { isCvAction: true },
    },
    {
        id: 'doc_history_action',
        header: 'Historial Docs',
        size: 115,
        meta: { isDocHistoryAction: true },
    },
    {
        id: 'update_docs_action',
        header: 'Documentos',
        size: 120,
        meta: { isUpdateDocsAction: true },
    },
    {
        id: 'actions',
        header: 'Acciones',
        size: 100,
        meta: { isAction: true },
    },
];


/** Historial completo de cambios de aceite para un vehículo específico. */
export const vehicleOilHistoryColumns = [
    {
        header: 'Fecha',
        accessorFn: (row) => formatDateTime(row.dateStamp),
        id: 'oil_h_fecha',
        size: 140,
    },
    {
        header: 'Km en cambio',
        accessorFn: (row) => (row.kmAtChange != null ? formatKm(row.kmAtChange) : 'N/A'),
        id: 'oil_h_km',
        size: 110,
    },
    {
        header: 'Próximo cambio (km)',
        accessorFn: (row) =>
            row.kmAtChange != null && row.intervalKm != null
                ? formatKm(row.kmAtChange + row.intervalKm)
                : 'N/A',
        id: 'oil_h_proximo',
        size: 130,
    },
    {
        header: 'Intervalo (km)',
        accessorFn: (row) => (row.intervalKm != null ? formatKm(row.intervalKm) : 'N/A'),
        id: 'oil_h_intervalo',
        size: 110,
    },
    { header: 'Marca', accessorKey: 'brandName', size: 120 },
    {
        header: 'Cantidad (L)',
        accessorFn: (row) => (row.quantity != null ? row.quantity : 'N/A'),
        id: 'oil_h_cantidad',
        size: 90,
    },
    {
        header: 'Filtro de aire',
        accessorFn: (row) => (row.airFilterChanged ? 'Sí' : 'No'),
        id: 'oil_h_filtro',
        size: 90,
    },
];

