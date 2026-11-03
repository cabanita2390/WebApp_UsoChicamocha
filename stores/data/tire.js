// Presión de llantas — perfiles (posiciones + rango en PSI) y su asignación por
// activo (backend /api/v1/tire). Es solo reporte: una presión fuera de rango no
// genera órdenes ni notificaciones. Reusa el isLoading/error global, igual que
// fuel/catalog: no lo refresca useWebSocketNotifications.js en segundo plano.
export function createTireActions({ update, fetchWithAuth, fetchAll }) {
    // Reemplaza la asignación del activo en el store; `updated` null = asignación quitada.
    function replaceAssignment(match, updated) {
        update(s => ({
            ...s,
            tireAssignments: [...s.tireAssignments.filter(a => !match(a)), ...(updated ? [updated] : [])],
        }));
        return updated;
    }

    return {
        fetchTireProfiles: () => fetchAll('tireProfiles', 'tire/perfiles'),
        createTireProfile: async (payload) => {
            const created = await fetchWithAuth('tire/perfiles', { method: 'POST', body: JSON.stringify(payload) });
            update(s => ({ ...s, tireProfiles: [...s.tireProfiles, created] }));
            return created;
        },
        updateTireProfile: async (id, payload) => {
            const updated = await fetchWithAuth(`tire/perfiles/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
            update(s => ({ ...s, tireProfiles: s.tireProfiles.map(p => (p.id === id ? updated : p)) }));
            return updated;
        },
        deleteTireProfile: async (id) => {
            await fetchWithAuth(`tire/perfiles/${id}`, { method: 'DELETE' });
            update(s => ({ ...s, tireProfiles: s.tireProfiles.filter(p => p.id !== id) }));
        },
        fetchTireAssignments: () => fetchAll('tireAssignments', 'tire/asignaciones'),
        /** perfilId null quita el perfil del vehículo o moto. */
        assignTireProfileVehicle: async (vehicleId, perfilId) => {
            const updated = await fetchWithAuth(`tire/asignaciones/vehicle/${vehicleId}`, {
                method: 'PUT',
                body: JSON.stringify({ perfilId }),
            });
            return replaceAssignment(a => a.vehicleId === vehicleId, updated || null);
        },
        /** perfilId null quita el perfil de la máquina. */
        assignTireProfileMachine: async (machineId, perfilId) => {
            const updated = await fetchWithAuth(`tire/asignaciones/machine/${machineId}`, {
                method: 'PUT',
                body: JSON.stringify({ perfilId }),
            });
            return replaceAssignment(a => a.machineId === machineId, updated || null);
        },
    };
}
