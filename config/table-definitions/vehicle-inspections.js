import { yn, siNoCampo, vehiculoInspeccionLabel, formatKm, formatDateTime, formatLocalDate, motoMonitoringUbicacionCell } from './helpers.js';

// --- VEHICLE & MOTO COLUMNS ---

/**
 * Inspección pre-operativa vehículos — columnas en el mismo orden que la hoja / formulario de campo
 * (Timestamp → vehículo → km → estados mecánicos → vigencias → elementos → observaciones → responsable → salud → cierre).
 * DTO: VehicleInspectionReportDTO. Semáforo: meta.isStatus (DataGrid getStatusClass).
 */
export const vehicleInspectionReportColumns = [
  {
    header: 'Fecha',
    accessorFn: (row) => {
      if (!row.fechaRegistro) return 'N/A';
      const d = new Date(row.fechaRegistro);
      if (Number.isNaN(d.getTime())) return 'N/A';
      return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    },
    id: 'vi_fecha',
    size: 90,
  },
  {
    header: 'Hora',
    accessorFn: (row) => {
      if (!row.fechaRegistro) return 'N/A';
      const d = new Date(row.fechaRegistro);
      if (Number.isNaN(d.getTime())) return 'N/A';
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    },
    id: 'vi_hora',
    size: 70,
  },
  {
    header: 'Vehículo inspeccionado',
    accessorFn: vehiculoInspeccionLabel,
    id: 'vi_vehiculo',
    size: 150,
  },
  {
    header: 'Pertenece a',
    accessorKey: 'areaOrganizacional',
    id: 'vi_area',
    size: 130,
  },
  {
    header: 'Ubicación',
    accessorKey: 'ubicacion',
    id: 'vi_ubicacion',
    size: 130,
  },
  {
    header: 'Km actual',
    accessorFn: (row) => formatKm(row.kilometraje),
    id: 'vi_km',
    size: 88,
  },
  { header: 'Aceite', accessorKey: 'nivelAceite', size: 78, meta: { isStatus: true } },
  { header: 'Refrigerante', accessorKey: 'nivelRefrigerante', size: 88, meta: { isStatus: true } },
  { header: 'Líquido frenos', accessorKey: 'nivelFrenos', size: 88, meta: { isStatus: true } },
  { header: 'Llantas / aire', accessorKey: 'estadoLlantas', size: 88, meta: { isStatus: true } },
  { header: 'Luces', accessorKey: 'lucesGeneral', size: 78, meta: { isStatus: true } },
  { header: 'Visual (pintura, golpes)', accessorKey: 'estadoVisual', size: 100, meta: { isStatus: true } },
  { header: 'Limpieza general', accessorKey: 'limpiezaGeneral', size: 88, meta: { isStatus: true } },
  { header: 'SOAT', accessorKey: 'checkSoat', size: 78, meta: { isStatus: true } },
  { header: 'Tecnomecánica', accessorKey: 'checkTecno', size: 92, meta: { isStatus: true } },
  { header: 'Extintor', accessorKey: 'checkExtintor', size: 82, meta: { isStatus: true } },
  { header: 'Botiquín', accessorFn: (row) => siNoCampo(row.tieneBotiquin), id: 'vi_bot', size: 72, meta: { isStatus: true } },
  { header: 'Señalización (conos)', accessorFn: (row) => siNoCampo(row.tieneSeñalizacion), id: 'vi_sen', size: 100, meta: { isStatus: true } },
  { header: 'Líneas emergencia', accessorFn: (row) => siNoCampo(row.tieneLineasEmergencia), id: 'vi_lin', size: 100, meta: { isStatus: true } },
  { header: 'Llanta repuesto', accessorFn: (row) => siNoCampo(row.tieneLlantaRepuesto), id: 'vi_llanta', size: 100, meta: { isStatus: true } },
  { header: 'Gato / cruceta', accessorFn: (row) => siNoCampo(row.tieneGatoHidraulico), id: 'vi_gato', size: 100, meta: { isStatus: true } },
  { header: 'Salud física', accessorFn: (row) => yn(row.saludFisica), id: 'vi_sf', size: 82, meta: { isStatus: true } },
  { header: 'Salud mental', accessorFn: (row) => yn(row.saludMental), id: 'vi_sm', size: 88, meta: { isStatus: true } },
  { header: 'Sobrio', accessorFn: (row) => yn(row.sobrio), id: 'vi_sob', size: 68, meta: { isStatus: true } },
  { header: 'Medicamentos', accessorFn: (row) => yn(row.medicamentos), id: 'vi_med', size: 95, meta: { isStatus: true } },
  { header: '¿Apto para conducir?', accessorFn: (row) => yn(row.condicionParaConducir), id: 'vi_cond', size: 108, meta: { isStatus: true } },
  { header: 'Consciente responsabilidad', accessorFn: (row) => yn(row.conscienteResponsabilidad), id: 'vi_cons', size: 118, meta: { isStatus: true } },
  { header: '¿Aprobado salida a ruta?', accessorFn: (row) => yn(row.aprobadoRuta), id: 'vi_ruta', size: 108, meta: { isStatus: true } },
  { header: 'Observaciones / novedades', accessorKey: 'observacionesFinales', id: 'vi_obs', size: 220, meta: { isMultiline: true } },
  { header: 'Responsable inspección', accessorKey: 'responsable', size: 120 },
  

];

/** Tabla 1 del Excel de control: documentación (Tecno + SOAT). Semáforo en fechas/días como el dashboard. */
export const monitoringVehicleDocumentColumns = [
    { header: 'Pertenece a', accessorKey: 'area', size: 140 },
    { header: 'Placa', accessorKey: 'placa', size: 90 },
    { header: 'Km Actual', accessorFn: row => formatKm(row.kmActual), id: 'doc_km_actual', size: 90 },
    { header: 'Fecha Último Reporte', accessorFn: row => formatDateTime(row.fechaUltimoReporte), id: 'doc_fecha_reporte', size: 140 },
    { header: 'Días Último Reporte', accessorKey: 'diasUltimoReporte', id: 'doc_dias_reporte', size: 95, meta: { isReportLagSemaforo: true } },
    {
        header: 'Revisión Tecnicomecánica',
        columns: [
            { header: 'Fecha Vencimiento', accessorFn: (row) => formatLocalDate(row.tecno?.fechaVencimiento), id: 'doc_tecno_venc', size: 105, meta: { isDateStatus: true } },
            { header: 'Días Para Vencimiento', accessorFn: (row) => row.tecno?.diasRestantes, id: 'doc_tecno_dias', size: 95 },
            { header: 'Estado Actual', accessorKey: 'tecno.estado', id: 'doc_tecno_est', size: 100, meta: { isBadge: true } },
        ],
    },
    {
        header: 'SOAT',
        columns: [
            { header: 'Fecha Vencimiento', accessorFn: (row) => formatLocalDate(row.soat?.fechaVencimiento), id: 'doc_soat_venc', size: 105, meta: { isDateStatus: true } },
            { header: 'Días Para Vencimiento', accessorFn: (row) => row.soat?.diasRestantes, id: 'doc_soat_dias', size: 95 },
            { header: 'Estado Actual', accessorKey: 'soat.estado', id: 'doc_soat_est', size: 100, meta: { isBadge: true } },
        ],
    },
    {
        id: 'doc_actions',
        header: 'Acciones',
        accessorFn: () => '',
        size: 128,
        meta: { isMonitoringDocsAction: true },
    },
];

/** Tabla 2 del Excel: aceite. Semáforo en km restante alineado al servicio de monitoreo. */
export const monitoringVehicleOilColumns = [
    { header: 'Pertenece a', accessorKey: 'area', size: 140 },
    { header: 'Placa', accessorKey: 'placa', size: 90 },
    { header: 'Km Actual', accessorFn: row => formatKm(row.kmActual), id: 'oil_km_actual', size: 90 },
    { header: 'Fecha Último Reporte', accessorFn: row => formatDateTime(row.fechaUltimoReporte), id: 'oil_fecha_reporte', size: 140 },
    { header: 'Días Último Reporte', accessorKey: 'diasUltimoReporte', id: 'oil_dias_reporte', size: 95, meta: { isReportLagSemaforo: true } },
    { header: 'TIPO de Aceite', accessorFn: (row) => row.maintenance?.tipoAceite ?? 'N/A', id: 'oil_tipo', size: 130 },
    {
        header: 'Cambio de Aceite',
        columns: [
            { header: 'Fecha Último Cambio', accessorFn: (row) => row.maintenance?.fechaUltimoCambio, id: 'oil_fecha_cambio', size: 110, meta: { isPlainMonitoringDate: true } },
            {
                header: 'Distancia de Cambio (Km)',
                accessorFn: (row) => {
                    const m = row.maintenance;
                    if (m?.kmProximoCambio == null || m?.kmUltimoCambio == null) return 'N/A';
                    return formatKm(m.kmProximoCambio - m.kmUltimoCambio);
                },
                id: 'oil_intervalo',
                size: 110,
            },
            { header: 'Km Cambio', accessorFn: row => formatKm(row.maintenance?.kmUltimoCambio), id: 'oil_km_cambio', size: 95 },
            { header: 'Km Próximo Cambio', accessorFn: row => formatKm(row.maintenance?.kmProximoCambio), id: 'oil_km_proximo', size: 110 },
            {
                header: 'Km Para Cambio',
                accessorFn: (row) => row.maintenance?.kmParaCambio,
                id: 'oil_km_restante',
                size: 100,
                meta: { isOilKmSemaforo: true },
            },
            { header: 'Estado Actual', accessorKey: 'maintenance.estado', id: 'oil_estado', size: 120, meta: { isBadge: true } },
        ],
    },
    {
        id: 'oil_actions',
        header: 'Acciones',
        accessorFn: () => '',
        size: 218,
        meta: { isMonitoringOilAction: true },
    },
];

/** Monitoreo motos — pestaña documentación (misma UX que vehículos livianos). DTO: MotoMonitoringDTO. */
export const monitoringMotoDocumentColumns = [
    { header: 'Pertenece a', accessorKey: 'departamento', size: 140 },
    {
        header: 'Ubicación',
        accessorFn: (row) => motoMonitoringUbicacionCell(row),
        id: 'moto_doc_unidad',
        size: 170,
    },
    { header: 'Placa', accessorKey: 'placa', size: 90 },
    { header: 'Km actual', accessorFn: (row) => formatKm(row.kmActual), id: 'moto_doc_km', size: 90 },
    { header: 'Fecha último reporte', accessorFn: (row) => formatDateTime(row.fechaUltimoReporte), id: 'moto_doc_fecha_rep', size: 140 },
    { header: 'Días último reporte', accessorKey: 'diasUltimoReporte', id: 'moto_doc_dias_rep', size: 100, meta: { isReportLagSemaforo: true } },
    {
        header: 'Revisión tecnomecánica',
        columns: [
            { header: 'Fecha vencimiento', accessorFn: (row) => formatLocalDate(row.tecno?.fechaVencimiento), id: 'moto_doc_tecno_venc', size: 105, meta: { isDateStatus: true } },
            { header: 'Días para vencimiento', accessorFn: (row) => row.tecno?.diasRestantes, id: 'moto_doc_tecno_dias', size: 100 },
            { header: 'Estado actual', accessorKey: 'tecno.estado', id: 'moto_doc_tecno_est', size: 100, meta: { isBadge: true } },
        ],
    },
    {
        header: 'SOAT',
        columns: [
            { header: 'Fecha vencimiento', accessorFn: (row) => formatLocalDate(row.soat?.fechaVencimiento), id: 'moto_doc_soat_venc', size: 105, meta: { isDateStatus: true } },
            { header: 'Días para vencimiento', accessorFn: (row) => row.soat?.diasRestantes, id: 'moto_doc_soat_dias', size: 100 },
            { header: 'Estado actual', accessorKey: 'soat.estado', id: 'moto_doc_soat_est', size: 100, meta: { isBadge: true } },
        ],
    },
    {
        id: 'moto_doc_actions',
        header: 'Acciones',
        accessorFn: () => '',
        size: 128,
        meta: { isMonitoringDocsAction: true },
    },
];

/** Monitoreo motos — pestaña aceite. DTO: campo anidado `oil` (MotoMonitoringDTO.OilStatus). */
export const monitoringMotoOilColumns = [
    { header: 'Pertenece a', accessorKey: 'departamento', size: 140 },
    {
        header: 'Ubicación',
        accessorFn: (row) => motoMonitoringUbicacionCell(row),
        id: 'moto_oil_unidad',
        size: 170,
    },
    { header: 'Placa', accessorKey: 'placa', size: 90 },
    { header: 'Km actual', accessorFn: (row) => formatKm(row.kmActual), id: 'moto_oil_km', size: 90 },
    { header: 'Fecha último reporte', accessorFn: (row) => formatDateTime(row.fechaUltimoReporte), id: 'moto_oil_fecha_rep', size: 140 },
    { header: 'Días último reporte', accessorKey: 'diasUltimoReporte', id: 'moto_oil_dias_rep', size: 100, meta: { isReportLagSemaforo: true } },
    { header: 'Estado moto', accessorKey: 'estadoMoto', size: 100, meta: { isBadge: true } },
    {
        header: 'Cambio de aceite',
        columns: [
            { header: 'Fecha último cambio', accessorFn: (row) => row.oil?.fechaUltimoCambio, id: 'moto_oil_fecha', size: 110, meta: { isPlainMonitoringDate: true } },
            {
                header: 'Distancia de cambio (km)',
                accessorFn: (row) => {
                    const o = row.oil;
                    if (o?.kmProximoCambio == null || o?.kmCambio == null) return 'N/A';
                    return formatKm(o.kmProximoCambio - o.kmCambio);
                },
                id: 'moto_oil_intervalo',
                size: 110,
            },
            { header: 'Km cambio', accessorFn: (row) => formatKm(row.oil?.kmCambio), id: 'moto_oil_km_cambio', size: 95 },
            { header: 'Km próximo cambio', accessorFn: (row) => formatKm(row.oil?.kmProximoCambio), id: 'moto_oil_km_prox', size: 110 },
            {
                header: 'Km para cambio',
                accessorFn: (row) => row.oil?.kmParaProximo,
                id: 'moto_oil_km_restante',
                size: 100,
                meta: { isMotoOilKmSemaforo: true },
            },
            { header: 'Filtro aire', accessorFn: (row) => (row.oil?.filtroAire ? 'SÍ' : 'NO'), id: 'moto_oil_filtro', size: 72 },
            { header: 'Estado actual', accessorKey: 'oil.estado', id: 'moto_oil_estado', size: 120, meta: { isBadge: true } },
        ],
    },
    {
        id: 'moto_oil_actions',
        header: 'Acciones',
        accessorFn: () => '',
        size: 198,
        meta: { isMonitoringOilAction: true },
    },
];



export const reportMotoColumns = [
    {
        header: 'Fecha',
        accessorFn: (row) => {
            if (!row.fechaRegistro) return 'N/A';
            const d = new Date(row.fechaRegistro);
            if (Number.isNaN(d.getTime())) return 'N/A';
            return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
        },
        id: 'moto_fecha',
        size: 90,
    },
    {
        header: 'Hora',
        accessorFn: (row) => {
            if (!row.fechaRegistro) return 'N/A';
            const d = new Date(row.fechaRegistro);
            if (Number.isNaN(d.getTime())) return 'N/A';
            return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        },
        id: 'moto_hora',
        size: 70,
    },
    { header: 'PLACA', accessorKey: 'placa', size: 100 },
    { header: 'Pertenece a', accessorKey: 'areaOrganizacional', id: 'moto_area', size: 140 },
    { header: 'Ubicación', accessorKey: 'ubicacion', id: 'moto_ubic', size: 150 },
    { header: 'KILOMETRAJE Actual', accessorFn: (row) => formatKm(row.kilometraje), id: 'moto_km', size: 96 },
    { header: `DOCUMENTACIÓN  SOAT`, accessorKey: 'checkSoat', size: 160, meta: { isStatus: true, isMultilineHeader: true } },
    { header: `DOCUMENTACIÓN  TECNICOMECÁNICA`, accessorKey: 'checkTecno', size: 160, meta: { isStatus: true, isMultilineHeader: true } },
    { header: 'Estado ACTUAL', accessorKey: 'estadoVisual', size: 130, meta: { isStatus: true } },
    { header: 'Observaciones', accessorKey: 'observacionesFinales', size: 220, meta: { isMultiline: true } },
    { header: 'Responsable', accessorKey: 'responsable', size: 120 },
];

