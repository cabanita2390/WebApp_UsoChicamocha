import { formatDateTimeLocal, yn } from './helpers.js';

/**
 * Columnas del historial de Tanqueo (combustibles, Fase 4 Task 18; reutilizada en
 * el historial editable de Tanqueo y Distribución, Fase 5).
 * @param {Record<number, string>} fuelTypesById - mapa id -> nombre, ya cargado en $data.fuelTypes.
 * @param {Record<number, string>} unidadMedidaById - mapa id -> unidadMedida ('GALON'|'M3'), ya cargado en $data.fuelTypes.
 * @param {Record<number, object>} vehiculosById - mapa id -> vehículo/moto de $data.vehicles (placa, marca).
 * @param {Record<number, object>} machinesById - mapa id -> máquina de $data.machines (name, brand).
 * @param {boolean} showActions - agrega una columna de acciones (Editar/Eliminar) al final; se
 *   omite del todo (no solo se oculta el botón Eliminar) cuando el usuario no es ADMIN.
 * @param {boolean} showHistorialAction - agrega la columna "Ver historial" (de solo lectura,
 *   visible sin importar el rol) — se omite dentro del propio modal de historial de un activo.
 */
export const createRefuelingColumns = (fuelTypesById = {}, unidadMedidaById = {}, vehiculosById = {}, machinesById = {}, showActions = false, showHistorialAction = false) => {
    const columns = [
        { header: 'Fecha', accessorFn: (row) => formatDateTimeLocal(row.fechaRegistro), id: 'ref_fecha', size: 140 },
        {
            header: 'Elemento',
            accessorFn: (row) => {
                if (row.machineId != null) {
                    const m = machinesById[row.machineId];
                    return m ? `${m.name}${m.brand ? ' — ' + m.brand : ''}` : `Máquina #${row.machineId}`;
                }
                const v = vehiculosById[row.vehicleId];
                return v ? `${v.placa}${v.marca ? ' — ' + v.marca : ''}` : `Vehículo #${row.vehicleId}`;
            },
            id: 'ref_elemento',
            size: 170,
        },
        { header: 'Lugar', accessorKey: 'lugar', size: 90 },
        { header: 'Área de costo', accessorKey: 'areaCosto', size: 100 },
        {
            header: 'Combustible',
            accessorFn: (row) => fuelTypesById[row.fuelTypeId] ?? `#${row.fuelTypeId}`,
            id: 'ref_combustible',
            size: 130,
        },
        {
            header: 'Cantidad',
            accessorFn: (row) => `${row.cantidadGalones} ${unidadMedidaById[row.fuelTypeId] === 'M3' ? 'm³' : 'gal'}`,
            id: 'ref_cantidad',
            size: 100,
        },
        { header: 'Horómetro/Km', accessorKey: 'horometroKm', size: 110 },
        { header: 'Full', accessorFn: (row) => yn(row.esFull), id: 'ref_full', size: 60 },
        {
            header: 'Precio unit.',
            accessorFn: (row) => (row.precioUnitario != null ? row.precioUnitario : '—'),
            id: 'ref_precio',
            size: 100,
        },
        {
            header: 'Total',
            accessorFn: (row) => (row.totalCalculado != null ? row.totalCalculado : '—'),
            id: 'ref_total',
            size: 100,
        },
        {
            // row.capacidadExcedida/cantidadFueraDeRango/precioFueraDeRango son
            // opcionales: solo los trae el reporte de Tanqueo y Distribución (ver
            // AssetFuelCapacityService/FuelPriceAnomalyService) — si no vienen, se
            // ignoran y la columna se comporta como antes (solo discrepancia
            // financiera).
            header: 'Discrepancia',
            accessorFn: (row) => yn(row.discrepanciaValor || row.capacidadExcedida
                || row.cantidadFueraDeRango || row.precioFueraDeRango),
            id: 'ref_discrepancia',
            size: 100,
        },
        { header: 'Origen', accessorKey: 'origen', size: 130 },
    ];
    if (showHistorialAction) {
        columns.push({ header: '', id: 'ref_ver_historial', meta: { isViewHistoryAction: true } });
    }
    if (showActions) {
        columns.push({ header: 'Acciones', id: 'ref_actions', meta: { isAction: true } });
    }
    return columns;
};

/**
 * Columnas del historial de Suministro de Almacén (compras de combustible, Fase 4 Task 19).
 * @param {Record<number, string>} fuelTypesById - mapa id -> nombre, ya cargado en $data.fuelTypes.
 * @param {Record<number, string>} unidadMedidaById - mapa id -> unidadMedida ('GALON'|'M3'), ya cargado en $data.fuelTypes.
 */
export const createFuelPurchaseColumns = (fuelTypesById = {}, unidadMedidaById = {}) => [
    { header: 'Fecha', accessorFn: (row) => formatDateTimeLocal(row.fechaCompra), id: 'compra_fecha', size: 140 },
    { header: 'Área de costo', accessorKey: 'areaCosto', size: 100 },
    {
        header: 'Combustible',
        accessorFn: (row) => fuelTypesById[row.fuelTypeId] ?? `#${row.fuelTypeId}`,
        id: 'compra_combustible',
        size: 130,
    },
    {
        header: 'Cantidad',
        accessorFn: (row) => `${row.cantidad} ${unidadMedidaById[row.fuelTypeId] === 'M3' ? 'm³' : 'gal'}`,
        id: 'compra_cantidad',
        size: 100,
    },
    { header: 'Precio unit.', accessorKey: 'precioUnitario', size: 100 },
    {
        header: 'Descuento',
        accessorFn: (row) => (row.descuento != null ? row.descuento : '—'),
        id: 'compra_descuento',
        size: 100,
    },
    { header: 'Total ingresado', accessorKey: 'totalIngresado', size: 110 },
    { header: 'Total calculado', accessorKey: 'totalCalculado', size: 110 },
    {
        header: 'Discrepancia',
        accessorFn: (row) => yn(row.discrepanciaValor),
        id: 'compra_discrepancia',
        size: 100,
    },
];

/**
 * Columnas de configuración de consumo estándar por activo (combustibles, Fase 4 Task 22).
 * @param {Record<number, string>} fuelTypesById - mapa id -> nombre, ya cargado en $data.fuelTypes.
 */
export const createAssetFuelConfigColumns = (fuelTypesById = {}) => [
    {
        header: 'Activo',
        accessorFn: (row) => (row.machineId != null ? `Máquina #${row.machineId}` : `Vehículo #${row.vehicleId}`),
        id: 'cfg_activo',
        size: 110,
    },
    {
        header: 'Combustible',
        accessorFn: (row) => fuelTypesById[row.fuelTypeDefaultId] ?? `#${row.fuelTypeDefaultId}`,
        id: 'cfg_combustible',
        size: 130,
    },
    { header: 'Consumo estándar', accessorKey: 'consumoEstandar', size: 110 },
    { header: 'Unidad', accessorKey: 'unidadConsumo', size: 110 },
    {
        header: 'Capacidad tanque (gal)',
        accessorFn: (row) => (row.tanqueCapacidadGal != null ? row.tanqueCapacidadGal : '—'),
        id: 'cfg_tanque',
        size: 130,
    },
];

/**
 * Columnas del reporte de Rendimiento Operativo (combustibles, Fase 4 Task 22).
 * Espera filas ya enriquecidas con `unidadLabel` ('gal'|'m³'), calculado en el
 * componente cruzando con la configuración de consumo estándar del activo.
 */
export const createFuelPerformanceColumns = (fuelTypesById = {}) => [

    {
        header: 'Activo',
        accessorFn: (row) => row.identificacionActivo ?? '—',
        id: 'perf_activo',
        size: 150,
    },
    {
        header: 'Producto',
        accessorFn: (row) => fuelTypesById[row.fuelTypeId] ?? '—',
        id: 'perf_producto',
        size: 130,
    },
    { header: 'Fecha', accessorFn: (row) => formatDateTimeLocal(row.fechaRegistro), id: 'perf_fecha', size: 140 },
    {
        header: 'Estándar (A)',
        accessorFn: (row) => `${row.consumoEstandar} ${row.unidadLabel}`,
        id: 'perf_consumo_estandar',
        size: 130,
    },
    { header: 'Último (B)', accessorKey: 'horometroAnterior', size: 100 },
    { header: 'Actual (C)', accessorKey: 'horometroActual', size: 100 },
    { header: 'Ejecutado (C−B)', accessorKey: 'ejecutado', size: 130 },
    {
        header: 'Proyectado',
        accessorFn: (row) => `${row.galonesProyectados} ${row.unidadLabel}`,
        id: 'perf_proyectado',
        size: 110,
    },
    {
        header: 'Real',
        accessorFn: (row) => `${row.galonesReal} ${row.unidadLabel}`,
        id: 'perf_real',
        size: 100,
    },
    {
        header: 'Diferencia',
        accessorFn: (row) => `${row.diferencia} ${row.unidadLabel}`,
        id: 'perf_diferencia',
        size: 110,
    },
    {
        header: 'Full',
        accessorFn: (row) => yn(row.esFull),
        id: 'perf_full',
        size: 80,
    },
    {
        header: 'Alerta',
        accessorFn: (row) => yn(row.alerta),
        id: 'perf_alerta',
        size: 80,
    },
];
