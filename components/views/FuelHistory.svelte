<script>
  import { onMount } from "svelte";
  import { pop } from "svelte-spa-router";
  import { data } from "../../stores/data.js";
  import { auth } from "../../stores/auth.js";
  import { addNotification } from "../../stores/ui.js";
  import Loader from "../shared/Loader.svelte";
  import DataGrid from "../shared/DataGrid.svelte";
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
  $: fuelTypes = $data.fuelTypes ?? [];
  $: fuelTypesById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.nombre]));
  $: unidadMedidaById = Object.fromEntries(fuelTypes.map((t) => [t.id, t.unidadMedida]));
  $: vehiculosById = Object.fromEntries(($data.vehicles ?? []).map((v) => [v.id, v]));
  $: machinesById = Object.fromEntries(($data.machines ?? []).map((m) => [m.id, m]));
  // GET /vehicle no filtra por tipo — trae motos también (viven en la misma
  // tabla vehiculos), por eso vehiculosById ya cubre VEHICULO y MOTOCICLETA.
  $: motos = $data.motos ?? [];
  $: machines = $data.machines ?? [];
  $: columns = createRefuelingColumns(fuelTypesById, unidadMedidaById, vehiculosById, machinesById, isAdmin, false);

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
  // edición completo de Tanqueo y Distribución no hace falta el buscador de
  // elemento — solo se corrigen los datos del tanqueo en sí.
  const emptyEditForm = {
    lugar: "BOMBA",
    areaCosto: "DISTRITO",
    fuelTypeId: "",
    cantidadGalones: "",
    horometroKm: "",
    esFull: false,
    precioUnitario: "",
    descuento: "",
    totalIngresado: "",
    origen: "",
  };
  let editForm = { ...emptyEditForm };
  let editingId = null;
  let editOriginalUrlFactura = null;
  let editFacturaFile = null;
  let editIsSubmitting = false;
  let editErrorMessage = "";
  let showEditModal = false;
  let refuelingToDelete = null;

  $: editUnidadCantidad = unidadMedidaById[Number(editForm.fuelTypeId)] === "M3" ? "m³" : "galones";

  function openEditModal(row) {
    editErrorMessage = "";
    editingId = row.id;
    editOriginalUrlFactura = row.urlFactura;
    editForm = {
      lugar: row.lugar,
      areaCosto: row.areaCosto,
      fuelTypeId: String(row.fuelTypeId),
      cantidadGalones: String(row.cantidadGalones),
      horometroKm: String(row.horometroKm),
      esFull: !!row.esFull,
      precioUnitario: row.precioUnitario != null ? String(row.precioUnitario) : "",
      descuento: row.descuento != null ? String(row.descuento) : "",
      totalIngresado: row.totalIngresado != null ? String(row.totalIngresado) : "",
      origen: row.origen ?? "",
    };
    editFacturaFile = null;
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
  }

  function handleEditFacturaChange(event) {
    editFacturaFile = event.target.files?.[0] ?? null;
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    editIsSubmitting = true;
    editErrorMessage = "";
    try {
      const fd = new FormData();
      if (tipoElemento === "MAQUINARIA") {
        fd.append("machineId", String(activoId));
      } else {
        fd.append("vehicleId", String(activoId));
      }
      fd.append("lugar", editForm.lugar);
      fd.append("areaCosto", editForm.areaCosto);
      fd.append("fuelTypeId", editForm.fuelTypeId);
      fd.append("cantidadGalones", editForm.cantidadGalones);
      fd.append("horometroKm", editForm.horometroKm);
      fd.append("esFull", String(editForm.esFull));
      if (editForm.lugar === "BOMBA") {
        fd.append("precioUnitario", editForm.precioUnitario);
        if (editForm.descuento) fd.append("descuento", editForm.descuento);
        fd.append("totalIngresado", editForm.totalIngresado);
        if (editFacturaFile) fd.append("factura", editFacturaFile);
      }
      if (editForm.origen) fd.append("origen", editForm.origen);

      await data.updateRefueling(editingId, fd);
      addNotification({ id: Date.now(), text: "Tanqueo actualizado con éxito." });
      showEditModal = false;
      loadHistory();
    } catch (e) {
      editErrorMessage = e.message || "Error al actualizar el tanqueo.";
    } finally {
      editIsSubmitting = false;
    }
  }

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
    if (type === "edit") openEditModal(row);
    else if (type === "delete") refuelingToDelete = row;
  }
</script>

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
  <div class="modal-overlay" role="presentation" on:click={closeEditModal}>
    <div class="modal-content" role="dialog" aria-modal="true" aria-label="Editar tanqueo" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Editar tanqueo — {activoLabel}</h3>
        <button type="button" class="close-btn" on:click={closeEditModal}>×</button>
      </div>
      <form aria-label="Editar tanqueo" class="create-form" on:submit={handleEditSubmit}>
        <div class="form-row">
          <label class="field" for="editLugar">
            <span class="field-lab">Lugar</span>
            <select id="editLugar" bind:value={editForm.lugar} disabled={editIsSubmitting}>
              <option value="BOMBA">Bomba</option>
              <option value="ALMACEN">Almacén</option>
            </select>
          </label>
          <label class="field" for="editAreaCosto">
            <span class="field-lab">Área de costo</span>
            <select id="editAreaCosto" bind:value={editForm.areaCosto} disabled={editIsSubmitting}>
              <option value="DISTRITO">Distrito</option>
              <option value="ASOCIACION">Asociación</option>
            </select>
          </label>
        </div>
        <div class="form-row">
          <label class="field" for="editFuelTypeId">
            <span class="field-lab">Combustible</span>
            <select id="editFuelTypeId" bind:value={editForm.fuelTypeId} required disabled={editIsSubmitting}>
              <option value="" disabled>Seleccione...</option>
              {#each fuelTypes as ft}
                <option value={String(ft.id)}>{ft.nombre}</option>
              {/each}
            </select>
          </label>
          <label class="field" for="editCantidadGalones">
            <span class="field-lab">Cantidad ({editUnidadCantidad})</span>
            <input id="editCantidadGalones" type="number" step="0.001" bind:value={editForm.cantidadGalones} required disabled={editIsSubmitting} />
          </label>
        </div>
        <div class="form-row form-row--align-center">
          <label class="field" for="editHorometroKm">
            <span class="field-lab">Horómetro/Km</span>
            <input id="editHorometroKm" type="number" step="0.01" bind:value={editForm.horometroKm} required disabled={editIsSubmitting} />
          </label>
          <label class="field field--checkbox" for="editEsFull">
            <input id="editEsFull" type="checkbox" bind:checked={editForm.esFull} disabled={editIsSubmitting} />
            <span class="field-lab">¿Tanque lleno?</span>
          </label>
        </div>
        {#if editForm.lugar === "BOMBA"}
          <div class="form-row">
            <label class="field" for="editPrecioUnitario">
              <span class="field-lab">Precio unitario</span>
              <input id="editPrecioUnitario" type="number" step="0.01" bind:value={editForm.precioUnitario} required disabled={editIsSubmitting} />
            </label>
            <label class="field" for="editDescuento">
              <span class="field-lab">Descuento (opcional)</span>
              <input id="editDescuento" type="number" step="0.01" bind:value={editForm.descuento} disabled={editIsSubmitting} />
            </label>
          </div>
          <div class="form-row">
            <label class="field" for="editTotalIngresado">
              <span class="field-lab">Total pagado (valor real)</span>
              <input id="editTotalIngresado" type="number" step="0.01" bind:value={editForm.totalIngresado} required disabled={editIsSubmitting} />
            </label>
            <label class="field" for="editOrigen">
              <span class="field-lab">Origen</span>
              <input id="editOrigen" type="text" bind:value={editForm.origen} disabled={editIsSubmitting} />
            </label>
          </div>
          <label class="field field--file" for="editFactura">
            <span class="field-lab">Factura{editOriginalUrlFactura ? " (opcional, mantiene la actual si no se adjunta)" : " (opcional)"}</span>
            <div class="dropzone">
              <input id="editFactura" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" on:change={handleEditFacturaChange} disabled={editIsSubmitting} />
              <div class="dropzone-content">
                <svg class="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 3v12" />
                  <path d="M7 8l5-5 5 5" />
                  <path d="M5 21h14" />
                </svg>
                {#if editFacturaFile}
                  <span class="dropzone-title">{editFacturaFile.name}</span>
                  <span class="dropzone-hint">Haz clic para cambiar el archivo</span>
                {:else}
                  <span class="dropzone-title">Arrastra la factura aquí o haz clic</span>
                  <span class="dropzone-hint">PDF, JPG o PNG</span>
                {/if}
              </div>
            </div>
          </label>
        {:else}
          <label class="field" for="editOrigen">
            <span class="field-lab">Origen</span>
            <input id="editOrigen" type="text" bind:value={editForm.origen} disabled={editIsSubmitting} />
          </label>
        {/if}
        <div class="create-actions">
          <button type="button" class="btn-cancel" on:click={closeEditModal} disabled={editIsSubmitting}>Cancelar</button>
          <button type="submit" class="btn-create" disabled={editIsSubmitting}>
            {editIsSubmitting ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
        {#if editErrorMessage}
          <p class="error-message">{editErrorMessage}</p>
        {/if}
      </form>
    </div>
  </div>
{/if}

{#if refuelingToDelete}
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

<style>
  .fuel-history {
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
  .no-data {
    color: var(--ink-muted);
    font-size: 12px;
    margin: 0;
  }

  /* Modal moderno — mismo patrón que Tanqueo y Distribución. */
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
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
  }
  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #0b0b0b;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    line-height: 1;
    color: #898781;
    cursor: pointer;
  }
  .create-form {
    display: flex;
    flex-direction: column;
  }
  .form-row {
    display: flex;
    gap: 12px;
    margin-bottom: 14px;
  }
  .form-row .field {
    flex: 1;
  }
  .form-row--align-center {
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
  .field--checkbox {
    flex: 0 0 auto;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    margin-top: 18px;
  }
  .field--file {
    margin-bottom: 24px;
  }
  .dropzone {
    position: relative;
    border: 2px dashed rgba(11, 11, 11, 0.15);
    border-radius: 14px;
    background: #fafaf9;
    padding: 26px 16px;
    text-align: center;
    transition: border-color 0.15s, background 0.15s;
  }
  .dropzone:hover {
    border-color: #2a78d6;
    background: #f5f8fd;
  }
  .field--file .dropzone input[type="file"] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    opacity: 0;
    cursor: pointer;
  }
  .dropzone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    pointer-events: none;
  }
  .dropzone-icon {
    width: 22px;
    height: 22px;
    color: #2a78d6;
  }
  .dropzone-title {
    font-size: 12.5px;
    font-weight: 600;
    color: #0b0b0b;
  }
  .dropzone-hint {
    font-size: 10.5px;
    color: #898781;
  }
  .create-form .field input:not([type="checkbox"]):not([type="file"]),
  .create-form .field select {
    border-radius: 12px;
    padding: 10px 14px;
    box-sizing: border-box;
    width: 100%;
    border-color: rgba(11, 11, 11, 0.18);
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
  .error-message {
    color: #d03b3b;
    font-size: 12px;
    margin: 10px 0 0;
  }
</style>
