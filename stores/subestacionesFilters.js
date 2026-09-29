import { writable } from 'svelte/store';

// Pestaña activa de SubestacionesTabbed — mismo patrón que fuelActiveTab
// (stores/fuelFilters.js): vive en un store para sobrevivir a que el
// componente se desmonte y remonte al navegar fuera y volver.
export const subestacionesActiveTab = writable('dashboard');

// Año con el que abre el Cronograma Anual cuando se llega desde otra pantalla
// (ej. "Copiar a 2027" en Configuración › Programación). null = el año actual.
export const cronogramaAnioInicial = writable(null);

// Pestaña interna de Configuración (Estaciones / Actividades / Programación).
export const configuracionTab = writable('est');
