<script>
  import { onMount } from 'svelte';
  import {
    monitoringVehicleDocumentColumns,
    monitoringVehicleOilColumns,
  } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';
  import { addNotification } from '../../stores/ui.js';
  import { link } from 'svelte-spa-router';
  import {
    assertOilChangeKmNotBelowVehicleCurrent,
    assertOilChangeKmBackendAllows,
  } from '../../src/lib/vehicleOilKmValidation.js';

  /** Fecha vencimiento según tipo (solo SOAT / Tecno en monitoreo). */
  function docVencRawForTipo(row, tipo) {
    if (!row) return null;
    return tipo === 'SOAT' ? row.soat?.fechaVencimiento : row.tecno?.fechaVencimiento;
  }

  function formatVencimientoPrev(raw) {
    if (raw == null || raw === '') return 'Sin fecha registrada';
    let s = raw;
    if (Array.isArray(raw) && raw.length >= 3) {
      s = `${raw[0]}-${String(raw[1]).padStart(2, '0')}-${String(raw[2]).padStart(2, '0')}`;
    } else if (typeof raw === 'string' && raw.length >= 10) {
      s = raw.slice(0, 10);
    }
    const d = new Date(typeof s === 'string' ? `${s}T12:00:00` : s);
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toLocaleDateString('es-CO');
  }

  /** Valor yyyy-mm-dd para input type="date". */
  function toDateInputValue(raw) {
    if (raw == null || raw === '') return '';
    if (Array.isArray(raw) && raw.length >= 3) {
      return `${raw[0]}-${String(raw[1]).padStart(2, '0')}-${String(raw[2]).padStart(2, '0')}`;
    }
    if (typeof raw === 'string') {
      const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) return m[1];
    }
    return '';
  }

  function syncDocFechaFromRow() {
    if (!actionRow) return;
    docForm.fechaVencimiento = toDateInputValue(docVencRawForTipo(actionRow, docForm.tipoDocumento));
  }

  let activeTab = 'documentos';

  $: vehicles = $data.vehicleMonitoring;
  $: isLoading = $data.isLoading;
  $: errorMessage = $data.error;
  $: motorOilBrands = ($data.oils || []).filter((o) => o.type === 'motor');

  let docModalOpen = false;
  let oilModalOpen = false;
  let actionRow = null;
  let docVehicleId = null;
  let modalError = '';
  let modalSubmitting = false;

  let oilForm = {
    oilType: '',
    brandId: null,
    kmAtChange: null,
    intervalKm: 5000,
    airFilterChanged: false,
    quantity: 1.0,
  };

  let docForm = {
    tipoDocumento: 'SOAT',
    fechaVencimiento: '',
  };

  onMount(() => {
    data.fetchOils().catch(() => {});
  });

  async function handleRefresh() {
    await data.fetchVehicleMonitoring();
  }

  function resetModals() {
    docModalOpen = false;
    oilModalOpen = false;
    actionRow = null;
    docVehicleId = null;
    modalError = '';
    modalSubmitting = false;
  }

  async function openDocModal(row) {
    modalError = '';
    actionRow = row;
    docForm.tipoDocumento = 'SOAT';
    docForm.fechaVencimiento = toDateInputValue(docVencRawForTipo(row, 'SOAT'));
    try {
      const v = await data.getVehicleByPlaca(row.placa);
      docVehicleId = v?.id ?? null;
      if (docVehicleId == null) throw new Error('No se encontró el vehículo.');
      docModalOpen = true;
    } catch (e) {
      addNotification({
        id: Date.now(),
        text: e.message || 'No se pudo cargar el vehículo para actualizar documentos.',
      });
      actionRow = null;
    }
  }

  function openOilModal(row) {
    modalError = '';
    actionRow = row;
    oilForm = {
      oilType: '',
      brandId: null,
      kmAtChange: row.kmActual != null ? Number(row.kmActual) : null,
      intervalKm: 5000,
      airFilterChanged: false,
      quantity: 1.0,
    };
    oilModalOpen = true;
  }

  async function submitDocModal() {
    if (!docVehicleId || !docForm.fechaVencimiento) {
      modalError = 'Seleccione el tipo de documento y la fecha de vencimiento.';
      return;
    }
    modalSubmitting = true;
    modalError = '';
    try {
      await data.updateVehicleDocument({
        idVehiculo: docVehicleId,
        tipoDocumento: docForm.tipoDocumento,
        fechaVencimiento: docForm.fechaVencimiento,
      });
      addNotification({ id: Date.now(), text: 'Documentación actualizada.' });
      resetModals();
      await data.fetchVehicleMonitoring();
    } catch (e) {
      modalError = e.message || 'Error al guardar.';
    } finally {
      modalSubmitting = false;
    }
  }

  async function submitOilModal() {
    if (!actionRow?.placa) return;
    modalSubmitting = true;
    modalError = '';
    try {
      assertOilChangeKmNotBelowVehicleCurrent(oilForm.kmAtChange, actionRow.kmActual);
      await assertOilChangeKmBackendAllows(data.validateVehicleKilometraje, actionRow.placa, oilForm.kmAtChange);
      await data.registerVehicleOilChange({
        placa: actionRow.placa,
        oilType: oilForm.oilType,
        brandId: oilForm.brandId,
        kmAtChange: oilForm.kmAtChange,
        intervalKm: oilForm.intervalKm,
        airFilterChanged: oilForm.airFilterChanged,
        quantity: oilForm.quantity,
        dateStamp: new Date().toISOString(),
      });
      addNotification({ id: Date.now(), text: 'Cambio de aceite registrado.' });
      resetModals();
      await data.fetchVehicleMonitoring();
    } catch (e) {
      modalError = e.message || 'Error al registrar.';
    } finally {
      modalSubmitting = false;
    }
  }

  function handleGridAction(ev) {
    const { type, data: row } = ev.detail;
    if (type === 'monitoring_update_docs') openDocModal(row);
    else if (type === 'monitoring_register_oil') openOilModal(row);
  }

  $: docTipoTitulo = docForm.tipoDocumento === 'SOAT' ? 'SOAT' : 'Revisión tecnomecánica';
  $: docPrevDisplayed =
    docModalOpen && actionRow
      ? formatVencimientoPrev(docVencRawForTipo(actionRow, docForm.tipoDocumento))
      : '';
</script>

<div class="vehicle-module">
  <div class="vehicle-module-inner">
    <div class="vehicle-toolbar">
      <button type="button" class="vehicle-btn" on:click={handleRefresh}>Refrescar</button>
    </div>

    <div class="vehicle-tab-bar" role="tablist">
      <button
        type="button"
        class="vehicle-tab"
        class:active={activeTab === 'documentos'}
        on:click={() => (activeTab = 'documentos')}
        role="tab"
        aria-selected={activeTab === 'documentos'}
      >
        Documentación (Tecno / SOAT)
      </button>
      <button
        type="button"
        class="vehicle-tab vehicle-tab--compact"
        class:active={activeTab === 'aceite'}
        on:click={() => (activeTab = 'aceite')}
        role="tab"
        aria-selected={activeTab === 'aceite'}
        title="Cambio de aceite: km, fechas y registro"
      >
        Aceite
      </button>
    </div>

    {#if isLoading}
      <div class="vehicle-loader">
        <Loader />
        <p>Cargando monitoreo...</p>
      </div>
    {:else if errorMessage}
      <div class="vehicle-error">
        <p><strong>Error:</strong> {errorMessage}</p>
      </div>
    {:else}
      <div class="vehicle-table-wrap vehicle-table-wrap--inset">
        {#if activeTab === 'documentos'}
          <DataGrid
            columns={monitoringVehicleDocumentColumns}
            data={vehicles}
            totalElements={vehicles.length}
            totalPages={1}
            currentPage={0}
            pageSize={Math.max(vehicles.length, 1)}
            showPagination={false}
            fixedLayout={false}
            on:action={handleGridAction}
          />
        {:else}
          <DataGrid
            columns={monitoringVehicleOilColumns}
            data={vehicles}
            totalElements={vehicles.length}
            totalPages={1}
            currentPage={0}
            pageSize={Math.max(vehicles.length, 1)}
            showPagination={false}
            fixedLayout={false}
            on:action={handleGridAction}
          />
        {/if}
      </div>
    {/if}
  </div>
</div>

{#if docModalOpen && actionRow}
  <div class="modal-overlay" role="presentation" on:click={resetModals}>
    <div class="modal-box" role="dialog" aria-modal="true" on:click|stopPropagation>
      <div class="modal-head">
        <h3>Actualizar documentación — {actionRow.placa}</h3>
        <button type="button" class="modal-close" on:click={resetModals}>×</button>
      </div>
      <p class="modal-lead">Solo se actualiza <strong>SOAT</strong> o <strong>revisión tecnomecánica</strong>. Al guardar se refresca el monitoreo.</p>
      <div class="modal-fields">
        <label>
          Documento
          <select bind:value={docForm.tipoDocumento} disabled={modalSubmitting} on:change={syncDocFechaFromRow}>
            <option value="SOAT">SOAT</option>
            <option value="TECNOMECANICA">Revisión tecnomecánica</option>
          </select>
        </label>
        <div class="prev-fecha-block">
          <span class="prev-fecha-label">Vencimiento actual ({docTipoTitulo})</span>
          <span class="prev-fecha-val">{docPrevDisplayed}</span>
        </div>
        <label>
          Nueva fecha de vencimiento
          <input type="date" bind:value={docForm.fechaVencimiento} disabled={modalSubmitting} />
        </label>
      </div>
      {#if modalError}
        <p class="vehicle-catalog-inline-error">{modalError}</p>
      {/if}
      <div class="modal-foot">
        <button type="button" class="btn-cancel" disabled={modalSubmitting} on:click={resetModals}>Cancelar</button>
        <button type="button" class="btn-save" disabled={modalSubmitting} on:click={submitDocModal}>
          {modalSubmitting ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if oilModalOpen && actionRow}
  <div class="modal-overlay" role="presentation" on:click={resetModals}>
    <div class="modal-box modal-box-wide" role="dialog" aria-modal="true" on:click|stopPropagation>
      <div class="modal-head">
        <h3>Cambio de aceite — {actionRow.placa}</h3>
        <button type="button" class="modal-close" on:click={resetModals}>×</button>
      </div>
      {#if actionRow.kmActual != null && Number(actionRow.kmActual) > 0}
        <p class="modal-lead">
          El km del cambio no puede ser menor al km actual del monitoreo:
          <strong>{Number(actionRow.kmActual).toLocaleString('es-CO')}</strong>.
        </p>
      {/if}
      <div class="modal-grid">
        <label>
          Km en el cambio
          <input type="number" bind:value={oilForm.kmAtChange} disabled={modalSubmitting} placeholder="Ej: 135000" />
        </label>
        <label>
          Tipo / viscosidad
          <input type="text" bind:value={oilForm.oilType} disabled={modalSubmitting} placeholder="Ej: 15W-40" />
        </label>
        <label>
          Marca de aceite
          <span class="inline-hint">(<a href="/oil-management" use:link>catálogo de marcas</a>)</span>
          <select bind:value={oilForm.brandId} disabled={modalSubmitting}>
            <option value={null}>— Seleccione —</option>
            {#each motorOilBrands as brand}
              <option value={brand.id}>{brand.name}</option>
            {/each}
          </select>
        </label>
        <label>
          Intervalo (km)
          <select bind:value={oilForm.intervalKm} disabled={modalSubmitting}>
            <option value={5000}>5.000</option>
            <option value={6000}>6.000</option>
            <option value={8000}>8.000</option>
            <option value={10000}>10.000</option>
          </select>
        </label>
        <label>
          Cantidad
          <input type="number" step="0.1" bind:value={oilForm.quantity} disabled={modalSubmitting} />
        </label>
        <label class="check-row">
          <input type="checkbox" bind:checked={oilForm.airFilterChanged} disabled={modalSubmitting} />
          Filtro de aire/combustible cambiado
        </label>
      </div>
      {#if modalError}
        <p class="vehicle-catalog-inline-error">{modalError}</p>
      {/if}
      <div class="modal-foot">
        <button type="button" class="btn-cancel" disabled={modalSubmitting} on:click={resetModals}>Cancelar</button>
        <button
          type="button"
          class="btn-save"
          disabled={modalSubmitting || oilForm.kmAtChange == null}
          on:click={submitOilModal}
        >
          {modalSubmitting ? 'Guardando…' : 'Registrar cambio'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200;
    padding: 12px;
  }
  .modal-box {
    background: #e0e0e0;
    border: 2px outset #fff;
    min-width: 320px;
    max-width: 100%;
    padding: 14px 16px 16px;
    box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.25);
    font-family: "MS Sans Serif", "Tahoma", sans-serif;
    font-size: 11px;
  }
  .modal-box-wide {
    min-width: 420px;
  }
  .modal-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    border-bottom: 1px solid #808080;
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  .modal-head h3 {
    margin: 0;
    font-size: 12px;
  }
  .modal-close {
    border: none;
    background: transparent;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    padding: 0 4px;
  }
  .modal-lead {
    margin: 0 0 10px;
    color: #404040;
    font-size: 10px;
  }
  .modal-fields,
  .modal-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .modal-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 10px 14px;
  }
  .prev-fecha-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 10px;
    background: #f5f5f5;
    border: 1px inset #c0c0c0;
    color: #202020;
  }
  .prev-fecha-label {
    font-size: 10px;
    font-weight: bold;
    color: #404040;
  }
  .prev-fecha-val {
    font-size: 12px;
    font-weight: normal;
  }
  .modal-fields label,
  .modal-grid label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-weight: bold;
  }
  .modal-fields input,
  .modal-fields select,
  .modal-grid input,
  .modal-grid select {
    padding: 4px 6px;
    border: 1px inset #c0c0c0;
    font-family: inherit;
    font-size: 11px;
    background: #fff;
  }
  .check-row {
    flex-direction: row !important;
    align-items: center;
    gap: 8px !important;
    grid-column: 1 / -1;
  }
  .inline-hint {
    font-weight: normal;
    font-size: 9px;
    color: #505050;
  }
  .inline-hint a {
    color: #303030;
    text-decoration: underline;
  }
  .modal-foot {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid #a0a0a0;
  }
  .btn-cancel {
    background: #d0d0d0;
    border: 1px outset #fff;
    padding: 4px 12px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
  }
  .btn-save {
    background: #90ee90;
    border: 1px outset #fff;
    padding: 4px 12px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    font-weight: bold;
  }
  .btn-save:disabled,
  .btn-cancel:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
</style>
