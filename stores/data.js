import { writable, get } from 'svelte/store';
import fetchWithAuth from './api';
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
        motoInspections: [],
        motoMaintenance: [],
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
     * - si solo viene el id, resuelve el nombre desde `locations` (evita carrera fetchMotos vs fetchLocations).
     */
    function enrichVehicleUbicacionRow(row, locations) {
        if (!row || typeof row !== 'object') return row;
        const idRaw = row.idUbicacionBase ?? row.id_ubicacion_base;
        const idUb = idRaw != null && idRaw !== '' ? Number(idRaw) : null;
        let nombre =
            row.ubicacionBase != null && String(row.ubicacionBase).trim() !== ''
                ? String(row.ubicacionBase).trim()
                : row.ubicacion_base != null && String(row.ubicacion_base).trim() !== ''
                  ? String(row.ubicacion_base).trim()
                  : null;
        if (
            (nombre == null || nombre === '') &&
            idUb != null &&
            !Number.isNaN(idUb) &&
            Array.isArray(locations)
        ) {
            const loc = locations.find(
                (l) =>
                    l &&
                    (Number(l.id) === idUb ||
                        Number(l.id_ubicacion) === idUb ||
                        Number(l.idUbicacion) === idUb),
            );
            const raw = loc?.name ?? loc?.nombre ?? loc?.nombreUbicacion;
            if (raw != null && String(raw).trim() !== '') nombre = String(raw).trim();
        }
        return {
            ...row,
            ...(idUb != null && !Number.isNaN(idUb) ? { idUbicacionBase: idUb } : {}),
            ubicacionBase: nombre ?? null,
        };
    }

    async function fetchAll(key, endpoint) {
        setLoading(true);
        try {
            const result = await fetchWithAuth(endpoint);
            const dataToStore = result?.content ?? result?.users ?? result;
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
        // Órdenes de Trabajo
        fetchWorkOrders: (page = 0, size = 20) => fetchPaginated('workOrders', 'order/all', page, size),
        createWorkOrder: async (newWorkOrder) => {
            await fetchWithAuth('order', { method: 'POST', body: JSON.stringify(newWorkOrder) });
            const currentState = get({ subscribe });
            actions.fetchWorkOrders(currentState.workOrders.currentPage, currentState.workOrders.pageSize);
        },
        executeWorkOrder: async (executionData) => {
            await fetchWithAuth('results/execute', { method: 'POST', body: JSON.stringify(executionData) });
            const currentState = get({ subscribe });
            actions.fetchWorkOrders(currentState.workOrders.currentPage, currentState.workOrders.pageSize);
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
            await fetchWithAuth('vehicle/oil-change', { method: 'POST', body: JSON.stringify(oilData) });
        },
        updateVehicleDocument: async (docData) => {
            await fetchWithAuth('admin/documents', { method: 'POST', body: JSON.stringify(docData) });
        },
        getVehicleDocuments: (idVehiculo) => fetchWithAuth(`vehicle-inspection/documentos/${idVehiculo}`),

        // Monitoreo Vehículos y Motos
        fetchVehicleMonitoring: () => fetchAll('vehicleMonitoring', 'vehicle/monitoring/consolidated'),
        fetchMotoMonitoring: () => fetchAll('motoMonitoring', 'moto/monitoring/consolidated'),
        
        /**
         * Inspecciones pre-operativas por tipo de vehículo (id en cat_tipos_vehiculo).
         * Debe coincidir con el seed: 2 = AUTOMOVIL (livianos); 1 = MOTOCICLETA (ver vista motos).
         * El backend devuelve un array completo; la paginación es en cliente.
         */
        fetchVehicleInspections: async (page = 0, size = 20, options = {}) => {
            const reload = options.reload === true;
            setLoading(true);
            try {
                const prev = get({ subscribe });
                let list = Array.isArray(prev.vehicleInspectionsFull) ? prev.vehicleInspectionsFull : [];
                if (reload || list.length === 0) {
                    const result = await fetchWithAuth('vehicle-inspection/reports/2');
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
        getVehicleByPlaca: (placa) => fetchWithAuth(`vehicle/${encodeURIComponent(placa)}`),
        validateVehicleKilometraje: (placa, kilometraje) => {
            const q = new URLSearchParams({ placa, kilometraje: String(kilometraje) });
            return fetchWithAuth(`vehicle-inspection/validar-kilometraje?${q.toString()}`);
        },
        /** Última inspección por placa (API deduplica por moto). */
        fetchMotoInspections: () => fetchAll('motoInspections', 'moto/inspections/reports'),
        
        // Mantenimiento
        fetchMotoMaintenance: () => fetchAll('motoMaintenance', 'maintenance/motos'),

        // Gestión de Vehículos (CRUD)
        fetchVehicles: async () => {
            setLoading(true);
            try {
                const result = await fetchWithAuth('vehicle');
                const list = Array.isArray(result) ? result : [];
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
                const list = Array.isArray(result) ? result : [];
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
            const created = await fetchWithAuth('brand/vehicle', { method: 'POST', body: JSON.stringify(newBrand) });
            update(s => ({ ...s, vehicleBrands: [...s.vehicleBrands, created] }));
            return created;
        },
        updateVehicleBrand: async (id, brandData) => {
            const updated = await fetchWithAuth(`brand/vehicle/${id}`, { method: 'PUT', body: JSON.stringify(brandData) });
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
                const locations = Array.isArray(dataToStore) ? dataToStore : [];
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
            const created = await fetchWithAuth(endpointMap[type], { method: 'POST', body: JSON.stringify(newItem) });
            update(s => ({ ...s, [stateMap[type]]: [...s[stateMap[type]], created] }));
            return created;
        },
        updateCatalogItem: async (type, id, itemData) => {
            const endpointMap = { 'area': 'catalog/area', 'location': 'catalog/ubicacion', 'type': 'catalog/tipo-vehiculo' };
            const stateMap = { 'area': 'areas', 'location': 'locations', 'type': 'vehicleTypes' };
            const updated = await fetchWithAuth(`${endpointMap[type]}/${id}`, { method: 'PUT', body: JSON.stringify(itemData) });
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
