import { formatDateTimeLocal, formatCurrency, formatKm, formatHoras, formatCantidad, yn, unidadConsumoLabel } from './helpers.js';

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
 * @param {boolean} showReintegroAction - agrega la columna "Reintegro" (Fase 6): botón
 *   "Reintegrar" si queda saldo (cantidadGalones - cantidadReintegrada > 0), o "Reintegrado"
 *   si ya no queda. Se omite del todo para roles sin permiso de reintegrar (mismo criterio
 *   que showActions, pero el backend exige SUPERVISOR_OPERATIVO o ADMIN, no solo ADMIN).
 */
export const createRefuelingColumns = (fuelTypesById = {}, unidadMedidaById = {}, vehiculosById = {}, machinesById = {}, showActions = false, showHistorialAction = false, showReintegroAction = false) => {
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
        {
            header: 'Lugar',
            accessorFn: (row) => (row.lugar === 'BOMBA' ? 'Estación de Servicio' : row.lugar === 'ALMACEN' ? 'Almacén General' : row.lugar),
            id: 'ref_lugar',
            size: 140,
        },
        { header: 'Área de costo', accessorKey: 'areaCosto', size: 100 },
        {
            header: 'Combustible',
            accessorFn: (row) => fuelTypesById[row.fuelTypeId] ?? `#${row.fuelTypeId}`,
            id: 'ref_combustible',
            size: 130,
        },
        {
            header: 'Cantidad',
            accessorFn: (row) => `${formatCantidad(row.cantidadGalones)} ${unidadMedidaById[row.fuelTypeId] === 'M3' ? 'm³' : 'gal'}`,
            id: 'ref_cantidad',
            size: 100,
        },
        {
            header: 'Horómetro/Km',
            accessorFn: (row) => (row.machineId != null ? formatHoras(row.horometroKm) : formatKm(row.horometroKm)),
            id: 'ref_horometro',
            size: 110,
        },
        { header: 'Full', accessorFn: (row) => yn(row.esFull), id: 'ref_full', size: 60 },
        {
            header: 'Precio unit.',
            accessorFn: (row) => (row.precioUnitario != null ? formatCurrency(row.precioUnitario) : '—'),
            id: 'ref_precio',
            size: 100,
        },
        {
            header: 'Total',
            accessorFn: (row) => (row.totalCalculado != null ? formatCurrency(row.totalCalculado) : '—'),
            id: 'ref_total',
            size: 100,
        },
        {
            // row.capacidadExcedida/cantidadFueraDeRango/precioFueraDeRango/
            // fullInconsistente (+ sus valores de referencia capacidadConfiguradaGal/
            // cantidadMaximaTipica/precioPromedioReciente/cantidadEsperadaLlenoGal)
            // son opcionales: solo los trae el reporte de Tanqueo y Distribución (ver
            // AssetFuelCapacityService/FuelPriceAnomalyService/
            // FuelFullConsistencyService) — si no vienen, se ignoran y la columna se
            // comporta como antes (solo discrepancia financiera). Se lista cada
            // motivo junto al valor contra el que se comparó (en vez de un SÍ/NO
            // genérico) para poder verificar la alerta sin adivinar el umbral.
            header: 'Discrepancia',
            accessorFn: (row) => {
                const unidad = unidadMedidaById[row.fuelTypeId] === 'M3' ? 'm³' : 'gal';
                const motivos = [];
                if (row.discrepanciaValor) {
                    motivos.push(`Financiera (calc. ${formatCurrency(row.totalCalculado)} vs ingresado ${formatCurrency(row.totalIngresado)})`);
                }
                if (row.capacidadExcedida) {
                    motivos.push(`Capacidad excedida (máx. configurado: ${row.capacidadConfiguradaGal} ${unidad})`);
                }
                if (row.cantidadFueraDeRango) {
                    motivos.push(`Cantidad fuera de rango (máx. típico: ${row.cantidadMaximaTipica} ${unidad})`);
                }
                if (row.precioFueraDeRango) {
                    motivos.push(`Precio fuera de rango (promedio reciente: ${formatCurrency(row.precioPromedioReciente)})`);
                }
                if (row.fullInconsistente) {
                    motivos.push(`Full declarado pero cantidad insuficiente (se esperaban ~${row.cantidadEsperadaLlenoGal} ${unidad})`);
                }
                return motivos.length ? motivos.join(' · ') : 'NO';
            },
            id: 'ref_discrepancia',
            size: 260,
            meta: { isMultiline: true },
        },
        { header: 'Origen', accessorKey: 'origen', size: 130 },
        // Visible siempre (no solo BOMBA/ADMIN) — un tanqueo de ALMACEN no tiene
        // urlFactura real y la celda simplemente muestra "—" (mismo patrón que
        // isLicenseDocAction).
        { header: 'Factura', id: 'ref_factura', meta: { isFacturaAction: true }, size: 90 },
    ];
    if (showHistorialAction) {
        columns.push({ header: '', id: 'ref_ver_historial', meta: { isViewHistoryAction: true } });
    }
    if (showReintegroAction) {
        columns.push({ header: 'Reintegro', id: 'ref_reintegro', meta: { isReintegroAction: true } });
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
        accessorFn: (row) => `${formatCantidad(row.cantidad)} ${unidadMedidaById[row.fuelTypeId] === 'M3' ? 'm³' : 'gal'}`,
        id: 'compra_cantidad',
        size: 100,
    },
    { header: 'Precio unit.', accessorFn: (row) => formatCurrency(row.precioUnitario), id: 'compra_precio', size: 100 },
    {
        header: 'Descuento',
        accessorFn: (row) => (row.descuento != null ? formatCurrency(row.descuento) : '—'),
        id: 'compra_descuento',
        size: 100,
    },
    { header: 'Total ingresado', accessorFn: (row) => formatCurrency(row.totalIngresado), id: 'compra_total_ingresado', size: 110 },
    { header: 'Total calculado', accessorFn: (row) => formatCurrency(row.totalCalculado), id: 'compra_total_calculado', size: 110 },
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
    {
        header: 'Unidad',
        accessorFn: (row) => unidadConsumoLabel(row.unidadConsumo),
        id: 'cfg_unidad',
        size: 90,
    },
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
 * @param {Record<number, string>} fuelTypesById - mapa id -> nombre, ya cargado en $data.fuelTypes.
 * @param {boolean} showActions - agrega la columna "Editar" (Fase 6): el reporte de
 *   rendimiento no trae lugar/areaCosto (obligatorios para PUT /fuel/refueling), así
 *   que el componente pide el tanqueo completo al abrir el modal en vez de armarlo
 *   con lo que ya tiene la fila.
 * @param {boolean} showHistorialAction - agrega la columna "Ver historial" (de solo
 *   lectura, visible sin importar el rol) — mismo patrón que createRefuelingColumns.
 *   Se omite dentro de la propia pantalla de historial de un activo.
 * @param {boolean} esMaquinaria - true si la tabla es de un activo tipo MAQUINARIA
 *   (se mide en horómetro/horas), false si es VEHICULO o MOTOCICLETA (se mide en
 *   kilometraje/km). Esta tabla siempre queda acotada a UN solo activo/tipo (el
 *   reporte general ya no usa estas columnas, solo el detalle de Rendimiento por
 *   activo), así que el encabezado puede ser exacto en vez del genérico
 *   "Km/Horómetro" que no decía en qué unidad venía el número.
 *
 * Modelo de rendimiento (a pedido del usuario, reemplaza el anterior basado en
 * galones proyectados/reales, que no aportaba nada legible): en vez de proyectar
 * galones a partir de lo ejecutado y compararlos contra los galones realmente
 * tanqueados, se proyectan HORAS/KM esperados a partir de lo que SÍ se tanqueó:
 *   H (esperado)  = F (galones tanqueados) × A (consumo estándar, ya en horas u
 *                   horas u horas/gal o km/gal)
 *   D (ejecutado) = C − B (ya viene calculado del backend como `ejecutado`)
 *   Diferencia    = D − H  (positivo: rindió más horas/km de las esperadas por
 *                   ese combustible: mejor que el estándar. Negativo: rindió
 *                   menos: consumió más rápido de lo normal)
 *   % eficiencia  = D ÷ H × 100 (100% = exactamente lo esperado)
 * "Alerta" sigue siendo la del backend (rango aprendido por activo) — no se
 * recalcula acá para no duplicar esa lógica de negocio en el frontend.
 */
export const createFuelPerformanceColumns = (fuelTypesById = {}, showActions = false, showHistorialAction = false, esMaquinaria = false) => {
    const unidadMedicion = esMaquinaria ? 'Horómetro' : 'Kilometraje';
    const unidadEjec = esMaquinaria ? 'Horas' : 'Km';
    const sufijo = esMaquinaria ? 'h' : 'km';
    // 2 decimales fijos (no solo "máximo") para que la tabla quede alineada como
    // en el ejemplo del usuario (20.00, 15.00, ...) — formatHoras/formatKm
    // (helpers compartidos) usan otra cantidad de decimales para otras pantallas
    // (Horómetro de Máquinas, historial de aceite, etc.), así que acá se define
    // aparte en vez de tocarlos.
    const fmt2 = (v) => new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
    const formatMedicion = (v) => `${fmt2(v)} ${sufijo}`;
    const esperado = (row) => (Number(row.galonesReal) || 0) * (Number(row.consumoEstandar) || 0);
    const columns = [
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
            header: 'Consumo estándar (A)',
            // Unidad de TASA (Km/Gl, Gl/Hr, Km/M3, M3/Hr) — no confundir con
            // unidadLabel (gal/m³ a secas), que es la unidad física del combustible
            // usada en Tamaño tanque/Total tanqueado, no la de este número.
            accessorFn: (row) => `${formatCantidad(row.consumoEstandar)} ${unidadConsumoLabel(row.unidadConsumo)}`,
            id: 'perf_consumo_estandar',
            size: 110,
            meta: { isMultilineHeader: true },
        },
        {
            header: 'Tamaño tanque (gal)',
            // Se une en el componente (fuelAssetConfig.tanqueCapacidadGal no viene
            // en el reporte de rendimiento en sí) — puede no estar configurado.
            accessorFn: (row) => (row.tanqueCapacidadGal != null ? `${formatCantidad(row.tanqueCapacidadGal)} gal` : '—'),
            id: 'perf_tanque',
            size: 110,
            meta: { isMultilineHeader: true },
        },
        {
            header: 'Total tanqueado, último registro (F)',
            accessorFn: (row) => `${formatCantidad(row.galonesReal)} ${row.unidadLabel}`,
            id: 'perf_real',
            size: 130,
            meta: { isMultilineHeader: true },
        },
        {
            header: `${unidadMedicion} anterior (B)`,
            accessorFn: (row) => formatMedicion(row.horometroAnterior),
            id: 'perf_horometro_anterior',
            size: 110,
            meta: { isMultilineHeader: true },
        },
        {
            header: `${unidadMedicion} actual (C)`,
            accessorFn: (row) => formatMedicion(row.horometroActual),
            id: 'perf_horometro_actual',
            size: 105,
            meta: { isMultilineHeader: true },
        },
        {
            header: `${unidadEjec} esperadas por el combustible (H = F×A)`,
            accessorFn: (row) => formatMedicion(esperado(row)),
            id: 'perf_esperado',
            size: 140,
            meta: { isMultilineHeader: true },
        },
        {
            header: `${unidadEjec} ejecutadas (D = C−B)`,
            accessorFn: (row) => formatMedicion(row.ejecutado),
            id: 'perf_ejecutado',
            size: 120,
            meta: { isMultilineHeader: true },
        },
        {
            header: 'Diferencia ejecutado / esperado (D − H)',
            accessorFn: (row) => {
                const dif = (Number(row.ejecutado) || 0) - esperado(row);
                return `${dif >= 0 ? '+' : '−'}${fmt2(Math.abs(dif))} ${sufijo}`;
            },
            id: 'perf_diferencia',
            size: 130,
            meta: { isMultilineHeader: true },
        },
        {
            header: '% Eficiencia (D ÷ H)',
            accessorFn: (row) => {
                const h = esperado(row);
                if (!h) return '—';
                return `${fmt2((Number(row.ejecutado) / h) * 100)}%`;
            },
            id: 'perf_eficiencia',
            size: 110,
            meta: { isMultilineHeader: true },
        },
        {
            header: '¿Tanque lleno?',
            accessorFn: (row) => yn(row.esFull),
            id: 'perf_full',
            size: 95,
            meta: { isMultilineHeader: true },
        },
        {
            header: 'Alerta',
            // El asterisco marca que este activo todavía no tiene suficiente historial
            // propio (mínimo 2 tanqueos previos comparables) para calcular su rango
            // aprendido — mientras tanto se evalúa con la tolerancia general del 15%,
            // no con el comportamiento normal de ESE activo en particular.
            accessorFn: (row) => `${yn(row.alerta)}${row.usaRangoAprendido === false ? ' *' : ''}`,
            id: 'perf_alerta',
            size: 90,
        },
    ];
    if (showHistorialAction) {
        columns.push({ header: '', id: 'perf_ver_historial', meta: { isViewHistoryAction: true } });
    }
    if (showActions) {
        columns.push({ header: 'Acciones', id: 'perf_actions', meta: { isAction: true } });
    }
    return columns;
};
