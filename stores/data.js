import { writable, get } from 'svelte/store';
import fetchWithAuth from './api';
import { initialState, createCore } from './data/core.js';
import { createDashboardActions } from './data/dashboard.js';
import { createUserActions } from './data/users.js';
import { createMachineActions } from './data/machines.js';
import { createWorkOrderActions } from './data/work-orders.js';
import { createConsolidadoActions } from './data/consolidado.js';
import { createOilActions } from './data/oils.js';
import { createVehicleMaintenanceActions } from './data/vehicle-maintenance.js';
import { createMonitoringActions } from './data/monitoring.js';
import { createVehicleActions } from './data/vehicles.js';
import { createMotoActions } from './data/motos.js';
import { createCatalogActions } from './data/catalog.js';
import { createFuelActions } from './data/fuel.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Store central de datos del frontend. La lógica vive dividida por dominio en
 * ./data/*.js (un archivo por área de negocio, igual que los módulos del backend);
 * este archivo es solo la raíz de composición — junta el estado inicial y todas
 * las acciones en un único store reactivo, preservando exactamente el mismo
 * contrato público (`data.subscribe`, `$data.vehicles`, `data.fetchVehicles()`, etc.)
 * que tenían los ~19 componentes que ya lo consumen.
 */
function createDataStore() {
    const { subscribe, update } = writable({ ...initialState });

    const core = createCore({ update, get, subscribe, fetchWithAuth });

    // `self` permite que una acción llame a otra hermana (p. ej. createWorkOrder
    // refresca la página actual llamando a fetchWorkOrders) sin que cada módulo
    // dependa de los demás — solo del objeto final ya compuesto.
    const self = {};
    Object.assign(
        self,
        createDashboardActions({ ...core, BASE_URL }),
        createUserActions(core),
        createMachineActions(core),
        createWorkOrderActions({ ...core, self }),
        createConsolidadoActions(core),
        createOilActions(core),
        createVehicleMaintenanceActions(core),
        createMonitoringActions(core),
        createVehicleActions(core),
        createMotoActions(core),
        createCatalogActions(core),
        createFuelActions({ ...core, self }),
    );

    return {
        subscribe,
        ...self,
    };
}

export const data = createDataStore();
