export function createVehicleActions({ update, setLoading, setError, unwrapEntityList, enrichVehicleUbicacionRow, fetchWithAuth }) {
    return {
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
        restoreVehicle: async (vehicleId) => {
            const restored = await fetchWithAuth(`vehicle/${vehicleId}/restore`, { method: 'POST' });
            let enriched;
            update(s => {
                enriched = enrichVehicleUbicacionRow(restored, s.locations || []);
                return { ...s, vehicles: [...s.vehicles, enriched] };
            });
            return enriched;
        },
    };
}
