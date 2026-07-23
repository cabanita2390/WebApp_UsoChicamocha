<script>
  import { onMount } from "svelte";
  import { data } from "../../stores/data.js";
  import { auth } from "../../stores/auth.js";
  import DataGrid from "../shared/DataGrid.svelte";
  import Loader from "../shared/Loader.svelte";
  import AssetFuelConfigManagement from "./AssetFuelConfigManagement.svelte";
  import { createFuelPerformanceColumns } from "../../config/table-definitions.js";

  // Task 22 combina Configuración (prerrequisito) + Rendimiento en una sola pestaña
  // para mantener las 6 pestañas planeadas — Configuración queda oculta tras un
  // toggle, visible solo para ADMIN (mismo rol exigido por el backend en /fuel/config).
  $: isAdmin = $auth?.currentUser?.role === "ADMIN";
  let mostrarConfig = false;

  let tipo = "VEHICULO";
  let fechaInicio = "";
  let fechaFin = "";

  $: isLoading = $data.isLoading;
  $: fuelTypes = $data.fuelTypes ?? [];
  $: fuelAssetConfig = $data.fuelAssetConfig ?? [];
  $: unidadMedidaById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.unidadMedida]));
  // El reporte no trae la unidad directamente — se obtiene cruzando con la config
  // de rendimiento del activo (fuelTypeDefaultId), que sí sabe qué combustible usa.
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

  $: columns = createFuelPerformanceColumns();
  // Filas con alerta=true reutilizan el resaltado de anomalía que el DataGrid ya
  // soporta (isAnomaly) — no hace falta tocar DataGrid.svelte para esto.
  $: rows = ($data.fuelPerformance ?? []).map((row) => ({ ...row, isAnomaly: row.alerta, unidadLabel: unidadDe(row) }));

  onMount(() => {
    data.fetchFuelTypes();
    data.fetchAssetFuelConfig();
    data.fetchFuelPerformance(tipo, fechaInicio || undefined, fechaFin || undefined);
  });

  function handleFiltrar() {
    data.fetchFuelPerformance(tipo, fechaInicio || undefined, fechaFin || undefined);
  }
</script>

<div class="fuel-dashboard">
  <div class="fuel-filtros">
    <label class="field" for="perfTipo">
      <span class="field-lab">Tipo</span>
      <select id="perfTipo" bind:value={tipo}>
        <option value="MAQUINARIA">Maquinaria</option>
        <option value="VEHICULO">Vehículo</option>
        <option value="MOTOCICLETA">Motocicleta</option>
      </select>
    </label>
    <label class="field" for="perfFechaInicio">
      <span class="field-lab">Fecha inicio</span>
      <input id="perfFechaInicio" type="date" bind:value={fechaInicio} />
    </label>
    <label class="field" for="perfFechaFin">
      <span class="field-lab">Fecha fin</span>
      <input id="perfFechaFin" type="date" bind:value={fechaFin} />
    </label>
    <button type="button" class="btn-filter" on:click={handleFiltrar}>Filtrar</button>
    {#if isAdmin}
      <button type="button" class="btn-filter btn-config" on:click={() => (mostrarConfig = !mostrarConfig)}>
        {mostrarConfig ? "Ocultar configuración" : "Configurar consumo estándar"}
      </button>
    {/if}
  </div>

  {#if isAdmin && mostrarConfig}
    <AssetFuelConfigManagement />
  {/if}

  {#if isLoading}
    <div class="fuel-loader">
      <Loader />
    </div>
  {:else}
    <div class="fuel-chart">
      <div class="fuel-chart-head">Rendimiento operativo — proyectado vs. real</div>
      {#if rows.length}
        <div class="fuel-table-wrap">
          <DataGrid {columns} data={rows} showDeleteButton={false} />
        </div>
      {:else}
        <p class="no-data">Sin activos con línea base y consumo configurado en el rango seleccionado.</p>
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
    flex: 1;
    min-height: 0;
    overflow-y: auto;
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
  .btn-config {
    background: #52514e;
    margin-left: auto;
  }
  .btn-config:hover {
    background: #3d3c3a;
  }
  .fuel-loader {
    display: flex;
    justify-content: center;
    padding: 32px;
  }
  .fuel-chart {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
  .fuel-chart-head {
    font-weight: 600;
    font-size: 13px;
    margin-bottom: 14px;
    color: var(--ink);
  }
  .fuel-table-wrap {
    flex: 1;
    min-height: 0;
  }
  .no-data {
    color: var(--ink-muted);
    font-size: 12px;
    margin: 0;
  }
</style>
