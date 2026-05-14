import { writable, get } from 'svelte/store';
import fetchWithAuth from './api';
import { normalizePlaca, normalizeTitleWords, normalizeUpperToken, normalizeFreeTextPreserveCase } from '../src/lib/textFormat.js';
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
function createDataStore() {
    const { subscribe, update } = writable({
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
        motoInspections: [],
        motoInspectionsHistory: [],
        motoMaintenance: [],
        vehicleMaintenance: [],
        // Gestión Administrativa
        vehicles: [],
        motos: [],
        vehicleBrands: [],
        vehicleTypes: [],
        areas: [],
        locations: [],
        isLoading: false,
        error: null
    });

    const setLoading = (isLoading) => update(s => ({ ...s, isLoading }));
    const setError = (error) => update(s => ({ ...s, error, isLoading: false }));

    /**
     * Asegura `ubicacionBase` / `idUbicacionBase` en filas tipo VehicleResponse:
     * - acepta camelCase o snake_case del JSON;
     * - normaliza id numérico (evita NaN / tipos raros);
     * - si solo viene el id, resuelve el nombre desde `locations` (evita carrera fetchMotos vs fetchLocations);
     * - si solo viene el nombre (o el id no coincide con el catálogo), intenta resolver el id por nombre (p. ej. select de edición).
     */
    function enrichVehicleUbicacionRow(row, locations) {
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

    /** Respuestas que deben guardarse como array (evita .filter is not a function si el API envía página u objeto). */
    const STORE_ARRAY_KEYS = new Set([
        'machines',
        'oils',
        'vehicleMonitoring',
        'motoMonitoring',
        'motoInspections',
        'motoInspectionsHistory',
        'motoMaintenance',
        'vehicleMaintenance',
        'vehicleBrands',
        'vehicleTypes',
        'areas',
        'vehicleInspectionsFull',
    ]);

    /** Convierte cuerpo JSON a lista (array plano, Spring `content`, o `data`). */
    function unwrapEntityList(value) {
        if (value == null) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'object') {
            if (Array.isArray(value.content)) return value.content;
            if (Array.isArray(value.data)) return value.data;
        }
        return [];
    }

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

    const actions = {
        // Dashboard
        fetchDashboardData: (page = 0, size = 20) => fetchPaginated('dashboard', 'inspection', page, size),
        fetchInspectionImages: async (inspectionId) => {
            try {
                // 1. Llama a la API con auth
                const images = await fetchWithAuth(`inspection/${inspectionId}/images`);

                if (!images || !Array.isArray(images)) {
                    return []; // Devuelve un array vacío si no hay imágenes
                }

                // 2. Transforma el array para construir la URL completa
                const imagesWithFullUrl = images.map(image => ({
                    ...image, // Mantiene otras propiedades que pueda tener el objeto (id, name, etc.)
                    // Concatena la URL base con la URL relativa de la imagen.
                    // Normaliza para evitar doble slash
                    url: `${BASE_URL.replace(/\/$/, '')}/${image.url.replace(/^\//, '')}`
                }));

                // 3. Devuelve el nuevo array con las URLs completas
                return imagesWithFullUrl;

            } catch (err) {
                console.error("Error fetching or processing inspection images:", err);
                throw err;
            }
        },
        // Usuarios
        fetchUsers: () => fetchAll('users', 'user'),
        createUser: async (newUser) => {
            const createdUser = await fetchWithAuth('user', { method: 'POST', body: JSON.stringify(newUser) });
            update(s => ({ ...s, users: [...s.users, createdUser] }));
        },
        updateUser: async (userId, userData) => {
            const userToUpdate = get({ subscribe }).users.find(u => u.id === userId);
            if (!userToUpdate) throw new Error("Usuario no encontrado");
            const payload = { id: userId, ...userToUpdate, ...userData };
            const updatedUser = await fetchWithAuth(`user/${userId}`, { method: 'PUT', body: JSON.stringify(payload) });
            update(s => ({ ...s, users: s.users.map(u => (u.id === userId ? updatedUser : u)) }));
        },
        deleteUser: async (userId) => {
            await fetchWithAuth(`user/${userId}`, { method: 'DELETE' });
            update(s => ({ ...s, users: s.users.filter(u => u.id !== userId) }));
        },
        changeUserPassword: async (userId, newPassword) => {
            await fetchWithAuth(`user/${userId}/change-password`, {
                method: 'PATCH',
                body: JSON.stringify({ id: userId, newPassword: newPassword })
            });
        },
        // Máquinas y Currículum
        fetchMachines: () => fetchAll('machines', 'machine'),
        createMachine: async (newMachine) => {
            const createdMachine = await fetchWithAuth('machine', { method: 'POST', body: JSON.stringify(newMachine) });
            update(s => ({ ...s, machines: [...s.machines, createdMachine] }));
        },
        updateMachine: async (machineData) => {
            const updatedMachine = await fetchWithAuth(`machine/${machineData.id}`, { method: 'PUT', body: JSON.stringify(machineData) });
            update(s => ({ ...s, machines: s.machines.map(m => m.id === machineData.id ? updatedMachine : m) }));
        },
        deleteMachine: async (machineId) => {
            await fetchWithAuth(`machine/${machineId}`, { method: 'DELETE' });
            update(s => ({ ...s, machines: s.machines.filter(m => m.id !== machineId) }));
        },
        fetchMachineCurriculum: async (machineId) => {
            setLoading(true);
            try {
                const result = await fetchWithAuth(`curriculum/${machineId}`);
                setLoading(false);
                return result;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },
        fetchVehicleCurriculum: async (vehicleId) => {
            setLoading(true);
            try {
                const result = await fetchWithAuth(`curriculum/vehicle/${vehicleId}`);
                setLoading(false);
                return result;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },
        // Órdenes de Trabajo
        fetchWorkOrders: (page = 0, size = 20) => fetchPaginated('workOrders', 'order/all', page, size),
        createWorkOrder: async (newWorkOrder) => {
            await fetchWithAuth('order', { method: 'POST', body: JSON.stringify(newWorkOrder) });
            const currentState = get({ subscribe });
            actions.fetchWorkOrders(currentState.workOrders.currentPage, currentState.workOrders.pageSize);
        },
        // Órdenes de Trabajo — Vehículos
        fetchVehicleWorkOrders: (page = 0, size = 20) => fetchPaginated('vehicleWorkOrders', 'order/vehicle/all', page, size),
        createVehicleWorkOrder: async (payload) => {
            await fetchWithAuth('order/vehicle', { method: 'POST', body: JSON.stringify(payload) });
            const currentState = get({ subscribe });
            actions.fetchVehicleWorkOrders(currentState.vehicleWorkOrders.currentPage, currentState.vehicleWorkOrders.pageSize);
        },
        executeWorkOrder: async (executionData) => {
            await fetchWithAuth('results/execute', { method: 'POST', body: JSON.stringify(executionData) });
            const currentState = get({ subscribe });
            actions.fetchWorkOrders(currentState.workOrders.currentPage, currentState.workOrders.pageSize);
        },
        executeVehicleWorkOrder: async (executionData) => {
            await fetchWithAuth('results/execute', { method: 'POST', body: JSON.stringify(executionData) });
            const currentState = get({ subscribe });
            actions.fetchVehicleWorkOrders(currentState.vehicleWorkOrders.currentPage, currentState.vehicleWorkOrders.pageSize);
        },
        // Consolidado
        fetchConsolidadoData: async () => {
            setLoading(true);
            try {
                const result = await fetchWithAuth('oil-changes/consolidated', { version: null });
                const dataToStore = Array.isArray(result?.content) ? result.content : (Array.isArray(result) ? result : []);
                const norm = (s) =>
                    String(s ?? '')
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '');
                const consolidatedData = {
                    distrito: dataToStore.filter((item) => norm(item?.machine?.belongsTo) === 'distrito'),
                    asociacion: dataToStore.filter((item) => norm(item?.machine?.belongsTo) === 'asociacion'),
                };
                update(s => ({ ...s, consolidated: consolidatedData, isLoading: false, error: null }));
                return consolidatedData;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },
        // Aceites
        fetchOils: () => fetchAll('oils', 'oil/brand'),
        createOil: async (newOil) => {
            const createdOil = await fetchWithAuth('oil/brand', { method: 'POST', body: JSON.stringify(newOil) });
            update(s => ({ ...s, oils: [...s.oils, createdOil] }));
        },
        updateOil: async (id, oilData) => {
            const updatedOil = await fetchWithAuth(`oil/brand/${id}`, { method: 'PUT', body: JSON.stringify(oilData) });
            update(s => ({ ...s, oils: s.oils.map(o => (o.id === id ? updatedOil : o)) }));
        },
        deleteLocation: async (id) => {
            await fetchWithAuth(`catalog/location/${id}`, { method: 'DELETE' });
            update(s => ({ ...s, locations: s.locations.filter(l => l.id !== id) }));
        },
        // Mantenimiento y Documentación Vehículos
        registerVehicleOilChange: async (oilData) => {
            const body = {
                ...oilData,
                placa: normalizePlaca(oilData.placa),
                oilType: normalizeFreeTextPreserveCase(oilData.oilType) ?? oilData.oilType,
            };
            await fetchWithAuth('vehicle/oil-change', { method: 'POST', body: JSON.stringify(body) });
        },
        fetchVehicleOilHistory: async (placa) => {
            try {
                const p = normalizePlaca(placa);
                const result = await fetchWithAuth(`vehicle/oil-change/history/${encodeURIComponent(p)}`);
                return Array.isArray(result) ? result : [];
            } catch (err) {
                throw err;
            }
        },
        updateVehicleDocument: async (docData) => {
            await fetchWithAuth('admin/documents', { method: 'POST', body: JSON.stringify(docData) });
        },
        /**
         * Sube PDF o imagen y registra vigencia (multipart).
         * @param {{ idVehiculo: number, tipoDocumento: string, fechaVencimiento: string, file: File }} payload
         */
        uploadVehicleDocumentFile: async (payload) => {
            const { idVehiculo, tipoDocumento, fechaVencimiento, file } = payload;
            const form = new FormData();
            form.append('file', file);
            form.append('idVehiculo', String(idVehiculo));
            form.append('tipoDocumento', tipoDocumento);
            form.append('fechaVencimiento', fechaVencimiento);
            await fetchWithAuth('admin/documents/upload', { method: 'POST', body: form });
        },
        getVehicleDocuments: (idVehiculo) => fetchWithAuth(`vehicle-inspection/documentos/${idVehiculo}`),
        getVehicleDocumentHistory: (idVehiculo) =>
            fetchWithAuth(`vehicle-inspection/documentos/${idVehiculo}/history`),

        // Monitoreo Vehículos y Motos
        fetchVehicleMonitoring: () => fetchAll('vehicleMonitoring', 'vehicle/monitoring/consolidated'),
        fetchMotoMonitoring: () => fetchAll('motoMonitoring', 'moto/monitoring/consolidated'),
        
        /**
         * Última inspección por vehículo (excluye motos). Una fila por placa, la más reciente.
         * El backend devuelve un array completo; la paginación es en cliente.
         */
        fetchVehicleInspections: async (page = 0, size = 20, options = {}) => {
            const reload = options.reload === true;
            setLoading(true);
            try {
                const prev = get({ subscribe });
                let list = Array.isArray(prev.vehicleInspectionsFull) ? prev.vehicleInspectionsFull : [];
                if (reload || list.length === 0) {
                    const result = await fetchWithAuth('vehicle-inspection/reports/latest');
                    list = Array.isArray(result) ? result : [];
                    list = [...list].sort((a, b) => {
                        const ta = a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
                        const tb = b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
                        return tb - ta;
                    });
                }
                const totalElements = list.length;
                const totalPages = Math.max(1, Math.ceil(totalElements / size) || 1);
                const safePage = Math.min(Math.max(0, page), totalPages - 1);
                const start = safePage * size;
                const slice = list.slice(start, start + size);
                update((s) => ({
                    ...s,
                    vehicleInspectionsFull: list,
                    vehicleInspections: {
                        data: slice,
                        totalPages,
                        totalElements,
                        currentPage: safePage,
                        pageSize: size,
                    },
                    isLoading: false,
                    error: null,
                }));
                return slice;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },
        getVehicleByPlaca: (placa) =>
            fetchWithAuth(`vehicle/${encodeURIComponent(normalizePlaca(placa))}`),
        validateVehicleKilometraje: (placa, kilometraje) => {
            const q = new URLSearchParams({ placa: normalizePlaca(placa), kilometraje: String(kilometraje) });
            return fetchWithAuth(`vehicle-inspection/validar-kilometraje?${q.toString()}`);
        },
        /** Última inspección por placa (API deduplica por moto). */
        fetchMotoInspections: () => fetchAll('motoInspections', 'moto/inspections/reports'),
        /** Historial completo de inspecciones de motos (todas, más recientes primero). */
        fetchMotoInspectionsHistory: () => fetchAll('motoInspectionsHistory', 'moto/inspections/reports/history'),

        // Mantenimiento
        fetchMotoMaintenance: () => fetchAll('motoMaintenance', 'maintenance/motos'),
        fetchVehicleMaintenance: () => fetchAll('vehicleMaintenance', 'maintenance/vehicles'),

        // Gestión de Vehículos (CRUD)
        fetchVehicles: async () => {
            setLoading(true);
            try {
                const result = await fetchWithAuth('vehicle');
                const list = unwrapEntityList(result);
                let vehiclesEnriched = [];
                update(s => {
                    vehiclesEnriched = list.map(v => enrichVehicleUbicacionRow(v, s.locations || []));
                    return {
                        ...s,
                        vehicles: vehiclesEnriched,
                        isLoading: false,
                        error: null,
                    };
                });
                return vehiclesEnriched;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },
        createVehicle: async (newVehicle) => {
            const created = await fetchWithAuth('vehicle', { method: 'POST', body: JSON.stringify(newVehicle) });
            let enriched;
            update(s => {
                enriched = enrichVehicleUbicacionRow(created, s.locations || []);
                return { ...s, vehicles: [...s.vehicles, enriched] };
            });
            return enriched;
        },
        updateVehicle: async (id, vehicleData) => {
            const updated = await fetchWithAuth(`vehicle/${id}`, { method: 'PUT', body: JSON.stringify(vehicleData) });
            let enriched;
            update(s => {
                enriched = enrichVehicleUbicacionRow(updated, s.locations || []);
                return { ...s, vehicles: s.vehicles.map(v => v.id === id ? enriched : v) };
            });
            return enriched;
        },
        deleteVehicle: async (id) => {
            await fetchWithAuth(`vehicle/${id}`, { method: 'DELETE' });
            update(s => ({ ...s, vehicles: s.vehicles.filter(v => v.id !== id) }));
        },

        /** CRUD motocicletas — GET/POST/PUT/DELETE `/api/v1/moto` (tipo MOTOCICLETA forzado en servidor). */
        fetchMotos: async () => {
            setLoading(true);
            try {
                const result = await fetchWithAuth('moto');
                const list = unwrapEntityList(result);
                let motosEnriched = [];
                update(s => {
                    motosEnriched = list.map(m => enrichVehicleUbicacionRow(m, s.locations || []));
                    return {
                        ...s,
                        motos: motosEnriched,
                        isLoading: false,
                        error: null,
                    };
                });
                return motosEnriched;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },
        createMoto: async (payload) => {
            const created = await fetchWithAuth('moto', { method: 'POST', body: JSON.stringify(payload) });
            let enriched;
            update(s => {
                enriched = enrichVehicleUbicacionRow(created, s.locations || []);
                return { ...s, motos: [...s.motos, enriched] };
            });
            return enriched;
        },
        updateMoto: async (id, payload) => {
            const updated = await fetchWithAuth(`moto/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
            let enriched;
            update(s => {
                enriched = enrichVehicleUbicacionRow(updated, s.locations || []);
                return { ...s, motos: s.motos.map(m => m.id === id ? enriched : m) };
            });
            return enriched;
        },
        deleteMoto: async (id) => {
            await fetchWithAuth(`moto/${id}`, { method: 'DELETE' });
            update(s => ({ ...s, motos: s.motos.filter(m => m.id !== id) }));
        },

        // Catálogos (Marcas, Tipos, Áreas, Ubicaciones)
        fetchVehicleBrands: () => fetchAll('vehicleBrands', 'brand/vehicle'),
        createVehicleBrand: async (newBrand) => {
            const descripcion = normalizeTitleWords(newBrand.descripcion) ?? String(newBrand.descripcion ?? '').trim();
            const created = await fetchWithAuth('brand/vehicle', {
                method: 'POST',
                body: JSON.stringify({ descripcion }),
            });
            update(s => ({ ...s, vehicleBrands: [...s.vehicleBrands, created] }));
            return created;
        },
        updateVehicleBrand: async (id, brandData) => {
            const descripcion =
                normalizeTitleWords(brandData.descripcion) ?? String(brandData.descripcion ?? '').trim();
            const updated = await fetchWithAuth(`brand/vehicle/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ descripcion }),
            });
            update(s => ({ ...s, vehicleBrands: s.vehicleBrands.map(b => b.idMarca === id ? updated : b) }));
        },
        deleteVehicleBrand: async (id) => {
            await fetchWithAuth(`brand/vehicle/${id}`, { method: 'DELETE' });
            update(s => ({ ...s, vehicleBrands: s.vehicleBrands.filter(b => b.idMarca !== id) }));
        },

        fetchVehicleTypes: () => fetchAll('vehicleTypes', 'catalog/tipo-vehiculo'),
        fetchAreas: () => fetchAll('areas', 'catalog/area'),
        fetchLocations: async () => {
            setLoading(true);
            try {
                const result = await fetchWithAuth('catalog/ubicacion');
                const dataToStore = result?.content ?? result?.users ?? result;
                const locations = unwrapEntityList(dataToStore);
                update(s => ({
                    ...s,
                    locations,
                    motos: (s.motos || []).map(m => enrichVehicleUbicacionRow(m, locations)),
                    vehicles: (s.vehicles || []).map(v => enrichVehicleUbicacionRow(v, locations)),
                    isLoading: false,
                    error: null,
                }));
                return locations;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },

        // Acciones Genéricas para Catálogos (Área, Ubicación, Tipo)
        createCatalogItem: async (type, newItem) => {
            const endpointMap = { 'area': 'catalog/area', 'location': 'catalog/ubicacion', 'type': 'catalog/tipo-vehiculo' };
            const stateMap = { 'area': 'areas', 'location': 'locations', 'type': 'vehicleTypes' };
            let body = { ...newItem };
            if (newItem?.name != null) {
                const raw = newItem.name;
                body = {
                    ...newItem,
                    name: type === 'type' ? (normalizeUpperToken(raw) ?? String(raw).trim()) : (normalizeTitleWords(raw) ?? String(raw).trim()),
                };
            }
            const created = await fetchWithAuth(endpointMap[type], { method: 'POST', body: JSON.stringify(body) });
            update(s => ({ ...s, [stateMap[type]]: [...s[stateMap[type]], created] }));
            return created;
        },
        updateCatalogItem: async (type, id, itemData) => {
            const endpointMap = { 'area': 'catalog/area', 'location': 'catalog/ubicacion', 'type': 'catalog/tipo-vehiculo' };
            const stateMap = { 'area': 'areas', 'location': 'locations', 'type': 'vehicleTypes' };
            let body = { ...itemData };
            if (itemData?.name != null) {
                const raw = itemData.name;
                body = {
                    ...itemData,
                    name: type === 'type' ? (normalizeUpperToken(raw) ?? String(raw).trim()) : (normalizeTitleWords(raw) ?? String(raw).trim()),
                };
            }
            const updated = await fetchWithAuth(`${endpointMap[type]}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
            update(s => ({ ...s, [stateMap[type]]: s[stateMap[type]].map(i => i.id === id ? updated : i) }));
        },
        deleteCatalogItem: async (type, id) => {
            const endpointMap = { 'area': 'catalog/area', 'location': 'catalog/ubicacion', 'type': 'catalog/tipo-vehiculo' };
            const stateMap = { 'area': 'areas', 'location': 'locations', 'type': 'vehicleTypes' };
            await fetchWithAuth(`${endpointMap[type]}/${id}`, { method: 'DELETE' });
            update(s => ({ ...s, [stateMap[type]]: s[stateMap[type]].filter(i => i.id !== id) }));
        }
    };

    return {
        subscribe,
        ...actions
    };
}

export const data = createDataStore();
