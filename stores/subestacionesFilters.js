import { writable } from 'svelte/store';

// Pestaña activa de SubestacionesTabbed — mismo patrón que fuelActiveTab
// (stores/fuelFilters.js): vive en un store para sobrevivir a que el
// componente se desmonte y remonte al navegar fuera y volver.
export const subestacionesActiveTab = writable('dashboard');

// Año con el que abre el Cronograma Anual cuando se llega desde otra pantalla
// (ej. "Copiar a 2027" en Configuración › Programación). null = el año actual.
export const cronogramaAnioInicial = writable(null);

// El Cronograma abre con "Solo atrasadas" prendido (desde la tarjeta "Atrasadas"). Se consume una vez.
export const cronogramaSoloAtrasadas = writable(false);

// Año que se está viendo en los detalles (por estación / por actividad). Sobrevive a ir a otra
// pestaña y volver, y viaja en los enlaces entre detalles; se limpia al volver a la tabla. null = el actual.
export const anioDetalle = writable(null);

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

// Disciplina que filtra Dashboard, Resumen por actividad, sus detalles y el Cronograma.
// "" = todas (el módulo ya tiene catálogo para Civil, Eléctrico y Electromecánico).
export const disciplinaFiltro = writable('');
