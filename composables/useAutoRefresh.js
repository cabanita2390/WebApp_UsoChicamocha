import { writable, get } from 'svelte/store';
import { location } from 'svelte-spa-router';
import { data } from '../stores/data.js';
import { auth } from '../stores/auth.js';

// State
export const isAutoRefreshEnabled = writable(true);
export const isAutoRefreshActive = writable(false);

let intervalId;
const REFRESH_INTERVAL = 60000; // 1 minute

export function startAutoRefresh() {
    stopAutoRefresh();
    console.log("🔄 [AUTO-REFRESH] Iniciando servicio (1 min)...");
    
    intervalId = setInterval(async () => {
        const $auth = get(auth);
        const $location = get(location);
        const $isEnabled = get(isAutoRefreshEnabled);
        const $data = get(data);

        // Check conditions:
        // 1. Enabled
        // 2. Authenticated
        // 3. Not currently loading data
        // 4. ONLY on Dashboard/Inspections view ('/' or empty)
        const isDashboard = $location === '/' || $location === '' || $location === '#/';
        const isVehicles = $location === '/vehicles';
        const isMotos = $location === '/moto-inventory';

        if ($isEnabled && $auth.isAuthenticated && !$data.isLoading && (isDashboard || isVehicles || isMotos)) {
             isAutoRefreshActive.set(true);
             try {
                 if (isDashboard) {
                     console.log('🔄 [AUTO-REFRESH] Actualizando Inspecciones...');
                     await data.fetchDashboardData($data.dashboard.currentPage, $data.dashboard.pageSize);
                     await data.fetchVehicleInspections($data.vehicleInspections.currentPage, $data.vehicleInspections.pageSize, { reload: true });
                     await data.fetchMotoInspections();
                 } else if (isVehicles) {
                     console.log('🔄 [AUTO-REFRESH] Actualizando Vehículos...');
                     await data.fetchVehicles();
                 } else if (isMotos) {
                     console.log('🔄 [AUTO-REFRESH] Actualizando Motocicletas...');
                     await data.fetchMotos();
                 }
                 console.log(`✅ [AUTO-REFRESH] Completado a las ${new Date().toLocaleTimeString()}`);
             } catch (e) {
                 console.error('❌ [AUTO-REFRESH] Error:', e);
             } finally {
                 isAutoRefreshActive.set(false);
             }
        }
    }, REFRESH_INTERVAL);
}

export function stopAutoRefresh() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        isAutoRefreshActive.set(false);
    }
}

export function toggleAutoRefresh() {
    isAutoRefreshEnabled.update(v => !v);
}
