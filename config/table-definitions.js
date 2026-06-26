export const workOrderColumns = [
 {
  accessorFn: (row) => (row.order.date ? new Date(row.order.date).toLocaleDateString('es-CO') : "N/A"),
  id: "fecha",
  header: "Fecha",
  
 },
 {
  accessorFn: (row) => (row.machine ? `${row.machine.name} - ${row.machine.model} - ${row.machine.numInterIdentification}` : "N/A"),
  id: "maquina",
  header: "Máquina",

 },
 {
  accessorFn: (row) => (row.order.description ? row.order.description.split('|')[0] : ''),
  id: 'origen',
  header: 'Origen',

  meta: { isOrigin: true },
 },
 {
  accessorFn: (row) => (row.order.description ? row.order.description.split('|')[1] : ''),
  id: 'sector',
  header: 'Sector',

 },
 {
  accessorFn: (row) => (row.order.description ? row.order.description.split('|')[2] : ''),
  id: 'condicion',
  header: 'Condición',

  meta: { isCondition: true },
 },
 {
  accessorFn: (row) => (row.order.description ? row.order.description.split('|')[3] : ''),
  id: 'detalle',
  header: 'Detalle',
  meta: { isMultiline: true },
 },
 {
  accessorFn: (row) => (row.order.description ? row.order.description.split('|')[4] : ''),
  id: 'tarea_asignada_a',
  header: 'Tarea Asignada a',

 },
 {
  accessorFn: (row) => row.order.status,
  id: "status",
  header: "Estado",

 },
 {
  accessorFn: (row) => (row.order.assignerUser ? row.order.assignerUser.fullName : "N/A"),
  id: "asignado_por",
  header: "Asignado por",

 },
{
    id: "execute",
    header: "Ejecutar Orden",
    meta: { isExecuteAction: true }, // Identificador para el nuevo botón
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
  // Adding 'T00:00:00' ensures the date is interpreted correctly across timezones
  accessorFn: (row) => (row.soat ? new Date(row.soat + 'T00:00:00').toLocaleDateString('es-CO') : 'N/A'),
  id: "soat",
  header: "SOAT",
  size: 100,
 },
 {
  accessorFn: (row) => (row.runt ? new Date(row.runt + 'T00:00:00').toLocaleDateString('es-CO') : 'N/A'),
  id: "runt",
  header: "RUNT",
  size: 100,
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
 accessorFn: (row) => new Date(row.dateStamp + 'Z').toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
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
 const formattedDate = date.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
 const formattedTime = date.toLocaleTimeString('en-GB', { timeZone: 'America/Bogota' });
 return `${formattedDate} ${formattedTime}`;
}

function formatDate(utcDateString) {
 if (!utcDateString) return 'N/A';
 return new Date(utcDateString + 'Z').toLocaleDateString('es-CO', {
  timeZone: 'America/Bogota',
 });
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
   { header: 'Fecha Últ. Cambio', size: 100, accessorFn: row => formatDate(row.consolidateMotorOil?.dateLastUpdate), id: 'motor_fecha_ultimo_cambio', meta: { cellClass: 'motor-oil-cell' } },
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
   { header: 'Fecha Últ. Cambio', size: 100, accessorFn: row => formatDate(row.consolidateHydraulicOil?.dateLastUpdate), id: 'hidraulico_fecha_ultimo_cambio', meta: { cellClass: 'hydraulic-oil-cell' } },
   { header: 'Horómetro Últ. Cambio', size: 100, accessorFn: row => row.consolidateHydraulicOil?.hourMeterLastUpdate ?? 'N/A', id: 'hidraulico_horometro_ultimo_cambio', meta: { cellClass: 'hydraulic-oil-cell' } },
   { header: 'Próximo Cambio', size: 80, accessorFn: row => row.consolidateHydraulicOil?.hourMeterNextUpdate ?? 'N/A', id: 'hidraulico_proximo_cambio', meta: { cellClass: 'hydraulic-oil-cell' } },
   { header: 'Tiempo Últ. Cambio', size: 100, accessorFn: row => row.consolidateHydraulicOil?.timeLastUpdateMouths ?? 'N/A', id: 'hidraulico_tiempo_ultimo_cambio', meta: { cellClass: 'hydraulic-oil-cell' } },
   { header: 'Horas Restantes', size: 80, accessorFn: row => row.consolidateHydraulicOil?.remainingHoursNextUpdateMouths ?? 'N/A', id: 'hidraulico_horas_restantes', meta: { cellClass: 'hydraulic-oil-cell' } },
  ]
 },
];

export const userColumns = [
 { accessorKey: "id", header: "ID", size: 40 },
 { accessorKey: "username", header: "Usuario", size: 100 },
 { accessorKey: "email", header: "Gmail", size: 150 },
 { accessorKey: "fullName", header: "Nombre Completo", size: 150 },
 { accessorKey: "role", header: "Rol", size: 80 },
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

export const curriculumColumns = [
  // Columna 1: Fecha (sin grupo)
  {
    accessorFn: (row) => (row.date ? new Date(row.date).toLocaleDateString("es-CO") : "N/A"),
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