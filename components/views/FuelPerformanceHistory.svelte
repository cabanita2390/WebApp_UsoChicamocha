<script>
  import { onMount } from "svelte";
  import { pop } from "svelte-spa-router";
  import { data } from "../../stores/data.js";
  import { auth } from "../../stores/auth.js";
  import { addNotification } from "../../stores/ui.js";
  import Loader from "../shared/Loader.svelte";
  import DataGrid from "../shared/DataGrid.svelte";
  import RefuelingFormModal from "../shared/RefuelingFormModal.svelte";
  import FuelTrendChart from "./FuelTrendChart.svelte";
  import { createFuelPerformanceColumns } from "../../config/table-definitions.js";

  const ACCENT_BLUE = "#2a78d6";
  // Rango "todo el histórico": el backend de Rendimiento asume el mes actual si
  // las fechas vienen vacías (útil para el reporte normal, no para un historial
  // completo por activo), así que acá se fuerza un rango amplio explícito. Esto
  // siempre trae TODO — el selector de abajo (RANGOS) es un filtro 100%
  // client-side sobre lo ya cargado, sin pedir de nuevo al backend por cada click.
  const FECHA_INICIO_HISTORICO = "2000-01-01";

  // Selector de rango estilo "gráfico de acciones" (1M/3M/6M/1A/Todo) — a
  // diferencia de un stock, un activo no tanquea varias veces al día, así que no
  // tienen sentido presets tipo "1D"/"5D"; el nivel más fino útil acá es "1M".
  const RANGOS = [
    { key: "1M", label: "1M", dias: 30 },
    { key: "3M", label: "3M", dias: 90 },
    { key: "6M", label: "6M", dias: 180 },
    { key: "1A", label: "1A", dias: 365 },
    { key: "TODO", label: "Todo", dias: null },
  ];
  let rangoSeleccionado = "TODO";

  export let params = {};

  $: tipoElemento = (params.tipoElemento || "MAQUINARIA").toUpperCase();
  $: activoId = Number(params.id);

  $: isLoading = $data.isLoading;
  $: isAdmin = $auth?.currentUser?.role === "ADMIN";
  $: fuelTypes = $data.fuelTypes ?? [];
  $: fuelTypesById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.nombre]));
  $: unidadMedidaById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.unidadMedida]));
  $: fuelAssetConfig = $data.fuelAssetConfig ?? [];
  $: unidadPorVehicleId = Object.fromEntries(
    fuelAssetConfig.filter((c) => c.vehicleId != null).map((c) => [c.vehicleId, unidadMedidaById[c.fuelTypeDefaultId]])
  );
  $: unidadPorMachineId = Object.fromEntries(
    fuelAssetConfig.filter((c) => c.machineId != null).map((c) => [c.machineId, unidadMedidaById[c.fuelTypeDefaultId]])
  );
  function unidadDe(row) {
    const unidad = row.machineId != null ? unidadPorMachineId[row.machineId] : unidadPorVehicleId[row.vehicleId];
    return unidad === "M3" ? "m³" : "gal";
  }

  $: columns = createFuelPerformanceColumns(fuelTypesById, isAdmin, false);

  $: rowsPorTipo = $data.fuelPerformance ?? { MAQUINARIA: [], VEHICULO: [], MOTOCICLETA: [] };
  $: filas = (rowsPorTipo[tipoElemento] ?? [])
    .filter((r) => (tipoElemento === "MAQUINARIA" ? r.machineId === activoId : r.vehicleId === activoId))
    .map((row) => ({ ...row, isAnomaly: row.alerta, unidadLabel: unidadDe(row) }))
    .sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

  $: activoLabel = filas[0]?.identificacionActivo
    ?? (tipoElemento === "MAQUINARIA" ? `Máquina #${activoId}` : `Vehículo #${activoId}`);

  // Filtro client-side por el rango elegido (filas ya viene ordenada desc por
  // fecha) — "Todo" no filtra nada, es el estado por defecto.
  $: rangoDias = RANGOS.find((r) => r.key === rangoSeleccionado)?.dias ?? null;
  $: limiteInferior = rangoDias != null ? new Date(Date.now() - rangoDias * 24 * 60 * 60 * 1000) : null;
  $: filasVisibles = limiteInferior ? filas.filter((f) => new Date(f.fechaRegistro) >= limiteInferior) : filas;

  $: totalAlertas = filasVisibles.filter((f) => f.alerta).length;
  $: ultimaFecha = filasVisibles[0]?.fechaRegistro ?? null;

  function formatFecha(fechaIso) {
    if (!fechaIso) return "—";
    return new Date(fechaIso).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function formatFechaCorta(fechaIso) {
    return new Date(fechaIso).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit" });
  }
  const MES_ABREV = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  // Etiqueta de dos líneas que se adapta al rango total de fechas del activo —
  // este historial solo va a crecer (empieza en "el mes en curso" pero con el
  // tiempo puede llegar a 12 meses, varios años), así que el nivel de detalle
  // tiene que bajar a medida que el rango crece, o las etiquetas se vuelven
  // ilegibles o dejan de tener sentido (mostrar el día exacto ya no importa
  // tanto si se están comparando años completos):
  //  - rango ≤ ~1 año: día arriba, mes abreviado abajo (ej. "05" / "ago") — el
  //    día sigue siendo el dato útil dentro de un mismo año.
  //  - rango > ~1 año: mes abreviado arriba, año abajo (ej. "ago" / "2026") —
  //    con varios años de por medio, el año es el dato que más falta y el día
  //    exacto deja de aportar a esa escala.
  function formatEtiquetaAdaptativa(fechaIso, rangoMayorAUnAnio) {
    const d = new Date(fechaIso);
    const mes = MES_ABREV[d.getMonth()];
    return rangoMayorAUnAnio
      ? `${mes}\n${d.getFullYear()}`
      : `${String(d.getDate()).padStart(2, "0")}\n${mes}`;
  }

  // El gráfico se lee de izquierda (más viejo) a derecha (más nuevo) — orden
  // contrario al de la tabla, que muestra lo más reciente arriba. Usa
  // filasVisibles (respeta el selector de rango 1M/3M/6M/1A/Todo).
  $: filasCronologicas = [...filasVisibles].reverse();
  $: unidadEje = filasCronologicas[0]?.unidadLabel ?? "gal";
  $: rangoMayorAUnAnio = filasCronologicas.length > 1 &&
    (new Date(filasCronologicas[filasCronologicas.length - 1].fechaRegistro) - new Date(filasCronologicas[0].fechaRegistro)) > 366 * 24 * 60 * 60 * 1000;
  $: chartMonths = filasCronologicas.map((f) => formatEtiquetaAdaptativa(f.fechaRegistro, rangoMayorAUnAnio));
  $: chartTimestamps = filasCronologicas.map((f) => f.fechaRegistro);
  $: chartProyectado = filasCronologicas.map((f) => Number(f.galonesProyectados));
  $: chartReal = filasCronologicas.map((f) => Number(f.galonesReal));

  function loadHistory() {
    data.fetchFuelPerformanceAllTipos(FECHA_INICIO_HISTORICO, new Date().toISOString().slice(0, 10));
  }

  let _lastKey = "";
  $: if (`${tipoElemento}:${activoId}` !== _lastKey) {
    _lastKey = `${tipoElemento}:${activoId}`;
    loadHistory();
  }

  onMount(() => {
    data.fetchFuelTypes();
    data.fetchAssetFuelConfig();
  });

  // ---- Editar un tanqueo desde el historial (mismo patrón que FuelPerformance.svelte) ----
  let editingRow = null;
  let showEditModal = false;

  async function openEditModal(row) {
    const reportTipo = tipoElemento === "VEHICULO" ? "VEHICULO" : "MAQUINARIA_MOTO";
    await data.fetchRefuelingReport(reportTipo, "TODAS");
    const full = ($data.fuelRefuelingReport ?? []).find((r) => r.id === row.refuelingId);
    if (!full) {
      addNotification({ id: Date.now(), text: "No se encontró el tanqueo completo para editar." });
      return;
    }
    editingRow = full;
    showEditModal = true;
  }

  function handleGridAction(event) {
    const { type, data: row } = event.detail;
    if (type === "edit") openEditModal(row);
  }
</script>

<div class="perf-history">
  <div class="ph-toolbar">
    <button type="button" class="btn-cancel" on:click={() => pop()}>← Volver</button>
    <h2 class="ph-title">
      Historial de rendimiento
      <span class="ph-badge" style="background: {ACCENT_BLUE}1a; color: {ACCENT_BLUE}">{activoLabel}</span>
    </h2>
    <button type="button" class="btn-filter" on:click={loadHistory} disabled={isLoading}>
      {isLoading ? "Cargando..." : "Refrescar"}
    </button>
  </div>

  {#if !isLoading && filas.length > 0}
    <div class="ph-rangos">
      {#each RANGOS as r}
        <button
          type="button"
          class="rango-pill"
          class:rango-pill--active={rangoSeleccionado === r.key}
          on:click={() => (rangoSeleccionado = r.key)}
        >
          {r.label}
        </button>
      {/each}
    </div>
  {/if}

  {#if !isLoading}
    <div class="ph-summary">
      <div class="summary-card">
        <span class="summary-label">Total registros</span>
        <span class="summary-value">{filasVisibles.length}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Último tanqueo</span>
        <span class="summary-value">{formatFecha(ultimaFecha)}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Con alerta</span>
        <span class="summary-value">{totalAlertas} / {filasVisibles.length}</span>
      </div>
    </div>
  {/if}

  {#if isLoading}
    <div class="ph-loader">
      <Loader />
    </div>
  {:else if filas.length === 0}
    <p class="no-data">Sin historial de rendimiento para este activo (falta línea base o consumo estándar configurado).</p>
  {:else if filasVisibles.length === 0}
    <p class="no-data">Sin tanqueos en el rango seleccionado ({RANGOS.find((r) => r.key === rangoSeleccionado)?.label}). Prueba con "Todo".</p>
  {:else}
    <div class="ph-chart">
      <FuelTrendChart
        label="Proyectado"
        color="#2a78d6"
        label2="Real"
        color2="#e67e22"
        months={chartMonths}
        values={chartProyectado}
        values2={chartReal}
        timestamps={chartTimestamps}
        formatValue={(v) => `${v} ${unidadEje}`}
        formatValue2={(v) => `${v} ${unidadEje}`}
      />
    </div>

    <div class="ph-table">
      <DataGrid {columns} data={filasVisibles} showDeleteButton={false} variant="modern" on:action={handleGridAction} />
    </div>
  {/if}
</div>

{#if showEditModal}
  <RefuelingFormModal
    initialRow={editingRow}
    assetEditable={false}
    titleSuffix={activoLabel}
    {fuelTypes}
    onSubmit={(fd) => data.updateRefueling(editingRow.id, fd)}
    on:success={() => {
      showEditModal = false;
      addNotification({ id: Date.now(), text: "Tanqueo actualizado con éxito." });
      loadHistory();
    }}
    on:close={() => (showEditModal = false)}
  />
{/if}

<style>
  .perf-history {
    --surface: #ffffff;
    --page: #f7f7f6;
    --ink: #0b0b0b;
    --ink-secondary: #52514e;
    --ink-muted: #898781;
    --border: rgba(11, 11, 11, 0.08);
    --shadow: 0 1px 2px rgba(11, 11, 11, 0.04), 0 4px 12px rgba(11, 11, 11, 0.05);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: var(--page);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
  .ph-toolbar {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .ph-title {
    flex: 1;
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--ink);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ph-badge {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 999px;
  }
  .ph-rangos {
    display: flex;
    gap: 6px;
  }
  .rango-pill {
    font-family: inherit;
    background: rgba(42, 120, 214, 0.1);
    color: #2a78d6;
    border: none;
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .rango-pill:hover {
    background: rgba(42, 120, 214, 0.18);
  }
  .rango-pill--active {
    background: #2a78d6;
    color: #fff;
  }
  .ph-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .summary-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 18px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    min-width: 150px;
  }
  .summary-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ink-muted);
  }
  .summary-value {
    font-size: 16px;
    font-weight: 700;
    color: var(--ink);
  }
  .ph-loader {
    display: flex;
    justify-content: center;
    padding: 32px;
  }
  .ph-chart {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 12px 14px;
  }
  .ph-table {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 18px 20px;
  }
  .no-data {
    color: var(--ink-muted);
    font-size: 12px;
    margin: 0;
  }
  .btn-filter {
    font-family: inherit;
    padding: 9px 20px;
    background: #2a78d6;
    color: #fff;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    height: 34px;
    white-space: nowrap;
  }
  .btn-filter:hover {
    background: #256abf;
  }
  .btn-filter:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .btn-cancel {
    font-family: inherit;
    background: #f0f0ef;
    color: #52514e;
    border: none;
    border-radius: 999px;
    padding: 9px 18px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-cancel:hover {
    background: #e4e4e2;
  }
</style>
