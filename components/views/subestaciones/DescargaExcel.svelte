<script>
  /**
   * "Descargar Excel" de Estaciones: el botón único de descargas (BotonExcel) con las hojas de
   * Estaciones. Las hojas, sus filtros y sus columnas los sirve el motor del back (GET /reportes);
   * abre con la hoja de la vista desde donde se llama y con sus filtros.
   */
  import BotonExcel from "../../shared/BotonExcel.svelte";
  import { disciplinaFiltro } from "../../../stores/subestacionesFilters.js";

  /** Hoja con la que abre (EJECUCIONES, HALLAZGOS, ORDENES, AVANCE, ACTIVIDADES). */
  export let hoja = "EJECUCIONES";
  /** Filtros de la vista: { anio, mes, estacionId }. La disciplina sale del filtro de Estaciones. */
  export let filtros = {};

  const HOJAS = ["ejecuciones", "hallazgos", "ordenes", "avance", "actividades"].map((h) => `estaciones-${h}`);
</script>

<BotonExcel claves={HOJAS} inicial={`estaciones-${hoja.toLowerCase()}`} clase="sub-btn boton-excel"
  filtros={{ ...filtros, disciplina: $disciplinaFiltro || "" }}>
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
    <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13h10" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
  Descargar Excel
</BotonExcel>

<style>
  :global(.sub-btn.boton-excel) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
</style>
