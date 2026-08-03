import { normalizePlaca } from '../../src/lib/textFormat.js';

export function createMonitoringActions({ update, get, subscribe, setLoading, setError, fetchAll, fetchPaginated, fetchWithAuth }) {
    return {
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
        getMotoByPlaca: (placa) =>
            fetchWithAuth(`moto/${encodeURIComponent(normalizePlaca(placa))}`),
        validateVehicleKilometraje: (placa, kilometraje) => {
            const q = new URLSearchParams({ placa: normalizePlaca(placa), kilometraje: String(kilometraje) });
            return fetchWithAuth(`vehicle-inspection/validar-kilometraje?${q.toString()}`);
        },
        /** Última inspección por placa (API deduplica por moto). */
        fetchMotoInspections: (page = 0, size = 20) => fetchPaginated('motoInspections', 'moto/inspections/reports', page, size),
    };
}
