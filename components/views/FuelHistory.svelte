<script>
  import { onMount } from "svelte";
  import { pop } from "svelte-spa-router";
  import { data } from "../../stores/data.js";
  import { auth } from "../../stores/auth.js";
  import { addNotification } from "../../stores/ui.js";
  import { getFileUrl, openDocumentSafely } from "../../stores/api.js";
  import Loader from "../shared/Loader.svelte";
  import DataGrid from "../shared/DataGrid.svelte";
  import RefuelingFormModal from "../shared/RefuelingFormModal.svelte";
  import ReintegroModal from "../shared/ReintegroModal.svelte";
  import { createRefuelingColumns } from "../../config/table-definitions.js";

  const ACCENT_BLUE = "#2a78d6";

  export let params = {};

  $: tipoElemento = (params.tipoElemento || "VEHICULO").toUpperCase();
  $: activoId = Number(params.id);
  // El reporte del backend agrupa Bomba=Vehículos (VEHICULO) vs
  // Almacén=Maquinaria+Motocicletas (MAQUINARIA_MOTO) — misma partición que
  // usan las pestañas de Tanqueo y Distribución.
  $: reportTipo = tipoElemento === "VEHICULO" ? "VEHICULO" : "MAQUINARIA_MOTO";
  $: activoKey = tipoElemento === "MAQUINARIA" ? `M-${activoId}` : `V-${activoId}`;

  let elementosCargando = false;

  $: isLoading = $data.isLoading;
  $: isAdmin = $auth?.currentUser?.role === "ADMIN";
  // Reintegrar exige SUPERVISOR_OPERATIVO o ADMIN en el backend
  // (FuelReintegrationController) — más permisivo que Editar/Eliminar, que son
  // ADMIN-only.
  $: isSupervisorOperativo = $auth?.currentUser?.role === "SUPERVISOR_OPERATIVO";
  $: canReintegrar = isAdmin || isSupervisorOperativo;
  $: fuelTypes = $data.fuelTypes ?? [];
  $: fuelTypesById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.nombre]));
  $: unidadMedidaById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.unidadMedida]));
  $: vehiculosById = Object.fromEntries(($data.vehicles ?? []).map((v) => [v.id, v]));
  $: machinesById = Object.fromEntries(($data.machines ?? []).map((m) => [m.id, m]));
  // GET /vehicle no filtra por tipo — trae motos también (viven en la misma
  // tabla vehiculos), por eso vehiculosById ya cubre VEHICULO y MOTOCICLETA.
  $: motos = $data.motos ?? [];
  $: machines = $data.machines ?? [];
  $: columns = createRefuelingColumns(fuelTypesById, unidadMedidaById, vehiculosById, machinesById, isAdmin, false, canReintegrar);

  $: activo = tipoElemento === "MAQUINARIA" ? machinesById[activoId] : vehiculosById[activoId];
  $: activoLabel = activo
    ? tipoElemento === "MAQUINARIA"
      ? `${activo.name}${activo.brand ? " — " + activo.brand : ""}`
      : `${activo.placa}${activo.marca ? " — " + activo.marca : ""}`
    : tipoElemento === "MAQUINARIA"
      ? `Máquina #${activoId}`
      : `Vehículo #${activoId}`;

  // El reporte se pide sin rango de fechas — a diferencia del modal que tenía
  // Tanqueo y Distribución, esta pantalla muestra TODO el historial del
  // activo, no solo lo que cae dentro del filtro de fechas seleccionado ahí.
  $: reporte = $data.fuelRefuelingReport ?? [];
  $: filas = reporte
    .filter((r) => (r.machineId != null ? `M-${r.machineId}` : `V-${r.vehicleId}`) === activoKey)
    .sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

  let page = 0;
  let pageSize = 20;
  $: totalPages = Math.max(1, Math.ceil(filas.length / pageSize));
  $: pageRows = filas.slice(page * pageSize, (page + 1) * pageSize);

  function handlePageChange(event) {
    page = event.detail;
  }

  function handleSizeChange(event) {
    pageSize = event.detail;
    page = 0;
  }

  $: totalCantidad = filas.reduce((acc, r) => acc + (Number(r.cantidadGalones) || 0), 0);
  $: ultimoTanqueo = filas[0] ?? null;
  $: unidadTotal = unidadMedidaById[ultimoTanqueo?.fuelTypeId] === "M3" ? "m³" : "gal";

  function formatFecha(fechaIso) {
    if (!fechaIso) return "—";
    return new Date(fechaIso).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function loadHistory() {
    data.fetchRefuelingReport(reportTipo, "TODAS");
  }

  let _lastKey = "";
  $: if (`${reportTipo}:${activoKey}` !== _lastKey) {
    _lastKey = `${reportTipo}:${activoKey}`;
    loadHistory();
  }

  onMount(() => {
    data.fetchFuelTypes();
    const pendientes = [];
    if (!$data.vehicles?.length) pendientes.push(data.fetchVehicles());
    if (!motos.length) pendientes.push(data.fetchMotos());
    if (!machines.length) pendientes.push(data.fetchMachines());
    if (pendientes.length) {
      elementosCargando = true;
      Promise.allSettled(pendientes).finally(() => {
        elementosCargando = false;
      });
    }
  });

  // ---- Editar / Eliminar un tanqueo ----
  // El activo ya está fijo por la ruta, así que a diferencia del modal de
  // edición completo de Tanqueo y Distribución (RefuelingFormModal con
  // assetEditable=true) acá va con assetEditable=false: sin buscador, el
  // FormData usa directamente el vehicleId/machineId de editingRow.
  let showEditModal = false;
  let editingRow = null;
  let refuelingToDelete = null;
  let reintegrandoRow = null;

  async function confirmDeleteRefueling() {
    if (!refuelingToDelete) return;
    try {
      await data.deleteRefueling(refuelingToDelete.id);
      addNotification({ id: Date.now(), text: "Tanqueo eliminado con éxito." });
      refuelingToDelete = null;
      loadHistory();
    } catch (e) {
      addNotification({ id: Date.now(), text: e.message || "Error al eliminar el tanqueo." });
    }
  }

  function handleGridAction(event) {
    const { type, data: row } = event.detail;
    if (type === "edit") {
      editingRow = row;
      showEditModal = true;
    } else if (type === "delete") {
      refuelingToDelete = row;
    } else if (type === "view_factura") {
      openDocumentSafely(getFileUrl(row.urlFactura));
    } else if (type === "reintegro") {
      reintegrandoRow = row;
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && refuelingToDelete) refuelingToDelete = null;
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="fuel-history">
  <div class="fh-toolbar">
    <button type="button" class="btn-cancel" on:click={() => pop()}>← Volver</button>
    <h2 class="fh-title">
      Historial de tanqueos
      <span class="fh-badge" style="background: {ACCENT_BLUE}1a; color: {ACCENT_BLUE}">{activoLabel}</span>
    </h2>
    <button type="button" class="btn-filter" on:click={loadHistory} disabled={isLoading}>
      {isLoading ? "Cargando..." : "Refrescar"}
    </button>
  </div>

  {#if !isLoading}
    <div class="fh-summary">
      <div class="summary-card">
        <span class="summary-label">Total registros</span>
        <span class="summary-value">{filas.length}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Último tanqueo</span>
        <span class="summary-value">{formatFecha(ultimoTanqueo?.fechaRegistro)}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Total acumulado</span>
        <span class="summary-value">{totalCantidad.toLocaleString("es-CO")} {unidadTotal}</span>
      </div>
    </div>
  {/if}

  {#if isLoading}
    <div class="fuel-loader">
      <Loader />
    </div>
  {:else if filas.length === 0}
    <p class="no-data">Sin tanqueos registrados para este activo.</p>
  {:else}
    <div class="fuel-chart">
      <DataGrid
        {columns}
        data={pageRows}
        totalElements={filas.length}
        {totalPages}
        currentPage={page}
        {pageSize}
        on:action={handleGridAction}
        on:pageChange={handlePageChange}
        on:sizeChange={handleSizeChange}
        showDeleteButton={isAdmin}
        variant="modern"
      />
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

{#if refuelingToDelete}
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="modal-overlay" role="presentation" on:click={() => (refuelingToDelete = null)}>
    <div class="modal-content" style="width: 420px;" role="dialog" aria-modal="true" aria-label="Eliminar tanqueo" on:click|stopPropagation>
      <p>¿Está seguro que desea eliminar el tanqueo de <b>{refuelingToDelete.cantidadGalones}</b> del {formatFecha(refuelingToDelete.fechaRegistro)}?</p>
      <div class="create-actions">
        <button type="button" class="btn-cancel" on:click={() => (refuelingToDelete = null)}>Cancelar</button>
        <button type="button" class="btn-create" on:click={confirmDeleteRefueling}>Eliminar</button>
      </div>
    </div>
  </div>
{/if}

{#if reintegrandoRow}
  <ReintegroModal
    row={reintegrandoRow}
    onSubmit={(payload) => data.createFuelReintegration(payload)}
    on:success={() => {
      reintegrandoRow = null;
      addNotification({ id: Date.now(), text: "Reintegro registrado con éxito." });
      loadHistory();
    }}
    on:close={() => (reintegrandoRow = null)}
  />
{/if}

<style>
  .fuel-history {
    --surface: #ffffff;
    --page: #f7f7f6;
    --ink: #0b0b0b;
    --ink-secondary: #52514e;
    --ink-muted: #898781;
    --border: rgba(11, 11, 11, 0.08);
       --row-border: rgba(11, 11, 11, 0.453);
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
  .fh-toolbar {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .fh-title {
    flex: 1;
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--ink);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .fh-badge {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 999px;
  }
  .fh-summary {
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
  }
  .fuel-chart :global(.data-grid-wrapper.modern .data-grid tbody tr td) {
    border-bottom: 1px solid var(--row-border) !important;
  }
  .fuel-chart :global(.data-grid-wrapper.modern .data-grid thead th) {
    border-bottom: 1px solid var(--row-border) !important;
  }
  .fuel-chart :global(.data-grid-wrapper.modern .data-grid tbody tr:nth-child(even) td) {
    background-color: #f3f4f6;
  }
  .fuel-chart :global(.data-grid-wrapper.modern .data-grid tbody tr:hover td) {
    background-color: #eef4fc;
  }
  .no-data {
    color: var(--ink-muted);
    font-size: 12px;
    margin: 0;
  }

  /* El modal de edición vive en RefuelingFormModal.svelte — acá solo queda lo
     que usa el modal de confirmar borrado. */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(11, 11, 11, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 24px;
    overflow: auto;
  }
  .modal-content {
    --surface: #ffffff;
    --ink: #0b0b0b;
    --ink-secondary: #52514e;
    --ink-muted: #898781;
    --border: rgba(11, 11, 11, 0.08);
    background: #fff;
    padding: 32px;
    border-radius: 20px;
    width: 560px;
    max-width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .create-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
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
  .btn-create {
    font-family: inherit;
    background: #2a78d6;
    color: #fff;
    border: none;
    border-radius: 999px;
    padding: 9px 18px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-create:hover {
    background: #256abf;
  }
  .btn-create:disabled,
  .btn-cancel:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
