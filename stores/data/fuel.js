export function createFuelActions({ update, setLoading, setError, fetchAll, fetchPaginated, fetchWithAuth }) {
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
            return created;
        },
        updateRefueling: async (id, formData) => {
            const updated = await fetchWithAuth(`fuel/refueling/${id}`, { method: 'PUT', body: formData });
            update(s => ({
                ...s,
                fuelRefueling: { ...s.fuelRefueling, data: s.fuelRefueling.data.map(r => r.id === id ? updated : r) },
            }));
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
        fetchFuelPerformance: async (tipo, fechaInicio, fechaFin) => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                params.set('tipo', tipo);
                if (fechaInicio) params.set('fechaInicio', fechaInicio);
                if (fechaFin) params.set('fechaFin', fechaFin);
                const result = await fetchWithAuth(`fuel/rendimiento?${params.toString()}`);
                update(s => ({ ...s, fuelPerformance: result ?? [], isLoading: false, error: null }));
                return result;
            } catch (err) {
                setError(err.message);
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
            setLoading(true);
            try {
                const params = new URLSearchParams({ tipo });
                if (area && area !== 'TODAS') params.set('area', area);
                if (fechaInicio) params.set('fechaInicio', fechaInicio);
                if (fechaFin) params.set('fechaFin', fechaFin);
                const result = await fetchWithAuth(`fuel/refueling/reporte?${params.toString()}`);
                update(s => ({ ...s, fuelRefuelingReport: result ?? [], isLoading: false, error: null }));
                return result;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },
    };
}
