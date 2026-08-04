/**
 * Piezas compartidas por todos los módulos de dominio de `stores/data.js`:
 * el estado inicial del store, y los helpers que dependen de `update`/`get`/`subscribe`
 * (por eso son una fábrica en vez de funciones sueltas — cada dominio recibe la
 * misma instancia via `createCore(...)`).
 */

export const initialState = {
    dashboard: { data: [], totalPages: 0, totalElements: 0, currentPage: 0, pageSize: 20 },
    users: [],
    machines: [],
    oils: [],
    workOrders: { data: [], totalPages: 0, totalElements: 0, currentPage: 0, pageSize: 20 },
    consolidated: { distrito: [], asociacion: [] },
    vehicleMonitoring: [],
    motoMonitoring: [],
    vehicleInspections: { data: [], totalPages: 0, totalElements: 0, currentPage: 0, pageSize: 20 },
    /** Lista completa de inspecciones vehículo (API devuelve array, no página Spring). */
    vehicleInspectionsFull: [],
    vehicleWorkOrders: { data: [], totalPages: 0, totalElements: 0, currentPage: 0, pageSize: 20 },
    motoInspections: { data: [], totalPages: 0, totalElements: 0, currentPage: 0, pageSize: 20 },
    // Gestión Administrativa
    vehicles: [],
    motos: [],
    vehicleBrands: [],
    vehicleTypes: [],
    locations: [],
    // Combustibles (Fase 4) — se rellenan en Tasks 18-23, cada uno con su fetchFuelX.
    fuelTypes: [],
    fuelPurchases: { data: [], totalPages: 0, totalElements: 0, currentPage: 0, pageSize: 20 },
    fuelRefueling: { data: [], totalPages: 0, totalElements: 0, currentPage: 0, pageSize: 20 },
    fuelDashboard: null,
    fuelTrend: [],
    fuelWarehouseBalance: [],
    fuelWarehouseMovements: null,
    // Los 3 tipos (Maquinaria/Vehículo/Motocicleta) se cargan siempre juntos —
    // ver fetchFuelPerformanceAllTipos — para que cambiar de pill en Rendimiento
    // sea instantáneo y no dependa de una petición nueva por tipo.
    fuelPerformance: { MAQUINARIA: [], VEHICULO: [], MOTOCICLETA: [] },
    fuelDistribution: null,
    fuelAssetConfig: [],
    isLoading: false,
    error: null
};

/** Respuestas que deben guardarse como array (evita .filter is not a function si el API envía página u objeto). */
export const STORE_ARRAY_KEYS = new Set([
    'machines',
    'oils',
    'vehicleMonitoring',
    'motoMonitoring',
    'motoInspections',
    'vehicleBrands',
    'vehicleTypes',
    'vehicleInspectionsFull',
]);

/** Convierte cuerpo JSON a lista (array plano, Spring `content`, o `data`). */
export function unwrapEntityList(value) {
    if (value == null) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'object') {
        if (Array.isArray(value.content)) return value.content;
        if (Array.isArray(value.data)) return value.data;
    }
    return [];
}

/**
 * Asegura `ubicacionBase` / `idUbicacionBase` en filas tipo VehicleResponse:
 * - acepta camelCase o snake_case del JSON;
 * - normaliza id numérico (evita NaN / tipos raros);
 * - si solo viene el id, resuelve el nombre desde `locations` (evita carrera fetchMotos vs fetchLocations);
 * - si solo viene el nombre (o el id no coincide con el catálogo), intenta resolver el id por nombre (p. ej. select de edición).
 */
export function enrichVehicleUbicacionRow(row, locations) {
    if (!row || typeof row !== 'object') return row;
    const idRaw = row.idUbicacionBase ?? row.id_ubicacion_base;
    let idNum = idRaw != null && idRaw !== '' ? Number(idRaw) : null;
    if (idNum != null && Number.isNaN(idNum)) {
        idNum = null;
    }
    let nombre =
        row.ubicacionBase != null && String(row.ubicacionBase).trim() !== ''
            ? String(row.ubicacionBase).trim()
            : row.ubicacion_base != null && String(row.ubicacion_base).trim() !== ''
              ? String(row.ubicacion_base).trim()
              : null;
    if (
        (nombre == null || nombre === '') &&
        idNum != null &&
        Array.isArray(locations)
    ) {
        const loc = locations.find(
            (l) =>
                l &&
                (Number(l.id) === idNum ||
                    Number(l.id_ubicacion) === idNum ||
                    Number(l.idUbicacion) === idNum),
        );
        const raw = loc?.name ?? loc?.nombre ?? loc?.nombreUbicacion;
        if (raw != null && String(raw).trim() !== '') nombre = String(raw).trim();
    }
    if ((idNum == null || Number.isNaN(idNum)) && nombre && Array.isArray(locations)) {
        const nomLower = nombre.toLocaleLowerCase('es');
        const loc = locations.find((l) => {
            const label = String(l?.name ?? l?.nombre ?? l?.nombreUbicacion ?? '').trim();
            return label.length > 0 && label.toLocaleLowerCase('es') === nomLower;
        });
        if (loc) {
            const lid = loc.id ?? loc.id_ubicacion ?? loc.idUbicacion;
            if (lid != null && lid !== '') {
                const n = Number(lid);
                if (!Number.isNaN(n)) idNum = n;
            }
        }
    }
    return {
        ...row,
        idUbicacionBase: idNum != null && !Number.isNaN(idNum) ? idNum : null,
        ubicacionBase: nombre ?? null,
    };
}

/**
 * Fábrica de helpers atados a una instancia de store (`update`/`get`/`subscribe`).
 * Cada módulo de dominio recibe el objeto que esto devuelve como sus `deps`.
 */
export function createCore({ update, get, subscribe, fetchWithAuth }) {
    const setLoading = (isLoading) => update(s => ({ ...s, isLoading }));
    const setError = (error) => update(s => ({ ...s, error, isLoading: false }));

    async function fetchAll(key, endpoint) {
        setLoading(true);
        try {
            const result = await fetchWithAuth(endpoint);
            let dataToStore = result?.content ?? result?.users ?? result;
            if (STORE_ARRAY_KEYS.has(key)) {
                dataToStore = unwrapEntityList(dataToStore);
            }
            update(s => ({ ...s, [key]: dataToStore, isLoading: false, error: null }));
            return dataToStore;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }

    async function fetchPaginated(key, endpoint, page, size) {
        setLoading(true);
        try {
            const result = await fetchWithAuth(`${endpoint}?page=${page}&size=${size}`);
            const paginatedData = {
                data: result.content, totalPages: result.totalPages, totalElements: result.totalElements,
                currentPage: result.number, pageSize: result.size
            };
            update(s => ({ ...s, [key]: paginatedData, isLoading: false, error: null }));
            return paginatedData;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }

    return {
        update,
        get,
        subscribe,
        fetchWithAuth,
        setLoading,
        setError,
        fetchAll,
        fetchPaginated,
        unwrapEntityList,
        enrichVehicleUbicacionRow,
    };
}
