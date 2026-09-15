import { writable } from 'svelte/store';

// Pestaña activa de SubestacionesTabbed — mismo patrón que fuelActiveTab
// (stores/fuelFilters.js): vive en un store para sobrevivir a que el
// componente se desmonte y remonte al navegar fuera y volver.
export const subestacionesActiveTab = writable('dashboard');
