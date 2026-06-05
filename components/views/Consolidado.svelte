<script>
  import { createConsolidadoColumns } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import { auth } from '../../stores/auth.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';
  import { addNotification } from '../../stores/ui.js';

  $: isAdmin = $auth?.currentUser?.role === 'ADMIN';
  $: isSupervisorOperativo = $auth?.currentUser?.role === 'SUPERVISOR_OPERATIVO';

  const distritoColumns = createConsolidadoColumns('Distrito');
  const asociacionColumns = createConsolidadoColumns('Asociación');

  $: distritoMachines = $data.consolidated.distrito;
  $: asociacionMachines = $data.consolidated.asociacion;
  $: isLoading = $data.isLoading;
  $: errorMessage = $data.error;
  let isExporting = false;

  // --- modal corregir horómetro ---
  let hourmeterModalOpen = false;
  let hourmeterRow = null;
  let hourmeterValue = '';
  let hourmeterSubmitting = false;

  function openHourmeterModal(row) {
    hourmeterRow = row;
    hourmeterValue = String(row.currentData?.currentHourMeter ?? '');
    hourmeterModalOpen = true;
  }

  function closeHourmeterModal() {
    hourmeterModalOpen = false;
    hourmeterRow = null;
    hourmeterValue = '';
    hourmeterSubmitting = false;
  }

  async function submitHourmeter() {
    const val = parseFloat(hourmeterValue);
    if (isNaN(val) || val < 0) {
      addNotification({ id: Date.now(), text: 'Ingrese un valor de horómetro válido.' });
      return;
    }
    hourmeterSubmitting = true;
    try {
      await data.updateInspectionHourMeter(hourmeterRow.machine.id, val);
      addNotification({ id: Date.now(), text: `Horómetro de "${hourmeterRow.machine.name}" actualizado a ${val}.` });
      closeHourmeterModal();
      await data.fetchConsolidadoData();
    } catch (e) {
      addNotification({ id: Date.now(), text: e.message || 'Error al actualizar el horómetro.' });
      hourmeterSubmitting = false;
    }
  }

  function handleGridAction(ev) {
    const { type, data: row } = ev.detail;
    if (type === 'edit_hourmeter') openHourmeterModal(row);
  }

  async function handleExportConsolidated() {
    isExporting = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/oil-changes/consolidated/excel`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!response.ok) throw new Error('Error al descargar el archivo');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'consolidado.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification({ id: Date.now(), text: 'Archivo consolidado descargado con éxito.' });
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar el archivo: ${e.message}` });
    } finally {
      isExporting = false;
    }
  }
</script>

<div class="vehicle-module">
  <div class="vehicle-module-inner">
    <div class="vehicle-toolbar">
      <button type="button" class="vehicle-btn" on:click={() => data.fetchConsolidadoData()}>
        Refrescar
      </button>
      <button class="vehicle-btn vehicle-btn--export" on:click={handleExportConsolidated} disabled={isExporting}>
        {#if isExporting}<span class="spin">⟳</span>{/if}
        {isExporting ? 'Descargando...' : 'Exportar Excel'}
      </button>
    </div>

    {#if isLoading}
      <div class="vehicle-loader">
        <Loader />
        <p>Cargando datos del consolidado...</p>
      </div>
    {:else if errorMessage}
      <div class="vehicle-error">
        <p><strong>Se encontraron problemas al cargar los datos:</strong></p>
        <p>{errorMessage}</p>
      </div>
    {:else if distritoMachines.length === 0 && asociacionMachines.length === 0}
      <div class="empty-state">
        <p>No hay datos disponibles. Verifique que las máquinas tengan inspecciones y cambios de aceite registrados.</p>
      </div>
    {:else}
      {#if distritoMachines.length > 0}
        <div class="vehicle-table-wrap vehicle-table-wrap--inset">
          <DataGrid columns={distritoColumns} data={distritoMachines} fixedLayout={false} on:action={handleGridAction} showDeleteButton={isAdmin} />
        </div>
      {/if}
      {#if asociacionMachines.length > 0}
        <div class="vehicle-table-wrap vehicle-table-wrap--inset">
          <DataGrid columns={asociacionColumns} data={asociacionMachines} fixedLayout={false} on:action={handleGridAction} showDeleteButton={isAdmin} />
        </div>
      {/if}
    {/if}
  </div>
</div>

{#if hourmeterModalOpen && hourmeterRow && (isAdmin || isSupervisorOperativo)}
  <div class="hm-overlay" role="presentation" on:click|self={closeHourmeterModal}>
    <div
      class="vehicle-form-section hm-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hm-title"
      on:click|stopPropagation
    >
      <div class="vehicle-subpanel-head hm-dialog-head">
        <span id="hm-title">Corregir Horómetro — {hourmeterRow.machine?.name ?? ''}</span>
        <button type="button" class="hm-close" on:click={closeHourmeterModal} aria-label="Cerrar">×</button>
      </div>
      <div class="hm-dialog-body">
        <div class="empty-state hm-info">
          <p>
            Valor actual: <strong>{hourmeterRow.currentData?.currentHourMeter ?? 'N/A'}</strong>
            &nbsp;·&nbsp; Última inspección:
            {hourmeterRow.currentData?.lastUpdate
              ? new Date(hourmeterRow.currentData.lastUpdate).toLocaleDateString('es-CO')
              : 'N/A'}
          </p>
        </div>
        <label class="hm-field" for="hm-input">
          <span class="hm-field-label">Nuevo valor de horómetro</span>
          <input
            id="hm-input"
            type="number"
            min="0"
            step="0.1"
            bind:value={hourmeterValue}
            disabled={hourmeterSubmitting}
          />
        </label>
        <div class="vehicle-toolbar hm-dialog-foot">
          <button type="button" class="vehicle-btn" on:click={closeHourmeterModal} disabled={hourmeterSubmitting}>
            Cancelar
          </button>
          <button
            type="button"
            class="vehicle-btn vehicle-btn--export"
            on:click={submitHourmeter}
            disabled={hourmeterSubmitting}
          >
            {hourmeterSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .empty-state {
    padding: 14px 16px;
    background: #f5f5f5;
    border: 1px inset #c0c0c0;
    font-family: "MS Sans Serif", "Tahoma", sans-serif;
    font-size: 11px;
    color: #202020;
  }

  /* Diálogo horómetro: cromática del módulo vehicle-*, no de modales flotantes */
  .hm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200;
    padding: 16px;
  }
  .hm-dialog {
    min-width: 320px;
    max-width: 420px;
    width: 100%;
    box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.3);
  }
  .hm-dialog-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .hm-close {
    border: none;
    background: transparent;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    padding: 0 4px;
    color: inherit;
  }
  .hm-dialog-body {
    padding: 10px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #c0c0c0;
  }
  .hm-info {
    margin: 0;
  }
  .hm-info p {
    margin: 0;
  }
  .hm-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .hm-field-label {
    font-weight: bold;
    font-size: 11px;
    color: #202020;
  }
  .hm-field input {
    padding: 4px 6px;
    border: 1px inset #c0c0c0;
    font-family: inherit;
    font-size: 11px;
    background: #fff;
    box-sizing: border-box;
  }
  .hm-dialog-foot {
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px solid #808080;
  }
</style>
