const FUEL_PERFORMANCE_TIPOS = ['MAQUINARIA', 'VEHICULO', 'MOTOCICLETA'];

export function createFuelActions({ update, get, subscribe, setLoading, setError, fetchAll, fetchPaginated, fetchWithAuth, self }) {
    // Contador de petición para fetchRefuelingReport — al cambiar de "tipo" rápido
    // (pills de Tanqueo y Distribución), dos peticiones quedan en vuelo a la vez;
    // sin esto, si la más vieja resuelve después de la más nueva, pisa el store con
    // datos del tipo anterior y la pantalla parece "no cargar" hasta volver a
    // cambiar de tipo. fetchFuelPerformanceAllTipos resuelve el mismo problema de
    // raíz (carga los 3 tipos de una vez), pero conserva su propio contador por si
    // se dispara más de una vez seguida (ej. Filtrar con doble click).
    let fuelPerformanceRequestId = 0;
    let refuelingReportRequestId = 0;

    // El backend ya actualiza vehicle.kilometrajeActual / machine.horometroActual al
    // registrar un tanqueo (RefuelingRecordService.actualizarLecturaActual), pero esa
    // lectura vive replicada en varios caches del store (Vehículos/Máquinas/Motos,
    // Consolidado) que no se invalidan solos — sin este refresco el nuevo
    // kilometraje/horómetro no aparecía ahí hasta recargar la página, aunque el dato
    // en BD ya estuviera correcto. Solo refresca lo que ya estaba cargado (evita
    // pedir de más listas que la pantalla actual nunca mostró).
    async function refrescarActivoAfectado(record) {
        const state = get({ subscribe });
        const tareas = [];
        if (record.vehicleId != null) {
            if (state.vehicles?.length) tareas.push(self.fetchVehicles());
            if (state.motos?.length) tareas.push(self.fetchMotos());
            if (state.vehicleMonitoring?.length) tareas.push(self.fetchVehicleMonitoring());
            if (state.motoMonitoring?.length) tareas.push(self.fetchMotoMonitoring());
        } else if (record.machineId != null) {
            if (state.machines?.length) tareas.push(self.fetchMachines());
            if (state.consolidated?.distrito?.length || state.consolidated?.asociacion?.length) {
                tareas.push(self.fetchConsolidadoData());
            }
        }
        if (tareas.length) await Promise.allSettled(tareas);
    }

    return {
        // Combustibles — Tanqueo (Fase 4, Task 18)
        fetchFuelTypes: () => fetchAll('fuelTypes', 'fuel/types'),
        fetchRefueling: (page = 0, size = 20) => fetchPaginated('fuelRefueling', 'fuel/refueling', page, size),
        createRefueling: async (formData) => {
            const created = await fetchWithAuth('fuel/refueling', { method: 'POST', body: formData });
            update(s => ({
                ...s,
                fuelRefueling: { ...s.fuelRefueling, data: [created, ...s.fuelRefueling.data] },
            }));
            await refrescarActivoAfectado(created);
            return created;
        },
        updateRefueling: async (id, formData) => {
            const updated = await fetchWithAuth(`fuel/refueling/${id}`, { method: 'PUT', body: formData });
            update(s => ({
                ...s,
                fuelRefueling: { ...s.fuelRefueling, data: s.fuelRefueling.data.map(r => r.id === id ? updated : r) },
            }));
            await refrescarActivoAfectado(updated);
            return updated;
        },
        deleteRefueling: async (id) => {
            await fetchWithAuth(`fuel/refueling/${id}`, { method: 'DELETE' });
            update(s => ({
                ...s,
                fuelRefueling: { ...s.fuelRefueling, data: s.fuelRefueling.data.filter(r => r.id !== id) },
            }));
        },
        // Combustibles — Suministro de Almacén (Fase 4, Task 19)
        fetchFuelPurchases: (page = 0, size = 20) => fetchPaginated('fuelPurchases', 'fuel/purchases', page, size),
        createFuelPurchase: async (formData) => {
            const created = await fetchWithAuth('fuel/purchases', { method: 'POST', body: formData });
            update(s => ({
                ...s,
                fuelPurchases: { ...s.fuelPurchases, data: [created, ...s.fuelPurchases.data] },
            }));
            return created;
        },
        // Combustibles — Dashboard Financiero (Fase 4, Task 20)
        fetchFuelDashboard: async (fechaInicio, fechaFin) => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (fechaInicio) params.set('fechaInicio', fechaInicio);
                if (fechaFin) params.set('fechaFin', fechaFin);
                const qs = params.toString();
                const result = await fetchWithAuth(`fuel/dashboard/financiero${qs ? `?${qs}` : ''}`);
                update(s => ({ ...s, fuelDashboard: result, isLoading: false, error: null }));
                return result;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },
        fetchFuelTrend: async (meses, fechaFin) => {
            try {
                const params = new URLSearchParams();
                if (meses) params.set('meses', meses);
                if (fechaFin) params.set('fechaFin', fechaFin);
                const qs = params.toString();
                const result = await fetchWithAuth(`fuel/dashboard/tendencia${qs ? `?${qs}` : ''}`);
                update(s => ({ ...s, fuelTrend: result ?? [] }));
                return result;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },
        // Combustibles — Control de Almacén (Fase 4, Task 21)
        fetchFuelWarehouseBalance: async () => {
            setLoading(true);
            try {
                const result = await fetchWithAuth('fuel/almacen/saldos');
                update(s => ({ ...s, fuelWarehouseBalance: result?.saldos ?? [], isLoading: false, error: null }));
                return result;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },
        fetchFuelWarehouseMovements: async (fechaInicio, fechaFin) => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (fechaInicio) params.set('fechaInicio', fechaInicio);
                if (fechaFin) params.set('fechaFin', fechaFin);
                const qs = params.toString();
                const result = await fetchWithAuth(`fuel/almacen/movimientos${qs ? `?${qs}` : ''}`);
                update(s => ({ ...s, fuelWarehouseMovements: result, isLoading: false, error: null }));
                return result;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },
        createFuelReintegration: async (payload) => {
            return await fetchWithAuth('fuel/reintegros', { method: 'POST', body: JSON.stringify(payload) });
        },
        // Combustibles — Configuración de rendimiento y Rendimiento Operativo (Fase 4, Task 22)
        fetchAssetFuelConfig: () => fetchAll('fuelAssetConfig', 'fuel/config'),
        updateAssetFuelConfigVehicle: async (vehicleId, payload) => {
            const updated = await fetchWithAuth(`fuel/config/vehicle/${vehicleId}`, { method: 'PUT', body: JSON.stringify(payload) });
            update(s => ({
                ...s,
                fuelAssetConfig: [...s.fuelAssetConfig.filter(c => c.vehicleId !== vehicleId), updated],
            }));
            return updated;
        },
        updateAssetFuelConfigMachine: async (machineId, payload) => {
            const updated = await fetchWithAuth(`fuel/config/machine/${machineId}`, { method: 'PUT', body: JSON.stringify(payload) });
            update(s => ({
                ...s,
                fuelAssetConfig: [...s.fuelAssetConfig.filter(c => c.machineId !== machineId), updated],
            }));
            return updated;
        },
        // Pide los 3 tipos en paralelo (en vez de uno por pill activada) para que
        // cambiar de tipo en Rendimiento sea instantáneo y no dependa de una
        // petición nueva — antes, cambiar de tipo rápido podía dejar dos peticiones
        // en vuelo y, si la vieja resolvía después de la nueva, "no cargaba" hasta
        // volver a cambiar de tipo (mismo problema de fondo que fetchRefuelingReport,
        // aquí resuelto de raíz cargando todo de una vez en vez de solo con guardas).
        fetchFuelPerformanceAllTipos: async (fechaInicio, fechaFin) => {
            const requestId = ++fuelPerformanceRequestId;
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (fechaInicio) params.set('fechaInicio', fechaInicio);
                if (fechaFin) params.set('fechaFin', fechaFin);
                const entries = await Promise.all(
                    FUEL_PERFORMANCE_TIPOS.map(async (tipo) => {
                        const tipoParams = new URLSearchParams(params);
                        tipoParams.set('tipo', tipo);
                        const result = await fetchWithAuth(`fuel/rendimiento?${tipoParams.toString()}`);
                        return [tipo, result ?? []];
                    })
                );
                const byTipo = Object.fromEntries(entries);
                if (requestId === fuelPerformanceRequestId) {
                    update(s => ({ ...s, fuelPerformance: byTipo, isLoading: false, error: null }));
                }
                return byTipo;
            } catch (err) {
                if (requestId === fuelPerformanceRequestId) setError(err.message);
                throw err;
            }
        },
        // Combustibles — Distribución Asociación/Distrito (Fase 4, Task 23)
        fetchFuelDistribution: async (area, fechaInicio, fechaFin) => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (area && area !== 'TODAS') params.set('area', area);
                if (fechaInicio) params.set('fechaInicio', fechaInicio);
                if (fechaFin) params.set('fechaFin', fechaFin);
                const result = await fetchWithAuth(`fuel/distribucion?${params.toString()}`);
                update(s => ({ ...s, fuelDistribution: result, isLoading: false, error: null }));
                return result;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },
        // Combustibles — Reporte de tanqueos por tipo de activo (Fase 5, reemplaza
        // el agrupado por lugar de Tanqueo y Distribución: Bomba=Vehículos,
        // Almacén=Maquinaria+Motocicletas siempre, así que agrupar por tipo de
        // activo es la misma partición con mejor lectura).
        fetchRefuelingReport: async (tipo, area, fechaInicio, fechaFin) => {
            const requestId = ++refuelingReportRequestId;
            setLoading(true);
            try {
                const params = new URLSearchParams({ tipo });
                if (area && area !== 'TODAS') params.set('area', area);
                if (fechaInicio) params.set('fechaInicio', fechaInicio);
                if (fechaFin) params.set('fechaFin', fechaFin);
                const result = await fetchWithAuth(`fuel/refueling/reporte?${params.toString()}`);
                // Descarta la respuesta si ya se disparó una petición más nueva
                // (cambio de tipo mientras esta seguía en vuelo).
                if (requestId === refuelingReportRequestId) {
                    update(s => ({ ...s, fuelRefuelingReport: result ?? [], isLoading: false, error: null }));
                }
                return result;
            } catch (err) {
                if (requestId === refuelingReportRequestId) setError(err.message);
                throw err;
            }
        },
    };
}
