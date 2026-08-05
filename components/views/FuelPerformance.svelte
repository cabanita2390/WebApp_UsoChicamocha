<script>
  import { onMount } from "svelte";
  import { data } from "../../stores/data.js";
  import { auth } from "../../stores/auth.js";
  import { addNotification } from "../../stores/ui.js";
  import { fuelDateRange } from "../../stores/fuelFilters.js";
  import DataGrid from "../shared/DataGrid.svelte";
  import Loader from "../shared/Loader.svelte";
  import RefuelingFormModal from "../shared/RefuelingFormModal.svelte";
  import AssetFuelConfigManagement from "./AssetFuelConfigManagement.svelte";
  import { createFuelPerformanceColumns } from "../../config/table-definitions.js";

  $: isAdmin = $auth?.currentUser?.role === "ADMIN";
  let mostrarConfig = false;

  let tipo = "MAQUINARIA";

  $: isLoading = $data.isLoading;
  $: fuelTypes = $data.fuelTypes ?? [];
  $: fuelAssetConfig = $data.fuelAssetConfig ?? [];
  $: unidadMedidaById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.unidadMedida]));
  $: fuelTypesById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.nombre]));
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

  $: columns = createFuelPerformanceColumns(fuelTypesById, isAdmin);
  // Los 3 tipos se piden siempre juntos (fetchFuelPerformanceAllTipos) — cambiar
  // de pill es solo una lectura local, sin fetch, así que ya no puede "no cargar"
  // por una respuesta vieja que resuelve tarde.
  $: rowsPorTipo = $data.fuelPerformance ?? { MAQUINARIA: [], VEHICULO: [], MOTOCICLETA: [] };
  // Filas con alerta=true reutilizan el resaltado de anomalía que el DataGrid ya
  // soporta (isAnomaly) — no hace falta tocar DataGrid.svelte para esto.
  $: rows = (rowsPorTipo[tipo] ?? []).map((row) => ({ ...row, isAnomaly: row.alerta, unidadLabel: unidadDe(row) }));

  onMount(() => {
    data.fetchFuelTypes();
    data.fetchAssetFuelConfig();
    data.fetchFuelPerformanceAllTipos($fuelDateRange.fechaInicio || undefined, $fuelDateRange.fechaFin || undefined);
  });

  function handleFiltrar() {
    data.fetchFuelPerformanceAllTipos($fuelDateRange.fechaInicio || undefined, $fuelDateRange.fechaFin || undefined);
  }

  function seleccionarTipo(nuevoTipo) {
    tipo = nuevoTipo;
  }

  // ---- Editar un tanqueo desde Rendimiento (Fase 6) ----
  // La fila de Rendimiento no trae lugar/areaCosto (obligatorios para
  // PUT /fuel/refueling) — al abrir el modal se pide el tanqueo completo del
  // reporte de Tanqueo y Distribución (mismo id = refuelingId) y se edita in
  // situ (RefuelingFormModal con assetEditable=false, igual que en Historial
  // de tanqueos), para poder corregir un horómetro o cantidad mal cargados
  // sin salir de Rendimiento.
  let editingRow = null;
  let showEditModal = false;

  async function openEditModal(row) {
    // MAQUINARIA y MOTOCICLETA comparten el mismo reporte agrupado
    // (Almacén) que usa Tanqueo y Distribución.
    const reportTipo = tipo === "VEHICULO" ? "VEHICULO" : "MAQUINARIA_MOTO";
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

<div class="fuel-dashboard">
  <div class="fuel-filtros-grid">
    <div class="filtros-fechas">
      <label class="field" for="perfFechaInicio">
        <span class="field-lab">Fecha inicio</span>
        <input id="perfFechaInicio" type="date" bind:value={$fuelDateRange.fechaInicio} />
      </label>
      <label class="field" for="perfFechaFin">
        <span class="field-lab">Fecha fin</span>
        <input id="perfFechaFin" type="date" bind:value={$fuelDateRange.fechaFin} />
      </label>
      <button type="button" class="btn-filter" on:click={handleFiltrar}>Filtrar</button>
    </div>

    <div class="tipo-selector-center">
      <div class="tipo-selector">
        <button type="button" class="tipo-pill" class:tipo-pill--active={tipo === "MAQUINARIA"} on:click={() => seleccionarTipo("MAQUINARIA")}>
          Maquinaria ({rowsPorTipo.MAQUINARIA?.length ?? 0})
        </button>
        <button type="button" class="tipo-pill" class:tipo-pill--active={tipo === "VEHICULO"} on:click={() => seleccionarTipo("VEHICULO")}>
          Vehículos ({rowsPorTipo.VEHICULO?.length ?? 0})
        </button>
        <button type="button" class="tipo-pill" class:tipo-pill--active={tipo === "MOTOCICLETA"} on:click={() => seleccionarTipo("MOTOCICLETA")}>
          Motocicletas ({rowsPorTipo.MOTOCICLETA?.length ?? 0})
        </button>
      </div>
    </div>

    <div class="config-btn-wrap">
      {#if isAdmin }
        <button type="button" class="btn-filter btn-config" on:click={() => (mostrarConfig = !mostrarConfig)}>
          {mostrarConfig ? "Ocultar configuración" : "Configurar consumo estándar"}
        </button>
      {/if}
    </div>
  </div>

  <style>
    .fuel-filtros-grid {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 8px 16px;
      align-items: end;
      margin-bottom: 4px;
      width: 100%;
    }
    .filtros-fechas {
      display: flex;
      gap: 12px;
      align-items: end;
    }
    .tipo-selector-center {
      display: flex;
      justify-content: center;
      align-items: end;
    }
    .tipo-selector {
      display: flex;
      gap: 6px;
    }
    .config-btn-wrap {
      display: flex;
      justify-content: flex-end;
      align-items: end;
    }
    @media (max-width: 700px) {
      .fuel-filtros-grid {
        grid-template-columns: 1fr;
        grid-template-rows: auto auto auto;
        gap: 12px 0;
      }
      .filtros-fechas,
      .tipo-selector-center,
      .config-btn-wrap {
        justify-content: flex-start;
      }
      .tipo-selector-center {
        justify-content: center;
      }
      .config-btn-wrap {
        justify-content: flex-end;
      }
    }
  </style>

  {#if isAdmin && mostrarConfig}
    <AssetFuelConfigManagement on:close={() => (mostrarConfig = false)} />
  {/if}

  {#if isLoading}
    <div class="fuel-loader">
      <Loader />
    </div>
  {:else}
    <div class="fuel-chart">
      <div class="fuel-chart-head">Rendimiento Operativo</div>
      {#if rows.length}
        <div class="fuel-table-wrap">
          <DataGrid {columns} data={rows} showDeleteButton={false} variant="modern" on:action={handleGridAction} />
        </div>
      {:else}
        <p class="no-data">Sin activos con línea base y consumo configurado en el rango seleccionado.</p>
      {/if}
    </div>
  {/if}
</div>

{#if showEditModal}
  <RefuelingFormModal
    initialRow={editingRow}
    assetEditable={false}
    {fuelTypes}
    onSubmit={(fd) => data.updateRefueling(editingRow.id, fd)}
    on:success={() => {
      showEditModal = false;
      addNotification({ id: Date.now(), text: "Tanqueo actualizado con éxito." });
      // Recalcula Ejecutado/Proyectado/Real/Diferencia con el valor corregido.
      data.fetchFuelPerformanceAllTipos($fuelDateRange.fechaInicio || undefined, $fuelDateRange.fechaFin || undefined);
    }}
    on:close={() => (showEditModal = false)}
  />
{/if}

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
  .field input {
    font-family: inherit;
    padding: 8px 14px;
    border: 1px solid var(--border);
    border-radius: 999px;
    font-size: 12px;
    background: var(--surface);
    color: var(--ink);
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
  .tipo-selector {
    display: flex;
    gap: 8px;
    align-self: center;

  }
  .tipo-pill {
    font-family: inherit;
    background: rgba(42, 120, 214, 0.1);
    color: #2a78d6;
    border: none;
    border-radius: 999px;
    padding: 8px 16px;
    font-size: 12px;
    cursor: pointer;
  }
  .tipo-pill--active {
    background: #2a78d6;
    color: #fff;
    font-weight: 600;
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
