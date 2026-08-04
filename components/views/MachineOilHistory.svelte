<script>
  import { pop } from 'svelte-spa-router';
  import { createMachineOilHistoryColumns } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import { auth } from '../../stores/auth.js';
  import { addNotification } from '../../stores/ui.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';

  export let params = {};

  $: machineId = params.machineId ? Number(params.machineId) : null;
  $: tipo = (params.tipo || 'MOTOR').toUpperCase();
  $: tipoLabel = tipo === 'HYDRAULIC' ? 'Hidráulico' : 'Motor';
  $: isAdmin = $auth?.currentUser?.role === 'ADMIN';
  // Editar/Eliminar solo para ADMIN ("en caso de error") — mismo criterio que
  // VehicleOilHistory.svelte / Tanqueo y Distribución.
  $: columns = createMachineOilHistoryColumns(isAdmin);

  let history = [];
  let machineName = '';
  let isLoading = false;
  let error = null;

  let _lastKey = '';
  $: if (machineId && `${machineId}-${tipo}` !== _lastKey) {
    _lastKey = `${machineId}-${tipo}`;
    loadHistory();
  }

  async function loadHistory() {
    if (!machineId) { error = 'No se especificó ninguna máquina.'; return; }
    isLoading = true;
    error = null;
    try {
      const [hist, machine] = await Promise.all([
        data.fetchMachineOilHistory(machineId, tipo),
        data.getMachineById(machineId),
      ]);
      history = hist;
      machineName = machine?.name ?? '';
    } catch (e) {
      error = e.message || 'Error al cargar el historial.';
    } finally {
      isLoading = false;
    }
  }

  $: totalCambios = history.length;
  $: ultimoCambio = history[0] ?? null;

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
  const initialEditForm = { brandId: '', quantity: '', currentHourMeter: '', averageHoursChange: '' };
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
      brandId: row.brandId != null ? String(row.brandId) : '',
      quantity: row.quantity != null ? String(row.quantity) : '',
      currentHourMeter: row.hourMeter != null ? String(row.hourMeter) : '',
      averageHoursChange: row.averageHoursChange != null ? String(row.averageHoursChange) : '',
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
    const hourMeter = parseFloat(editForm.currentHourMeter);
    if (isNaN(hourMeter) || hourMeter <= 0) { editError = 'Ingrese un horómetro válido.'; return; }
    const avg = parseInt(editForm.averageHoursChange, 10);
    if (!avg || avg <= 0) { editError = 'Ingrese un promedio de cambio válido.'; return; }
    if (!editForm.brandId) { editError = 'Seleccione una marca.'; return; }

    editSubmitting = true;
    try {
      await data.updateMachineOilChange(editRow.id, {
        machineId,
        dateTime: editRow.dateStamp,
        brandId: Number(editForm.brandId),
        quantity: editForm.quantity ? parseFloat(editForm.quantity) : null,
        currentHourMeter: hourMeter,
        averageHoursChange: avg,
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
      await data.deleteMachineOilChange(deleteRow.id);
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
      Historial de aceite {tipoLabel}
      {#if machineName}<span class="placa-badge">{machineName}</span>{/if}
    </h2>
    <button type="button" class="btn-refresh" on:click={loadHistory} disabled={isLoading}>
      Refrescar
    </button>
  </div>

  {#if machineId && !isLoading && !error}
    <div class="oil-history__summary">
      <div class="summary-card">
        <span class="summary-label">Total registros</span>
        <span class="summary-value">{totalCambios}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Último horómetro</span>
        <span class="summary-value">{ultimoCambio?.hourMeter ?? 'N/A'}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Promedio de cambio (h)</span>
        <span class="summary-value summary-value--highlight">{ultimoCambio?.averageHoursChange ?? 'N/A'}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Última marca</span>
        <span class="summary-value">{ultimoCambio?.brandName ?? 'N/A'}</span>
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
      <p>No se encontraron registros de cambio de aceite {tipoLabel.toLowerCase()} para esta máquina.</p>
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
          <span class="oh-field-label">Marca de aceite</span>
          <select bind:value={editForm.brandId} disabled={editSubmitting}>
            <option value="">— Seleccionar —</option>
            {#each oils as oil}
              <option value={String(oil.id)}>{oil.name}</option>
            {/each}
          </select>
        </div>
        <div class="oh-field-row">
          <label class="oh-field" for="oh-hourmeter">
            <span class="oh-field-label">Horómetro del cambio</span>
            <input id="oh-hourmeter" type="number" min="0" step="0.1" bind:value={editForm.currentHourMeter} disabled={editSubmitting} />
          </label>
          <label class="oh-field" for="oh-avg">
            <span class="oh-field-label">Promedio de cambio (h)</span>
            <input id="oh-avg" type="number" min="1" bind:value={editForm.averageHoursChange} disabled={editSubmitting} />
          </label>
        </div>
        <label class="oh-field" for="oh-quantity">
          <span class="oh-field-label">Cantidad</span>
          <input id="oh-quantity" type="number" step="0.1" min="0" bind:value={editForm.quantity} disabled={editSubmitting} />
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
        <p>¿Está seguro de eliminar el cambio de aceite del {formatDate(deleteRow.dateStamp)}?</p>
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
