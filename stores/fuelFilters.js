import { writable } from 'svelte/store';

// Mismo default que el backend cuando fechaInicio/fechaFin llegan null (ver
// FechaRangoUtil.resolver): primer día del mes actual → hoy. Se calcula acá
// también para que los inputs de fecha SIEMPRE muestren el rango real que se
// está usando para filtrar, en vez de quedar en blanco mientras el backend
// aplica su propio default en silencio.
function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function defaultFuelDateRange() {
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return { fechaInicio: toIsoDate(inicioMes), fechaFin: toIsoDate(hoy) };
}

// Rango de fechas compartido por las 3 pestañas de Combustibles (Dashboard
// Financiero, Rendimiento, Tanqueo y Distribución) — filtrarlo en una pestaña lo
// deja aplicado en las otras al cambiar de pestaña, sin tener que volver a
// escribirlo. Área (Tanqueo y Distribución) y tipo/píldoras (Rendimiento, Tanqueo y
// Distribución) siguen siendo locales a cada pestaña: no son comparables entre
// vistas con categorías distintas.
export const fuelDateRange = writable(defaultFuelDateRange());

// Botón "Limpiar filtro" de las 3 pestañas: vuelve al mismo rango por defecto
// que ya se estaba aplicando (mes actual → hoy), no lo deja vacío.
export function resetFuelDateRange() {
  fuelDateRange.set(defaultFuelDateRange());
}

// Pestaña activa de FuelTabbed — vive en un store (no en `let activeTab` local
// del componente) para que sobreviva a que el componente se destruya y se
// vuelva a montar, como pasa al navegar a Historial de tanqueos y volver con
// "← Volver" (svelte-spa-router desmonta la ruta anterior; sin esto, volvía
// siempre a la primera pestaña en vez de a Tanqueo y Distribución).
export const fuelActiveTab = writable('dashboard');
