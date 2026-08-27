import { formatDateTime, formatLocalDate, calculatePercentageUsed, getStatusColor, formatKm } from './helpers.js';

export const createConsolidadoColumns = (owner) => [
    {
        header: `Propiedad de ${owner}`,
        columns: [
            { header: 'Máquina', accessorFn: row => row.machine.name, size: 200 },
            { header: 'Horómetro Actual', accessorFn: row => row.currentData?.currentHourMeter ?? 'N/A', id: 'horometro_actual', size: 120 },
            { header: 'Última Actualización', accessorFn: row => formatDateTime(row.currentData?.lastUpdate), id: 'ultima_actualizacion', size: 150 },
        ]
    },
    {
        header: 'Aceite de Motor',
        columns: [
            { header: 'Marca', size: 60, accessorFn: row => row.consolidateMotorOil?.brand?.name ?? 'N/A', id: 'motor_marca', meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Cant.', size: 60, accessorFn: row => row.consolidateMotorOil?.quantity ?? 'N/A', id: 'motor_cantidad', meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Prom. Cambio', size: 80, accessorFn: row => row.consolidateMotorOil?.averageChangeHours ?? 'N/A', id: 'motor_promedio_cambio', meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Fecha Últ. Cambio', size: 100, accessorFn: row => formatLocalDate(row.consolidateMotorOil?.dateLastUpdate), id: 'motor_fecha_ultimo_cambio', meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Horómetro Últ. Cambio', size: 100, accessorFn: row => row.consolidateMotorOil?.hourMeterLastUpdate ?? 'N/A', id: 'motor_horometro_ultimo_cambio', meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Próximo Cambio', size: 80, accessorFn: row => row.consolidateMotorOil?.hourMeterNextUpdate ?? 'N/A', id: 'motor_proximo_cambio', meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Tiempo Últ. Cambio', size: 100, accessorFn: row => row.consolidateMotorOil?.timeLastUpdateMouths ?? 'N/A', id: 'motor_tiempo_ultimo_cambio', meta: { cellClass: 'motor-oil-cell' } },
            {
                header: 'Horas Restantes',
                size: 100,
                accessorFn: row => row.consolidateMotorOil?.remainingHoursNextUpdateMouths ?? 'N/A',
                id: 'motor_horas_restantes',
                meta: {
                    cellClass: 'motor-oil-cell',
                    isStatusCell: true,
                    getStatus: (row) => {
                        const percentage = calculatePercentageUsed(
                            row.consolidateMotorOil?.remainingHoursNextUpdateMouths,
                            row.consolidateMotorOil?.averageChangeHours
                        );
                        return { percentage, color: getStatusColor(percentage) };
                    }
                }
            },
            {
                id: 'motor_historial',
                header: '',
                size: 90,
                meta: { cellClass: 'motor-oil-cell', isViewMotorOilHistoryAction: true },
            },
        ]
    },
    {
        header: 'Aceite Hidráulico',
        columns: [
            { header: 'Marca', size: 60, accessorFn: row => row.consolidateHydraulicOil?.brand?.name ?? 'N/A', id: 'hidraulico_marca', meta: { cellClass: 'hydraulic-oil-cell' } },
            { header: 'Cant.', size: 60, accessorFn: row => row.consolidateHydraulicOil?.quantity ?? 'N/A', id: 'hidraulico_cantidad', meta: { cellClass: 'hydraulic-oil-cell' } },
            { header: 'Prom. Cambio', size: 80, accessorFn: row => row.consolidateHydraulicOil?.averageChangeHours ?? 'N/A', id: 'hidraulico_promedio_cambio', meta: { cellClass: 'hydraulic-oil-cell' } },
            { header: 'Fecha Últ. Cambio', size: 100, accessorFn: row => formatLocalDate(row.consolidateHydraulicOil?.dateLastUpdate), id: 'hidraulico_fecha_ultimo_cambio', meta: { cellClass: 'hydraulic-oil-cell' } },
            { header: 'Horómetro Últ. Cambio', size: 100, accessorFn: row => row.consolidateHydraulicOil?.hourMeterLastUpdate ?? 'N/A', id: 'hidraulico_horometro_ultimo_cambio', meta: { cellClass: 'hydraulic-oil-cell' } },
            { header: 'Próximo Cambio', size: 80, accessorFn: row => row.consolidateHydraulicOil?.hourMeterNextUpdate ?? 'N/A', id: 'hidraulico_proximo_cambio', meta: { cellClass: 'hydraulic-oil-cell' } },
            { header: 'Tiempo Últ. Cambio', size: 100, accessorFn: row => row.consolidateHydraulicOil?.timeLastUpdateMouths ?? 'N/A', id: 'hidraulico_tiempo_ultimo_cambio', meta: { cellClass: 'hydraulic-oil-cell' } },
            {
                header: 'Horas Restantes',
                size: 100,
                accessorFn: row => row.consolidateHydraulicOil?.remainingHoursNextUpdateMouths ?? 'N/A',
                id: 'hidraulico_horas_restantes',
                meta: {
                    cellClass: 'hydraulic-oil-cell',
                    isStatusCell: true,
                    getStatus: (row) => {
                        const percentage = calculatePercentageUsed(
                            row.consolidateHydraulicOil?.remainingHoursNextUpdateMouths,
                            row.consolidateHydraulicOil?.averageChangeHours
                        );
                        return { percentage, color: getStatusColor(percentage) };
                    }
                }
            },
            {
                id: 'hidraulico_historial',
                header: '',
                size: 90,
                meta: { cellClass: 'hydraulic-oil-cell', isViewHydraulicOilHistoryAction: true },
            },
        ]
    },
    {
        id: 'acciones_maq',
        header: 'Acciones',
        size: 140,
        meta: { isConsolidadoMaqActions: true },
    },
];

/**
 * Historial editable de cambios de aceite (motor u hidráulico) de una máquina —
 * "Ver historial" en createConsolidadoColumns abre esto en un modal.
 * @param {boolean} showActions - agrega columna Editar/Eliminar (ADMIN, "en caso de error").
 */
export const createMachineOilHistoryColumns = (showActions = false) => {
    const columns = [
        { header: 'Fecha', accessorFn: (row) => formatDateTime(row.dateStamp), id: 'moh_fecha', size: 140 },
        { header: 'Marca', accessorKey: 'brandName', size: 120 },
        {
            header: 'Cantidad',
            accessorFn: (row) => (row.quantity != null ? row.quantity : 'N/A'),
            id: 'moh_cantidad',
            size: 90,
        },
        {
            header: 'Horómetro',
            accessorFn: (row) => (row.hourMeter != null ? row.hourMeter : 'N/A'),
            id: 'moh_horometro',
            size: 100,
        },
        {
            header: 'Prom. cambio (h)',
            accessorFn: (row) => (row.averageHoursChange != null ? row.averageHoursChange : 'N/A'),
            id: 'moh_promedio',
            size: 110,
        },
    ];
    if (showActions) {
        columns.push({ id: 'moh_actions', header: 'Acciones', size: 140, meta: { isAction: true } });
    }
    return columns;
};

/** Consolidado vehículos (tab Consolidado → Vehículos). Mismo estilo que maquinaria: fondos por grupo. */
export const consolidadoVehicleColumns = [
    {
        header: 'Vehículo',
        columns: [
            { header: 'Pertenece a', accessorKey: 'area', size: 130 },
            { header: 'Placa', accessorKey: 'placa', size: 90 },
            { header: 'Km Actual', accessorFn: row => formatKm(row.kmActual), id: 'cv_km', size: 90 },
            { header: 'Días sin reporte', accessorKey: 'diasUltimoReporte', id: 'cv_dias_rep', size: 95 },
            { header: 'Fecha Último Reporte', accessorFn: row => formatDateTime(row.fechaUltimoReporte), id: 'cv_fecha_rep', size: 150 },
        ],
    },
    {
        header: 'Aceite Motor',
        columns: [
            { header: 'Marca', size: 100, accessorFn: row => row.maintenance?.brandName ?? 'N/A', id: 'cv_oil_marca', meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Cant.', size: 60, accessorFn: row => row.maintenance?.quantity ?? 'N/A', id: 'cv_oil_cantidad', meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Intervalo', size: 80, accessorFn: row => (row.maintenance?.intervalKm ? formatKm(row.maintenance.intervalKm) + ' km' : 'N/A'), id: 'cv_oil_intervalo', meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Fecha Últ. Cambio', accessorFn: row => formatLocalDate(row.maintenance?.fechaUltimoCambio), id: 'cv_oil_fecha', size: 110, meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Km Últ. Cambio', accessorFn: row => formatKm(row.maintenance?.kmCambio), id: 'cv_oil_km_cambio', size: 95, meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Próximo Cambio', accessorFn: row => formatKm(row.maintenance?.kmProximoCambio), id: 'cv_oil_km_prox', size: 95, meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Días desde Cambio', accessorFn: row => row.maintenance?.diasDesdeUltimoCambio ?? 'N/A', id: 'cv_oil_dias', size: 95, meta: { cellClass: 'motor-oil-cell' } },
            {
                header: 'Km Restantes',
                accessorFn: row => row.maintenance?.kmParaProximo ?? 'N/A',
                id: 'cv_oil_km_rest',
                size: 90,
                meta: {
                    cellClass: 'motor-oil-cell',
                    isStatusCell: true,
                    getStatus: (row) => {
                        const percentage = calculatePercentageUsed(
                            row.maintenance?.kmParaProximo,
                            row.maintenance?.intervalKm
                        );
                        return { percentage, color: getStatusColor(percentage) };
                    }
                }
            },
            { header: 'Filtro Aire', accessorFn: row => row.maintenance?.filtroAire ? 'Sí' : 'No', id: 'cv_oil_filtro', size: 80, meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Estado', accessorFn: row => row.maintenance?.estado ?? 'N/A', id: 'cv_oil_estado', size: 100, meta: { cellClass: 'motor-oil-cell' } },
        ],
    },
    {
        id: 'cv_actions',
        header: 'Acciones',
        accessorFn: () => '',
        size: 140,
        meta: { isConsolidadoVehicleActions: true },
    },
];

/** Consolidado motos (tab Consolidado → Motos). Mismo estilo que vehículos: estructura idéntica. */
export const consolidadoMotoColumns = [
    {
        header: 'Moto',
        columns: [
            { header: 'Pertenece a', accessorKey: 'departamento', size: 130 },
            { header: 'Placa', accessorKey: 'placa', size: 90 },
            { header: 'Km Actual', accessorFn: row => formatKm(row.kmActual), id: 'cm_km', size: 90 },
            { header: 'Días sin reporte', accessorKey: 'diasUltimoReporte', id: 'cm_dias_rep', size: 95 },
            { header: 'Fecha Último Reporte', accessorFn: row => formatDateTime(row.fechaUltimoReporte), id: 'cm_fecha_rep', size: 150 },
        ],
    },
    {
        header: 'Aceite Motor',
        columns: [
            { header: 'Marca', size: 100, accessorFn: row => row.oil?.brandName ?? 'N/A', id: 'cm_oil_marca', meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Cant.', size: 60, accessorFn: row => row.oil?.quantity ?? 'N/A', id: 'cm_oil_cantidad', meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Intervalo', size: 80, accessorFn: row => (row.oil?.intervalKm ? formatKm(row.oil.intervalKm) + ' km' : 'N/A'), id: 'cm_oil_intervalo', meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Fecha Últ. Cambio', accessorFn: row => formatLocalDate(row.oil?.fechaUltimoCambio), id: 'cm_oil_fecha', size: 110, meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Km Últ. Cambio', accessorFn: row => formatKm(row.oil?.kmCambio), id: 'cm_oil_km_cambio', size: 95, meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Próximo Cambio', accessorFn: row => formatKm(row.oil?.kmProximoCambio), id: 'cm_oil_km_prox', size: 95, meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Días desde Cambio', accessorFn: row => row.oil?.diasDesdeUltimoCambio ?? 'N/A', id: 'cm_oil_dias', size: 95, meta: { cellClass: 'motor-oil-cell' } },
            {
                header: 'Km Restantes',
                accessorFn: row => row.oil?.kmParaProximo ?? 'N/A',
                id: 'cm_oil_km_rest',
                size: 90,
                meta: {
                    cellClass: 'motor-oil-cell',
                    isStatusCell: true,
                    getStatus: (row) => {
                        const percentage = calculatePercentageUsed(
                            row.oil?.kmParaProximo,
                            row.oil?.intervalKm
                        );
                        return { percentage, color: getStatusColor(percentage) };
                    }
                }
            },
            { header: 'Filtro Aire', accessorFn: row => row.oil?.filtroAire ? 'Sí' : 'No', id: 'cm_oil_filtro', size: 80, meta: { cellClass: 'motor-oil-cell' } },
            { header: 'Estado', accessorFn: row => row.oil?.estado ?? 'N/A', id: 'cm_oil_estado', size: 100, meta: { cellClass: 'motor-oil-cell' } },
        ],
    },
    {
        id: 'cm_actions',
        header: 'Acciones',
        accessorFn: () => '',
        size: 140,
        meta: { isConsolidadoMotoActions: true },
    },
];

