/**
 * Descripción con pipes: Origen|Sector|Condición|Detalle|Tarea (5+ segmentos).
 * Texto libre: intenta partir por " — " / raya (títulos tipo seed); si no, el resumen va en Origen
 * y el texto completo en Detalle (Sector/Condición/Tarea como N/A si no aplica).
 */
export function parseWorkOrderDescription(description) {
  const raw = description == null ? '' : String(description).trim();
  const NA = 'N/A';

  if (!raw) {
    return {
      origen: '',
      sector: '',
      condicion: '',
      detalle: '',
      tareaAsignada: '',
      structured: false,
    };
  }

  const parts = raw.split('|').map((p) => (p == null ? '' : String(p).trim()));
  if (parts.length >= 5) {
    return {
      origen: parts[0] !== '' ? parts[0] : NA,
      sector: parts[1] !== '' ? parts[1] : NA,
      condicion: parts[2] !== '' ? parts[2] : NA,
      detalle: parts[3] !== '' ? parts[3] : NA,
      tareaAsignada: parts[4] !== '' ? parts[4] : NA,
      structured: true,
    };
  }

  // Texto libre: partir por raya larga / em dash entre espacios (muy habitual en descripciones del sistema)
  const dashPieces = raw.split(/\s+[—\u2014\u2013]\s+/).map((s) => s.trim()).filter(Boolean);
  if (dashPieces.length >= 2) {
    return {
      origen: dashPieces[0] || NA,
      sector: dashPieces[1] || NA,
      condicion: dashPieces.length > 2 ? dashPieces[2] : NA,
      detalle: raw,
      tareaAsignada: dashPieces.length > 3 ? dashPieces.slice(3).join(' — ') : NA,
      structured: false,
    };
  }

  // Una sola frase: mostrar en Origen (visible en columna estrecha) y repetir en Detalle para lectura cómoda
  const short = raw.length > 72 ? `${raw.slice(0, 69)}…` : raw;
  return {
    origen: short,
    sector: NA,
    condicion: NA,
    detalle: raw,
    tareaAsignada: NA,
    structured: false,
  };
}

export const workOrderColumns = [
 {
  accessorFn: (row) => row.order.consecutive ?? '—',
  id: "consecutive",
  header: "Consecutivo",
  size: 130,
 },
 {
  accessorFn: (row) => {
    if (!row.order.date) return "N/A";
    const d = new Date(row.order.date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  },
  id: "fecha",
  header: "Fecha",
  size: 95,
 },
 {
  accessorFn: (row) => (row.machine ? `${row.machine.name} - ${row.machine.model} - ${row.machine.numInterIdentification}` : "N/A"),
  id: "maquina",
  header: "Máquina",
  size: 200,
 },
 {
  accessorFn: (row) => parseWorkOrderDescription(row.order?.description).origen,
  id: 'origen',
  header: 'Origen',
  size: 95,
  meta: { isOrigin: true },
 },
 {
  accessorFn: (row) => parseWorkOrderDescription(row.order?.description).sector,
  id: 'sector',
  header: 'Sector',
  size: 110,
 },
 {
  accessorFn: (row) => parseWorkOrderDescription(row.order?.description).condicion,
  id: 'condicion',
  header: 'Condición',
  size: 90,
  meta: { isCondition: true },
 },
 {
  accessorFn: (row) => parseWorkOrderDescription(row.order?.description).detalle,
  id: 'detalle',
  header: 'Detalle',
  size: 220,
  meta: { isMultiline: true },
 },
 {
  accessorFn: (row) => parseWorkOrderDescription(row.order?.description).tareaAsignada,
  id: 'tarea_asignada_a',
  header: 'Tarea Asignada a',
  size: 150,
 },
 {
  accessorFn: (row) => row.order.status,
  id: "status",
  header: "Estado",
  size: 110,
  meta: { isOrderStatus: true },
 },
 {
  accessorFn: (row) => (row.order.assignerUser ? row.order.assignerUser.fullName : "N/A"),
  id: "asignado_por",
  header: "Asignado por",
  size: 140,
 },
 {
  accessorFn: (row) => {
    const specialty = row.order?.maintenanceType;
    if (!specialty) return '—';
    const specialtyMap = {
      'MECANICO': 'Mecánico',
      'ELECTRICO': 'Eléctrico',
      'ESTRUCTURAL': 'Estructural'
    };
    return specialtyMap[specialty] || specialty;
  },
  id: 'especialidad_tecnica',
  header: 'Especialidad Técnica',
  size: 130,
 },
 {
  accessorFn: (row) => {
    const category = row.order?.maintenanceCategory;
    if (!category) return '—';
    const categoryMap = {
      'PREVENTIVO': 'Preventivo',
      'CORRECTIVO': 'Correctivo'
    };
    return categoryMap[category] || category;
  },
  id: 'mantenimiento_categoria',
  header: 'Tipo de Mantenimiento',
  size: 130,
 },
 {
  accessorFn: (row) => {
    const hours = row.order?.hoursSpent;
    const minutes = row.order?.minutesSpent;
    if (!hours && !minutes) return "—";
    const h = hours || 0;
    const m = minutes || 0;
    if (h === 0 && m === 0) return "—";
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  },
  id: "tiempo_empleado",
  header: "Tiempo",
  size: 100,
 },
 {
  id: "execute",
  header: "Ejecutar Orden",
  size: 120,
  meta: { isExecuteAction: true },
 },
];
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
 { accessorKey: "hourMeter", header: "Horómetro", size: 80 },
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
 size:200,
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
 

function formatDateTime(utcDateString) {
 if (!utcDateString) return 'N/A';
 const date = new Date(utcDateString + 'Z');
 const day = String(date.getUTCDate()).padStart(2, '0');
 const month = String(date.getUTCMonth() + 1).padStart(2, '0');
 const year = date.getUTCFullYear();
 const hours = String(date.getUTCHours()).padStart(2, '0');
 const minutes = String(date.getUTCMinutes()).padStart(2, '0');
 const seconds = String(date.getUTCSeconds()).padStart(2, '0');
 return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function formatDate(utcDateString) {
 if (!utcDateString) return 'N/A';
 const date = new Date(utcDateString + 'Z');
 const day = String(date.getUTCDate()).padStart(2, '0');
 const month = String(date.getUTCMonth() + 1).padStart(2, '0');
 const year = date.getUTCFullYear();
 return `${day}/${month}/${year}`;
}

/** Formatea un LocalDate del backend, que puede llegar como array [y,m,d] o string "yyyy-mm-dd". Retorna dd/mm/yyyy */
function formatLocalDate(raw) {
 if (!raw) return 'N/A';
 let s = raw;
 if (Array.isArray(raw) && raw.length >= 3) {
  s = `${raw[0]}-${String(raw[1]).padStart(2, '0')}-${String(raw[2]).padStart(2, '0')}`;
 }
 const d = new Date(typeof s === 'string' ? `${s}T12:00:00` : s);
 if (Number.isNaN(d.getTime())) return String(raw);
 const day = String(d.getDate()).padStart(2, '0');
 const month = String(d.getMonth() + 1).padStart(2, '0');
 const year = d.getFullYear();
 return `${day}/${month}/${year}`;
}

/** Fecha-hora sin forzar Z (LocalDateTime del backend). */
function formatDateTimeLocal(value) {
 if (!value) return 'N/A';
 const d = new Date(value);
 if (Number.isNaN(d.getTime())) return String(value);
 const day = String(d.getDate()).padStart(2, '0');
 const month = String(d.getMonth() + 1).padStart(2, '0');
 const year = d.getFullYear();
 const hours = String(d.getHours()).padStart(2, '0');
 const minutes = String(d.getMinutes()).padStart(2, '0');
 const seconds = String(d.getSeconds()).padStart(2, '0');
 return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function yn(v) {
 if (v === true) return 'SÍ';
 if (v === false) return 'NO';
 return 'N/A';
}

/** Texto SI/NO/N/A para campos de existencia (boolean o texto tipo "SI", "SI, NO"). */
function siNoCampo(v) {
 if (v === true || v === 'true' || v === 'TRUE') return 'SÍ';
 if (v === false || v === 'false' || v === 'FALSE') return 'NO';
 if (v == null || v === '') return 'N/A';
 return String(v).trim();
}

function vehiculoInspeccionLabel(row) {
 const m = (row.marca || '').trim();
 const p = (row.placa || '').trim();
 if (m && p) return `${m} ${p}`;
 return p || m || 'N/A';
}

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
   { header: 'Horas Restantes', size: 80, accessorFn: row => row.consolidateMotorOil?.remainingHoursNextUpdateMouths ?? 'N/A', id: 'motor_horas_restantes', meta: { cellClass: 'motor-oil-cell' } },
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
   { header: 'Horas Restantes', size: 80, accessorFn: row => row.consolidateHydraulicOil?.remainingHoursNextUpdateMouths ?? 'N/A', id: 'hidraulico_horas_restantes', meta: { cellClass: 'hydraulic-oil-cell' } },
  ]
 },
 {
  id: 'acciones_maq',
  header: 'Acciones',
  size: 140,
  meta: { isConsolidadoMaqActions: true },
 },
];

export const userColumns = [
 { accessorKey: "username", header: "Usuario", size: 100 },
 { accessorKey: "fullName", header: "Nombre Completo", size: 150 },
 { accessorKey: "email", header: "Gmail", size: 150 },
 { accessorKey: "role", header: "Rol", size: 80 },
 { accessorKey: "licenseCategory", header: "Categoría Lic.", size: 90, accessorFn: (row) => row.licenseCategory || "—" },
 {
  id: "licenseExpiry",
  header: "Venc. Licencia",
  size: 110,
  accessorFn: (row) => formatLocalDate(row.licenseExpiry),
  meta: { isDateStatus: true },
 },
 {
  id: "licenseDoc",
  header: "Documento",
  size: 74,
  meta: { isLicenseDocAction: true },
 },
 {
  id: "actions",
  header: "Acciones",
  size: 120,
  meta: { isAction: true },
 },
];

// Helper para formatear moneda
const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP', 
    minimumFractionDigits: 0 
}).format(value || 0);

const formatKm = (value) => new Intl.NumberFormat('es-CO').format(value || 0);

/** Monitoreo moto: `ubicacionBase` del vehículo; si no, unidad de la última inspección (`responsable` en el DTO). */
const motoMonitoringUbicacionCell = (row) => {
    const fromBase = row.ubicacionBase != null && String(row.ubicacionBase).trim() !== '' ? String(row.ubicacionBase).trim() : '';
    const fromLastInsp = row.responsable != null && String(row.responsable).trim() !== '' ? String(row.responsable).trim() : '';
    return fromBase || fromLastInsp || '—';
};

export const curriculumColumns = [
  // Columna 1: Fecha (sin grupo)
  {
    accessorFn: (row) => {
      if (!row.date) return "N/A";
      const d = new Date(row.date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    },
    id: "fecha",
    header: "FECHA",
  },
  
  // Grupo 2: Mantenimiento
  {
    header: "MANTENIMIENTO",
    columns: [
      {
        accessorKey: "description",
        header: "Descripción",
        size: 300, // Damos más espacio a esta columna
        meta: { isMultiline: true },
      },
      // Sub-grupo: Repuestos
      {
        header: "REPUESTOS",
        columns: [
          {
            accessorFn: (row) => row.sparePart?.ref || 'N/A',
            id: 'repuesto_ref',
            header: "REF. (#)",
            size: 150,
          },
          {
            accessorFn: (row) => row.sparePart?.name || 'N/A',
            id: 'repuesto_nombre',
            header: "NOMBRE",
            size: 200,
          },
          {
            accessorFn: (row) => row.sparePart?.quantity || 0,
            id: 'repuesto_cantidad',
            header: "CANTIDAD",
            size: 80,
          },
          {
            accessorFn: (row) => formatCurrency(row.sparePart?.price),
            id: 'repuesto_valor',
            header: "VALOR ($)",
            size: 120,
          }
        ],
      },
    ],
  },
  
  {
    header: "MANO DE OBRA",
    columns: [
        {
            accessorFn: (row) => (row.labor?.user ? row.labor.user.fullName : 'N/A'),
            id: 'mecanico_planta',
            header: "MECÁNICO DE PLANTA",
            size: 150,
        },
        {
            accessorFn: (row) => row.labor?.contractor || 'N/A',
            id: 'mecanico_contratado',
            header: "CONTRATADA",
            size: 150,
        },
        {
            accessorKey: 'timeSpent',
            header: "TIEMPO EMPLEADO",
            size: 100,
        },
        {
            accessorFn: (row) => formatCurrency(row.labor?.price),
            id: 'mano_obra_valor',
            header: "VALOR ($)",
            size: 120,
        },
        {
            accessorFn: (row) => row.labor?.observations || 'N/A',
            id: 'mano_obra_observaciones',
            header: "OBSERVACIONES",
            size: 200,
            meta: { isMultiline: true },
        }
    ]
  },

  {
    accessorFn: (row) => formatCurrency(row.totalPrice),
    id: "valor_total",
    header: "VALOR TOTAL (Repuestos + M. de O)",
    size: 150,
  }
];

// --- VEHICLE & MOTO COLUMNS ---

/**
 * Inspección pre-operativa vehículos — columnas en el mismo orden que la hoja / formulario de campo
 * (Timestamp → vehículo → km → estados mecánicos → vigencias → elementos → observaciones → responsable → salud → cierre).
 * DTO: VehicleInspectionReportDTO. Semáforo: meta.isStatus (DataGrid getStatusClass).
 */
export const vehicleInspectionReportColumns = [
  {
    header: 'Registro',
    columns: [
      {
        header: 'Timestamp',
        accessorFn: (row) => formatDateTimeLocal(row.fechaRegistro),
        id: 'vi_ts',
        size: 132,
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
    ],
  },
  {
    header: 'Estado actual del vehículo',
    columns: [
      { header: 'Aceite', accessorKey: 'nivelAceite', size: 78, meta: { isStatus: true } },
      { header: 'Refrigerante', accessorKey: 'nivelRefrigerante', size: 88, meta: { isStatus: true } },
      { header: 'Líquido frenos', accessorKey: 'nivelFrenos', size: 88, meta: { isStatus: true } },
      { header: 'Llantas / aire', accessorKey: 'estadoLlantas', size: 88, meta: { isStatus: true } },
      { header: 'Luces', accessorKey: 'lucesGeneral', size: 78, meta: { isStatus: true } },
      { header: 'Visual (pintura, golpes)', accessorKey: 'estadoVisual', size: 100, meta: { isStatus: true } },
      { header: 'Limpieza general', accessorKey: 'limpiezaGeneral', size: 88, meta: { isStatus: true } },
    ],
  },
  {
    header: 'Vigencia documentación (próximo a vencer: menos de 1 mes)',
    columns: [
      { header: 'SOAT', accessorKey: 'checkSoat', size: 78, meta: { isStatus: true } },
      { header: 'Tecnomecánica', accessorKey: 'checkTecno', size: 92, meta: { isStatus: true } },
      { header: 'Lic. conductor', accessorKey: 'checkLicencia', size: 92, meta: { isStatus: true } },
      { header: 'Extintor', accessorKey: 'checkExtintor', size: 82, meta: { isStatus: true } },
    ],
  },
  {
    header: 'Existencia de elementos',
    columns: [
      { header: 'Botiquín', accessorFn: (row) => siNoCampo(row.tieneBotiquin), id: 'vi_bot', size: 72, meta: { isStatus: true } },
      { header: 'Señalización (conos)', accessorFn: (row) => siNoCampo(row.tieneSeñalizacion), id: 'vi_sen', size: 100, meta: { isStatus: true } },
      { header: 'Líneas emergencia', accessorFn: (row) => siNoCampo(row.tieneLineasEmergencia), id: 'vi_lin', size: 100, meta: { isStatus: true } },
      { header: 'Llanta repuesto', accessorFn: (row) => siNoCampo(row.tieneLlantaRepuesto), id: 'vi_llanta', size: 100, meta: { isStatus: true } },
      { header: 'Gato / cruceta', accessorFn: (row) => siNoCampo(row.tieneGatoHidraulico), id: 'vi_gato', size: 100, meta: { isStatus: true } },
    ],
  },
  {
    header: 'Observaciones y responsable',
    columns: [
      { header: 'Observaciones / novedades', accessorKey: 'observacionesFinales', id: 'vi_obs', size: 220, meta: { isMultiline: true } },
      { header: 'Responsable inspección', accessorKey: 'responsable', size: 120 },
    ],
  },
  {
    header: 'Condiciones de salud (conducción)',
    columns: [
      { header: 'Salud física', accessorFn: (row) => yn(row.saludFisica), id: 'vi_sf', size: 82, meta: { isStatus: true } },
      { header: 'Salud mental', accessorFn: (row) => yn(row.saludMental), id: 'vi_sm', size: 88, meta: { isStatus: true } },
      { header: 'Sobrio', accessorFn: (row) => yn(row.sobrio), id: 'vi_sob', size: 68, meta: { isStatus: true } },
      { header: 'Medicamentos', accessorFn: (row) => yn(row.medicamentos), id: 'vi_med', size: 95, meta: { isStatus: true } },
      { header: '¿Apto para conducir?', accessorFn: (row) => yn(row.condicionParaConducir), id: 'vi_cond', size: 108, meta: { isStatus: true } },
      { header: 'Consciente responsabilidad', accessorFn: (row) => yn(row.conscienteResponsabilidad), id: 'vi_cons', size: 118, meta: { isStatus: true } },
      { header: '¿Aprobado salida a ruta?', accessorFn: (row) => yn(row.aprobadoRuta), id: 'vi_ruta', size: 108, meta: { isStatus: true } },
    ],
  },
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
            { header: 'Km Restantes', accessorFn: row => formatKm(row.maintenance?.kmParaProximo), id: 'cv_oil_km_rest', size: 90, meta: { cellClass: 'motor-oil-cell' } },
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
            { header: 'Km Restantes', accessorFn: row => formatKm(row.oil?.kmParaProximo), id: 'cm_oil_km_rest', size: 90, meta: { cellClass: 'motor-oil-cell' } },
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

export const reportMotoColumns = [
    { header: 'Marca temporal', accessorFn: (row) => formatDateTimeLocal(row.fechaRegistro), id: 'moto_ts', size: 140 },
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

export const maintenanceMotoColumns = [
    { header: 'Fecha', accessorFn: row => formatDateTime(row.fecha), id: 'fecha', size: 140 },
    { header: 'Placa', accessorKey: 'placa', size: 90 },
    { header: 'Ubicación', accessorKey: 'ubicacion', size: 150 },
    { header: 'Responsable', accessorKey: 'responsableAsignado', size: 150 },
    { header: 'Km', accessorKey: 'kilometraje', size: 90 },
    { header: 'Tipo', accessorKey: 'tipoMantenimiento', size: 100 },
    { header: 'Repuestos / Trabajo', accessorKey: 'repuestosMantenimiento', size: 250, meta: { isMultiline: true } },
    { header: 'Taller / Mecánico', accessorKey: 'tallerResponsable', size: 150 },
    { header: 'Observaciones', accessorKey: 'observaciones', size: 200, meta: { isMultiline: true } }
];

export const maintenanceVehicleColumns = [
    { header: 'Fecha', accessorFn: row => formatDateTime(row.fecha), id: 'fecha', size: 140 },
    { header: 'Placa', accessorKey: 'placa', size: 90 },
    { header: 'Ubicación', accessorKey: 'ubicacion', size: 150 },
    { header: 'Responsable', accessorKey: 'responsableAsignado', size: 150 },
    { header: 'Km', accessorKey: 'kilometraje', size: 90 },
    { header: 'Tipo', accessorKey: 'tipoMantenimiento', size: 100 },
    { header: 'Repuestos / Trabajo', accessorKey: 'repuestosMantenimiento', size: 250, meta: { isMultiline: true } },
    { header: 'Taller / Mecánico', accessorKey: 'tallerResponsable', size: 150 },
    { header: 'Observaciones', accessorKey: 'observaciones', size: 200, meta: { isMultiline: true } }
];

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

/** Órdenes de trabajo vinculadas a inspecciones pre-operativas de vehículos. DTO: OrderWithVehicleDTO. */
export const vehicleWorkOrderColumns = [
    {
        accessorFn: (row) => row.order?.consecutive ?? '—',
        id: 'vo_consecutive', header: 'Consecutivo', size: 130,
    },
    {
        accessorFn: (row) => {
            if (!row.order?.date) return 'N/A';
            const d = new Date(row.order.date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        },
        id: 'vo_fecha', header: 'Fecha', size: 95,
    },
    {
        accessorFn: (row) => {
            const v = row.vehicle;
            if (!v) return 'N/A';
            return [v.placa, v.marca, v.tipoVehiculo].filter(Boolean).join(' - ') || 'N/A';
        },
        id: 'vo_vehiculo', header: 'Vehículo', size: 200,
    },
    {
        accessorFn: (row) => parseWorkOrderDescription(row.order?.description).origen,
        id: 'vo_origen', header: 'Origen', size: 95, meta: { isOrigin: true },
    },
    {
        accessorFn: (row) => parseWorkOrderDescription(row.order?.description).sector,
        id: 'vo_sector', header: 'Sector', size: 110,
    },
    {
        accessorFn: (row) => parseWorkOrderDescription(row.order?.description).condicion,
        id: 'vo_condicion', header: 'Condición', size: 90, meta: { isCondition: true },
    },
    {
        accessorFn: (row) => parseWorkOrderDescription(row.order?.description).detalle,
        id: 'vo_detalle', header: 'Detalle', size: 220, meta: { isMultiline: true },
    },
    {
        accessorFn: (row) => parseWorkOrderDescription(row.order?.description).tareaAsignada,
        id: 'vo_asignado_a', header: 'Tarea Asignada a', size: 150,
    },
    {
        accessorFn: (row) => row.order?.status,
        id: 'vo_status', header: 'Estado', size: 110,
        meta: { isOrderStatus: true },
    },
    {
        accessorFn: (row) => row.order?.assignerUser ? row.order.assignerUser.fullName : 'N/A',
        id: 'vo_asignado_por', header: 'Asignado por', size: 140,
    },
    {
        accessorFn: (row) => {
            const specialty = row.order?.maintenanceType;
            if (!specialty) return '—';
            const specialtyMap = {
                'MECANICO': 'Mecánico',
                'ELECTRICO': 'Eléctrico',
                'ESTRUCTURAL': 'Estructural'
            };
            return specialtyMap[specialty] || specialty;
        },
        id: 'vo_especialidad_tecnica', header: 'Especialidad Técnica', size: 130,
    },
    {
        accessorFn: (row) => {
            const category = row.order?.maintenanceCategory;
            if (!category) return '—';
            const categoryMap = {
                'PREVENTIVO': 'Preventivo',
                'CORRECTIVO': 'Correctivo'
            };
            return categoryMap[category] || category;
        },
        id: 'vo_mantenimiento_categoria', header: 'Tipo de Mantenimiento', size: 130,
    },
    {
        accessorFn: (row) => {
            const hours = row.order?.hoursSpent;
            const minutes = row.order?.minutesSpent;
            if (!hours && !minutes) return "—";
            const h = hours || 0;
            const m = minutes || 0;
            if (h === 0 && m === 0) return "—";
            if (h === 0) return `${m}m`;
            if (m === 0) return `${h}h`;
            return `${h}h ${m}m`;
        },
        id: 'vo_tiempo_empleado', header: 'Tiempo', size: 100,
    },
    {
        id: 'vo_execute',
        header: 'Ejecutar Orden',
        size: 120,
        meta: { isExecuteAction: true },
    },
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
