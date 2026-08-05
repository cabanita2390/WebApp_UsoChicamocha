<script>
  import { push } from 'svelte-spa-router';
  import { data } from '../../stores/data.js';
  import { auth } from '../../stores/auth.js';
  import { addNotification } from '../../stores/ui.js';
  import { download } from '../../stores/api.js';
  import { formatVehiclePayload } from '@/lib/textFormat.js';

  $: isAdmin = $auth?.currentUser?.role === 'ADMIN';
  $: isSupervisorOperativo = $auth?.currentUser?.role === 'SUPERVISOR_OPERATIVO';

  // --- Corregir Km ("en caso de error", mismo patrón que Corregir Horómetro de
  // Maquinaria) — reutiliza el endpoint de edición de vehículo que ya existe
  // (VehicleManagement.svelte), no hace falta backend nuevo. Motos usan el mismo
  // endpoint porque viven en la tabla vehiculos.
  let kmModalOpen = false;
  let kmRow = null;
  let kmTipo = 'vehiculos';
  let kmValue = '';
  let kmSubmitting = false;

  async function openKmModal(monitoringRow, tipo) {
    try {
      const full = tipo === 'motos'
        ? await data.getMotoByPlaca(monitoringRow.placa)
        : await data.getVehicleByPlaca(monitoringRow.placa);
      kmRow = full;
      kmTipo = tipo;
      kmValue = String(full.kilometrajeActual ?? '');
      kmModalOpen = true;
    } catch (e) {
      addNotification({ id: Date.now(), text: e.message || 'No se pudo cargar el vehículo para editar.' });
    }
  }

  function closeKmModal() {
    kmModalOpen = false;
    kmRow = null;
    kmValue = '';
    kmSubmitting = false;
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && kmModalOpen) closeKmModal();
  }

  async function submitKm() {
    const val = parseInt(kmValue, 10);
    if (isNaN(val) || val < 0) {
      addNotification({ id: Date.now(), text: 'Ingrese un valor de kilometraje válido.' });
      return;
    }
    kmSubmitting = true;
    try {
      await data.updateVehicle(kmRow.id, formatVehiclePayload({ ...kmRow, kilometrajeActual: val }));
      addNotification({ id: Date.now(), text: `Kilometraje de "${kmRow.placa}" actualizado a ${val}.` });
      closeKmModal();
      if (kmTipo === 'motos') await data.fetchMotoMonitoring();
      else await data.fetchVehicleMonitoring();
    } catch (e) {
      addNotification({ id: Date.now(), text: e.message || 'Error al actualizar el kilometraje.' });
      kmSubmitting = false;
    }
  }

  let isExportingVehicles = false;
  let isExportingMotos = false;

  async function handleExportVehicles() {
    isExportingVehicles = true;
    try {
      await download('vehicle/monitoring/consolidated/export', 'consolidado_vehiculos.xlsx');
      addNotification({ id: Date.now(), text: 'Consolidado de vehículos descargado.' });
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar: ${e.message}` });
    } finally {
      isExportingVehicles = false;
    }
  }

  async function handleExportMotos() {
    isExportingMotos = true;
    try {
      await download('moto/monitoring/consolidated/export', 'consolidado_motos.xlsx');
      addNotification({ id: Date.now(), text: 'Consolidado de motos descargado.' });
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar: ${e.message}` });
    } finally {
      isExportingMotos = false;
    }
  }
  import TabPanel from '../shared/TabPanel.svelte';
  import Consolidado from './Consolidado.svelte';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';
  import { consolidadoVehicleColumns, consolidadoMotoColumns } from '../../config/table-definitions.js';
  import { normalizePlaca } from '@/lib/textFormat.js';

  const tabs = [
    { id: 'maquinaria', label: 'Maquinaria' },
    { id: 'vehiculos',  label: 'Vehículos'  },
    { id: 'motos',      label: 'Motos'       },
  ];
  let activeTab = 'maquinaria';

  $: vehicleData = $data.vehicleMonitoring ?? [];
  $: motoData    = $data.motoMonitoring    ?? [];
  $: isLoading   = $data.isLoading;

  function handleGridAction(ev) {
    const { type, data: row } = ev.detail;
    if (type === 'monitoring_oil_history')
      push(`/vehicle-oil-history/${encodeURIComponent(normalizePlaca(row.placa))}`);
    else if (type === 'edit_km')
      openKmModal(row, activeTab === 'motos' ? 'motos' : 'vehiculos');
  }

  // --- tab switching ---
  function handleTabChange(event) {
    activeTab = event.detail;
    if (activeTab === 'maquinaria' && $data.consolidated.distrito.length === 0 && $data.consolidated.asociacion.length === 0) {
      data.fetchConsolidadoData();
    }
    if (activeTab === 'vehiculos' && vehicleData.length === 0) {
      data.fetchVehicleMonitoring();
    }
    if (activeTab === 'motos' && motoData.length === 0) {
      data.fetchMotoMonitoring();
    }
  }
</script>

<div class="tabbed-wrap">
  <TabPanel {tabs} bind:activeTab on:tabChange={handleTabChange}>
    {#if activeTab === 'maquinaria'}
      <Consolidado />
    {:else if activeTab === 'vehiculos'}
      <div class="vehicle-module">
        <div class="vehicle-module-inner">
          <div class="vehicle-toolbar">
            <button class="vehicle-btn" on:click={() => data.fetchVehicleMonitoring()}>
              Refrescar
            </button>
            <button class="vehicle-btn vehicle-btn--export" on:click={handleExportVehicles} disabled={isExportingVehicles}>
              {isExportingVehicles ? 'Descargando...' : 'Exportar Excel'}
            </button>
          </div>
          {#if isLoading}
            <div class="vehicle-loader">
              <Loader />
              <p>Cargando consolidado de vehículos...</p>
            </div>
          {:else}
            <div class="vehicle-table-wrap vehicle-table-wrap--inset">
              <DataGrid
                columns={consolidadoVehicleColumns}
                data={vehicleData}
                totalElements={vehicleData.length}
                totalPages={1}
                currentPage={0}
                pageSize={Math.max(vehicleData.length, 1)}
                showPagination={false}
                fixedLayout={false}
                on:action={handleGridAction}
              />
            </div>
          {/if}
        </div>
      </div>
    {:else if activeTab === 'motos'}
      <div class="vehicle-module">
        <div class="vehicle-module-inner">
          <div class="vehicle-toolbar">
            <button class="vehicle-btn" on:click={() => data.fetchMotoMonitoring()}>
              Refrescar
            </button>
            <button class="vehicle-btn vehicle-btn--export" on:click={handleExportMotos} disabled={isExportingMotos}>
              {isExportingMotos ? 'Descargando...' : 'Exportar Excel'}
            </button>
          </div>
          {#if isLoading}
            <div class="vehicle-loader">
              <Loader />
              <p>Cargando consolidado de motos...</p>
            </div>
          {:else}
            <div class="vehicle-table-wrap vehicle-table-wrap--inset">
              <DataGrid
                columns={consolidadoMotoColumns}
                data={motoData}
                totalElements={motoData.length}
                totalPages={1}
                currentPage={0}
                pageSize={Math.max(motoData.length, 1)}
                showPagination={false}
                fixedLayout={false}
                on:action={handleGridAction}
              />
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </TabPanel>
</div>

<svelte:window on:keydown={handleKeydown} />

{#if kmModalOpen && kmRow && (isAdmin || isSupervisorOperativo)}
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="km-overlay" role="presentation" on:click|self={closeKmModal}>
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="km-dialog" role="dialog" aria-modal="true" aria-labelledby="km-title" on:click|stopPropagation>
      <div class="km-dialog-head">
        <span id="km-title">Corregir Km — {kmRow.placa ?? ''}</span>
        <button type="button" class="km-close" on:click={closeKmModal} aria-label="Cerrar">×</button>
      </div>
      <div class="km-dialog-body">
        <label class="km-field" for="km-input">
          <span class="km-field-label">Nuevo kilometraje</span>
          <input id="km-input" type="number" min="0" bind:value={kmValue} disabled={kmSubmitting} />
        </label>
        <div class="km-dialog-foot">
          <button type="button" class="vehicle-btn" on:click={closeKmModal} disabled={kmSubmitting}>
            Cancelar
          </button>
          <button type="button" class="vehicle-btn vehicle-btn--export" on:click={submitKm} disabled={kmSubmitting}>
            {kmSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .tabbed-wrap {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* Modal Corregir Km — mismo espíritu que Consolidado.svelte (Corregir
     Horómetro), estilo retro consistente con el resto de la app. */
  .km-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200;
    padding: 16px;
  }
  .km-dialog {
    min-width: 300px;
    max-width: 380px;
    width: 100%;
    background: #c0c0c0;
    border: 1px outset #d0d0d0;
    box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.3);
    font-family: "MS Sans Serif", "Tahoma", sans-serif;
    font-size: 11px;
  }
  .km-dialog-head {
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
  .km-close {
    border: none;
    background: transparent;
    color: #000;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    padding: 0 4px;
  }
  .km-dialog-body {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .km-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .km-field-label {
    font-weight: bold;
    font-size: 11px;
    color: #202020;
  }
  .km-field input {
    padding: 4px 6px;
    border: 1px inset #808080;
    font-family: inherit;
    font-size: 11px;
    background: #fff;
    box-sizing: border-box;
  }
  .km-dialog-foot {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px solid #808080;
  }
</style>
