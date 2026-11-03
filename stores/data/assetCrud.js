/**
 * CRUD genérico para "activos" que viven en la tabla `vehiculos` del backend
 * (vehículos y motos son la misma entidad, diferenciada por tipoVehiculo —
 * ver la nota "moto es un alias de vehicle" en CLAUDE.md). vehicles.js y
 * motos.js eran función por función idénticas salvo el endpoint y las
 * claves de estado/loading/error; esto centraliza esa lógica compartida.
 *
 * Se devuelve un objeto { fetchAll, create, update, remove, restore } sin
 * nombre — cada archivo de dominio (vehicles.js, motos.js) lo envuelve con
 * los nombres reales (fetchVehicles, createVehicle, ...) para no romper
 * ningún call site ni perder capacidad de grep.
 */
export function createAssetCrud({ entity, endpoint, loadingKey, errorKey }, { update, setLoading, setError, unwrapEntityList, enrichVehicleUbicacionRow, fetchWithAuth }) {
    const stateKey = `${entity}s`;

    async function fetchAll() {
        setLoading(true, loadingKey);
        try {
            const result = await fetchWithAuth(endpoint);
            const list = unwrapEntityList(result);
            let enriched = [];
            update((s) => {
                enriched = list.map((v) => enrichVehicleUbicacionRow(v, s.locations || []));
                return { ...s, [stateKey]: enriched, [loadingKey]: false, [errorKey]: null };
            });
            return enriched;
        } catch (err) {
            setError(err.message, { loadingKey, errorKey });
            throw err;
        }
    }

    async function create(payload) {
        const created = await fetchWithAuth(endpoint, { method: 'POST', body: JSON.stringify(payload) });
        let enriched;
        update((s) => {
            enriched = enrichVehicleUbicacionRow(created, s.locations || []);
            return { ...s, [stateKey]: [...s[stateKey], enriched] };
        });
        return enriched;
    }

    async function update_(id, payload) {
        const updated = await fetchWithAuth(`${endpoint}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        let enriched;
        update((s) => {
            enriched = enrichVehicleUbicacionRow(updated, s.locations || []);
            return { ...s, [stateKey]: s[stateKey].map((v) => (v.id === id ? enriched : v)) };
        });
        return enriched;
    }

    async function remove(id) {
        await fetchWithAuth(`${endpoint}/${id}`, { method: 'DELETE' });
        update((s) => ({ ...s, [stateKey]: s[stateKey].filter((v) => v.id !== id) }));
    }

    async function restore(id) {
        const restored = await fetchWithAuth(`${endpoint}/${id}/restore`, { method: 'POST' });
        let enriched;
        update((s) => {
            enriched = enrichVehicleUbicacionRow(restored, s.locations || []);
            return { ...s, [stateKey]: [...s[stateKey], enriched] };
        });
        return enriched;
    }

    return { fetchAll, create, update: update_, remove, restore };
}
