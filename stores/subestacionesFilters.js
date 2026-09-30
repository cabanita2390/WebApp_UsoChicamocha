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

// "⤢ Ampliar" del Cronograma: oculta el menú, el encabezado y las pestañas (MainLayout y
// SubestacionesTabbed lo leen). Se apaga al salir del Cronograma.
export const pantallaAmpliada = writable(false);

// Filtro con el que abre la pestaña Ejecuciones cuando se llega desde el Cronograma
// ("Ver ejecuciones de este mes →") o del Resumen por actividad:
// { estacionId?, actividadId?, fechaInicio?, fechaFin? }. Se consume una vez.
export const ejecucionesFiltroInicial = writable(null);

// Estación cuyo detalle abre la pestaña Dashboard (Detalle por estación, P4). null = la tabla.
export const detalleEstacionId = writable(null);

// Actividad cuyo detalle (registros) abre la pestaña Resumen por actividad. null = la tabla.
export const detalleActividadId = writable(null);
