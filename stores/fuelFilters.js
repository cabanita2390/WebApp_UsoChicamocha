import { writable } from 'svelte/store';

// Rango de fechas compartido por las 3 pestañas de Combustibles (Dashboard
// Financiero, Rendimiento, Tanqueo y Distribución) — filtrarlo en una pestaña lo
// deja aplicado en las otras al cambiar de pestaña, sin tener que volver a
// escribirlo. Área (Tanqueo y Distribución) y tipo/píldoras (Rendimiento, Tanqueo y
// Distribución) siguen siendo locales a cada pestaña: no son comparables entre
// vistas con categorías distintas.
export const fuelDateRange = writable({ fechaInicio: '', fechaFin: '' });

// Pestaña activa de FuelTabbed — vive en un store (no en `let activeTab` local
// del componente) para que sobreviva a que el componente se destruya y se
// vuelva a montar, como pasa al navegar a Historial de tanqueos y volver con
// "← Volver" (svelte-spa-router desmonta la ruta anterior; sin esto, volvía
// siempre a la primera pestaña en vez de a Tanqueo y Distribución).
export const fuelActiveTab = writable('dashboard');
