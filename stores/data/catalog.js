import { normalizeTitleWords, normalizeUpperToken } from '../../src/lib/textFormat.js';

export function createCatalogActions({ update, setLoading, setError, fetchAll, unwrapEntityList, enrichVehicleUbicacionRow, fetchWithAuth }) {
    return {
        deleteLocation: async (id) => {
            await fetchWithAuth(`catalog/location/${id}`, { method: 'DELETE' });
            update(s => ({ ...s, locations: s.locations.filter(l => l.id !== id) }));
        },
        // Catálogos (Marcas, Tipos, Ubicaciones)
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

        // Acciones Genéricas para Catálogos (Ubicación, Tipo)
        createCatalogItem: async (type, newItem) => {
            const endpointMap = { 'location': 'catalog/ubicacion', 'type': 'catalog/tipo-vehiculo' };
            const stateMap = { 'location': 'locations', 'type': 'vehicleTypes' };
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
            const endpointMap = { 'location': 'catalog/ubicacion', 'type': 'catalog/tipo-vehiculo' };
            const stateMap = { 'location': 'locations', 'type': 'vehicleTypes' };
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
            const endpointMap = { 'location': 'catalog/ubicacion', 'type': 'catalog/tipo-vehiculo' };
            const stateMap = { 'location': 'locations', 'type': 'vehicleTypes' };
            await fetchWithAuth(`${endpointMap[type]}/${id}`, { method: 'DELETE' });
            update(s => ({ ...s, [stateMap[type]]: s[stateMap[type]].filter(i => i.id !== id) }));
        },
    };
}
