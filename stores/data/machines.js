export function createMachineActions({ update, setLoading, setError, fetchAll, fetchWithAuth }) {
    return {
        // Máquinas y Currículum
        fetchMachines: () => fetchAll('machines', 'machine'),
        createMachine: async (newMachine) => {
            const createdMachine = await fetchWithAuth('machine', { method: 'POST', body: JSON.stringify(newMachine) });
            update(s => ({ ...s, machines: [...s.machines, createdMachine] }));
        },
        getMachineById: (machineId) =>
            fetchWithAuth(`machine/${machineId}`),
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
        fetchVehicleCurriculum: async (vehicleId) => {
            setLoading(true);
            try {
                const result = await fetchWithAuth(`curriculum/vehicle/${vehicleId}`);
                setLoading(false);
                return result;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },
        updateInspectionHourMeter: async (machineId, newHourMeter) => {
            await fetchWithAuth(`inspection/machine/${machineId}/hour-meter`, {
                method: 'PATCH',
                body: JSON.stringify(newHourMeter),
            });
        },
        // Editar/eliminar un cambio de aceite de maquinaria ya registrado ("en
        // caso de error") — cubre motor e hidráulico, mismas 3 rutas, tipo va en
        // el query param del historial (el registro en sí no cambia de tipo).
        fetchMachineOilHistory: async (machineId, tipo) => {
            const result = await fetchWithAuth(`oil-changes/machine/${machineId}/history?tipo=${encodeURIComponent(tipo)}`);
            return Array.isArray(result) ? result : [];
        },
        updateMachineOilChange: async (id, payload) => {
            await fetchWithAuth(`oil-changes/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        },
        deleteMachineOilChange: async (id) => {
            await fetchWithAuth(`oil-changes/${id}`, { method: 'DELETE' });
        },
    };
}
