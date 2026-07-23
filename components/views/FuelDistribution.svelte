<script>
  import { onMount } from "svelte";
  import { data } from "../../stores/data.js";
  import Loader from "../shared/Loader.svelte";

  const ACCENT_BLUE = "#2a78d6";
  const GOOD_GREEN = "#006300";

  let area = "DISTRITO";
  let fechaInicio = "";
  let fechaFin = "";

  $: isLoading = $data.isLoading;
  $: fuelTypes = $data.fuelTypes ?? [];
  $: fuelTypesById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.nombre]));
  $: unidadMedidaById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.unidadMedida]));

  $: distribucion = $data.fuelDistribution;
  $: filas = distribucion?.filas ?? [];

  function unidad(fuelTypeId) {
    return unidadMedidaById[fuelTypeId] === "M3" ? "m³" : "gal";
  }

  function formatCantidad(value, fuelTypeId) {
    if (value == null) return "—";
    return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(value)} ${unidad(fuelTypeId)}`;
  }

  // valorDespachado=null significa "no valorizado" (tanqueo ALMACEN, sin precio de
  // bomba) — no es lo mismo que $0, así que NUNCA se formatea como moneda cero.
  function formatCOP(value) {
    if (value == null) return "—";
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", notation: "compact", maximumFractionDigits: 2 }).format(value);
  }

  function formatFecha(fechaIso) {
    if (!fechaIso) return "—";
    return new Date(fechaIso).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function elemento(fila) {
    return fila.machineId != null ? `Máquina #${fila.machineId}` : `Vehículo #${fila.vehicleId}`;
  }

  onMount(() => {
    data.fetchFuelTypes();
    data.fetchFuelDistribution(area, fechaInicio || undefined, fechaFin || undefined);
  });

  function handleFiltrar() {
    data.fetchFuelDistribution(area, fechaInicio || undefined, fechaFin || undefined);
  }
</script>

<div class="fuel-dashboard">
  <div class="fuel-filtros">
    <label class="field" for="distArea">
      <span class="field-lab">Área</span>
      <select id="distArea" bind:value={area}>
        <option value="DISTRITO">Distrito</option>
        <option value="ASOCIACION">Asociación</option>
      </select>
    </label>
    <label class="field" for="distFechaInicio">
      <span class="field-lab">Fecha inicio</span>
      <input id="distFechaInicio" type="date" bind:value={fechaInicio} />
    </label>
    <label class="field" for="distFechaFin">
      <span class="field-lab">Fecha fin</span>
      <input id="distFechaFin" type="date" bind:value={fechaFin} />
    </label>
    <button type="button" class="btn-filter" on:click={handleFiltrar}>Filtrar</button>
  </div>

  {#if isLoading}
    <div class="fuel-loader">
      <Loader />
    </div>
  {:else if distribucion}
    <div class="stat-grid stat-grid--primary">
      <div class="stat-tile" style="--tile-accent: {ACCENT_BLUE}">
        <span class="stat-label">Total despachado</span>
        <span class="stat-value">{formatCantidad(distribucion.totalGalonesDespachados, filas[0]?.fuelTypeId)}</span>
      </div>
      <div class="stat-tile" style="--tile-accent: {GOOD_GREEN}">
        <span class="stat-label">Costo total despachado</span>
        <span class="stat-value">{formatCOP(distribucion.totalCostoDespachado)}</span>
      </div>
    </div>

    <div class="fuel-chart">
      <div class="fuel-chart-head">Detalle de despachos — {distribucion.areaCosto}</div>
      {#if filas.length}
        <div class="dist-table">
          <div class="dist-row dist-row--head">
            <span>Fecha</span>
            <span>Elemento</span>
            <span>Combustible</span>
            <span>Origen</span>
            <span>Cantidad</span>
            <span>Valor</span>
            <span>Reintegrado</span>
          </div>
          {#each filas as fila}
            <div class="dist-row" role="row">
              <span>{formatFecha(fila.fechaRegistro)}</span>
              <span>{elemento(fila)}</span>
              <span>{fuelTypesById[fila.fuelTypeId] ?? `Tipo #${fila.fuelTypeId}`}</span>
              <span>{fila.origen ?? "—"}</span>
              <span>{formatCantidad(fila.cantidadDespachada, fila.fuelTypeId)}</span>
              <span>{formatCOP(fila.valorDespachado)}</span>
              <span>{formatCantidad(fila.cantidadReintegrada, fila.fuelTypeId)}</span>
            </div>
          {/each}
        </div>
      {:else}
        <p class="no-data">Sin despachos en el rango seleccionado.</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .fuel-dashboard {
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
  }
  .fuel-filtros {
    display: flex;
    gap: 12px;
    align-items: end;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }
  .field-lab {
    font-weight: 500;
    font-size: 11px;
    color: var(--ink-secondary);
  }
  .field input,
  .field select {
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 12px;
    background: var(--surface);
  }
  .btn-filter {
    padding: 7px 16px;
    background: #2a78d6;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    height: 32px;
  }
  .btn-filter:hover {
    background: #256abf;
  }
  .fuel-loader {
    display: flex;
    justify-content: center;
    padding: 32px;
  }
  .stat-grid {
    display: grid;
    gap: 14px;
  }
  .stat-grid--primary {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
  .stat-tile {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .stat-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-secondary);
  }
  .stat-label::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--tile-accent, #2a78d6);
    flex-shrink: 0;
  }
  .stat-value {
    font-size: 26px;
    font-weight: 600;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .fuel-chart {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 18px 20px;
  }
  .fuel-chart-head {
    font-weight: 600;
    font-size: 13px;
    margin-bottom: 14px;
    color: var(--ink);
  }
  .no-data {
    color: var(--ink-muted);
    font-size: 12px;
    margin: 0;
  }
  .dist-table {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 12px;
    overflow-x: auto;
  }
  .dist-row {
    display: grid;
    grid-template-columns: repeat(7, minmax(90px, 1fr));
    gap: 10px;
    padding: 8px 6px;
    border-bottom: 1px solid var(--border);
    color: var(--ink);
  }
  .dist-row--head {
    font-weight: 600;
    color: var(--ink-secondary);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
</style>
