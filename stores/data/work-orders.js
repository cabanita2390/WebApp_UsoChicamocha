/**
 * `self` es una referencia al objeto final de acciones (ver stores/data.js) — se
 * necesita porque create*WorkOrder llama a su propio fetch* hermano para refrescar
 * la página actual, igual que en el archivo original antes de dividirlo.
 */
export function createWorkOrderActions({ get, subscribe, fetchPaginated, fetchWithAuth, self }) {
    return {
        // Órdenes de Trabajo
        fetchWorkOrders: (page = 0, size = 20) => fetchPaginated('workOrders', 'order/all', page, size, { loadingKey: 'isLoadingWorkOrders', errorKey: 'errorWorkOrders' }),
        createWorkOrder: async (newWorkOrder) => {
            await fetchWithAuth('order', { method: 'POST', body: JSON.stringify(newWorkOrder) });
            const currentState = get({ subscribe });
            self.fetchWorkOrders(currentState.workOrders.currentPage, currentState.workOrders.pageSize);
        },
        // Órdenes de Trabajo — Vehículos
        // soloMotos: null/undefined = sin filtrar, true = solo motos, false = excluye motos.
        // El filtro se resuelve en el backend (antes de paginar); true guarda en
        // `motoWorkOrders`, null/false guardan en `vehicleWorkOrders`.
        fetchVehicleWorkOrders: (page = 0, size = 20, soloMotos = null) => {
            const key = soloMotos === true ? 'motoWorkOrders' : 'vehicleWorkOrders';
            const extraQuery = soloMotos === null ? '' : `&soloMotos=${soloMotos}`;
            return fetchPaginated(key, 'order/vehicle/all', page, size, { extraQuery });
        },
        createVehicleWorkOrder: async (payload) => {
            await fetchWithAuth('order/vehicle', { method: 'POST', body: JSON.stringify(payload) });
            const currentState = get({ subscribe });
            self.fetchVehicleWorkOrders(currentState.vehicleWorkOrders.currentPage, currentState.vehicleWorkOrders.pageSize);
        },
        executeWorkOrder: async (executionData) => {
            await fetchWithAuth('results/execute', { method: 'POST', body: JSON.stringify(executionData) });
            const currentState = get({ subscribe });
            self.fetchWorkOrders(currentState.workOrders.currentPage, currentState.workOrders.pageSize);
        },
        executeVehicleWorkOrder: async (executionData, soloMotos = null) => {
            await fetchWithAuth('results/execute', { method: 'POST', body: JSON.stringify(executionData) });
            const currentState = get({ subscribe });
            const key = soloMotos === true ? 'motoWorkOrders' : 'vehicleWorkOrders';
            self.fetchVehicleWorkOrders(currentState[key].currentPage, currentState[key].pageSize, soloMotos);
        },
    };
}
