export function createMotoActions({ update, setLoading, setError, unwrapEntityList, enrichVehicleUbicacionRow, fetchWithAuth }) {
    return {
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
        restoreMoto: async (motoId) => {
            const restored = await fetchWithAuth(`moto/${motoId}/restore`, { method: 'POST' });
            let enriched;
            update(s => {
                enriched = enrichVehicleUbicacionRow(restored, s.locations || []);
                return { ...s, motos: [...s.motos, enriched] };
            });
            return enriched;
        },
    };
}
