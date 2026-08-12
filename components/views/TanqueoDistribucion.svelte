<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { data } from "../../stores/data.js";
  import { auth } from "../../stores/auth.js";
  import { addNotification } from "../../stores/ui.js";
  import { getFileUrl, openDocumentSafely, download } from "../../stores/api.js";
  import { fuelDateRange, resetFuelDateRange } from "../../stores/fuelFilters.js";
  import Loader from "../shared/Loader.svelte";
  import DataGrid from "../shared/DataGrid.svelte";
  import RefuelingFormModal from "../shared/RefuelingFormModal.svelte";
  import ReintegroModal from "../shared/ReintegroModal.svelte";
  import { createRefuelingColumns } from "../../config/table-definitions.js";

  const ACCENT_BLUE = "#2a78d6";

  let area = "TODAS";
  // Bomba=Vehículos y Almacén=Maquinaria+Motocicletas siempre (regla real de la
  // empresa) — agrupar por tipo de activo es la misma partición que agrupar por
  // lugar, con mejor lectura. Reemplaza el agrupado Bomba/Almacén.
  let tipo = "VEHICULO";

  // Modales "Registrar tanqueo"/"Editar tanqueo" — el formulario en sí (campos,
  // buscador de activo, validación) vive en RefuelingFormModal.svelte (Fase 6:
  // estaba duplicado acá dos veces, una por modo). `editingRow` es lo único que
  // distingue el modo: null en creación, la fila real en edición (prefill).
  let showModal = false;
  let showEditModal = false;
  let editingRow = null;
  let refuelingToDelete = null;
  let isExporting = false;

  async function handleExportarExcel() {
    isExporting = true;
    try {
      const params = new URLSearchParams({ tipo });
      if (area && area !== "TODAS") params.set("area", area);
      if ($fuelDateRange.fechaInicio) params.set("fechaInicio", $fuelDateRange.fechaInicio);
      if ($fuelDateRange.fechaFin) params.set("fechaFin", $fuelDateRange.fechaFin);
      await download(`fuel/refueling/reporte/export?${params.toString()}`, "tanqueos_export.xlsx");
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar: ${e.message}` });
    } finally {
      isExporting = false;
    }
  }
  let reintegrandoRow = null;
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
  $: resumenColumns = createRefuelingColumns(fuelTypesById, unidadMedidaById, vehiculosById, machinesById, isAdmin, true, canReintegrar);
  // GET /vehicle no filtra por tipo — trae motos también (viven en la misma
  // tabla vehiculos). GET /moto sí filtra correctamente solo motos.
  $: vehicles = ($data.vehicles ?? []).filter((v) => (v.tipoVehiculo ?? "").toUpperCase() !== "MOTOCICLETA");
  $: motos = $data.motos ?? [];
  $: machines = $data.machines ?? [];
  // Sugerencias del datalist de Origen (dentro de RefuelingFormModal): valores
  // ya usados en el rango filtrado — "elige o escribe uno nuevo", no una lista
  // cerrada.
  $: origenesConocidos = [...new Set(reporte.map((r) => r.origen).filter(Boolean))];

  // isAnomaly activa el resaltado de fila que DataGrid ya soporta (mismo patrón
  // que FuelPerformance.svelte) — combina las 5 discrepancias ya calculadas por el
  // backend: financiera, capacidad de tanque excedida (AssetFuelCapacityService),
  // cantidad fuera de rango típico para el tipo de activo (mismo servicio), precio
  // unitario fuera de rango vs el promedio reciente (FuelPriceAnomalyService) y
  // "Full" declarado pero cantidad insuficiente para llenar el tanque
  // (FuelFullConsistencyService).
  $: reporte = ($data.fuelRefuelingReport ?? []).map((row) => ({
    ...row,
    isAnomaly: !!row.discrepanciaValor || !!row.capacidadExcedida
      || !!row.cantidadFueraDeRango || !!row.precioFueraDeRango || !!row.fullInconsistente,
  }));
  // Colapsa a 1 fila por activo = su tanqueo más reciente dentro del rango
  // filtrado (si un activo no tanqueó en el rango, no aparece). La clave usa un
  // prefijo M-/V- porque un machineId y un vehicleId pueden coincidir numéricamente
  // sin ser el mismo activo.
  $: resumenPorActivo = Object.values(
    reporte.reduce((acc, row) => {
      const key = row.machineId != null ? `M-${row.machineId}` : `V-${row.vehicleId}`;
      if (!acc[key] || new Date(row.fechaRegistro) > new Date(acc[key].fechaRegistro)) {
        acc[key] = row;
      }
      return acc;
    }, {})
  ).sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

  // Paginación 100% client-side: el reporte ya trae todos los activos del rango
  // de una vez (sin paginar en el backend, igual que Rendimiento/Distribución),
  // así que solo hace falta recortar lo que se le pasa al DataGrid.
  let resumenPage = 0;
  let resumenPageSize = 20;
  $: resumenTotalPages = Math.max(1, Math.ceil(resumenPorActivo.length / resumenPageSize));
  $: resumenPageRows = resumenPorActivo.slice(resumenPage * resumenPageSize, (resumenPage + 1) * resumenPageSize);

  function handleResumenPageChange(event) {
    resumenPage = event.detail;
  }

  function handleResumenSizeChange(event) {
    resumenPageSize = event.detail;
    resumenPage = 0;
  }

  function formatFecha(fechaIso) {
    if (!fechaIso) return "—";
    return new Date(fechaIso).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  onMount(() => {
    data.fetchFuelTypes();
    data.fetchRefuelingReport(tipo, area, $fuelDateRange.fechaInicio || undefined, $fuelDateRange.fechaFin || undefined);
    // Reutiliza lo que ya haya cargado otra vista (ej. Inventario) — solo
    // pide lo que todavía no está en el store.
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

  function handleFiltrar() {
    resumenPage = 0;
    data.fetchRefuelingReport(tipo, area, $fuelDateRange.fechaInicio || undefined, $fuelDateRange.fechaFin || undefined);
  }

  function handleLimpiarFiltro() {
    resetFuelDateRange();
    handleFiltrar();
  }

  function seleccionarTipo(nuevoTipo) {
    tipo = nuevoTipo;
    resumenPage = 0;
    data.fetchRefuelingReport(tipo, area, $fuelDateRange.fechaInicio || undefined, $fuelDateRange.fechaFin || undefined);
  }

  function handleResumenAction(event) {
    const { type, data: row } = event.detail;
    if (type === "edit") {
      editingRow = row;
      showEditModal = true;
    } else if (type === "delete") {
      refuelingToDelete = row;
    } else if (type === "viewHistory") {
      abrirHistorialActivo(row);
    } else if (type === "view_factura") {
      openDocumentSafely(getFileUrl(row.urlFactura));
    } else if (type === "reintegro") {
      reintegrandoRow = row;
    }
  }

  function abrirHistorialActivo(row) {
    const tipoActivo = row.machineId != null
      ? "MAQUINARIA"
      : motos.some((m) => m.id === row.vehicleId)
        ? "MOTOCICLETA"
        : "VEHICULO";
    const idActivo = row.machineId ?? row.vehicleId;
    push(`/fuel-history/${tipoActivo}/${idActivo}`);
  }

  async function confirmDeleteRefueling() {
    if (!refuelingToDelete) return;
    try {
      await data.deleteRefueling(refuelingToDelete.id);
      addNotification({ id: Date.now(), text: "Tanqueo eliminado con éxito." });
      refuelingToDelete = null;
      handleFiltrar();
    } catch (e) {
      addNotification({ id: Date.now(), text: e.message || "Error al eliminar el tanqueo." });
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && refuelingToDelete) refuelingToDelete = null;
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="fuel-dashboard">
  <div class="fuel-filtros-grid">
    <div class="filtros-fechas">
      <label class="field" for="tdArea">
        <span class="field-lab">Área</span>
        <select id="tdArea" bind:value={area}>
          <option value="TODAS">Todas</option>
          <option value="DISTRITO">Distrito</option>
          <option value="ASOCIACION">Asociación</option>
        </select>
      </label>
      <label class="field" for="tdFechaInicio">
        <span class="field-lab">Fecha inicio</span>
        <input id="tdFechaInicio" type="date" bind:value={$fuelDateRange.fechaInicio} />
      </label>
      <label class="field" for="tdFechaFin">
        <span class="field-lab">Fecha fin</span>
        <input id="tdFechaFin" type="date" bind:value={$fuelDateRange.fechaFin} />
      </label>
      <button type="button" class="btn-filter" on:click={handleFiltrar}>Filtrar</button>
      <button type="button" class="btn-clear-filter" on:click={handleLimpiarFiltro}>Limpiar filtro</button>
    </div>

    <div class="tipo-selector-center">
      <div class="tipo-selector">
        <button type="button" class="tipo-pill" class:tipo-pill--active={tipo === "VEHICULO"} on:click={() => seleccionarTipo("VEHICULO")}>
          Estación de Servicio{tipo === "VEHICULO" ? ` (${resumenPorActivo.length})` : ""}
        </button>
        <button type="button" class="tipo-pill" class:tipo-pill--active={tipo === "MAQUINARIA_MOTO"} on:click={() => seleccionarTipo("MAQUINARIA_MOTO")}>
          Almacén General{tipo === "MAQUINARIA_MOTO" ? ` (${resumenPorActivo.length})` : ""}
        </button>
      </div>
    </div>

    <div class="accion-btn-wrap">
      <button type="button" class="btn-filter" on:click={handleExportarExcel} disabled={isExporting}>
        {isExporting ? "Descargando..." : "Exportar Excel"}
      </button>
      <button type="button" class="btn-filter btn-registrar" on:click={() => (showModal = true)}>+ Registrar tanqueo</button>
    </div>
  </div>

  {#if isLoading}
    <div class="fuel-loader">
      <Loader />
    </div>
  {:else}
    <div class="fuel-chart">
      <div class="dist-group-head">
        <span class="dist-chip" style="background: {ACCENT_BLUE}1a; color: {ACCENT_BLUE}">
          {tipo === "VEHICULO" ? "Estación de Servicio" : "Almacén General"}
        </span>
        <span class="dist-count">{resumenPorActivo.length} activos con tanqueo en el rango</span>
      </div>
      {#if resumenPorActivo.length}
        <DataGrid
          columns={resumenColumns}
          data={resumenPageRows}
          totalElements={resumenPorActivo.length}
          totalPages={resumenTotalPages}
          currentPage={resumenPage}
          pageSize={resumenPageSize}
          on:action={handleResumenAction}
          on:pageChange={handleResumenPageChange}
          on:sizeChange={handleResumenSizeChange}
          showDeleteButton={isAdmin}
          variant="modern"
        />
      {:else}
        <p class="no-data">Sin tanqueos en el rango seleccionado.</p>
      {/if}
    </div>
  {/if}
</div>

{#if showModal}
  <RefuelingFormModal
    {fuelTypes}
    {vehicles}
    {motos}
    {machines}
    {origenesConocidos}
    {elementosCargando}
    onSubmit={(fd) => data.createRefueling(fd)}
    on:success={() => {
      showModal = false;
      handleFiltrar();
    }}
    on:close={() => (showModal = false)}
  />
{/if}

{#if showEditModal}
  <RefuelingFormModal
    initialRow={editingRow}
    {fuelTypes}
    {vehicles}
    {motos}
    {machines}
    {origenesConocidos}
    {elementosCargando}
    onSubmit={(fd) => data.updateRefueling(editingRow.id, fd)}
    on:success={() => {
      showEditModal = false;
      addNotification({ id: Date.now(), text: "Tanqueo actualizado con éxito." });
      handleFiltrar();
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
      handleFiltrar();
    }}
    on:close={() => (reintegrandoRow = null)}
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
  /* Mismo layout de grilla que Rendimiento (FuelPerformance.svelte): filtros a
     la izquierda, píldoras de tipo centradas en su propia columna, acción a la
     derecha — antes las píldoras quedaban sueltas en medio de un flex-wrap
     junto a los demás filtros, sin ese mismo orden visual. */
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
    flex-wrap: wrap;
  }
  .tipo-selector-center {
    display: flex;
    justify-content: center;
    align-items: end;
  }
  .accion-btn-wrap {
    display: flex;
    justify-content: flex-end;
    align-items: end;
    gap: 8px;
  }
  @media (max-width: 700px) {
    .fuel-filtros-grid {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto auto;
      gap: 12px 0;
    }
    .filtros-fechas,
    .tipo-selector-center,
    .accion-btn-wrap {
      justify-content: flex-start;
    }
    .tipo-selector-center {
      justify-content: center;
    }
    .accion-btn-wrap {
      justify-content: flex-end;
    }
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
    white-space: nowrap;
  }
  .btn-filter:hover {
    background: #256abf;
  }
  .btn-clear-filter {
    font-family: inherit;
    padding: 9px 20px;
    background: #fff;
    color: #52514e;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 999px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    height: 34px;
    white-space: nowrap;
  }
  .btn-clear-filter:hover {
    background: #f5f6f8;
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
  .dist-group-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .dist-chip {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 5px 12px;
    border-radius: 999px;
  }
  .dist-count {
    font-size: 11px;
    color: var(--ink-muted);
  }
  .no-data {
    color: var(--ink-muted);
    font-size: 12px;
    margin: 0;
  }

  /* Modal de confirmación de borrado — el resto del "modal moderno" (formulario
     de registrar/editar) vive en RefuelingFormModal.svelte. */
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
