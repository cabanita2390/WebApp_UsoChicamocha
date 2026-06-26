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
        
        if ($isEnabled && $auth.isAuthenticated && !$data.isLoading && isDashboard) {
             isAutoRefreshActive.set(true);
             try {
                 console.log('🔄 [AUTO-REFRESH] Actualizando Inspecciones...');
                 await data.fetchDashboardData($data.dashboard.currentPage, $data.dashboard.pageSize);
                 console.log(`✅ [AUTO-REFRESH] Completado a las ${new Date().toLocaleTimeString()}`);
             } catch (e) {
                 console.error('❌ [AUTO-REFRESH] Error:', e);
             } finally {
                 isAutoRefreshActive.set(false);
             }
        } else if (!isDashboard && $isEnabled) {
            // Debug log to confirm it's skipped on other views
            // console.log('💤 [AUTO-REFRESH] Skipped - Not on Dashboard');
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
