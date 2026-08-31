import { formatCurrency } from './helpers.js';

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
                header: "OPERARIO DE PLANTA",
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

