export function createOilActions({ update, fetchAll, fetchWithAuth }) {
    return {
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
        deleteOil: async (id) => {
            await fetchWithAuth(`oil/brand/${id}`, { method: 'DELETE' });
            update(s => ({ ...s, oils: s.oils.filter(o => o.id !== id) }));
        },
    };
}
