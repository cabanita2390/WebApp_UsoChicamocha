<script>
  import { pop } from 'svelte-spa-router';
  import { createVehicleOilHistoryColumns } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import { auth } from '../../stores/auth.js';
  import { addNotification } from '../../stores/ui.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';
  import { normalizePlaca } from '@/lib/textFormat.js';

  export let params = {};

  $: placa = normalizePlaca(params.placa ?? '');
  $: isAdmin = $auth?.currentUser?.role === 'ADMIN';
  // Acciones Editar/Eliminar solo para ADMIN — "en caso de error", mismo criterio
  // que Tanqueo y Distribución / Corregir Horómetro de Maquinaria.
  $: columns = createVehicleOilHistoryColumns(isAdmin);

  let history = [];
  let isLoading = false;
  let error = null;
  let vehicleInfo = null;

  let _lastPlaca = '';
  $: if (placa && placa !== _lastPlaca) {
    _lastPlaca = placa;
    loadHistory();
  }

  async function loadHistory() {
    if (!placa) { error = 'No se especificó ninguna placa.'; return; }
    isLoading = true;
    error = null;
    try {
      history = await data.fetchVehicleOilHistory(placa);
      if (history.length > 0) {
        const last = history[0];
        vehicleInfo = { kmActual: last.kmAtChange };
      }
    } catch (e) {
      error = e.message || 'Error al cargar el historial.';
    } finally {
      isLoading = false;
    }
  }

  $: totalCambios = history.length;
  $: ultimoCambio = history[0] ?? null;
  $: kmProximoCambio =
    ultimoCambio?.kmAtChange != null && ultimoCambio?.intervalKm != null
      ? ultimoCambio.kmAtChange + ultimoCambio.intervalKm
      : null;

  function formatKm(v) {
    if (v == null) return 'N/A';
    return new Intl.NumberFormat('es-CO').format(v);
  }

  function formatDate(raw) {
    if (!raw) return 'N/A';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // ---- Editar/Eliminar un registro del historial ("en caso de error") ----

  let oils = [];
  let oilsLoaded = false;

  async function ensureOilsLoaded() {
    if (!oilsLoaded) {
      oils = (await data.fetchOils()) || [];
      oilsLoaded = true;
    }
  }

  let editModalOpen = false;
  let editRow = null;
  const initialEditForm = { oilType: 'motor', brandId: '', quantity: '', kmAtChange: '', intervalKm: '', airFilterChanged: false };
  let editForm = { ...initialEditForm };
  let editSubmitting = false;
  let editError = '';

  let deleteRow = null;
  let deleteSubmitting = false;

  function handleGridAction(event) {
    const { type, data: row } = event.detail;
    if (type === 'edit') openEditModal(row);
    else if (type === 'delete') deleteRow = row;
  }

  async function openEditModal(row) {
    await ensureOilsLoaded();
    editRow = row;
    editForm = {
      oilType: (row.oilType || 'MOTOR').toLowerCase(),
      brandId: row.brandId != null ? String(row.brandId) : '',
      quantity: row.quantity != null ? String(row.quantity) : '',
      kmAtChange: row.kmAtChange != null ? String(row.kmAtChange) : '',
      intervalKm: row.intervalKm != null ? String(row.intervalKm) : '',
      airFilterChanged: !!row.airFilterChanged,
    };
    editError = '';
    editModalOpen = true;
  }

  function closeEditModal() {
    editModalOpen = false;
    editRow = null;
    editForm = { ...initialEditForm };
    editSubmitting = false;
  }

  async function submitEdit() {
    editError = '';
    const km = parseInt(editForm.kmAtChange, 10);
    if (!km || km <= 0) { editError = 'Ingrese un kilometraje válido.'; return; }
    const interval = parseInt(editForm.intervalKm, 10);
    if (!interval || interval <= 0) { editError = 'Ingrese un intervalo válido.'; return; }
    if (!editForm.brandId) { editError = 'Seleccione una marca de aceite.'; return; }

    editSubmitting = true;
    try {
      await data.updateVehicleOilChange(editRow.id, {
        placa,
        dateStamp: editRow.dateStamp,
        oilType: editForm.oilType,
        brandId: Number(editForm.brandId),
        quantity: editForm.quantity ? parseFloat(editForm.quantity) : null,
        kmAtChange: km,
        intervalKm: interval,
        airFilterChanged: editForm.airFilterChanged,
      });
      addNotification({ id: Date.now(), text: 'Cambio de aceite actualizado.' });
      closeEditModal();
      await loadHistory();
    } catch (e) {
      editError = e.message || 'Error al actualizar.';
    } finally {
      editSubmitting = false;
    }
  }

  async function confirmDelete() {
    if (!deleteRow) return;
    deleteSubmitting = true;
    try {
      await data.deleteVehicleOilChange(deleteRow.id);
      addNotification({ id: Date.now(), text: 'Cambio de aceite eliminado.' });
      deleteRow = null;
      await loadHistory();
    } catch (e) {
      addNotification({ id: Date.now(), text: e.message || 'Error al eliminar.' });
    } finally {
      deleteSubmitting = false;
    }
  }
</script>

<div class="oil-history">
  <div class="oil-history__toolbar">
    <button type="button" class="btn-back" on:click={() => pop()}>← Volver</button>
    <h2 class="oil-history__title">
      Historial de cambios de aceite
      {#if placa}<span class="placa-badge">{placa}</span>{/if}
    </h2>
    <button type="button" class="btn-refresh" on:click={loadHistory} disabled={isLoading}>
      Refrescar
    </button>
  </div>

  {#if placa && !isLoading && !error}
    <div class="oil-history__summary">
      <div class="summary-card">
        <span class="summary-label">Total registros</span>
        <span class="summary-value">{totalCambios}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Último cambio (km)</span>
        <span class="summary-value">{formatKm(ultimoCambio?.kmAtChange)}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Próximo cambio (km)</span>
        <span class="summary-value summary-value--highlight">{formatKm(kmProximoCambio)}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Último aceite</span>
        <span class="summary-value">
          {[ultimoCambio?.brandName, ultimoCambio?.oilType].filter(Boolean).join(' · ') || 'N/A'}
        </span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Fecha último cambio</span>
        <span class="summary-value">{formatDate(ultimoCambio?.dateStamp)}</span>
      </div>
    </div>
  {/if}

  {#if isLoading}
    <div class="oil-history__loader">
      <Loader />
      <p>Cargando historial...</p>
    </div>
  {:else if error}
    <div class="oil-history__error">
      <strong>Error:</strong> {error}
    </div>
  {:else if history.length === 0}
    <div class="oil-history__empty">
      <p>No se encontraron registros de cambio de aceite para la placa <strong>{placa}</strong>.</p>
    </div>
  {:else}
    <div class="oil-history__table">
      <DataGrid
        {columns}
        data={history}
        totalElements={history.length}
        totalPages={1}
        currentPage={0}
        pageSize={history.length}
        showPagination={false}
        fixedLayout={false}
        on:action={handleGridAction}
      />
    </div>
  {/if}
</div>

{#if editModalOpen && editRow}
  <div class="oh-overlay" role="presentation" on:click|self={closeEditModal}>
    <div class="oh-dialog" role="dialog" aria-modal="true" aria-labelledby="oh-edit-title" on:click|stopPropagation>
      <div class="oh-dialog-head">
        <span id="oh-edit-title">Corregir cambio de aceite — {formatDate(editRow.dateStamp)}</span>
        <button type="button" class="oh-close" on:click={closeEditModal} aria-label="Cerrar">×</button>
      </div>
      <form class="oh-dialog-body" on:submit|preventDefault={submitEdit}>
        <div class="oh-field">
          <span class="oh-field-label">Tipo de aceite</span>
          <select bind:value={editForm.oilType} disabled={editSubmitting}>
            <option value="motor">Motor</option>
            <option value="hidraulico">Hidráulico</option>
          </select>
        </div>
        <div class="oh-field">
          <span class="oh-field-label">Marca de aceite</span>
          <select bind:value={editForm.brandId} disabled={editSubmitting}>
            <option value="">— Seleccionar —</option>
            {#each oils as oil}
              <option value={String(oil.id)}>{oil.name}</option>
            {/each}
          </select>
        </div>
        <div class="oh-field-row">
          <label class="oh-field" for="oh-km">
            <span class="oh-field-label">Km en cambio</span>
            <input id="oh-km" type="number" min="0" bind:value={editForm.kmAtChange} disabled={editSubmitting} />
          </label>
          <label class="oh-field" for="oh-interval">
            <span class="oh-field-label">Intervalo (km)</span>
            <input id="oh-interval" type="number" min="1" bind:value={editForm.intervalKm} disabled={editSubmitting} />
          </label>
        </div>
        <label class="oh-field" for="oh-quantity">
          <span class="oh-field-label">Cantidad (L)</span>
          <input id="oh-quantity" type="number" step="0.1" min="0" bind:value={editForm.quantity} disabled={editSubmitting} />
        </label>
        <label class="oh-checkbox">
          <input type="checkbox" bind:checked={editForm.airFilterChanged} disabled={editSubmitting} />
          ¿Se cambió el filtro de aire?
        </label>
        {#if editError}
          <p class="oh-error">{editError}</p>
        {/if}
        <div class="oh-dialog-foot">
          <button type="button" class="btn-back" on:click={closeEditModal} disabled={editSubmitting}>Cancelar</button>
          <button type="submit" class="btn-primary" disabled={editSubmitting}>
            {editSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if deleteRow}
  <div class="oh-overlay" role="presentation" on:click|self={() => (deleteRow = null)}>
    <div class="oh-dialog oh-dialog--small" role="dialog" aria-modal="true" aria-labelledby="oh-delete-title" on:click|stopPropagation>
      <div class="oh-dialog-head">
        <span id="oh-delete-title">Eliminar cambio de aceite</span>
        <button type="button" class="oh-close" on:click={() => (deleteRow = null)} aria-label="Cerrar">×</button>
      </div>
      <div class="oh-dialog-body">
        <p>¿Está seguro de eliminar el cambio de aceite del {formatDate(deleteRow.dateStamp)} ({formatKm(deleteRow.kmAtChange)} km)?</p>
        <div class="oh-dialog-foot">
          <button type="button" class="btn-back" on:click={() => (deleteRow = null)} disabled={deleteSubmitting}>Cancelar</button>
          <button type="button" class="btn-danger" on:click={confirmDelete} disabled={deleteSubmitting}>
            {deleteSubmitting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .oil-history {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    font-family: "MS Sans Serif", "Tahoma", sans-serif;
    font-size: 11px;
    padding: 8px;
    box-sizing: border-box;
    gap: 8px;
  }

  .oil-history__toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #a0a0a0;
  }

  .oil-history__title {
    flex: 1;
    margin: 0;
    font-size: 13px;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .placa-badge {
    display: inline-block;
    background: #1a3a6e;
    color: #fff;
    padding: 2px 10px;
    font-size: 12px;
    font-weight: bold;
    letter-spacing: 1px;
    border: 1px solid #0d2550;
  }

  .btn-back {
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border: 1px outset #d0d0d0;
    padding: 3px 10px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    white-space: nowrap;
  }

  .btn-back:hover { background: linear-gradient(to bottom, #ececec 0%, #d0d0d0 100%); }

  .btn-refresh {
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border: 1px outset #d0d0d0;
    padding: 3px 10px;
    cursor: pointer;
    font-family: inherit;
    font-size: 10px;
  }
  .btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

  .oil-history__summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .summary-card {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 8px 14px;
    background: #f0f0f0;
    border: 1px inset #c0c0c0;
    min-width: 130px;
  }

  .summary-label {
    font-size: 9px;
    color: #505050;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .summary-value {
    font-size: 13px;
    font-weight: bold;
    color: #202020;
  }

  .summary-value--highlight {
    color: #1a3a6e;
  }

  .oil-history__loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 160px;
    gap: 12px;
    color: #404040;
  }

  .oil-history__error {
    padding: 12px 16px;
    background: #ffdddd;
    border: 1px solid #c00;
    color: #800000;
  }

  .oil-history__empty {
    padding: 20px;
    text-align: center;
    color: #505050;
    background: #f8f8f8;
    border: 1px inset #c0c0c0;
  }

  .oil-history__table {
    flex: 1;
    min-height: 0;
  }

  /* Modales Editar/Eliminar — mismo estilo retro que el resto de la página. */
  .oh-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200;
    padding: 16px;
  }
  .oh-dialog {
    min-width: 320px;
    max-width: 420px;
    width: 100%;
    background: #c0c0c0;
    border: 1px outset #d0d0d0;
    box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.3);
    font-family: "MS Sans Serif", "Tahoma", sans-serif;
    font-size: 11px;
  }
  .oh-dialog--small {
    max-width: 360px;
  }
  .oh-dialog-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 3px 8px;
    background: #d4d0c8;
    color: #000;
    font-weight: bold;
    border-bottom: 1px solid #808080;
  }
  .oh-close {
    border: none;
    background: transparent;
    color: #000;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    padding: 0 4px;
  }
  .oh-dialog-body {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .oh-field {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .oh-field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .oh-field-label {
    font-weight: bold;
    font-size: 10px;
    color: #202020;
  }
  .oh-field input,
  .oh-field select {
    padding: 4px 6px;
    border: 1px inset #808080;
    font-family: inherit;
    font-size: 11px;
    background: #fff;
    box-sizing: border-box;
  }
  .oh-checkbox {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .oh-error {
    background: #ffcccc;
    border: 1px solid #c00;
    color: #800000;
    padding: 6px 8px;
    margin: 0;
  }
  .oh-dialog-foot {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px solid #808080;
  }
  .btn-primary {
    background: linear-gradient(to bottom, #90ee90 0%, #7bc97b 100%);
    color: #000;
    border: 1px outset #7bc97b;
    padding: 3px 12px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    font-weight: bold;
  }
  .btn-primary:hover:not(:disabled) { background: linear-gradient(to bottom, #a0ffa0 0%, #8bd98b 100%); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-danger {
    background-color: #ffbaba;
    color: #000;
    border: 1px outset #c0c0c0;
    padding: 3px 12px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    font-weight: bold;
  }
  .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
