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
            if (row.order?.timeSpent) return row.order.timeSpent;
            const hours = row.order?.hoursSpent;
            const minutes = row.order?.minutesSpent;
            if (hours == null && minutes == null) return "—";
            const h = hours ?? 0;
            const m = minutes ?? 0;
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
            if (row.order?.timeSpent) return row.order.timeSpent;
            const hours = row.order?.hoursSpent;
            const minutes = row.order?.minutesSpent;
            if (hours == null && minutes == null) return "—";
            const h = hours ?? 0;
            const m = minutes ?? 0;
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

