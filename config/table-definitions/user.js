import { formatLocalDate } from './helpers.js';

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
